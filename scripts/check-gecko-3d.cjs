const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
app.commandLine.appendSwitch('no-sandbox');
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1440, height: 1000, show: true, webPreferences: { contextIsolation: true, backgroundThrottling: false } });
  const errors = [];
  win.webContents.on('console-message', (_, level, text) => { if (level >= 3) errors.push(text); });
  try {
    await win.loadURL('http://localhost:5173/gecko-3d.html?model=gecko');
    const result = await win.webContents.executeJavaScript(`(async () => {
      const g = await window.geckoPreview.ready;
      const api = window.geckoPreview;
      document.getElementById('play').click();
      const foot = api.model.getObjectByName('front_L_foot');
      function sampleFoot(time) {
        api.mixer.setTime(time); api.model.updateMatrixWorld(true);
        return foot.getWorldPosition(api.model.position.clone());
      }
      const start = sampleFoot(.10), end = sampleFoot(.30);
      const expectedTravel = .36 / (.625*g.animations[0].duration) * .20;
      if(Math.abs(end.y-start.y) > .002 || Math.abs((end.z-start.z)-expectedTravel) > .003) throw new Error('Foot stance should stay level and push backward: '+JSON.stringify({start,end,expectedTravel}));
      const lifted = sampleFoot(g.animations[0].duration*.8125);
      if(lifted.y < start.y+.06) throw new Error('Foot does not clear the ground during swing');
      const pose = document.getElementById('pose');
      pose.value = 150; pose.dispatchEvent(new Event('input'));
      api.model.updateMatrixWorld(true);
      const leg = api.model.getObjectByName('front_L');
      const before = leg.quaternion.toArray();
      pose.value = 650; pose.dispatchEvent(new Event('input'));
      const after = leg.quaternion.toArray();
      if (before.every((v,i) => Math.abs(v-after[i]) < 0.0001)) throw new Error('Leg does not animate');
      document.getElementById('top').click();
      document.getElementById('reset').click();
      const mode = document.getElementById('mode');
      mode.value = 'target'; mode.dispatchEvent(new Event('change'));
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const canvas = document.getElementById('viewport');
      const rect=canvas.getBoundingClientRect(), cx=rect.width*.4, cy=rect.height*.6;
      canvas.dispatchEvent(new PointerEvent('pointerdown', {clientX:cx,clientY:cy,pointerId:1}));
      canvas.dispatchEvent(new PointerEvent('pointerup', {clientX:cx,clientY:cy,pointerId:1}));
      for(let i=0;i<15;i++) await new Promise(resolve => requestAnimationFrame(resolve));
      if(api.model.position.length() < .01) throw new Error('Click to walk did not move the model: '+JSON.stringify({position:api.model.position.toArray(),mode:mode.value,status:document.getElementById('status').textContent}));
      document.getElementById('reset').click();
      return { clips:g.animations.length, duration:g.animations[0].duration, animatedLeg:true, groundedStance:true, forwardReach:true, clickToWalk:true, status:document.getElementById('status').textContent };
    })()`);
    await win.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    await new Promise(resolve => setTimeout(resolve, 800));
    const shot = await win.webContents.capturePage();
    fs.writeFileSync(path.join(__dirname, '../assets/models/preview.png'), shot.toPNG());
    await win.webContents.executeJavaScript(`(async () => {
      document.getElementById('play').click();
      const api=window.geckoPreview;
      api.controls.target.set(0,.3,-1.12);
      api.camera.position.set(1.25,1.15,-2.6);
      api.controls.minDistance=.5;
      api.controls.update();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    })()`);
    fs.writeFileSync(path.join(__dirname, '../assets/models/head-preview.png'), (await win.webContents.capturePage()).toPNG());
    if(errors.length) throw new Error(errors.join('\n'));
    console.log(JSON.stringify(result));
    app.exit(0);
  } catch (e) { console.error(e); app.exit(1); }
});
