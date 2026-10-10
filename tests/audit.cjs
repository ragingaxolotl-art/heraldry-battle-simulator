const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({});vm.runInContext(fs.readFileSync('campaign-core.js','utf8'),c);
vm.runInContext(`for(let total=0;total<200;total++)for(const weights of [[0,0,0],[1,2,3],[2,0,7]]){const result=distributeCounts(total,weights);if(result.reduce((a,b)=>a+b,0)!==total||result.some(n=>!Number.isInteger(n)||n<0))throw Error('Allocation');}
const country={regiments:[{id:'a',selected:true,units:{pens:20,books:10,mages:0,cannons:0},battles:0},{id:'b',selected:false,units:{pens:80,books:0,mages:0,cannons:0},battles:0}]};
const force=campaignForce(country,{pens:100,books:10,mages:0,cannons:0,commitment:{pens:50}});
if(force.regimentCommitment.pens!==20)throw Error('Reserve committed');
applyRegimentLosses(country,force,{side:'A',units:[{key:'pens',lost:7},{key:'books',lost:3}]});
if(country.regiments[0].units.pens!==13||country.regiments[1].units.pens!==80)throw Error('Regiment losses');`,c);
console.log('Passed: regiment allocation, excluded regiments, commitment limits, casualty allocation.');
