const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context=vm.createContext({console,Math,Set,Map,Uint32Array});
for(const file of ['vendor/d3-delaunay.min.js','data/gria-template.js','world-core.js','azgaar.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
const input={info:{width:1000,height:600,mapName:'Import test'},pack:{states:[{i:0}],vertices:[],cells:[],biomes:[{i:4,name:'Custom grassland',color:'#123456'}]}};
for(let i=0;i<6;i++){const v=input.pack.vertices.length,x=i*150;input.pack.states.push({i:i+1,name:`Land ${i+1}`,color:'#aa6677',diplomacy:[]});input.pack.vertices.push(...[[x,100],[x+140,100],[x+140,400],[x,400]].map((p,j)=>({i:v+j,p})));input.pack.cells.push({i,p:[x+70,250],v:[v,v+1,v+2,v+3],h:30,state:i+1,biome:4});}
context.input=input;
const world=JSON.parse(vm.runInContext('JSON.stringify(importAzgaarWorld(input))',context));assert.equal(world.countries.length,6);assert.equal(world.cells[0].biome.color,'#123456');assert.equal(world.cells[0].biome.name,'Custom grassland');assert.equal(world.cells[5].country,5);assert.equal(world.cells[0].polygon.length,5);
context.saved=world;vm.runInContext('const SETTINGS_IDS=[];',context);const source=fs.readFileSync('world.js','utf8');vm.runInContext(source.slice(source.indexOf('function validateWorldSave('),source.indexOf('function setCamera(')),context);
assert.equal(vm.runInContext('validateWorldSave(saved).countries[5].name',context),'Land 6');assert.equal(vm.runInContext('validateWorldSave(saved).cells[0].biome.color',context),'#123456');assert.throws(()=>vm.runInContext('importAzgaarWorld({})',context));
fs.writeFileSync('/tmp/azgaar-import-test.json',JSON.stringify(input));
console.log('Passed: Azgaar geometry, custom palette, six-country import, save restoration, invalid export rejection.');
