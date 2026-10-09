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
