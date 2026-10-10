const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({console,Math,Set,Map,Uint32Array});
for(const file of ['vendor/d3-delaunay.min.js','data/gria-template.js','world-core.js','azgaar.js','campaign-core.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
vm.runInContext(`const world=generateStudentWorld(42,GRIA_TEMPLATE);world.countries.forEach(c=>ensureCountryCampaign(world,c));`,ctx);
const evaluate=s=>JSON.parse(vm.runInContext(`JSON.stringify(${s})`,ctx));
const countries=evaluate('world.countries');
for(const c of countries){
 assert.equal(c.cities.length,3);assert.equal(c.regiments.length,3);
 for(const city of c.cities)assert.ok(evaluate(`world.cells.some(c=>c.land&&c.country===${c.id}&&c.point[0]===${city.position[0]}&&c.point[1]===${city.position[1]})`));
 for(const key of ['pens','books','cannons','mages'])assert.equal(c.regiments.reduce((n,r)=>n+r.units[key],0),c[key]);
}
vm.runInContext(`const c=world.countries[0];c.regiments[0].selected=false;const held=JSON.stringify(c.regiments[0].units);const force=campaignForce(c,{...c,commitment:{pens:50,books:20,mages:10,cannons:2}});const record={side:'A',units:CAMPAIGN_KEYS.map(key=>({key,lost:Math.floor(force.regimentCommitment[key]/2)}))};const records=applyRegimentLosses(c,force,record);`,ctx);
assert.equal(evaluate('JSON.stringify(c.regiments[0].units)'),evaluate('held'));
assert.equal(evaluate('c.regiments[0].battles'),0);
assert.equal(evaluate('c.regiments[1].battles'),1);
for(const key of ['pens','books','cannons','mages']){
 assert.equal(evaluate(`force.regiments.reduce((n,r)=>n+r.units.${key},0)`),evaluate(`force.regimentCommitment.${key}`));
 assert.equal(evaluate(`records.reduce((n,r)=>n+r.losses.${key},0)`),evaluate(`record.units.find(u=>u.key==='${key}').lost`));
 assert.ok(evaluate(`c.regiments.every(r=>r.units.${key}>=0)`));
}
assert.equal(evaluate('regimentCompanies(c.regiments[1]).reduce((n,x)=>n+x.count,0)'),evaluate('CAMPAIGN_KEYS.reduce((n,k)=>n+c.regiments[1].units[k],0)'));
vm.runInContext(`c.cities[0].notes='A city of moonlit cheese markets';c.regiments[1].general='Captain Noodle';CAMPAIGN_KEYS.forEach(k=>c[k]=c.regiments.reduce((n,r)=>n+r.units[k],0));const rebuilt=generateStudentWorld(42,GRIA_TEMPLATE);Object.assign(rebuilt.countries[0],Object.fromEntries(CAMPAIGN_KEYS.map(k=>[k,c[k]])));restoreCountryCampaign(rebuilt,rebuilt.countries[0],JSON.parse(JSON.stringify(c)));`,ctx);
assert.deepEqual(evaluate('rebuilt.countries[0].regiments'),evaluate('c.regiments'));
assert.equal(evaluate('rebuilt.countries[0].cities[0].notes'),'A city of moonlit cheese markets');
assert.throws(()=>vm.runInContext(`restoreCountryCampaign(rebuilt,rebuilt.countries[0],{cities:[{id:'x',position:[-10,100]}]})`,ctx));
assert.throws(()=>vm.runInContext(`restoreCountryCampaign(rebuilt,rebuilt.countries[0],{regiments:[null,null,null]})`,ctx));
vm.runInContext(`const input={info:{width:1000,height:600},pack:{states:[{i:0}],vertices:[],cells:[],burgs:[]}};for(let i=0;i<5;i++){const v=input.pack.vertices.length,x=i*180;input.pack.states.push({i:i+1,name:'Land '+i,capital:i*2+1});input.pack.vertices.push(...[[x,100],[x+170,100],[x+170,400],[x,400]].map((p,j)=>({i:v+j,p})));input.pack.cells.push({i,p:[x+70,250],v:[v,v+1,v+2,v+3],h:30,state:i+1,biome:4});input.pack.burgs.push({i:i*2+1,state:i+1,name:'Capital '+i,capital:1,x:x+40,y:160},{i:i*2+2,state:i+1,name:'Market '+i,capital:0,x:x+110,y:320});}const imported=importAzgaarWorld(input);imported.countries.forEach(c=>ensureCountryCampaign(imported,c));const importedAgain=importAzgaarWorld(imported.azgaar);`,ctx);
assert.equal(evaluate('imported.settlements.length'),10);
assert.equal(evaluate('imported.countries[0].cities[1].name'),'Market 0');
assert.deepEqual(evaluate('imported.settlements'),evaluate('importedAgain.settlements'));
// Every possible partial allocation is bounded and conserves counts, including zero-sized units.
for(let total=0;total<30;total++)for(let a=0;a<10;a++)for(let b=0;b<10;b++){
 const limit=a+b;if(total>limit)continue;const values=evaluate(`distributeCounts(${total},[${a},${b}])`);assert.equal(values[0]+values[1],total);assert.ok(values[0]<=a&&values[1]<=b);
}
console.log('Passed: land-based cities, Azgaar settlements and export round-trip, regiment/company conservation, partial deployments, untouched reserves, persistent generals and losses, malformed saves.');
vm.runInContext(`input.settings={populationRate:1000,urbanization:1.5};input.pack.burgs[0].population=2.25;const withPopulation=importAzgaarWorld(input);const populationRoundtrip=importAzgaarWorld(withPopulation.azgaar);`,ctx);
assert.equal(evaluate('withPopulation.settlements[0].population'),3375);
assert.equal(evaluate('populationRoundtrip.settlements[0].population'),3375);
assert.equal(evaluate('imported.settlements[0].population'),null);
assert.equal(evaluate('rebuilt.countries[0].cities[0].mapSeed'),evaluate('c.cities[0].mapSeed'));
console.log('Passed: Azgaar population conversion and backup metadata, missing population remains unknown, stable settlement seeds.');
