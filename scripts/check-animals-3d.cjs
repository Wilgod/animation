// With the local server running: npx electron scripts/check-animals-3d.cjs
// Checks every procedural 3D animal's GLB loads, its clip animates and
// rendering stays deterministic, then enables it from the editor's selector
// on an all-ground scene (air is allowed everywhere there) and checks it moves
// along a path. Water animals skip the editor step: no scene has water yet.
const { app, BrowserWindow } = require('electron');
const IDS = ['spider', 'mantis', 'ladybug', 'sparrow', 'squirrel', 'pigeon', 'pigeon-flying', 'frog', 'cicada', 'goldfish', 'stingray', 'seastar', 'jellyfish', 'sea-urchin', 'clownfish', 'sea-turtle', 'seahorse', 'hermit-crab', 'octopus', 'shark', 'moray-eel', 'sea-snake', 'fish-school', 'fieldmouse', 'dragonfly', 'moth', 'firefly', 'housefly', 'ladybug-flying', 'hummingbird', 'swallow', 'seagull', 'owl', 'bat', 'ant', 'ant-red', 'rhino-beetle', 'grasshopper', 'caterpillar', 'wasp', 'stag-beetle', 'stag-beetle-brown', 'cricket', 'cricket-brown', 'stick-insect', 'scarab', 'centipede', 'pill-bug', 'shield-bug', 'slug', 'mosquito', 'bumblebee', 'damselfly', 'rhino-beetle-flying', 'swallowtail', 'locust-flying', 'lacewing'];
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 1600, height: 1100, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = []; win.webContents.on('console-message', (_, l, m) => { if (l >= 3) errors.push(m); });
  try {
    await win.loadURL('http://localhost:5173/');
    const result = await win.webContents.executeJavaScript(`(async()=>{
      const sleep=ms=>new Promise(r=>setTimeout(r,ms));
      for(let i=0;i<200&&!window.__ready;i++)await sleep(100);
      if(!window.__ready)throw Error('Editor not ready');
      const scene=document.getElementById('sceneSelect'); scene.value='garden-lawn-grass'; scene.dispatchEvent(new Event('change'));
      await sleep(3000);
      const config=await (await fetch('config/scenes.json')).json();
      const {loadAnimal3D}=await import('./animal-3d.js');
      const canvas=document.querySelector('canvas'); const out={};
      for(const id of ${JSON.stringify(IDS)}){
        const def=config.animals.find(a=>a.id===id);
        if(!def||!def.model3d)throw Error(id+' has no model3d');
        const model=await loadAnimal3D(def.model3d,null,def);
        model.render(.1,.1); const poseA=model.canvas.toDataURL();
        model.render(.35,.35); if(poseA===model.canvas.toDataURL())throw Error(id+' clip did not animate');
        model.render(.1,.1); if(poseA!==model.canvas.toDataURL())throw Error(id+' pose not deterministic');
        model.dispose();
        if(def.habitat==='water'){out[id]='model ok, editor skipped (no water scene)';continue;}
        const row=[...document.querySelectorAll('.animal-row')].find(r=>r.textContent.includes(def.label));
        if(!row)throw Error(id+' missing from selector');
        const box=row.querySelector('input'); if(box.disabled)throw Error(id+' unavailable in the test scene'); if(!box.checked)box.click();
        for(let i=0;i<200&&!AnimEngine.actorHasWalkFrames(id);i++)await sleep(50);
        if(!AnimEngine.actorHasWalkFrames(id))throw Error(id+' did not load in the editor');
        for(const other of AnimEngine.getActorIds())if(other!==id)AnimEngine.removeActor(other);
        const y=def.habitat==='air'?90:def.habitat==='water'?700:450, x=def.habitat==='water'?400:500;
        AnimEngine.setActorPath(id,[{x,y,durationToNextMs:2000},{x:x+300,y,durationToNextMs:0}]);
        AnimEngine.setActorStartAtMs(id,0);
        AnimEngine.renderFrame(500); const first=canvas.toDataURL();
        AnimEngine.renderFrame(1100); if(first===canvas.toDataURL())throw Error(id+' frame did not change on the timeline');
        out[id]='ok';
      }
      return out;
    })()`);
    if (errors.length) throw Error(errors.join('\n'));
    console.log(JSON.stringify(result)); app.exit(0);
  } catch (e) { console.error(e); app.exit(1); }
});
