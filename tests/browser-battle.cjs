// Serve the app first. Set PLAYWRIGHT_MODULE and BROWSER_PATH if not on PATH.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:8017');
  await page.waitForFunction(()=>typeof studentWorld!=='undefined'&&document.querySelectorAll('.commit-pens').length===5);
  // Exercise half/all controls before requesting a small expedition.
  await page.locator('.deployment button').filter({hasText:'Send half'}).first().click();
  assert.notEqual(await page.locator('.commit-pens').first().inputValue(),'');
  await page.locator('.deployment button').filter({hasText:'Send all'}).first().click();
  assert.equal(await page.locator('.commit-pens').first().inputValue(),'');
  await page.evaluate(()=>{
   Math.random=()=>.31;
   const names=['The Northern Republic of Westhaven','Valoria','The Kingdom of the Ashen Coast','Ironmark','House of the Golden Mountain'];
   cards().forEach((card,i)=>{
    card.querySelector('.country-name').value=names[i];
    UNIT_TYPES.forEach(u=>{card.querySelector(`.country-${u.key}`).value=1000;card.querySelector(`.commit-${u.key}`).value=i===1?(u.key==='pens'?1:0):100;});
    const canvas=document.createElement('canvas');canvas.width=60;canvas.height=80;const ctx=canvas.getContext('2d');ctx.fillStyle=i===1?'#255d83':'#9b3f32';ctx.beginPath();ctx.moveTo(5,5);ctx.lineTo(55,5);ctx.lineTo(50,50);ctx.lineTo(30,75);ctx.lineTo(10,50);ctx.closePath();ctx.fill();ctx.fillStyle='#f5cf64';ctx.fillRect(25,10,10,50);ctx.fillRect(10,25,40,10);
    card.querySelector('.heraldry-preview').src=canvas.toDataURL();card.querySelector('.heraldry-drop').classList.add('has-image');
   });
   alliances.clear();['0-2','0-3','0-4'].forEach(k=>alliances.add(k));enemies.clear();refreshCountryChoices();
   document.getElementById('allyChance').value='100';document.getElementById('hatredChance').value='0';document.getElementById('betrayalChance').value='0';document.getElementById('terrain').value='hills';
  });
  await page.locator('.formation-choice').nth(0).selectOption('concave');
  await page.locator('.maneuver-choice').nth(0).selectOption('pincer');
  await page.locator('.formation-choice').nth(1).selectOption('square');
  await page.locator('.maneuver-choice').nth(1).selectOption('hold');
  await page.locator('.formation-choice').nth(2).selectOption('echelon');
  await page.locator('.formation-choice').nth(3).selectOption('column');
  await page.locator('.formation-choice').nth(4).selectOption('refused');
  if(await page.locator('#battleCountryChoices').count()){await page.locator('#battleCountryChoices button').nth(0).click();await page.locator('#battleCountryChoices button').nth(1).click();}else await page.locator('#battleButton').click();
  await page.waitForFunction(()=>document.querySelectorAll('.tactical-battle-image').length===studentWorld.history[0]?.scenes.length);
  await page.locator('.battle-motion').nth(2).screenshot({path:process.env.BATTLE_MOTION_PICTURE||'/tmp/battle-motion-preview.png'});
  const flow=page.locator('.battle-flow').first();
  const offset=await flow.evaluate(el=>getComputedStyle(el).strokeDashoffset);
  await page.waitForTimeout(180);
  assert.notEqual(await flow.evaluate(el=>getComputedStyle(el).strokeDashoffset),offset,'Battle lines must visibly move');
  await page.locator('.battle-motion-toggle').first().click();
  assert.equal(await flow.evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
  await page.locator('.battle-motion-toggle').first().click();
  assert.equal(await flow.evaluate(el=>getComputedStyle(el).animationPlayState),'running');

  const check=await page.evaluate(()=>{
   const battle=studentWorld.history[0],final=battle.scenes.at(-1).tactical;
   return {scenes:battle.scenes.length,images:document.querySelectorAll('.battle-block img').length,formations:final.formations,countries:getCountries(),history:JSON.stringify(studentWorld.history),valid:battle.scenes.every(s=>validTacticalScene(s.tactical))};
  });
  assert.equal(check.formations[0].formation,'concave');assert.equal(check.formations[0].maneuver,'pincer');
  assert.equal(check.formations[1].formation,'square');
  assert.equal(check.valid,true);assert.equal(check.images,check.scenes*2);assert.equal(check.formations.length,5);
  for(const f of check.formations)for(const u of f.units){
   assert.equal(check.countries[f.index][u.key],1000-u.lost);
   assert.equal(u.reserve,1000-u.committed);
  }
  assert.ok(check.formations.find(f=>f.index===1).units.every(u=>u.remaining===0));
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('.battle-block').last().getByRole('button',{name:'Download battle picture',exact:true}).click()]);
  await download.saveAs(process.env.BATTLE_PICTURE||'/tmp/battle-verified.png');
  const before=check.countries.map(c=>[c.cannons,c.books,c.pens,c.mages]);
  await page.evaluate(()=>{showBattle(studentWorld.history[0]);for(let i=0;i<studentWorld.history[0].scenes.length;i++)advancePlayback();});
  assert.deepEqual(await page.evaluate(()=>getCountries().map(c=>[c.cannons,c.books,c.pens,c.mages])),before);
  await page.reload();
  await page.waitForFunction(()=>document.querySelectorAll('.tactical-battle-image').length===studentWorld.history[0]?.scenes.length);
  assert.deepEqual(await page.evaluate(()=>getCountries().map(c=>[c.cannons,c.books,c.pens,c.mages])),before);
  assert.equal(await page.evaluate(()=>JSON.stringify(studentWorld.history)),check.history);
  assert.equal(await page.locator('.commit-pens').nth(1).inputValue(),'1');
  assert.equal(await page.locator('.formation-choice').nth(0).inputValue(),'concave');
  assert.equal(await page.locator('.maneuver-choice').nth(0).inputValue(),'pincer');
  // Leaders cannot fight using reserves when nothing is committed.
  for(const key of ['cannons','books','pens','mages'])await page.locator(`.commit-${key}`).first().fill('0');
  if(await page.locator('#battleCountryChoices').count()){await page.locator('#battleCountryChoices button').nth(0).click();await page.locator('#battleCountryChoices button').nth(1).click();}else await page.locator('#battleButton').click();assert.match(await page.locator('#formMessage').textContent(),/commit at least one/);
  assert.equal(await page.evaluate(()=>studentWorld.history.length),1);
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true);
  assert.deepEqual(errors,[]);
  console.log('Passed browser: half/all controls, five nations with heraldry, exact losses/reserves, two pictures per scene, PNG download, wipeout with reserves preserved, replay/reload without double deduction, persisted image snapshots, zero-force rejection, mobile width, no JS errors.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
