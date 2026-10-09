const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('app.js', 'utf8').replace(/createCountryCards\(\);\s*$/, '');
const context = vm.createContext({ document: { querySelector: () => ({ addEventListener() {} }) }, console });
vm.runInContext(source, context);
vm.runInContext(`
function trial(keys, chance, roll) {
  alliances.clear(); keys.forEach(key => alliances.add(key));
  const countries = Array.from({length: 5}, (_, index) => ({index, name: 'Country ' + index}));
  const responses = resolveAllies(countries, 0, 1, chance, () => roll);
  return {sides: countries.map(country => country.side), responses};
}`, context);
function trial(keys, chance, roll) { return JSON.parse(JSON.stringify(vm.runInContext(`trial(${JSON.stringify(keys)}, ${chance}, ${roll})`, context))); }
assert.deepEqual(trial(['0-2','1-3'],100,0.99).sides,['A','B','A','B',null]);
assert.deepEqual(trial(['0-2','1-3'],0,0).sides,['A','B',null,null,null]);
assert.deepEqual(trial(['0-2','1-2'],100,0).sides,['A','B',null,null,null]);
assert.deepEqual(trial(['0-2','2-4'],100,0).sides,['A','B','A',null,null]);
assert.deepEqual(trial(['0-1','0-2'],60,0.6).sides,['A','B',null,null,null]);
assert.deepEqual(trial(['0-2'],60,0.59).sides,['A','B','A',null,null]);
assert.equal(trial([],60,0).responses.length,3);
console.log('Passed: 100%, 0%, shared allies, direct allies only, opponents, probability boundary, neutral responses.');
vm.runInContext(`
function diplomacy(allyKeys, enemyKeys, help, hate, betrayal) {
  alliances.clear(); enemies.clear();
  allyKeys.forEach(key => alliances.add(key)); enemyKeys.forEach(key => enemies.add(key));
  const countries = Array.from({length: 5}, (_, index) => ({index, name: 'Country ' + index}));
  const responses = resolveAllies(countries, 0, 1, help, () => 0.5, hate, betrayal);
  return {sides: countries.map(country => country.side), responses};
}`, context);
function diplomacy(allies,enemies,help,hate,betrayal) { return JSON.parse(JSON.stringify(vm.runInContext(`diplomacy(${JSON.stringify(allies)},${JSON.stringify(enemies)},${help},${hate},${betrayal})`,context))); }
assert.deepEqual(diplomacy([],['0-2'],0,100,0).sides,['A','B','B',null,null]);
assert.deepEqual(diplomacy([],['0-2'],0,0,0).sides,['A','B',null,null,null]);
const turn = diplomacy(['0-2','0-3'],['2-3'],100,0,100);
assert.deepEqual(turn.sides,['A','B','B','B',null]);
assert.ok(turn.responses.some(line=>line.includes('turned against ally')));
assert.deepEqual(diplomacy(['0-2','0-3'],['2-3'],100,0,0).sides,['A','B','A','A',null]);
assert.deepEqual(diplomacy([],['0-2','1-2'],0,100,100).sides,['A','B',null,null,null]);
console.log('Passed: hatred join, no hatred, simultaneous betrayal, no betrayal, enemies on both sides, fixed leaders.');
vm.runInContext(`
function combatTrial(terrain = 'plains') {
  const forces = [
    {index:0,name:'A',side:'A',gold:100,cannons:10,books:30,pens:100,mages:20},
    {index:1,name:'B',side:'B',gold:100,cannons:10,books:30,pens:100,mages:20},
    {index:2,name:'N',side:null,gold:100,cannons:10,books:30,pens:100,mages:20}
  ];
  const before = JSON.stringify(forces);
  const battle = simulateCombat(forces, 3, terrain, () => .3);
  return {battle, unchanged:before === JSON.stringify(forces), emptyPower: countryBasePower({...forces[0],cannons:0,books:0,pens:0,mages:0})};
}`,context);
const combat = JSON.parse(JSON.stringify(vm.runInContext('combatTrial()',context)));
assert.equal(combat.unchanged,true);
assert.equal(combat.emptyPower,0);
assert.ok(combat.battle.rounds.length > 0);
for (const record of combat.battle.casualties) for (const unit of record.units) {
  assert.equal(unit.before,unit.lost + unit.remaining);
  assert.ok(Number.isInteger(unit.remaining) && unit.remaining >= 0);
  if (!record.side) assert.equal(unit.lost,0);
}
assert.ok(combat.battle.casualties[0].units.some(u=>u.lost>0));
const fortified = JSON.parse(JSON.stringify(vm.runInContext("combatTrial('fortifications')",context)));
assert.equal(fortified.battle.winnerSide,'B');
console.log('Passed: casualty conservation, whole nonnegative survivors, neutral preservation, no source mutation, empty armies, defensive terrain.');
