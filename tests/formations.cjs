const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({console});vm.runInContext(fs.readFileSync('formations.js','utf8'),ctx);
const result=JSON.parse(vm.runInContext(`JSON.stringify((()=>{
 const units=['pens','books','mages','cannons'].map(key=>({key,label:key,committed:101,remaining:67}));
 return {formations:FORMATIONS, maneuvers:MANEUVERS,layouts:FORMATIONS.map(f=>buildFormationLayout(f.id,units)),empty:buildFormationLayout('line',units.map(u=>({...u,committed:0,remaining:0}))),small:buildFormationLayout('square',units.map(u=>({...u,committed:1,remaining:0}))),fallback:formationChoice('invalid').id,paths:MANEUVERS.map(m=>maneuverDisplacement(m.id,{key:'mages',y:.75},'combat',3,6))};
})())`,ctx));
assert.equal(result.formations.length,12);assert.equal(result.maneuvers.length,7);
assert.equal(new Set(result.layouts.map(l=>JSON.stringify(l))).size,12,'every preset has a distinct geometry');
for(const layout of result.layouts){
 for(const key of ['pens','books','mages','cannons']){
  const nodes=layout.filter(n=>n.key===key);
  assert.equal(nodes.reduce((n,u)=>n+u.committed,0),101);
  assert.equal(nodes.reduce((n,u)=>n+u.remaining,0),67);
  assert.equal(nodes.reduce((n,u)=>n+u.lost,0),34);
 }
 layout.forEach(n=>{assert.ok(Number.isFinite(n.x)&&Number.isFinite(n.y));assert.ok(n.remaining>=0&&n.remaining<=n.committed);assert.ok(n.x>=-.1&&n.x<=1&&Math.abs(n.y)<=1);});
}
assert.equal(result.empty.length,0);assert.equal(result.small.length,4);assert.ok(result.small.every(n=>n.committed===1&&n.lost===1));
assert.equal(result.fallback,'line');assert.equal(new Set(result.paths.map(p=>JSON.stringify(p))).size,7);
console.log('Passed: twelve distinct formations, seven distinct maneuvers, exact detachment totals, empty and tiny forces, bounded positions, safe fallback.');
// Full-sized blocks must remain distinct even in the densest four-nation side.
const collisions=JSON.parse(vm.runInContext(`JSON.stringify((()=>{
 const bad=[],units=['pens','books','mages','cannons'].map(key=>({key,committed:100,remaining:100}));
 for(const f of FORMATIONS)for(const m of MANEUVERS){
  const nodes=buildFormationLayout(f.id,units).map(n=>{const d=maneuverDisplacement(m.id,n,'outcome',6,6);return {...n,px:(n.x+d.x)*590,py:(n.y+d.y)*125};});
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++)if(Math.abs(nodes[i].px-nodes[j].px)<48&&Math.abs(nodes[i].py-nodes[j].py)<23)bad.push([f.id,m.id,nodes[i].key,nodes[j].key]);
 }
 return bad;
})())`,ctx));
assert.deepEqual(collisions,[],'marker labels must not overlap across the 84 combinations');
console.log('Passed: all 84 formation/maneuver combinations keep distinct marker labels in a four-nation coalition.');
