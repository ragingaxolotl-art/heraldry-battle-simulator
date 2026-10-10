const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context=vm.createContext({console,document:{querySelector:()=>({addEventListener(){}})}});
for(const file of ['formations.js','app.js','battle-picture.js'])vm.runInContext(fs.readFileSync(file,'utf8').replace(/createCountryCards\(\);\s*$/,''),context);
const result=JSON.parse(vm.runInContext(`JSON.stringify((()=>{
 const nations=[
 {index:0,name:'A',side:'A',gold:100,cannons:50,books:200,pens:1000,mages:100,commitment:{cannons:0,books:100,pens:400,mages:25}},
 {index:1,name:'B',side:'B',gold:100,cannons:10,books:100,pens:600,mages:50,commitment:{cannons:9999,books:50,pens:300,mages:0}},
 {index:2,name:'Neutral',side:null,gold:100,cannons:10,books:10,pens:500,mages:10},
 {index:3,name:'Zero',side:'A',gold:100,cannons:10,books:10,pens:500,mages:10,commitment:{cannons:0,books:0,pens:0,mages:0}}
 ];
 const original=JSON.stringify(nations),forces=prepareBattleForces(nations),combat=simulateCombat(forces,3,'hills',()=>.3);
 const battle={scenes:Array.from({length:combat.roundDetails.length+3},()=>({})),participants:[]};
 attachTacticalScenes(battle,{combat,winnerSide:combat.winnerSide},'hills');
 const nationalAfter=nations.map((n,i)=>({...n,...Object.fromEntries(combat.casualties[i].units.map(u=>[u.key,u.nationalRemaining]))}));
 const nextForces=prepareBattleForces(nationalAfter),next=simulateCombat(nextForces,3,'plains',()=>.4);
 return {nations,forces,combat,battle,next,unchanged:original===JSON.stringify(nations),valid:battle.scenes.every(s=>validTacticalScene(s.tactical))};
})())`,context));
assert.equal(result.unchanged,true);assert.equal(result.valid,true);
assert.equal(result.forces[0].pens,400);assert.equal(result.forces[0].reserves.pens,600);assert.equal(result.forces[0].cannons,0);
assert.equal(result.forces[1].cannons,10);assert.equal(result.forces[2].pens,0);assert.equal(result.forces[3].side,null);
for(const record of result.combat.casualties)for(const unit of record.units){
 assert.equal(unit.before+unit.reserve,unit.available);
 assert.equal(unit.remaining+unit.lost,unit.before);
 assert.equal(unit.nationalRemaining,unit.available-unit.lost);
 assert.equal(unit.nationalRemaining,unit.reserve+unit.remaining);
 if(!record.side)assert.equal(unit.available,unit.nationalRemaining);
 const next=result.next.casualties[record.index].units.find(u=>u.key===unit.key);
 assert.equal(next.available,unit.nationalRemaining);
 assert.ok(next.lost<=next.before);
}
for(const [i,scene] of result.battle.scenes.entries())for(const f of scene.tactical.formations)for(const u of f.units){
 const record=result.combat.casualties.find(r=>r.index===f.index).units.find(r=>r.key===u.key);
 assert.equal(u.reserve,record.reserve);
 if(i<2)assert.equal(u.remaining,record.before);
 else if(i<2+result.combat.roundDetails.length)assert.equal(u.remaining,result.combat.roundDetails[i-2].countries.find(c=>c.index===f.index).units.find(r=>r.label===u.label).remaining);
 else assert.equal(u.remaining,record.remaining);
}
const invalid=structuredClone(result.battle.scenes[0].tactical);invalid.formations[0].units[0].remaining=-1;
assert.equal(vm.runInContext(`validTacticalScene(${JSON.stringify(invalid)})`,context),false);
console.log('Passed: exact commitments, zero deployment, over-request clamp, neutral reserves, two-battle conservation, immutable source, every scene reconciles to recorded rounds, invalid snapshots rejected.');
for(const file of ['vendor/d3-delaunay.min.js','data/gria-template.js','world-core.js','azgaar.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
const worldSource=fs.readFileSync('world.js','utf8');
vm.runInContext(`const SETTINGS_IDS=['terrain'];`+worldSource.slice(worldSource.indexOf('function validateWorldSave('),worldSource.indexOf('function setCamera(')),context);
const restored=JSON.parse(vm.runInContext(`JSON.stringify((()=>{
 const save=generateStudentWorld(42,GRIA_TEMPLATE);
 save.countries[0].commitment={cannons:0,books:12,pens:100,mages:null};
 save.history=[{title:'Test battle',winner:'A',events:[],arrows:[],scenes:${JSON.stringify(result.battle.scenes)}.map(s=>({...s,heading:'Test',text:'Facts',facts:[],view:{x:0,y:0,w:1200,h:700}}))}];
 return validateWorldSave(JSON.parse(JSON.stringify(save)));
})())`,context));
assert.deepEqual(restored.countries[0].commitment,{cannons:0,books:12,pens:100,mages:null});
assert.equal(restored.history[0].scenes.length,result.battle.scenes.length);
assert.deepEqual(restored.history[0].scenes.at(-1).tactical,result.battle.scenes.at(-1).tactical);
console.log('Passed: JSON save/restore preserves exact commitments, zero/all choices, and tactical round/outcome snapshots.');
for(const bad of [null,{...result.battle.scenes[0].tactical,formations:[null]},{...result.battle.scenes[0].tactical,formations:[{...result.battle.scenes[0].tactical.formations[0],units:[null,null,null,null]}]}])assert.equal(Boolean(vm.runInContext(`validTacticalScene(${JSON.stringify(bad)})`,context)),false);
vm.runInContext(`(()=>{const save=generateStudentWorld(42,GRIA_TEMPLATE);save.history=[{title:'Broken replay',winner:'A',events:[],arrows:[null]}];if(validateWorldSave(save).history.length)throw Error('Malformed replay retained');})()`,context);
vm.runInContext(`(()=>{for(const layout of FORMATIONS)for(const maneuver of MANEUVERS){const f={name:'Test Nation',side:'A',formation:layout.id,maneuver:maneuver.id,units:UNIT_TYPES.map(u=>({...u,committed:10,remaining:8,lost:2,reserve:90,roundLost:1}))};const t={phase:'combat',winnerSide:'B'};const text=narrateFormation(f,t);if(!text.includes(layout.name.toLowerCase())||!text.includes(maneuver.name.toLowerCase())||!text.includes('4 units were lost this round'))throw Error('Missing narration');if(formationStatus(f,{...t,phase:'outcome'}).label!=='Defeat · withdrawal')throw Error('Wrong defeat');f.units.forEach(u=>{u.remaining=0;u.lost=10;});if(formationStatus(f,{...t,phase:'outcome',winnerSide:'A'}).label!=='Force lost')throw Error('Destroyed winning contingent mislabeled');}})()`,context);
console.log('Passed: 84 narrated combinations, defeat and destroyed contingents, null replay recovery.');
vm.runInContext(`(()=>{
 const t=${JSON.stringify(result.battle.scenes[0].tactical)};
 if(!battleFlowPaths(t).every(p=>p.kind==='deploy'))throw Error('Deployment depicts fighting');
 t.phase='combat';const routes=battleFlowPaths(t);if(!routes.some(p=>p.side==='A'&&p.kind==='attack')||!routes.some(p=>p.side==='B'&&p.kind==='counter'))throw Error('Missing coalition direction');
 t.phase='outcome';if(!battleFlowPaths(t).every(p=>p.side!==t.winnerSide&&p.kind==='retreat'))throw Error('Winner retreats');
})()`,context);
console.log('Passed: deployment, attack/counterattack, and loser-only retreat animation routes.');
