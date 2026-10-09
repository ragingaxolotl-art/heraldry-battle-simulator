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
  return {version:1,seed,width,height,cells,countries,selected:[0,1,2,3,4],relations:{},settings:{sideAName:'0',sideBName:'1',allyChance:'60',hatredChance:'60',betrayalChance:'40',terrain:'plains',chaosLevel:'3'},history:[]};
}
function biomeForCell(cell) {
  if (!cell.land) return {name:'Ocean',color:'#adc9d7'};
  if (cell.elevation > .86) return {name:'Highlands',color:'#9c9888'};
  if (cell.moisture < .23) return {name:'Drylands',color:'#dfc88a'};
  if (cell.moisture > .64) return {name:'Forest',color:'#6c9e78'};
  return {name:'Grassland',color:'#b6cc88'};
}
