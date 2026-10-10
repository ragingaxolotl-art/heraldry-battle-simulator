const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('world.js','utf8');const ctx=vm.createContext({studentWorld:{selected:[0],countries:[{id:0,name:'Testland',position:[100,100]}],azgaar:{},cells:[{country:0,land:true,point:[105,100],elevation:.7,biome:{name:'Taiga'}},{country:1,land:true,point:[100,100],elevation:.1,biome:{name:'Grassland'}}]}});
vm.runInContext(source.slice(source.indexOf('function chooseMapBattlefield('),source.indexOf('function renderBattleChoices(')),ctx);
assert.equal(vm.runInContext('chooseMapBattlefield(0).terrain',ctx),'hills');assert.ok(vm.runInContext('chooseMapBattlefield(0).description.includes("taiga")',ctx));
vm.runInContext('studentWorld.background="picture"',ctx);assert.equal(vm.runInContext('chooseMapBattlefield(0).terrain',ctx),'plains');
console.log('Passed: defender territory selects actual biome/elevation; PNG uses neutral terrain.');
