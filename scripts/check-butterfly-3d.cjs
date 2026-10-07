const {app,BrowserWindow}=require('electron');const fs=require('fs');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1200,height:800,webPreferences:{offscreen:true,backgroundThrottling:false}});const errors=[];
 win.webContents.on('console-message',(_,level,msg)=>{if(level>=3)errors.push(msg)});
 try{
 const serverModule=process.argv.includes('--packaged')
  ? '../dist/win-unpacked/resources/app.asar/server.js' : '../server.js';
 const server=await require(serverModule).start(0);
 await win.loadURL('http://127.0.0.1:'+server.address().port+'/');
 const result=await win.webContents.executeJavaScript(`(async()=>{
 const {loadAnimal3D}=await import('./animal-3d.js');
 const config=await fetch('/api/config').then(r=>r.json());const def=config.animals.find(a=>a.id==='butterfly');
 const bee=await loadAnimal3D(def.model3d,null,def);
 const wings=[];bee.model.traverse(o=>{if(/^(fore|hind)_wing_/.test(o.name))wings.push(o)});
 if(wings.length!==4)throw Error('Expected four articulated wings: '+wings.map(w=>w.name));
 bee.render(0,0);const first=wings.map(w=>w.quaternion.clone());
 bee.render(0,.05);if(wings.some((w,i)=>w.quaternion.angleTo(first[i])<.1))throw Error('Not all wings animate');
 bee.render(0,.4);if(wings.some((w,i)=>w.quaternion.angleTo(first[i])>.001))throw Error('Flight loop seam');
 bee.render(0,.025);const image=bee.canvas.toDataURL().split(',')[1];
 for(let i=0;i<200&&!window.__ready;i++)await new Promise(r=>setTimeout(r,50));
 const select=document.getElementById('sceneSelect');select.value='garden-with-pond-test';select.dispatchEvent(new Event('change'));
 await new Promise(r=>setTimeout(r,1500));
 const row=[...document.querySelectorAll('.animal-row')].find(r=>r.querySelector('.name').textContent==='3D 蝴蝶');
 if(!row)throw Error('Bee missing in selector');
 const checkbox=row.querySelector('input');if(checkbox.disabled)throw Error('Default scene has no air habitat');if(!checkbox.checked)row.querySelector('.name').click();
 for(let i=0;i<200&&!AnimEngine.actorHasWalkFrames('butterfly');i++)await new Promise(r=>setTimeout(r,50));
 if(!AnimEngine.actorHasWalkFrames('butterfly'))throw Error('Bee did not activate');
 const stage=document.getElementById('stage'),rect=stage.getBoundingClientRect();
 stage.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,clientX:rect.left+rect.width*.4,clientY:rect.top+rect.height*.1}));window.dispatchEvent(new MouseEvent('mouseup'));
 if(!AnimEngine.getActorPath('butterfly').length)throw Error('Bee placement failed');
 AnimEngine.setActorPath('butterfly',[{x:500,y:100}]);AnimEngine.renderFrame(0);const hoverA=stage.toDataURL();
 AnimEngine.renderFrame(50);if(hoverA===stage.toDataURL())throw Error('Hover wings did not animate');
 return {image,wings:wings.length,flight:true,loop:true,placement:true};
 })()`);
 fs.writeFileSync(require('path').join(__dirname,'../assets/models/butterfly-preview.png'),Buffer.from(result.image,'base64'));
 if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify({wings:result.wings,flight:result.flight,loop:result.loop,placement:result.placement,packaged:process.argv.includes('--packaged')}));app.exit(0);
 }catch(e){console.error(e);app.exit(1)}
});
