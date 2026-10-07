const { app, BrowserWindow } = require('electron');
const fs = require('fs');
app.whenReady().then(async () => {
  const win = new BrowserWindow({width:1440,height:1000,show:false,webPreferences:{backgroundThrottling:false,offscreen:true}});
  const errors=[];
  win.webContents.on('console-message',(_,level,message)=>{if(level>=3) errors.push(message)});
  try {
    await win.loadURL('http://localhost:5173/gecko-3d.html');
    const result=await win.webContents.executeJavaScript(`(async()=>{
      const g=await geckoPreview.ready, a=geckoPreview;
      const wait=()=>new Promise(r=>setTimeout(r,500));
      const before=a.model.position.clone(); const bone=a.model.getObjectByName('sh_l_upper');
      const q=bone.quaternion.clone(); await wait();
      if(a.model.position.distanceTo(before)<.05) throw Error('Automatic movement failed');
      if(q.angleTo(bone.quaternion)<.001) throw Error('Walk animation failed');
      document.getElementById('play').click(); const paused=a.model.position.clone(); await wait();
      if(a.model.position.distanceTo(paused)>0.0001) throw Error('Pause failed');
      const mode=document.getElementById('mode'); mode.value='target'; mode.dispatchEvent(new Event('change'));
      const canvas=document.getElementById('viewport');
      for(const type of ['pointerdown','pointerup']) canvas.dispatchEvent(new PointerEvent(type,{clientX:550,clientY:600,pointerId:1}));
      await wait(); if(a.model.position.distanceTo(paused)<.02) throw Error('Click to walk failed');
      document.getElementById('reset').click(); document.getElementById('play').click();
      a.model.updateMatrixWorld(true);
      const nose=a.model.getObjectByName('nose').getWorldPosition(a.model.position.clone());
      const tail=a.model.getObjectByName('tail1').getWorldPosition(a.model.position.clone());
      if(nose.z>=tail.z) throw Error('Heading alignment failed '+JSON.stringify({nose,tail,rotation:a.model.rotation.y}));
      return {clip:g.animations[0].name,automaticMovement:true,animatedLeg:true,pause:true,clickToWalk:true,heading:true};
    })()`);
    await new Promise(r=>setTimeout(r,200));
    fs.writeFileSync('assets/models/lizard-preview.png',(await win.webContents.capturePage()).toPNG());
    if(errors.length) throw Error(errors.join('\n'));
    console.log(JSON.stringify(result)); app.exit(0);
  } catch(e) {console.error(e);app.exit(1)}
});



