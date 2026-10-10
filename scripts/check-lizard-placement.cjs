const {app,BrowserWindow}=require('electron');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1600,height:1100,webPreferences:{offscreen:true,backgroundThrottling:false}});
 win.webContents.on('console-message',(_,level,message)=>{if(level>=2)console.error(message)});
 try{
 let url=process.env.PLACEMENT_TEST_URL || 'http://localhost:5173/';
 if(process.argv.includes('--packaged')) {
   const server=await require('../dist/win-unpacked/resources/app.asar/server.js').start(0,{pathsDir:require('path').join(require('fs').mkdtempSync(require('path').join(require('os').tmpdir(),'lizard-placement-')),'paths')});
   url='http://localhost:'+server.address().port+'/';
 }
 await win.loadURL(url);
 console.log(await win.webContents.executeJavaScript(`(async()=>{
 const wait=()=>new Promise(r=>setTimeout(r,100));
 for(let i=0;i<200&&!window.__ready;i++)await wait();
 if(!window.__ready)throw Error('Editor did not initialize');
 const row=id=>[...document.querySelectorAll('.animal-row')].find(r=>r.querySelector('.name').textContent.includes(id));
 document.querySelector('[data-tab="animals"]').click();
 const lizard=()=>row('3D 黃蜥蝪').querySelector('input[type=checkbox]');
 if(lizard().checked){lizard().click();await wait();}
 const other=[...document.querySelectorAll('.animal-row')].find(r=>!r.textContent.includes('3D 黃蜥蝪')&&!r.querySelector('input').disabled);
 if(!other.querySelector('input').checked)other.querySelector('input').click();
 await wait();
 [...document.querySelectorAll('.animal-row')].find(r=>r.querySelector('.name').textContent===other.querySelector('.name').textContent).click();
 lizard().click();
 for(let i=0;i<200&&!AnimEngine.actorHasWalkFrames('lizard-yellow');i++)await wait();
 if(!document.getElementById('editingAnimalLabel').textContent.includes('3D 黃蜥蝪'))throw Error('Checking 3D lizard leaves the previous animal selected for placement');
 const canvas=document.getElementById('stage'), rect=canvas.getBoundingClientRect();
 const before=AnimEngine.getActorPath('lizard-yellow').length;
 for(const x of [650,1000]){
 const event={clientX:rect.left+x/1600*rect.width,clientY:rect.top+450/900*rect.height,bubbles:true,button:0};
 canvas.dispatchEvent(new MouseEvent('mousedown',event));window.dispatchEvent(new MouseEvent('mouseup',event));
 }
 if(AnimEngine.getActorPath('lizard-yellow').length!==before+2)throw Error('Canvas clicks did not add 3D lizard waypoints');
 lizard().click();await wait();row('3D 黃蜥蝪').querySelector('.name').click();
 for(let i=0;i<200&&!AnimEngine.actorHasWalkFrames('lizard-yellow');i++)await wait();
 if(!lizard().checked || !document.getElementById('editingAnimalLabel').textContent.includes('3D 黃蜥蝪'))throw Error('Clicking name did not enable and select lizard');
 const data=new DataTransfer();data.setData('application/x-path-animator-animal','lizard-yellow');
 document.getElementById('stagePad').dispatchEvent(new DragEvent('drop',{dataTransfer:data,clientX:rect.left+800/1600*rect.width,clientY:rect.top+450/900*rect.height,bubbles:true}));
 await wait();
 if(Math.abs(AnimEngine.getActorPath('lizard-yellow')[0].x-800)>1)throw Error('Drag placement failed');
 return {checkboxSelectsAnimal:true,clickPlacement:true,pathPoints:true,nameSelection:true,dragPlacement:true};
 })()`)); app.exit(0);
 }catch(e){console.error(e);app.exit(1)}
});
