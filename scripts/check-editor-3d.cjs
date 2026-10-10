const {app,BrowserWindow}=require('electron');
const fs=require('fs');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1600,height:1100,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const errors=[]; win.webContents.on('console-message',(_,l,m)=>{if(l>=3)errors.push(m)});
 try {
 await win.loadURL('http://localhost:5173/' + (process.argv.includes('--export-mode') ? '?export=1' : ''));
 const result=await win.webContents.executeJavaScript(`(async()=>{
  for(let i=0;i<200&&!window.__ready;i++)await new Promise(r=>setTimeout(r,100));
  if(!window.__ready)throw Error('Editor not ready');
  const row=[...document.querySelectorAll('.animal-row')].find(r=>r.textContent.includes('3D 黃蜥蝪'));
  if(!row)throw Error('3D animal missing from selector');
  const checkbox=row.querySelector('input'); if(!checkbox.checked)checkbox.click();
  for(let i=0;i<200&&!AnimEngine.actorHasWalkFrames('lizard-yellow');i++)await new Promise(r=>setTimeout(r,50));
  if(!AnimEngine.actorHasWalkFrames('lizard-yellow'))throw Error('3D model did not load');
  const {loadAnimal3D}=await import('./animal-3d.js');
  const model=await loadAnimal3D('model/Lizard.glb');
  model.render(.1); const poseA=model.canvas.toDataURL();
  model.render(.6); if(poseA===model.canvas.toDataURL())throw Error('GLB gait did not animate');
  model.render(.1); if(poseA!==model.canvas.toDataURL())throw Error('GLB pose not deterministic');
  model.dispose();
  const id='lizard-yellow';
  for(const other of AnimEngine.getActorIds())if(other!==id)AnimEngine.removeActor(other);
  AnimEngine.setActorPath(id,[{x:500,y:450,durationToNextMs:2000},{x:1000,y:450,durationToNextMs:0}]);
  AnimEngine.setActorStartAtMs(id,0); AnimEngine.setActorOptions(id,{sizeScale:1,useWalkCycle:true});
  const canvas=document.querySelector('canvas');
  AnimEngine.renderFrame(500); const first=canvas.toDataURL();
  AnimEngine.renderFrame(1100); const second=canvas.toDataURL();
  if(first===second)throw Error('Timeline did not change rendered frame');
  AnimEngine.renderFrame(500); if(first!==canvas.toDataURL())throw Error('Rendering is not deterministic');
  AnimEngine.renderFrame(1100);
  return {selector:true,loaded:true,moving:true,deterministic:true};
 })()`);
 fs.writeFileSync('assets/models/editor-3d-preview.png',(await win.webContents.capturePage()).toPNG());
 if(errors.length)throw Error(errors.join('\n'));
 console.log(JSON.stringify(result));app.exit(0);
 }catch(e){console.error(e);app.exit(1)}
});
