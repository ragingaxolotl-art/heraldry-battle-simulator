const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context=vm.createContext({console,Math,Set,Map,Uint32Array});
for(const file of ['vendor/d3-delaunay.min.js','data/gria-template.js','world-core.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
for(const seed of [0,1,12,2026,4294967295]) {
 const result=JSON.parse(JSON.stringify(vm.runInContext(`generateStudentWorld(${seed},GRIA_TEMPLATE)`,context)));
 assert.equal(result.countries.length,15);
 assert.equal(new Set(result.countries.map(c=>c.name)).size,15);
 assert.equal(result.selected.length,5);
 assert.ok(result.cells.some(c=>!c.land));assert.ok(result.cells.some(c=>c.land));
 for(const country of result.countries) {
  assert.ok(result.cells.some(c=>c.country===country.id));
  assert.ok(result.cells.some(c=>c.land&&c.point[0]===country.capital[0]&&c.point[1]===country.capital[1]));
  assert.ok(country.pens>0&&country.gold>=0);
 }
 assert.equal(JSON.stringify(result),JSON.stringify(JSON.parse(JSON.stringify(vm.runInContext(`generateStudentWorld(${seed},GRIA_TEMPLATE)`,context)))));
}
assert.notEqual(vm.runInContext('JSON.stringify(generateStudentWorld(1,GRIA_TEMPLATE).cells)',context),vm.runInContext('JSON.stringify(generateStudentWorld(2,GRIA_TEMPLATE).cells)',context));
const source=fs.readFileSync('world.js','utf8');
const start=source.indexOf('function validateWorldSave('),end=source.indexOf("function setCamera(",start);
vm.runInContext(`const SETTINGS_IDS=['sideAName','sideBName','allyChance','hatredChance','betrayalChance','terrain','chaosLevel'];const allianceKey=(a,b)=>[a,b].sort((x,y)=>x-y).join('-');`+source.slice(start,end),context);
vm.runInContext('const save=generateStudentWorld(42,GRIA_TEMPLATE); save.countries[0].pens=17; save.countries[0].name="Student kingdom";save.countries[0].position=[100,200];',context);
const restored=JSON.parse(vm.runInContext('JSON.stringify(validateWorldSave(JSON.parse(JSON.stringify(save))))',context));
assert.equal(restored.countries[0].pens,17);assert.equal(restored.countries[0].name,'Student kingdom');assert.deepEqual(restored.countries[0].position,[100,200]);
assert.throws(()=>vm.runInContext('validateWorldSave({...save,selected:[0,0,1,2,3]})',context));
assert.throws(()=>vm.runInContext('validateWorldSave({...save,countries:save.countries.map((c,i)=>i?c:{...c,shield:"https://example.com/tracking.png"})})',context));
assert.throws(()=>vm.runInContext('validateWorldSave({...save,countries:save.countries.map((c,i)=>i?c:{...c,pens:-10})})',context));
console.log('Passed: deterministic worlds, distinct rerolls, 15 selectable land countries, save restoration, duplicate/invalid save rejection.');
const drawStart=source.indexOf('function drawWorld('),drawEnd=source.indexOf('function downloadBlob(',drawStart);
vm.runInContext('let studentWorld=generateStudentWorld(42,GRIA_TEMPLATE); const commands=[]; const mapContext=new Proxy({}, {get:(target,key)=>(...args)=>commands.push([key,...args]),set:(target,key,value)=>{commands.push([key,value]);return true;}});'+source.slice(drawStart,drawEnd),context);
const cleanBefore=vm.runInContext('drawWorldBase(mapContext);JSON.stringify(commands)',context);
const cleanAfter=vm.runInContext('commands.length=0;studentWorld.countries[0].shield="data:image/png;base64,test";studentWorld.countries[0].position=[400,300];drawWorldBase(mapContext);JSON.stringify(commands)',context);
assert.equal(cleanBefore,cleanAfter,'clean map drawing must not include shields or draggable positions');
console.log('Passed: clean PNG rendering is unaffected by shield uploads or movement.');
if(process.env.WRITE_WORLD_FIXTURE) fs.writeFileSync('/tmp/student-world-backup.json',vm.runInContext('JSON.stringify(save)',context));
