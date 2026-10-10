const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync('app.js','utf8').replace(/createCountryCards\(\);\s*$/, '');
const context=vm.createContext({document:{querySelector:()=>({addEventListener(){}}),getElementById:()=>({value:'0'}),querySelectorAll:()=>[]},console});vm.runInContext(app,context);
const world=fs.readFileSync('world.js','utf8');vm.runInContext(world.slice(world.indexOf('function focusView('),world.indexOf('function loadBackground(')),context);
const result=JSON.parse(vm.runInContext(`JSON.stringify((()=>{
 const countries=[{index:0,name:'Small force',side:'A',gold:0,cannons:0,books:0,pens:1,mages:0},{index:1,name:'Large force',side:'B',gold:0,cannons:100,books:100,pens:1000,mages:100}];
 const combat=simulateCombat(countries,1,'plains',()=>0);
 const model={countries,combat,sideAName:'Small force',sideBName:'Large force',winnerName:'Large force',loserName:'Small force',loserSide:'A'};
 return {combat,scenes:makeBattleScenes(model,i=>i?[900,400]:[300,300],[900,400],[])};
})())`,context));
assert.ok(result.scenes.some(s=>s.heading==='Force wiped out · Small force'));
const round=result.scenes.find(s=>s.heading.startsWith('Round 1'));
assert.ok(round.facts.some(f=>f==='Infantry: 1 lost this round; 0 remain.'));
assert.ok(round.location&&round.view.w<1200);
assert.ok(round.text.length>250,'round should have a substantive narrative');
assert.ok(result.scenes.find(s=>s.heading.startsWith('Outcome')).text.includes('was wiped out'));
assert.ok(!fs.readFileSync('index.html','utf8').includes('<table'));
console.log('Passed: wiped-out force gets a separate block, close-up location, exact unit facts, narrative, and no prebuilt table.');
