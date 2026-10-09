const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('app.js','utf8');const ctx=vm.createContext({Uint8Array});vm.runInContext(source.slice(source.indexOf('function clearOuterWhite('),source.indexOf('function createCountryCards(')),ctx);
const data=new Uint8ClampedArray(5*5*4).fill(255);
for(let y=1;y<4;y++)for(let x=1;x<4;x++)if(x!==2||y!==2){const k=(y*5+x)*4;data[k]=20;data[k+1]=40;data[k+2]=80;}
ctx.clearOuterWhite(data,5,5);
assert.equal(data[3],0,'edge white becomes transparent');assert.equal(data[(2*5+2)*4+3],255,'enclosed white stays opaque');assert.equal(data[(1*5+1)*4+3],255,'colored shield stays opaque');
console.log('Passed: outside white removal preserves enclosed white and colored shield details.');
