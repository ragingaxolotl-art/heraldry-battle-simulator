const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),c=vm.createContext({});vm.runInContext(fs.readFileSync('battle-stories.js','utf8'),c);
const run=code=>vm.runInContext(code,c);
run(`var t={winnerSide:'A',formations:[{name:'Oak',side:'A',units:[{key:'pens',committed:10,remaining:8}]},{name:'Elm',side:'B',units:[{key:'pens',committed:10,remaining:0}]}]};var b={id:1,title:'Oak vs Elm',winner:'Oak',events:['Birch joined Oak (100% help chance).'],scenes:[{heading:'Alliances and decisions',text:'Birch joined Oak (100% help chance).'}]};`);
assert.equal(run('JSON.stringify(simpleBattleStory(b,t))'),run('JSON.stringify(simpleBattleStory(b,t))'));
assert.match(run('simpleBattleStory(b,t).join(" ")'),/no committed troops remaining/);
assert.equal(run('simpleDiplomacyEvents(b)[0]'),'Birch joined Oak.');
assert(run('new Set(Array.from({length:20},(_,i)=>simpleBattleStory({...b,id:i},t).join(" "))).size')>10);
assert(!/cavalry|artillery|archers/i.test(run('simpleBattleStory(b,t).join(" ")')));
console.log('Passed: stable varied stories, absent troop types excluded, wipeout facts, ally decisions.');
