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


def goldfish():
    period = 36 / 60
    L, cycles = flap_loop(period, 4.8, 89)
    L.bed(colored(L.n, 40, 500, L.rng), .25)  # underwater hush
    for c in range(cycles):
        L.add(wing_whoosh(L.rng, .35, 120, 900), c * period, .45)  # tail swish
    for _ in range(9):
        L.add(bubble(L.rng), L.rng.uniform(0, L.seconds), L.rng.uniform(.25, .6))
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
    'goldfish':      ('goldfish-swim.wav',      goldfish,             ('rms', -33)),
    'snail':         ('snail-walk.wav',         snail,                ('rms', -30)),
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
