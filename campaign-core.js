/* Persistent classroom settlements and army identities. No additional combat simulation. */
const CAMPAIGN_KEYS = ['cannons','books','pens','mages'];
const COMMANDER_TRAITS = ['Steady','Cautious','Bold','Inspiring','Resourceful'];
const CAMPAIGN_FIELDS = [['ruler','Ruler / leader'],['exports','Major export'],['currency','Money named'],['sport','Favorite sport']];
const campaignText = (value, max=80) => typeof value==='string' ? value.slice(0,max) : '';
const campaignPoint = p => Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=0&&p[0]<=1200&&p[1]>=0&&p[1]<=700;
function distributeCounts(total, weights) {
  const sum=weights.reduce((a,b)=>a+b,0);
  if(!weights.length)return [];
  if(!sum)return weights.map((_,i)=>Math.floor(total/weights.length)+(i<total%weights.length?1:0));
  const exact=weights.map(w=>total*w/sum), counts=exact.map(Math.floor);
  let rest=total-counts.reduce((a,b)=>a+b,0);
  exact.map((n,i)=>({i,f:n-counts[i]})).sort((a,b)=>b.f-a.f||a.i-b.i).forEach(({i})=>{if(rest>0){counts[i]++;rest--;}});
  return counts;
}
function makeCountryCities(world,country) {
  const imported=world.settlements?.filter(c=>c.country===country.id)||[];
  if(imported.length&&!world.background)return imported.map(c=>({...c,position:[...c.position]})).sort((a,b)=>Number(b.capital)-Number(a.capital)||a.name.localeCompare(b.name));
  const land=world.background?[]:world.cells.filter(c=>c.land&&c.country===country.id);
  const points=[world.background?[...country.position]:[...country.capital]];
  while(points.length<Math.min(3,land.length||3)) {
    const next=land.reduce((best,c)=>{
      const distance=p=>Math.min(...points.map(q=>Math.hypot(p[0]-q[0],p[1]-q[1])));
      return !best||distance(c.point)>distance(best.point)?c:best;
    },null);
    if(next) {if(points.some(p=>p[0]===next.point[0]&&p[1]===next.point[1]))break;points.push([...next.point]);}
    else points.push([Math.max(25,Math.min(1175,country.position[0]+(points.length===1?-45:45))),Math.max(30,Math.min(610,country.position[1]+50))]);
  }
  return points.map((position,i)=>({id:`city-${country.id}-${i}`,country:country.id,name:`${country.name.slice(0,28)} ${['City','Crossing','Haven'][i]}`,capital:i===0,position,source:world.background?'manual':'generated'}));
}
function ensureCountryCampaign(world,country) {
  if(!Array.isArray(country.cities))country.cities=makeCountryCities(world,country);
  if(!Array.isArray(country.regiments)||!country.regiments.length){
    const first=['Mira','Tobin','Lena','Rowan','Amara','Jules','Niko','Sora'];
    const last=['Ashford','Reed','Vale','Stone','Thorne','Brook','Wren','Hale'];
    country.regiments=Array.from({length:3},(_,i)=>({id:`regiment-${country.id}-${i}`,name:`${i+1}${['st','nd','rd'][i]} ${['Oakguard','Riverwatch','Dawnward'][(country.id+i)%3]} Regiment`,general:`${first[(world.seed+country.id+i)%first.length]} ${last[(country.id*3+i)%last.length]}`,trait:COMMANDER_TRAITS[(country.id+i)%COMMANDER_TRAITS.length],selected:true,cityId:country.cities[i%country.cities.length]?.id||'',units:Object.fromEntries(CAMPAIGN_KEYS.map(k=>[k,distributeCounts(country[k],[1,1,1])[i]])),battles:0,notes:''}));
  }
  return country;
}
function syncRegimentTotals(country,totals=country) {
  CAMPAIGN_KEYS.forEach(key=>{
    const old=country.regiments.map(r=>r.units[key]),total=old.reduce((a,b)=>a+b,0);
    if(total!==totals[key])distributeCounts(totals[key],old).forEach((count,i)=>{country.regiments[i].units[key]=count;});
  });
}
function campaignForce(country,data) {
  syncRegimentTotals(country,data);
  const eligible=country.regiments.filter(r=>r.selected!==false);
  const commitment={...data.commitment};
  CAMPAIGN_KEYS.forEach(key=>{
    const available=eligible.reduce((n,r)=>n+r.units[key],0);
    commitment[key]=Math.min(available,commitment[key]==null?data[key]:commitment[key]);
  });
  const deployments=eligible.map(r=>({id:r.id,name:r.name,general:r.general,trait:r.trait,units:{}}));
  CAMPAIGN_KEYS.forEach(key=>distributeCounts(commitment[key],eligible.map(r=>r.units[key])).forEach((n,i)=>{deployments[i].units[key]=n;}));
  return {...data,regimentCommitment:commitment,regiments:deployments.filter(r=>CAMPAIGN_KEYS.some(k=>r.units[k]>0))};
}
function regimentCompanies(regiment) {
  return CAMPAIGN_KEYS.flatMap(key=>{
    const total=regiment.units[key];if(!total)return [];
    const count=Math.min(3,Math.ceil(total/120));
    const label={pens:'Infantry',books:'Archer',mages:'Cavalry',cannons:'Artillery'}[key];
    return distributeCounts(total,Array(count).fill(1)).map((n,i)=>({name:`${label} ${key==='cannons'?'Battery':'Company'} ${String.fromCharCode(65+i)}`,key,count:n}));
  });
}
function applyRegimentLosses(country,force,record) {
  const roster=(force.regiments||[]).map(r=>({...r,units:{...r.units},losses:Object.fromEntries(CAMPAIGN_KEYS.map(k=>[k,0]))}));
  if(!record.side)return [];
  record.units.forEach(unit=>{
    const losses=distributeCounts(unit.lost,roster.map(r=>r.units[unit.key]));
    losses.forEach((lost,i)=>{
      roster[i].losses[unit.key]=lost;
      const current=country.regiments.find(r=>r.id===roster[i].id);
      if(current)current.units[unit.key]-=lost;
    });
  });
  roster.forEach(r=>{const current=country.regiments.find(item=>item.id===r.id);if(current)current.battles++;});
  return roster;
}
function restoreCountryCampaign(world,country,saved) {
  const cities=saved.cities;
  if(cities!==undefined){
    if(!Array.isArray(cities)||cities.length<1||cities.length>100000||new Set(cities.map(c=>c?.id)).size!==cities.length)throw Error('Invalid saved cities.');
    country.cities=cities.map(c=>{
      if(!c||typeof c.id!=='string'||c.id.length>80||!campaignPoint(c.position))throw Error('Invalid saved city location.');
      return {id:c.id,country:country.id,name:campaignText(c.name,60),position:[...c.position],capital:Boolean(c.capital),source:['azgaar','manual','generated'].includes(c.source)?c.source:'generated',...Object.fromEntries(CAMPAIGN_FIELDS.map(([k])=>[k,campaignText(c[k])])),notes:campaignText(c.notes,1200)};
    });
  }
  if(saved.regiments!==undefined){
    if(!Array.isArray(saved.regiments)||saved.regiments.length!==3||new Set(saved.regiments.map(r=>r?.id)).size!==3)throw Error('Invalid saved regiments.');
    country.regiments=saved.regiments.map(r=>{
      if(!r||typeof r.id!=='string'||r.id.length>80||!CAMPAIGN_KEYS.every(k=>Number.isInteger(r.units?.[k])&&r.units[k]>=0&&r.units[k]<=999999))throw Error('Invalid saved regiment troops.');
      return {id:r.id,name:campaignText(r.name,60),general:campaignText(r.general,60),trait:COMMANDER_TRAITS.includes(r.trait)?r.trait:'Steady',selected:r.selected!==false,cityId:campaignText(r.cityId),units:Object.fromEntries(CAMPAIGN_KEYS.map(k=>[k,r.units[k]])),battles:Number.isInteger(r.battles)&&r.battles>=0?r.battles:0,notes:campaignText(r.notes,1200)};
    });
  }
  ensureCountryCampaign(world,country);syncRegimentTotals(country);
  country.regiments.forEach(r=>{if(!country.cities.some(c=>c.id===r.cityId))r.cityId=country.cities[0].id;});
}
