const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:8021');
 await page.evaluate(()=>{Math.random=()=>.3;alliances.clear();enemies.clear();['0-2','0-3','0-4'].forEach(k=>alliances.add(k));document.getElementById('allyChance').value=100;
 cards().forEach((card,i)=>{card.querySelector('.country-name').value=['Oakguard','Silver Coast','Westhaven','Ravenmere','Eastwatch'][i];UNIT_TYPES.forEach(u=>{card.querySelector('.country-'+u.key).value=100;card.querySelector('.commit-'+u.key).value=20;});const c=document.createElement('canvas');c.width=60;c.height=80;const x=c.getContext('2d');x.fillStyle=i%2?'#245e91':'#a83f31';x.fillRect(4,4,52,70);x.fillStyle='#f7d15d';x.fillRect(24,7,12,65);x.fillRect(8,24,44,12);card.querySelector('.heraldry-preview').src=c.toDataURL();card.querySelector('.heraldry-drop').classList.add('has-image');});document.getElementById('sideAName').value='0';document.getElementById('sideBName').value='1';runBattle();});
 await page.waitForSelector('.battle-closeup img');
 const image=await page.locator('.battle-closeup img').getAttribute('src');
 const before=await page.evaluate(()=>JSON.stringify(studentWorld.history));
 assert.equal(await page.evaluate(()=>battleCloseupLocation(studentWorld.history[0]).view.w),400);
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Download battle close-up',exact:true}).click()]);await download.saveAs('/tmp/restored-battle-closeup.png');
 await page.evaluate(async()=>{const b=studentWorld.history[0];const edge={...b,scenes:[{location:[0,700],heading:'Outcome'}]};const c=await renderBattleCloseup(edge);if(!c||c.width!==1200)throw Error('Edge map failed');if(await renderBattleCloseup({...b,mapSnapshot:''})!==null)throw Error('Missing map did not fall back');cards()[0].querySelector('.country-name').value='Renamed later';saveWorld();await renderAfterAction();});
 assert.equal(await page.locator('.battle-closeup img').getAttribute('src'),image);
 assert.equal(await page.evaluate(()=>JSON.stringify(studentWorld.history)),before);
 await page.reload();await page.waitForSelector('.battle-closeup img');assert.equal(await page.locator('.battle-closeup img').getAttribute('src'),image);
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);console.log('Passed: saved close-up with five shields, download, edge location, missing-map fallback, stable history/image after renaming and reload, mobile width.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
