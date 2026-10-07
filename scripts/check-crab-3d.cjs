const {app,BrowserWindow}=require('electron');const fs=require('fs');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1200,height:800,webPreferences:{offscreen:true,backgroundThrottling:false}});const errors=[];
 win.webContents.on('console-message',(_,level,msg)=>{if(level>=3)errors.push(msg)});
 try{
 const server=await require(process.argv.includes('--packaged')?'../dist/win-unpacked/resources/app.asar/server.js':'../server.js').start(0);
 await win.loadURL('http://127.0.0.1:'+server.address().port+'/');
 const result=await win.webContents.executeJavaScript(`(async()=>{
 const {loadAnimal3D}=await import('./animal-3d.js');
 const config=await fetch('/api/config').then(r=>r.json()),def=config.animals.find(a=>a.id==='crab');
 if(def.rotationFollowsPath!==false)throw Error('Crab must preserve sideways facing');
 const crab=await loadAnimal3D(def.model3d,null,def),legs=[];
 crab.model.traverse(o=>{if(/^leg_.*_0$/.test(o.name))legs.push(o)});
 if(legs.length!==8)throw Error('Expected 8 articulated legs, got '+legs.length);
 crab.render(0);const first=legs.map(o=>o.quaternion.clone());const initial=crab.canvas.toDataURL();
 crab.render(.25);if(legs.some((o,i)=>o.quaternion.angleTo(first[i])<.01))throw Error('A leg did not animate');
 crab.render(1);if(legs.some((o,i)=>o.quaternion.angleTo(first[i])>.001))throw Error('Walk loop seam');
 crab.render(0);if(crab.canvas.toDataURL()!==initial)throw Error('Non-deterministic pose');
 crab.render(.125);const image=crab.canvas.toDataURL().split(',')[1];crab.dispose();
 for(let i=0;i<200&&!window.__ready;i++)await new Promise(r=>setTimeout(r,50));
 const select=document.getElementById('sceneSelect');select.value='garden-with-pond-test';select.dispatchEvent(new Event('change'));
 await new Promise(r=>setTimeout(r,1500));
 const row=[...document.querySelectorAll('.animal-row')].find(r=>r.querySelector('.name').textContent===def.label);
 if(!row)throw Error('Crab missing in selector');if(row.querySelector('input').disabled)throw Error('Ground placement unavailable');row.querySelector('.name').click();
 for(let i=0;i<200&&!AnimEngine.actorHasWalkFrames('crab');i++)await new Promise(r=>setTimeout(r,50));
 if(!AnimEngine.actorHasWalkFrames('crab'))throw Error('Crab failed to activate');
 const stage=document.getElementById('stage'),rect=stage.getBoundingClientRect();
 stage.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,clientX:rect.left+rect.width*.4,clientY:rect.top+rect.height*.4}));window.dispatchEvent(new MouseEvent('mouseup'));
 if(!AnimEngine.getActorPath('crab').length)throw Error('Placement failed');
 for(const id of AnimEngine.getActorIds())if(id!=='crab')AnimEngine.removeActor(id);
 AnimEngine.clearScrollLayers();
 AnimEngine.setActorPath('crab',[{x:400,y:350,durationToNextMs:2000},{x:1000,y:350}]);AnimEngine.setActorStartAtMs('crab',0);
 AnimEngine.renderFrame(250);const a=stage.toDataURL();AnimEngine.renderFrame(900);if(stage.toDataURL()===a)throw Error('Timeline did not move');
 AnimEngine.renderFrame(250);if(stage.toDataURL()!==a)throw Error('Timeline not deterministic');
 return {image,legs:legs.length,walk:true,loop:true,placement:true,deterministic:true};
 })()`);
 fs.writeFileSync('assets/models/crab-preview.png',Buffer.from(result.image,'base64'));delete result.image;
 if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify({...result,packaged:process.argv.includes('--packaged')}));app.exit(0);
 }catch(e){console.error(e);app.exit(1)}
});
