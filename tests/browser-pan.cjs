const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});try{
 const page=await browser.newPage({viewport:{width:1200,height:900},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:8017');
 await page.evaluate(()=>setCamera({x:300,y:175,w:600}));
 const map=page.locator('#worldMap');await map.scrollIntoViewIfNeeded();const box=await map.boundingBox();
 // Empty upper-left ground avoids draggable country markers.
 const x=box.x+30,y=box.y+30;const positions=await page.evaluate(()=>JSON.stringify(studentWorld.countries.map(c=>c.position)));
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+90,y+50,{steps:5});await page.mouse.up();
 const moved=await page.evaluate(()=>({...camera}));assert(moved.x<300&&moved.y<175);assert.equal(await page.evaluate(()=>JSON.stringify(studentWorld.countries.map(c=>c.position))),positions);
 await map.focus();await page.keyboard.press('ArrowRight');assert((await page.evaluate(()=>camera.x))>moved.x);
 await page.evaluate(()=>setCamera({x:300,y:175,w:600}));
 const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+70,y:y+40}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert((await page.evaluate(()=>camera.x))<300);assert.equal(await map.evaluate(e=>e.classList.contains('is-panning')),false);
 await page.evaluate(()=>{setWorkspace(true);atlasView={x:300,y:175,w:600,h:350};drawAtlas();});const atlas=page.locator('#atlasMap');await atlas.scrollIntoViewIfNeeded();const ab=await atlas.boundingBox();await page.mouse.move(ab.x+20,ab.y+20);await page.mouse.down();await page.mouse.move(ab.x+80,ab.y+60);await page.mouse.up();assert((await page.evaluate(()=>atlasView.x))<300);
 await atlas.focus();for(let i=0;i<30;i++)await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>atlasView.x),0);
 assert.deepEqual(errors,[]);console.log('Passed: mouse and touch panning, keyboard navigation, atlas panning, map bounds, marker positions unchanged, no browser errors.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
