const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('app.js','utf8'),context={};vm.createContext(context);vm.runInContext(src.slice(src.indexOf('const UNIT_TYPES'),src.indexOf('const grid =')),context);
const deploy=counts=>vm.runInContext(`automaticDeployment(${JSON.stringify(counts)})`,context);
for(let n=0;n<1000;n++){
 const counts={cannons:n%7,books:0,pens:n,mages:n%11},sent=deploy(counts),total=Object.values(counts).reduce((a,b)=>a+b,0),out=Object.values(sent).reduce((a,b)=>a+b,0);
 for(const key in counts)assert(sent[key]>=0&&sent[key]<=counts[key]&&Number.isInteger(sent[key]));
 assert.equal(sent.books,0);assert(total===0?out===0:out>=1);if(total>1)assert(out<total);
}
for(const [total,expected] of [[1,1],[20,6],[100,45],[300,165]])assert.equal(deploy({cannons:0,books:0,pens:total,mages:0}).pens,expected);
console.log('PASS adaptive deployment, tiny/empty armies, proportional allocation, reserves, no invented troop types');
