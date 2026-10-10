const {app,BrowserWindow}=require('electron');const fs=require('fs');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1200,height:600,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const errors=[];win.webContents.on('console-message',(_,level,text)=>{if(level>=3)errors.push(text)});
 try{
 await win.loadURL('http://localhost:5173/');
 const result=await win.webContents.executeJavaScript(`(async()=>{
 for(let i=0;i<200&&!window.__ready;i++)await new Promise(r=>setTimeout(r,100));
 const {loadAnimal3D}=await import('./animal-3d.js');
 const config=await fetch('/api/config').then(r=>r.json());
 const results=[];const board=document.createElement('canvas');board.width=1200;board.height=450;const ctx=board.getContext('2d');ctx.fillStyle='#eee';ctx.fillRect(0,0,1200,450);
 for(const [index,id] of ['lizard-yellow','green','red'].entries()){
 const def=config.animals.find(a=>a.id===id);if(!def.model3d)throw Error('Not a 3D animal: '+id);
 const model=await loadAnimal3D(def.model3d,def.modelColor);model.render(.2);
 const pixels=document.createElement('canvas');pixels.width=pixels.height=768;const c=pixels.getContext('2d');c.drawImage(model.canvas,0,0);const data=c.getImageData(0,0,768,768).data;
 let sums=[0,0,0],count=0;for(let i=0;i<data.length;i+=4){if(data[i+3]>240){count++;for(let j=0;j<3;j++)sums[j]+=data[i+j]}}
 const mean=sums.map(v=>v/count);if(!count)throw Error('Invisible '+id);
 if(id==='green'&&mean[1]<mean[0]*1.2)throw Error('Green tint missing');
 if(id==='red'&&mean[0]<mean[1]*1.2)throw Error('Red tint missing');
 ctx.drawImage(model.canvas,index*400,30,400,400);ctx.fillStyle='#222';ctx.font='22px sans-serif';ctx.fillText(def.label,index*400+100,35);
 const bone=model.model.getObjectByName('sh_l_upper');const before=bone.quaternion.clone();model.render(.6);if(before.angleTo(bone.quaternion)<.001)throw Error('Not animated: '+id);
 results.push({id,mean,animated:true});model.dispose();
 }
 return {results,image:board.toDataURL().split(',')[1]};
 })()`);
 fs.writeFileSync('assets/models/color-variants-preview.png',Buffer.from(result.image,'base64'));if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify(result.results));app.exit(0);
 }catch(e){console.error(e);app.exit(1)}
});
