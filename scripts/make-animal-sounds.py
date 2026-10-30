"""Synthesize every animal's movement sound as a seamless, loudness-matched
WAV loop: python scripts/make-animal-sounds.py [id ...]

Walk loops place a footstep where each 3D model's foot touches down. The app
plays a loop at rate speed / 150 px/s (app.js BASE_WALK_SOUND_SPEED_PX_PER_SEC),
so one walk cycle lasts strideLengthPx / 150 s in the file and the steps
stay in time with the legs at any speed. Fly and swim loops match the
model's wingbeat or tail beat and play at a fixed rate.

Everything is rendered into a circular buffer (event tails wrap around and
noise is shaped in the frequency domain), so the loops have no seam.
"""
import sys, wave, math
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'audio'
SR = 44100
BASE_SPEED = 150.0  # px/s, keep in sync with app.js


# ---------------------------------------------------------------- primitives
def band_env(freqs, lo, hi, slope=2.0):
    """Smooth band-pass magnitude response (log-frequency), lo..hi Hz."""
    f = np.maximum(freqs, 1.0)
    rise = 1 / (1 + (lo / f) ** (2 * slope))
    fall = 1 / (1 + (f / hi) ** (2 * slope))
    return rise * fall


def colored(n, lo, hi, rng, slope=2.0):
    """Band-limited noise; periodic in n samples (filtered by FFT)."""
    spec = np.fft.rfft(rng.standard_normal(n))
    spec *= band_env(np.fft.rfftfreq(n, 1 / SR), lo, hi, slope)
    x = np.fft.irfft(spec, n)
    return x / (np.abs(x).max() + 1e-12)


def env_ad(n, attack, decay):
    """Attack (s) then exponential decay (time constant, s)."""
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(0, t - attack) / decay)


def burst(dur, lo, hi, attack, decay, rng, slope=2.0):
    n = int(dur * SR)
    return colored(n, lo, hi, rng, slope) * env_ad(n, attack, decay)


def thump(dur, f0, f1, decay, rng, noise=.3):
    """Low body thud: pitch-dropping sine plus a little low noise."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / (dur * .25))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR)
    x += noise * colored(n, 60, 900, rng)
    return x * env_ad(n, .002, decay)


def ring(dur, freq, decay):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * freq * t) * env_ad(n, .0005, decay)


def sweep(dur, f0, f1, harmonics=(1, .3, .12), shape=.5):
    """Tonal glide (bird chirp, bubble). Bell-shaped amplitude."""
    n = int(dur * SR)
    u = np.arange(n) / n
    f = f0 + (f1 - f0) * u
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(a * np.sin(ph * (k + 1)) for k, a in enumerate(harmonics))
    return x * np.sin(np.pi * u) ** shape


class Loop:
    def __init__(self, seconds, seed):
        self.n = int(round(seconds * SR))
        self.buf = np.zeros(self.n)
        self.rng = np.random.default_rng(seed)

    @property
    def seconds(self):
        return self.n / SR

    def add(self, event, t, gain=1.0):
        """Add an event at time t (s), wrapping its tail to the start."""
        event = event.copy()
        fade = min(len(event), int(.004 * SR))
        event[-fade:] *= np.linspace(1, 0, fade)  # never cut an event off mid-wave (click)
        start = int(round(t * SR)) % self.n
        idx = (start + np.arange(len(event))) % self.n
        np.add.at(self.buf, idx, event * gain)

    def bed(self, signal, gain=1.0):
        self.buf += signal[:self.n] * gain

    def time(self):
        return np.arange(self.n) / SR


def periodic_lfo(loop, cycles, phase=0.0):
    """Sine LFO completing a whole number of cycles in the loop (seamless)."""
    return np.sin(2 * np.pi * cycles * loop.time() / loop.seconds + phase)


def walk_loop(stride_px, target=4.0):
    """Loop length: whole walk cycles near `target` seconds."""
    cycle = stride_px / BASE_SPEED
    cycles = max(1, round(target / cycle))
    return cycle, cycles


def touchdowns(cycle, cycles, leg_phases, rng, jitter=.012):
    """Footfall times: a leg with gait phase offset p lands when
    (cycle_pos + p) % 1 == 0, i.e. at cycle_pos = (1 - p) % 1."""
    times = []
    for c in range(cycles):
        for p in leg_phases:
            times.append((c + (1 - p) % 1) * cycle + rng.uniform(-jitter, jitter) * cycle)
    return times


# ---------------------------------------------------------------- footsteps
def insect_tick(rng, bright=1.0):
    body = .35 * burst(.02, 500, 1800, .001, .004, rng)
    body[:int(.012 * SR)] += burst(.012, 1800 * bright, 7500 * bright, .0004, .0018, rng)
    return body


def claw_scrape(rng):
    """Small claws: a crisp tick and a short grainy scrape."""
    n = int(.05 * SR)
    grains = (rng.random(n) < .08) * rng.standard_normal(n)
    scrape = np.convolve(grains, np.hanning(40), 'same')
    scrape = np.fft.irfft(np.fft.rfft(scrape) * band_env(np.fft.rfftfreq(n, 1 / SR), 1500, 6000), n)
    scrape /= np.abs(scrape).max() + 1e-12
    out = .55 * scrape * env_ad(n, .003, .014)
    out[:int(.012 * SR)] += insect_tick(rng)[:int(.012 * SR)] * .8
    return out


def paw_pat(rng, weight=1.0):
    n = int(.07 * SR)
    soft = thump(.07, 190 * (1.3 - .3 * weight), 90, .012 + .01 * weight, rng, noise=.5)
    rustle = burst(.07, 700, 4000, .003, .012, rng)
    return soft[:n] * .8 * weight + rustle[:n] * .35


def shell_tap(rng):
    out = burst(.03, 1200, 5000, .0003, .0025, rng)
    out += .5 * ring(.03, rng.uniform(2300, 3100), .006)
    return out


def bird_step(rng):
    n = int(.06 * SR)
    out = .6 * thump(.06, 160, 90, .012, rng, noise=.6)
    out[:int(.012 * SR)] += insect_tick(rng, .8)[:int(.012 * SR)] * .9
    return out


# ---------------------------------------------------------------- voices
def bird_chirp(rng, f_hi, f_lo, dur):
    return sweep(dur, f_hi, f_lo, (1, .25, .08), .6)


def pigeon_coo(rng):
    """Soft 'coo-roo-coo': low glides with a throaty flutter."""
    parts = []
    for dur, f0, f1, amp in ((.22, 300, 340, .5), (.34, 360, 290, 1.0), (.2, 300, 270, .6)):
        n = int(dur * SR)
        t = np.arange(n) / SR
        x = sweep(dur, f0, f1, (1, .45, .2, .08), .8)
        x *= 1 + .25 * np.sin(2 * np.pi * 28 * t)
        parts.append(x * amp)
        parts.append(np.zeros(int(.05 * SR)))
    return np.concatenate(parts)


def mouse_squeak(rng):
    """Two tiny high squeaks."""
    return np.concatenate([sweep(.06, 6000, 7600, (1, .15), .5), np.zeros(int(.03 * SR)),
                           sweep(.05, 7200, 6300, (1, .15), .5) * .7])


def bubble(rng):
    dur = rng.uniform(.025, .06)
    f0 = rng.uniform(500, 1300)
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 * (1 + 2.5 * t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(n, .002, dur * .35)


def wing_whoosh(rng, dur, lo, hi):
    n = int(dur * SR)
    u = np.arange(n) / n
    shape = np.sin(np.pi * u ** .6) ** 2  # quick rise, longer fall
    return colored(n, lo, hi, rng, 1.5) * shape


# ---------------------------------------------------------------- animals
def lizard(seed):
    # Diagonal pairs land together, twice per cycle (Lizard.glb walk).
    rng = np.random.default_rng(seed)
    cycle, cycles = walk_loop(140)
    L = Loop(cycle * cycles, seed)
    for t in touchdowns(cycle, cycles, [0, .5], rng):
        L.add(claw_scrape(rng), t, 1.0)
        L.add(claw_scrape(rng), t + rng.uniform(.012, .03), .7)
    return L


def crab():
    rng = np.random.default_rng(31)
    cycle, cycles = walk_loop(100)
    L = Loop(cycle * cycles, 31)
    for t in touchdowns(cycle, cycles, [0, .5], rng):
        for k in range(4):  # four legs per set, slightly staggered
            L.add(shell_tap(rng), t + k * rng.uniform(.012, .022), rng.uniform(.55, 1))
    return L


def spider():
    rng = np.random.default_rng(37)
    cycle, cycles = walk_loop(58)
    L = Loop(cycle * cycles, 37)
    for t in touchdowns(cycle, cycles, [0, .5], rng):
        for k in range(4):
            L.add(insect_tick(rng, 1.1), t + k * rng.uniform(.006, .014), rng.uniform(.4, 1))
    return L


def mantis():
    rng = np.random.default_rng(41)
    cycle, cycles = walk_loop(46)
    L = Loop(cycle * cycles, 41)
    for t in touchdowns(cycle, cycles, [0, .5], rng):
        L.add(insect_tick(rng, .8), t, 1)
        L.add(insect_tick(rng, .8), t + rng.uniform(.015, .03), .7)
        L.add(burst(.08, 800, 3500, .02, .025, rng), t, .12)  # leafy body sway rustle
    return L


def ladybug():
    rng = np.random.default_rng(43)
    cycle, cycles = walk_loop(69)
    L = Loop(cycle * cycles, 43)
    for t in touchdowns(cycle, cycles, [0, .5], rng):
        for k in range(3):  # tripod
            L.add(insect_tick(rng, 1.3), t + k * rng.uniform(.004, .009), rng.uniform(.5, 1))
    return L


def squirrel():
    rng = np.random.default_rng(47)
    cycle, cycles = walk_loop(61, 4.2)
    L = Loop(cycle * cycles, 47)
    # Bound: fronts land as a quick pair, hinds as a heavier pair.
    for c in range(cycles):
        t0 = c * cycle
        for p, w in ((0, .7), (.94, .7), (.5, 1.0), (.44, 1.0)):
            L.add(paw_pat(rng, w), t0 + (1 - p) % 1 * cycle, 1)
        L.add(burst(.12, 1500, 7000, .01, .04, rng), t0 + .5 * cycle, .18)  # tail swish
    return L


def fieldmouse():
    rng = np.random.default_rng(53)
    cycle, cycles = walk_loop(30)
    L = Loop(cycle * cycles, 53)
    for i, t in enumerate(touchdowns(cycle, cycles, [0, .25, .5, .75], rng, .04)):
        # hind feet land a little heavier than front feet; irregular scurry
        L.add(paw_pat(rng, .35 if i % 2 else .5), t, rng.uniform(.35, 1))
    L.add(mouse_squeak(rng), L.seconds * .62, .16)
    return L


def pigeon():
    rng = np.random.default_rng(59)
    cycle, cycles = walk_loop(50, 4.2)
    L = Loop(cycle * cycles, 59)
    for t in touchdowns(cycle, cycles, [0, .5], rng):
        L.add(bird_step(rng), t, rng.uniform(.75, 1))
    L.add(pigeon_coo(rng), L.seconds * .3, .22)
    return L


def frog():
    rng = np.random.default_rng(61)
    cycle, cycles = walk_loop(96)
    L = Loop(cycle * cycles, 61)
    for c in range(cycles):
        t0 = c * cycle
        L.add(burst(.07, 250, 1800, .005, .02, rng), t0 + .02 * cycle, .35)  # push-off scuff
        land = t0 + .6 * cycle
        L.add(thump(.12, 150, 70, .03, rng, noise=.4), land, .9)  # body lands
        L.add(burst(.06, 600, 3500, .001, .012, rng), land, .55)  # wet slap
    L.add(sweep(.16, 180, 150, (1, .7, .5, .3, .2), 1.0) * (1 + .6 * np.sign(np.sin(2 * np.pi * 32 * np.arange(int(.16 * SR)) / SR))) * .5,
          L.seconds * .82, .18)  # one quiet throat croak per loop
    return L


def snail():
    # No feet, so no steps to keep in time: a continuous slimy glide hush
    # with slow wet squishes, sticky peels and mucus pops. It plays at a
    # fixed rate (walkSound.fixedRate) because a snail's slow speed would
    # otherwise stretch it to near silence (and drop its pitch in exports).
    rng = np.random.default_rng(97)
    L = Loop(4.0, 97)
    L.bed(colored(L.n, 350, 3200, L.rng) * (.65 + .35 * periodic_lfo(L, 3)), .35)
    for i in range(5):
        t = i * .8 + rng.uniform(-.12, .12)
        L.add(burst(.16, 400, 2800, .04, .05, rng), t, rng.uniform(.6, .9))  # wet squish
        L.add(burst(.04, 2500, 7000, .001, .008, rng), t + .1, .2)  # sticky peel
    for _ in range(9):
        L.add(bubble(rng) * .7, rng.uniform(0, L.seconds), rng.uniform(.2, .45))
    return L


def flap_loop(period, target, seed):
    cycles = max(1, round(target / period))
    return Loop(period * cycles, seed), cycles


def bee():
    L = Loop(4.0, 67)
    t = L.time()
    f0 = 225.0  # whole number of cycles per 4 s loop
    vib = 3.0 * np.sin(2 * np.pi * .5 * t)  # slow pitch drift, periodic
    phase = 2 * np.pi * f0 * t + 2 * np.pi * np.cumsum(vib) / SR
    phase -= (phase[-1] + 2 * np.pi * f0 / SR - 2 * np.pi * f0 * L.seconds) * t / L.seconds  # close the loop exactly
    x = sum(np.sin(k * phase) / k ** 1.15 for k in range(1, 18))
    spec = np.fft.rfft(x) * band_env(np.fft.rfftfreq(L.n, 1 / SR), 150, 3500, 1.2)
    x = np.fft.irfft(spec, L.n)
    x /= np.abs(x).max()
    L.bed(x * (1 + .12 * periodic_lfo(L, 3)), 1)
    L.bed(colored(L.n, 300, 4000, L.rng), .08)
    return L


def butterfly():
    L, cycles = flap_loop(24 / 60, 4.0, 71)
    for c in range(cycles):
        L.add(wing_whoosh(L.rng, .22, 80, 700), c * 24 / 60, L.rng.uniform(.6, 1))
    return L


def cicada():
    L = Loop(6.0, 73)
    t = L.time()
    carrier = colored(L.n, 3800, 7500, L.rng, 3)
    pulses = (np.sin(2 * np.pi * 140 * t) > .3).astype(float)  # tymbal clicks, 140/s
    pulses = np.convolve(pulses, np.hanning(30) / 15, 'same')
    swell = .55 + .45 * (.5 - .5 * np.cos(2 * np.pi * t / L.seconds)) ** 1.5
    L.bed(carrier * pulses * swell, 1)
    whirr = colored(L.n, 120, 900, L.rng) * (1 + .5 * np.sin(2 * np.pi * 25 * t))
    L.bed(whirr, .12)  # wing whirr under the song
    return L


def sparrow():
    period = 16 / 60
    L, cycles = flap_loop(period, 4.0, 79)
    for c in range(cycles):
        L.add(wing_whoosh(L.rng, .16, 400, 3500), c * period, L.rng.uniform(.7, 1))
    for t0 in (.9, 1.05, 2.8):  # 'cheep-cheep ... cheep'
        L.add(bird_chirp(L.rng, 5600, 3600, .07), t0, .5)
    return L


def pigeon_flying():
    period = 24 / 60
    L, cycles = flap_loop(period, 4.0, 83)
    for c in range(cycles):
        t0 = c * period
        L.add(wing_whoosh(L.rng, .3, 200, 1800), t0, L.rng.uniform(.8, 1))
        L.add(wing_whoosh(L.rng, .12, 1500, 6000), t0 + .05, .25)  # feather whistle
    return L


def buzz_bed(L, f0, lo, hi, harmonics=17, drift=3.0):
    """Seamless wing buzz like bee(): a harmonic-rich tone at f0 (Hz, a whole
    number of cycles per loop) with slow periodic pitch drift, band-shaped."""
    t = L.time()
    vib = drift * np.sin(2 * np.pi * t / L.seconds * 2)
    phase = 2 * np.pi * f0 * t + 2 * np.pi * np.cumsum(vib) / SR
    phase -= (phase[-1] + 2 * np.pi * f0 / SR - 2 * np.pi * f0 * L.seconds) * t / L.seconds
    x = sum(np.sin(k * phase) / k ** 1.15 for k in range(1, harmonics + 1))
    spec = np.fft.rfft(x) * band_env(np.fft.rfftfreq(L.n, 1 / SR), lo, hi, 1.2)
    x = np.fft.irfft(spec, L.n)
    return x / np.abs(x).max()


def dragonfly():
    period = 12 / 60
    L, cycles = flap_loop(period, 4.0, 101)
    L.bed(colored(L.n, 60, 600, L.rng) * (1 + .6 * periodic_lfo(L, cycles)), .5)  # papery wing rattle
    for c in range(cycles):
        L.add(wing_whoosh(L.rng, .09, 300, 2500), c * period, L.rng.uniform(.4, .6))
    return L


def moth():
    period = 22 / 60
    L, cycles = flap_loop(period, 4.0, 103)
    for c in range(cycles):
        L.add(wing_whoosh(L.rng, .2, 100, 900), c * period, L.rng.uniform(.6, 1))
        L.add(insect_tick(L.rng, .6), c * period + .17, .15)  # dusty wingtip flick
    return L


def firefly():
    L = Loop(4.0, 107)
    L.bed(buzz_bed(L, 95.0, 80, 1200, drift=2.0), 1)
    L.bed(colored(L.n, 200, 2000, L.rng), .12)
    return L


def housefly():
    L = Loop(4.0, 109)
    x = buzz_bed(L, 190.0, 160, 4500, harmonics=22, drift=8.0)
    L.bed(x * (1 + .35 * periodic_lfo(L, 2)), 1)  # swells as it circles
    L.bed(colored(L.n, 400, 5000, L.rng), .06)
    return L


def ladybug_flying():
    L = Loop(4.0, 113)
    L.bed(buzz_bed(L, 85.0, 70, 1500, drift=2.5), 1)
    L.bed(colored(L.n, 150, 1800, L.rng), .1)
    return L


def hummingbird():
    L = Loop(4.0, 127)
    L.bed(buzz_bed(L, 55.0, 40, 900, harmonics=10, drift=1.5) * (1 + .2 * periodic_lfo(L, 2)), 1)
    for t0 in (.7, .78, 2.6):  # tiny 'tsip' calls
        L.add(bird_chirp(L.rng, 7800, 6200, .04), t0, .35)
    return L


def swallow():
    period = 18 / 60
    L, cycles = flap_loop(period, 4.0, 131)
    for c in range(cycles):
        L.add(wing_whoosh(L.rng, .14, 500, 4000), c * period, L.rng.uniform(.5, .8))
    for i, t0 in enumerate((1.1, 1.18, 1.26, 1.34, 3.0, 3.08)):  # liquid twitter
        L.add(bird_chirp(L.rng, 5200 + 600 * (i % 2), 4200, .05), t0, .45)
    return L


def seagull():
    period = 40 / 60
    L, cycles = flap_loop(period, 4.0, 137)
    for c in range(cycles):
        L.add(wing_whoosh(L.rng, .45, 150, 1400), c * period, L.rng.uniform(.6, .9))
    for t0, dur, f0, f1 in ((1.3, .28, 1500, 1050), (1.65, .22, 1400, 1000), (1.95, .2, 1350, 950)):  # 'kee-ow'
        L.add(sweep(dur, f0, f1, (1, .6, .35, .15), .4), t0, .55)
    return L


def owl():
    period = 32 / 60
    L, cycles = flap_loop(period, 4.0, 139)
    for c in range(cycles):  # soft fringed feathers: a hushed, low swish
        L.add(wing_whoosh(L.rng, .4, 60, 400), c * period, L.rng.uniform(.6, .9))
    return L


def bat():
    period = 20 / 60
    L, cycles = flap_loop(period, 4.0, 149)
    for c in range(cycles):  # leathery flap with a membrane snap
        L.add(wing_whoosh(L.rng, .18, 120, 1600), c * period, L.rng.uniform(.7, 1))
        L.add(burst(.02, 1500, 6000, .001, .004, L.rng), c * period + .15, .25)
    for t0 in np.arange(.2, L.seconds, .55):  # faint high squeaks
        L.add(sweep(.03, 9000, 7000, (1, .1), .5), t0 + L.rng.uniform(0, .1), .12)
    return L


def goldfish():
    period = 36 / 60
    L, cycles = flap_loop(period, 4.8, 89)
    L.bed(colored(L.n, 40, 500, L.rng), .25)  # underwater hush
    for c in range(cycles):
        L.add(wing_whoosh(L.rng, .35, 120, 900), c * period, .45)  # tail swish
    for _ in range(9):
        L.add(bubble(L.rng), L.rng.uniform(0, L.seconds), L.rng.uniform(.25, .6))
    return L


def stingray():
    period = 72 / 60
    L, cycles = flap_loop(period, 4.8, 97)
    L.bed(colored(L.n, 30, 350, L.rng), .3)  # deep underwater hush
    for c in range(cycles):
        L.add(wing_whoosh(L.rng, .8, 70, 450), c * period, .5)  # slow wing ripple
    for _ in range(5):
        L.add(bubble(L.rng), L.rng.uniform(0, L.seconds), L.rng.uniform(.2, .45))
    return L


def seastar():
    # Hundreds of tube feet make no distinct steps: a quiet underwater hush
    # with slow, soft sand shuffles as the arms creep. Fixed rate, like the
    # snail, so a very slow crawl doesn't stretch it to silence.
    rng = np.random.default_rng(101)
    L = Loop(4.0, 101)
    L.bed(colored(L.n, 30, 350, L.rng), .3)
    L.bed(colored(L.n, 900, 4500, L.rng) * (.55 + .45 * periodic_lfo(L, 5)), .12)  # sand grains
    for i in range(5):
        L.add(burst(.35, 500, 3000, .12, .12, rng), i * .8 + rng.uniform(-.1, .1), rng.uniform(.35, .55))
    for _ in range(4):
        L.add(bubble(rng), rng.uniform(0, L.seconds), rng.uniform(.15, .35))
    return L


def jellyfish():
    # One soft, low water push per bell pulse (90 frames at 60 fps) over a
    # deep hush, with a few slow bubbles.
    period = 90 / 60
    L, cycles = flap_loop(period, 4.5, 103)
    L.bed(colored(L.n, 25, 300, L.rng), .3)
    for c in range(cycles):
        L.add(wing_whoosh(L.rng, .5, 50, 320), c * period, .55)
    for _ in range(4):
        L.add(bubble(L.rng), L.rng.uniform(0, L.seconds), L.rng.uniform(.15, .35))
    return L


def sea_urchin():
    # Spines brushing over grit: a quiet hush with faint, dry clicks of spine
    # tips on stone, at a fixed rate like the sea star.
    rng = np.random.default_rng(107)
    L = Loop(4.0, 107)
    L.bed(colored(L.n, 30, 350, L.rng), .3)
    L.bed(colored(L.n, 1200, 6000, L.rng) * (.5 + .5 * periodic_lfo(L, 4)), .08)
    for _ in range(26):
        L.add(burst(.012, 2500, 9000, .0005, .003, rng), rng.uniform(0, L.seconds), rng.uniform(.25, .6))
    for _ in range(3):
        L.add(bubble(rng), rng.uniform(0, L.seconds), rng.uniform(.15, .3))
    return L


def clownfish():
    # Quicker, lighter tail flicks than the goldfish (30-frame beat), with a
    # few small bubbles.
    period = 30 / 60
    L, cycles = flap_loop(period, 4.5, 109)
    L.bed(colored(L.n, 40, 500, L.rng), .25)
    for c in range(cycles):
        L.add(wing_whoosh(L.rng, .25, 160, 1100), c * period, .4)
    for _ in range(10):
        L.add(bubble(L.rng), L.rng.uniform(0, L.seconds), L.rng.uniform(.2, .5))
    return L


def sea_turtle():
    # A big, slow water push on each flipper downstroke (96 frames at 60 fps)
    # and a softer recovery swish, over a deep hush.
    period = 96 / 60
    L, cycles = flap_loop(period, 4.8, 113)
    L.bed(colored(L.n, 25, 320, L.rng), .3)
    for c in range(cycles):
        L.add(wing_whoosh(L.rng, .7, 55, 380), c * period, .6)
        L.add(wing_whoosh(L.rng, .45, 120, 700), c * period + period * .55, .25)
    for _ in range(5):
        L.add(bubble(L.rng), L.rng.uniform(0, L.seconds), L.rng.uniform(.15, .4))
    return L


def seahorse():
    # Nearly silent drifting: a soft hush, a faint fin flutter, and the
    # seahorse's characteristic little head clicks, with a few bubbles.
    period = 120 / 60
    L, cycles = flap_loop(period, 4.0, 127)
    L.bed(colored(L.n, 30, 350, L.rng), .3)
    L.bed(colored(L.n, 300, 1500, L.rng) * (.6 + .4 * periodic_lfo(L, 2 * cycles)), .05)
    for c in range(cycles):
        L.add(burst(.01, 1500, 6000, .0005, .002, L.rng), c * period + L.rng.uniform(.2, 1.6), .5)  # click
    for _ in range(4):
        L.add(bubble(L.rng), L.rng.uniform(0, L.seconds), L.rng.uniform(.15, .35))
    return L


def hermit_crab():
    # Leg taps in time with the four walking legs (stride 45 px), plus the
    # borrowed shell scraping and clacking on the bottom with each rock.
    stride = 45
    cycle, cycles = walk_loop(stride)
    L = Loop(cycle * cycles, 131)
    L.bed(colored(L.n, 30, 350, L.rng), .25)
    for t in touchdowns(cycle, cycles, (0, .5, .5, 0), L.rng):
        L.add(insect_tick(L.rng, .8), t, L.rng.uniform(.4, .65))
    for c in range(cycles):
        L.add(shell_tap(L.rng), c * cycle + cycle * .3, .35)
        L.add(burst(.18, 600, 3500, .03, .06, L.rng), c * cycle + cycle * .55, .25)  # shell drag
    return L


def octopus():
    # A strong water jet as the mantle squeezes (start of each 108-frame
    # cycle), then a soft refill swirl while the arms spread, with bubbles.
    period = 108 / 60
    L, cycles = flap_loop(period, 3.6, 137)
    L.bed(colored(L.n, 25, 320, L.rng), .3)
    for c in range(cycles):
        L.add(wing_whoosh(L.rng, .45, 80, 900), c * period, .7)           # jet
        L.add(wing_whoosh(L.rng, .9, 50, 300), c * period + period * .5, .3)  # refill
        for _ in range(3):
            L.add(bubble(L.rng), c * period + L.rng.uniform(.05, .35), L.rng.uniform(.25, .5))
    return L


def shark():
    # Deep, smooth tail sweeps (72-frame beat): a low push each way, with
    # almost no bubbles; sharks glide quietly.
    period = 72 / 60
    L, cycles = flap_loop(period, 4.8, 149)
    L.bed(colored(L.n, 20, 260, L.rng), .35)
    for c in range(cycles):
        for half in (0, .5):
            L.add(wing_whoosh(L.rng, .55, 45, 400), (c + half) * period, .5)
    for _ in range(2):
        L.add(bubble(L.rng), L.rng.uniform(0, L.seconds), L.rng.uniform(.1, .25))
    return L



def moray_eel():
    # Soft, continuous water swish from the body wave (90-frame cycle), a
    # gentle push each half-wave and the odd bubble.
    period = 90 / 60
    L, cycles = flap_loop(period, 4.5, 211)
    L.bed(colored(L.n, 30, 380, L.rng), .45)
    for c in range(cycles):
        for half in (0, .5):
            L.add(wing_whoosh(L.rng, .6, 60, 520), (c + half) * period, .35)
    for _ in range(3):
        L.add(bubble(L.rng), L.rng.uniform(0, L.seconds), L.rng.uniform(.15, .3))
    return L


def sea_snake():
    # Lighter, quicker-sounding swish than the moray, with the paddle tail's
    # flick at the end of each half-wave.
    period = 90 / 60
    L, cycles = flap_loop(period, 4.5, 223)
    L.bed(colored(L.n, 40, 450, L.rng), .35)
    for c in range(cycles):
        for half in (0, .5):
            L.add(wing_whoosh(L.rng, .45, 90, 700), (c + half) * period, .3)
            L.add(wing_whoosh(L.rng, .15, 200, 1400), (c + half + .3) * period, .15)
    for _ in range(2):
        L.add(bubble(L.rng), L.rng.uniform(0, L.seconds), L.rng.uniform(.1, .25))
    return L


def fish_school():
    # Many small, quick tail flicks overlapping (each fish beats 5-7 times
    # per 2 s), a light water rush from the whole school and lots of tiny
    # bubbles.
    period = 120 / 60
    L, cycles = flap_loop(period, 4.0, 307)
    L.bed(colored(L.n, 60, 900, L.rng), .35)
    for c in range(cycles):
        for _ in range(40):
            L.add(wing_whoosh(L.rng, .12, 300, 2200), c * period + L.rng.uniform(0, period), L.rng.uniform(.08, .2))
    for _ in range(14):
        L.add(bubble(L.rng), L.rng.uniform(0, L.seconds), L.rng.uniform(.15, .35))
    return L


def ant():
    # Tiny, quick tripod ticks: barely-there pitter-patter.
    rng = np.random.default_rng(311)
    cycle, cycles = walk_loop(64)
    L = Loop(cycle * cycles, 311)
    for t in touchdowns(cycle, cycles, [0, .5], rng):
        for k in range(3):
            L.add(insect_tick(rng, 1.5), t + k * rng.uniform(.003, .007), rng.uniform(.35, .7))
    return L


def rhino_beetle():
    # Heavy armoured steps: duller shell taps plus a short claw scrape.
    rng = np.random.default_rng(313)
    cycle, cycles = walk_loop(39)
    L = Loop(cycle * cycles, 313)
    for t in touchdowns(cycle, cycles, [0, .5], rng):
        for k in range(3):
            tap = shell_tap(rng) * .7
            tick = insect_tick(rng, .7)
            tap[:len(tick)] += tick
            L.add(tap, t + k * rng.uniform(.01, .02), rng.uniform(.6, 1))
        L.add(claw_scrape(rng), t + .02, .35)
    return L


def grasshopper():
    # Light ticks, plus a short stridulation chirp (leg rasped on wing) now
    # and then.
    rng = np.random.default_rng(317)
    cycle, cycles = walk_loop(45)
    L = Loop(cycle * cycles, 317)
    for t in touchdowns(cycle, cycles, [0, .5], rng):
        L.add(insect_tick(rng, 1.0), t, 1)
        L.add(insect_tick(rng, 1.0), t + rng.uniform(.01, .025), .6)
    for c in range(0, cycles, 3):
        t0 = c * cycle + .3 * cycle
        for k in range(8):
            L.add(burst(.012, 3500, 9000, .001, .004, rng), t0 + k * .022, .45)
    return L


def caterpillar():
    # No feet to keep time with: a soft leafy hush with gentle squeezes as
    # the body wave passes. Fixed rate like the snail (walkSound.fixedRate).
    rng = np.random.default_rng(331)
    L = Loop(4.0, 331)
    L.bed(colored(L.n, 300, 2600, L.rng) * (.6 + .4 * periodic_lfo(L, 4)), .25)
    for i in range(8):
        t = i * .5 + rng.uniform(-.06, .06)
        L.add(burst(.12, 300, 2000, .03, .04, rng), t, rng.uniform(.5, .8))
        L.add(burst(.03, 2000, 6000, .001, .006, rng), t + .08, .15)
    return L


def wasp():
    # Higher, thinner and more aggressive buzz than the honeybee.
    L = Loop(4.0, 337)
    x = buzz_bed(L, 160.0, 140, 5000, harmonics=20, drift=6.0)
    L.bed(x * (1 + .25 * periodic_lfo(L, 3)), 1)
    L.bed(colored(L.n, 500, 5500, L.rng), .07)
    return L


def tripod_ticks(stride, seed, per_set=3, bright=1.0, gain=(.5, 1.0), extra=None):
    """Generic six-legged walk: a tripod of quick ticks twice per cycle."""
    rng = np.random.default_rng(seed)
    cycle, cycles = walk_loop(stride)
    L = Loop(cycle * cycles, seed)
    for t in touchdowns(cycle, cycles, [0, .5], rng):
        for k in range(per_set):
            L.add(insect_tick(rng, bright), t + k * rng.uniform(.004, .012), rng.uniform(*gain))
        if extra:
            extra(L, rng, t)
    return L


def stag_beetle():
    def scrape(L, rng, t):
        L.add(claw_scrape(rng), t + .015, .3)
    return tripod_ticks(42, 341, bright=.7, gain=(.6, 1), extra=scrape)


def cricket():
    # Ticking steps under a bright, regular chirp (three pulses every second).
    L = tripod_ticks(37, 343, per_set=2, bright=1.0)
    t = 0.0
    while t < L.seconds - .2:
        for k in range(3):
            n = int(.025 * SR)
            L.add(np.sin(2 * np.pi * 4500 * np.arange(n) / SR) * env_ad(n, .003, .008), t + k * .045, .5)
        t += 1.0
    return L


def stick_insect():
    def rustle(L, rng, t):
        L.add(burst(.1, 600, 3000, .02, .03, rng), t, .1)
    return tripod_ticks(34, 347, per_set=2, bright=.7, gain=(.3, .6), extra=rustle)


def scarab():
    return tripod_ticks(62, 349, bright=1.2, gain=(.5, .9))


def centipede():
    # Dozens of feet: a dense, even patter instead of distinct sets.
    rng = np.random.default_rng(353)
    cycle, cycles = walk_loop(17, 4.0)
    L = Loop(cycle * cycles, 353)
    for _ in range(int(L.seconds * 70)):
        L.add(insect_tick(rng, 1.4), rng.uniform(0, L.seconds), rng.uniform(.2, .55))
    L.bed(colored(L.n, 1500, 6000, L.rng), .04)
    return L


def pill_bug():
    rng = np.random.default_rng(359)
    cycle, cycles = walk_loop(34)
    L = Loop(cycle * cycles, 359)
    for c in range(cycles):
        for k in range(14):
            L.add(insect_tick(rng, .9), (c + k / 14 + rng.uniform(-.01, .01)) * cycle, rng.uniform(.25, .5))
    return L


def shield_bug():
    return tripod_ticks(58, 367, bright=.9, gain=(.45, .85))


def mosquito():
    # The thin high whine, swelling and fading as it circles.
    L = Loop(4.0, 373)
    x = buzz_bed(L, 520.0, 400, 7000, harmonics=12, drift=14.0)
    L.bed(x * (.75 + .25 * periodic_lfo(L, 2)), 1)
    return L


def bumblebee():
    # Deep, round, lazy drone.
    L = Loop(4.0, 379)
    L.bed(buzz_bed(L, 130.0, 90, 2500, harmonics=18, drift=4.0) * (1 + .15 * periodic_lfo(L, 2)), 1)
    L.bed(colored(L.n, 150, 1500, L.rng), .06)
    return L


def damselfly():
    period = 14 / 60
    L, cycles = flap_loop(period, 4.0, 383)
    L.bed(colored(L.n, 80, 700, L.rng) * (1 + .5 * periodic_lfo(L, cycles)), .3)
    for c in range(cycles):
        L.add(wing_whoosh(L.rng, .1, 400, 2800), c * period, L.rng.uniform(.3, .5))
    return L


def rhino_beetle_flying():
    # Heavy, low clattering hum of a big beetle.
    L = Loop(4.0, 389)
    L.bed(buzz_bed(L, 70.0, 55, 1400, harmonics=14, drift=2.0), 1)
    L.bed(colored(L.n, 100, 1500, L.rng) * (1 + .4 * periodic_lfo(L, 24)), .15)
    return L


def swallowtail():
    period = 30 / 60
    L, cycles = flap_loop(period, 4.0, 397)
    for c in range(cycles):
        L.add(wing_whoosh(L.rng, .26, 70, 600), c * period, L.rng.uniform(.6, 1))
    return L


def locust_flying():
    # Papery wing clatter at the beat.
    period = 10 / 60
    L, cycles = flap_loop(period, 4.0, 401)
    L.bed(colored(L.n, 300, 3500, L.rng) * (1 + .7 * periodic_lfo(L, cycles)), .35)
    for c in range(cycles):
        L.add(wing_whoosh(L.rng, .07, 600, 4000), c * period, L.rng.uniform(.4, .6))
    return L


def lacewing():
    period = 20 / 60
    L, cycles = flap_loop(period, 4.0, 409)
    for c in range(cycles):
        L.add(wing_whoosh(L.rng, .16, 150, 1500), c * period, L.rng.uniform(.5, .8))
    return L


def chipmunk():
    rng = np.random.default_rng(41)
    cycle, cycles = walk_loop(59, 4.2)
    L = Loop(cycle * cycles, 41)
    # Bound like the squirrel, but lighter and quicker, with a 'chip' call.
    for c in range(cycles):
        t0 = c * cycle
        for p, w in ((0, .5), (.94, .5), (.5, .75), (.44, .75)):
            L.add(paw_pat(rng, w), t0 + (1 - p) % 1 * cycle, 1)
    for t0 in (L.seconds * .3, L.seconds * .36):
        L.add(bird_chirp(rng, 4200, 3000, .04), t0, .2)
    return L


def hedgehog():
    rng = np.random.default_rng(43)
    cycle, cycles = walk_loop(47)
    L = Loop(cycle * cycles, 43)
    # Trot: diagonal pairs land together; spines rustle on each step and
    # the nose snuffles now and then.
    for t in touchdowns(cycle, cycles, [0, .5], rng):
        L.add(paw_pat(rng, .55), t, rng.uniform(.6, 1))
        L.add(burst(.06, 2500, 9000, .005, .03, rng), t + .01, .18)
    for t0 in (L.seconds * .25, L.seconds * .7):
        for k in range(3):
            L.add(burst(.04, 800, 4000, .004, .02, rng), t0 + k * .07, .35)
    return L


def skink():
    # Light, quick claw scrapes; diagonal pairs land together (build-skink).
    rng = np.random.default_rng(61)
    cycle, cycles = walk_loop(45)
    L = Loop(cycle * cycles, 61)
    for t in touchdowns(cycle, cycles, [0, .5], rng):
        L.add(claw_scrape(rng), t, .8)
        L.add(claw_scrape(rng), t + rng.uniform(.01, .025), .5)
    return L


def robin():
    period = 16 / 60
    L, cycles = flap_loop(period, 4.0, 47)
    for c in range(cycles):
        L.add(wing_whoosh(L.rng, .16, 400, 3500), c * period, L.rng.uniform(.7, 1))
    # A short warbling phrase: falling, then rising notes.
    for t0, hi, lo in ((.6, 6200, 4200), (.72, 4800, 5600), (.84, 6800, 5000), (2.5, 5600, 4000)):
        L.add(bird_chirp(L.rng, hi, lo, .08), t0, .45)
    return L


def koi():
    period = 48 / 60
    L, cycles = flap_loop(period, 4.8, 53)
    L.bed(colored(L.n, 40, 450, L.rng), .3)  # underwater hush
    for c in range(cycles):
        L.add(wing_whoosh(L.rng, .45, 100, 700), c * period, .5)  # slow tail sweep
    for _ in range(6):
        L.add(bubble(L.rng), L.rng.uniform(0, L.seconds), L.rng.uniform(.25, .55))
    return L


def tadpoles():
    # Many tiny, quick wriggles (each tadpole beats 6-10 times per 2 s).
    period = 120 / 60
    L, cycles = flap_loop(period, 4.0, 59)
    L.bed(colored(L.n, 60, 700, L.rng), .3)
    for c in range(cycles):
        for _ in range(28):
            L.add(wing_whoosh(L.rng, .08, 500, 3000), c * period + L.rng.uniform(0, period), L.rng.uniform(.06, .16))
    for _ in range(10):
        L.add(bubble(L.rng), L.rng.uniform(0, L.seconds), L.rng.uniform(.12, .3))
    return L

# Output file, generator, and loudness target (RMS dBFS before the limiter's
# ~+3 dB): quiet for small insects, louder for birds, frog and buzzing wings.
SOUNDS = {
    'lizard':        ('lizard-walk.wav',        lambda: lizard(29),   ('rms', -33)),
    'crab':          ('crab-walk.wav',          crab,                 ('rms', -31)),
    'spider':        ('spider-walk.wav',        spider,               ('rms', -37)),
    'mantis':        ('mantis-walk.wav',        mantis,               ('rms', -37)),
    'ladybug':       ('ladybug-walk.wav',       ladybug,              ('rms', -38)),
    'squirrel':      ('squirrel-walk.wav',      squirrel,             ('rms', -30)),
    'fieldmouse':    ('fieldmouse-walk.wav',    fieldmouse,           ('rms', -32)),
    'pigeon':        ('pigeon-walk.wav',        pigeon,               ('rms', -30)),
    'frog':          ('frog-hop.wav',           frog,                 ('rms', -28)),
    'bee':           ('bee-fly.wav',            bee,                  ('rms', -28)),
    'butterfly':     ('butterfly-fly.wav',      butterfly,            ('rms', -36)),
    'cicada':        ('cicada-fly.wav',         cicada,               ('rms', -28)),
    'sparrow':       ('sparrow-fly.wav',        sparrow,              ('rms', -29)),
    'pigeon-flying': ('pigeon-fly.wav',         pigeon_flying,        ('rms', -28)),
    'dragonfly':     ('dragonfly-fly.wav',      dragonfly,            ('rms', -33)),
    'moth':          ('moth-fly.wav',           moth,                 ('rms', -37)),
    'firefly':       ('firefly-fly.wav',        firefly,              ('rms', -34)),
    'housefly':      ('housefly-fly.wav',       housefly,             ('rms', -29)),
    'ladybug-flying': ('ladybug-flying-fly.wav', ladybug_flying,      ('rms', -34)),
    'hummingbird':   ('hummingbird-fly.wav',    hummingbird,          ('rms', -30)),
    'swallow':       ('swallow-fly.wav',        swallow,              ('rms', -30)),
    'seagull':       ('seagull-fly.wav',        seagull,              ('rms', -28)),
    'owl':           ('owl-fly.wav',            owl,                  ('rms', -36)),
    'bat':           ('bat-fly.wav',            bat,                  ('rms', -31)),
    'goldfish':      ('goldfish-swim.wav',      goldfish,             ('rms', -33)),
    'snail':         ('snail-walk.wav',         snail,                ('rms', -30)),
    'stingray':      ('stingray-swim.wav',      stingray,             ('rms', -34)),
    'seastar':       ('seastar-crawl.wav',      seastar,              ('rms', -36)),
    'jellyfish':     ('jellyfish-swim.wav',     jellyfish,            ('rms', -35)),
    'sea-urchin':    ('sea-urchin-crawl.wav',   sea_urchin,           ('rms', -37)),
    'clownfish':     ('clownfish-swim.wav',     clownfish,            ('rms', -33)),
    'sea-turtle':    ('sea-turtle-swim.wav',    sea_turtle,           ('rms', -32)),
    'seahorse':      ('seahorse-swim.wav',      seahorse,             ('rms', -37)),
    'hermit-crab':   ('hermit-crab-walk.wav',   hermit_crab,          ('rms', -33)),
    'octopus':       ('octopus-swim.wav',       octopus,              ('rms', -32)),
    'shark':         ('shark-swim.wav',         shark,                ('rms', -31)),
    'moray-eel':     ('moray-eel-swim.wav',     moray_eel,            ('rms', -33)),
    'sea-snake':     ('sea-snake-swim.wav',     sea_snake,            ('rms', -34)),
    'fish-school':   ('fish-school-swim.wav',   fish_school,          ('rms', -33)),
    'ant':           ('ant-walk.wav',           ant,                  ('rms', -40)),
    'rhino-beetle':  ('rhino-beetle-walk.wav',  rhino_beetle,         ('rms', -34)),
    'grasshopper':   ('grasshopper-walk.wav',   grasshopper,          ('rms', -36)),
    'caterpillar':   ('caterpillar-walk.wav',   caterpillar,          ('rms', -36)),
    'wasp':          ('wasp-fly.wav',           wasp,                 ('rms', -29)),
    'stag-beetle':   ('stag-beetle-walk.wav',   stag_beetle,          ('rms', -34)),
    'cricket':       ('cricket-walk.wav',       cricket,              ('rms', -33)),
    'stick-insect':  ('stick-insect-walk.wav',  stick_insect,         ('rms', -39)),
    'scarab':        ('scarab-walk.wav',        scarab,               ('rms', -37)),
    'centipede':     ('centipede-walk.wav',     centipede,            ('rms', -36)),
    'pill-bug':      ('pill-bug-walk.wav',      pill_bug,             ('rms', -39)),
    'shield-bug':    ('shield-bug-walk.wav',    shield_bug,           ('rms', -38)),
    'mosquito':      ('mosquito-fly.wav',       mosquito,             ('rms', -31)),
    'bumblebee':     ('bumblebee-fly.wav',      bumblebee,            ('rms', -28)),
    'damselfly':     ('damselfly-fly.wav',      damselfly,            ('rms', -35)),
    'rhino-beetle-flying': ('rhino-beetle-flying-fly.wav', rhino_beetle_flying, ('rms', -30)),
    'swallowtail':   ('swallowtail-fly.wav',    swallowtail,          ('rms', -36)),
    'locust-flying': ('locust-flying-fly.wav',  locust_flying,        ('rms', -32)),
    'lacewing':      ('lacewing-fly.wav',       lacewing,             ('rms', -38)),
    'chipmunk':      ('chipmunk-walk.wav',      chipmunk,             ('rms', -31)),
    'hedgehog':      ('hedgehog-walk.wav',      hedgehog,             ('rms', -32)),
    'skink':         ('skink-walk.wav',         skink,                ('rms', -34)),
    'robin':         ('robin-fly.wav',          robin,                ('rms', -29)),
    'koi':           ('koi-swim.wav',           koi,                  ('rms', -33)),
    'tadpoles':      ('tadpoles-swim.wav',      tadpoles,             ('rms', -35)),
}


def finish(x, target):
    kind, db = target
    level = np.abs(x).max() if kind == 'peak' else np.sqrt(np.mean(x ** 2))
    x = x * (10 ** (db / 20) / (level + 1e-12))
    return np.tanh(x * 1.2) / np.tanh(1.2)  # gentle limiter, never clips


def write_wav(path, x):
    pcm = np.clip(np.round(x * 32767), -32768, 32767).astype('<i2')
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == '__main__':
    wanted = sys.argv[1:] or list(SOUNDS)
    for key in wanted:
        name, make, target = SOUNDS[key]
        loop = make()
        x = finish(loop.buf, target)
        write_wav(OUT / name, x)
        print(f'{name:22} {loop.seconds:5.2f}s  peak {20 * np.log10(np.abs(x).max()):6.1f} dB  '
              f'rms {20 * np.log10(np.sqrt(np.mean(x ** 2))):6.1f} dB')
