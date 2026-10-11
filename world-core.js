// Default palette from Azgaar's Fantasy Map Generator (MIT; vendor/Azgaar-LICENSE.txt).
const AZGAAR_BIOMES=['Marine','Hot desert','Cold desert','Savanna','Grassland','Tropical seasonal forest','Temperate deciduous forest','Tropical rainforest','Temperate rainforest','Taiga','Tundra','Glacier','Wetland'].map((name,i)=>({i,name,color:['#466eab','#fbe79f','#b5b887','#d2d082','#c8d68f','#b6d95d','#29bc56','#7dcb35','#409c43','#4b6b32','#96784b','#d5e7eb','#0b9131'][i]}));
/* Seeded classroom geography. Geometry uses d3-delaunay (ISC); see vendor licenses. */
function seededRandom(seed) {
  let value = seed >>> 0;
  return () => { value += 0x6D2B79F5; let t = value; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function generateStudentWorld(seed, templates) {
  const random = seededRandom(seed), width = 1200, height = 700;
  const points = [];
  const lobes = Array.from({length: 7}, () => ({x: 240 + random() * 720, y: 190 + random() * 320, rx: 145 + random() * 170, ry: 105 + random() * 150}));
  const phase = random() * 100;
  for (let y = 12; y < height; y += 22) for (let x = 12; x < width; x += 22) points.push([x + (random() - .5) * 17, y + (random() - .5) * 17]);
  const diagram = d3.Delaunay.from(points).voronoi([0, 0, width, height]);
  const cells = points.map(([x, y], i) => {
    const mass = Math.max(...lobes.map(lobe => 1 - ((x-lobe.x)/lobe.rx)**2 - ((y-lobe.y)/lobe.ry)**2));
    const noise = .13 * Math.sin(x / 37 + phase) * Math.cos(y / 41 - phase) + .065 * Math.sin(x / 16 + y / 23);
    return {point: [x,y], polygon: diagram.cellPolygon(i).map(p => [...p]), land: mass + noise > .08, elevation: mass + noise, moisture: .5 + .5 * Math.sin(x / 170 + phase) * Math.cos(y / 150), shade: random(), country: -1};
  });
  cells.forEach(cell=>{cell.biome=biomeForCell(cell);});
  const land = cells.filter(cell => cell.land);
  const centers = [land[Math.floor(random() * land.length)].point];
  while (centers.length < 15) {
    const cell = land.reduce((best, candidate) => {
      const distance = p => Math.min(...centers.map(c => (p[0]-c[0])**2 + (p[1]-c[1])**2));
      return distance(candidate.point) > distance(best.point) ? candidate : best;
    });
    centers.push(cell.point);
  }
  const prefixes = ['Alder','Thorn','Raven','Silver','Stone','Ash','North','Elder','Val','Dun','Mar','Bel','Caer','Wind','Iron','West','High','Oak','Red','Grey'];
  const suffixes = ['ia','mere','fall','haven','mark','oria','reach','land','wick','mont','ford','crest'];
  const names = new Set();
  const countries = centers.map((position, i) => {
    let name; do { name = prefixes[Math.floor(random()*prefixes.length)] + suffixes[Math.floor(random()*suffixes.length)]; } while (names.has(name)); names.add(name);
    const template = templates[i % templates.length], factor = .75 + random() * .5;
    return {id:i, name, templateId:template.id, gold:Math.round(template.gold * factor), cannons:Math.round(template.units.artillery * factor), books:Math.round(template.units.archers * factor), pens:Math.round(template.units.infantry * factor), mages:Math.round(template.units.cavalry * factor), position:[...position], capital:[...position], shield:'', ruler:'', exports:'', currency:'', sport:'', color:`hsl(${Math.round((i * 137.5 + seed % 100) % 360)}, 36%, 70%)`};
  });
  cells.forEach(cell => {
    if (!cell.land) return;
    cell.country = centers.reduce((best, c, i) => Math.hypot(c[0]-cell.point[0],c[1]-cell.point[1]) < Math.hypot(centers[best][0]-cell.point[0],centers[best][1]-cell.point[1]) ? i : best, 0);
  });
  return {version:1,seed,width,height,biomes:AZGAAR_BIOMES.map(b=>({...b})),cells,countries,selected:[0,1,2,3,4],relations:{},settings:{sideAName:'0',sideBName:'1',allyChance:'60',hatredChance:'60',betrayalChance:'40',terrain:'plains',chaosLevel:'3'},history:[]};
}
// Classification matrix and thresholds adapted from Azgaar (MIT; vendor/Azgaar-LICENSE.txt).
// Local climate is illustrative: latitude and elevation set temperature; seeded moisture sets rainfall.
const AZGAAR_BIOME_MATRIX=[
[1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 10],
[3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 9, 9, 9, 9, 10, 10, 10],
[5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 9, 9, 9, 9, 9, 10, 10, 10],
[5, 6, 6, 6, 6, 6, 6, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 10, 10, 10],
[7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 9, 10, 10]
];
function biomeForCell(cell) {
  if(cell.biome)return cell.biome;
  if(!cell.land)return AZGAAR_BIOMES[0];
  const temperature=Math.round(30-Math.abs(cell.point[1]-430)*.11-Math.max(0,cell.elevation-.4)*18);
  const moisture=Math.max(0,Math.min(1,cell.moisture))*35,height=20+Math.max(0,Math.min(1,cell.elevation))*80;
  let id;
  if(temperature < -5)id=11;
  else if(temperature>=25&&moisture<8)id=1;
  else if(temperature> -2&&((moisture>40&&height<25)||(moisture>24&&height>24&&height<60)))id=12;
  else id=AZGAAR_BIOME_MATRIX[Math.min(Math.floor(moisture/5),4)][Math.min(Math.max(20-temperature,0),25)];
  return AZGAAR_BIOMES[id];
}
