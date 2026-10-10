const COUNTRY_COUNT = 5;

const sampleCountries = [
  { name: "Valoria", side: "A", gold: 420, cannons: 12, books: 9, pens: 46, mages: 7 },
  { name: "The Northern Republic", side: "B", gold: 350, cannons: 16, books: 5, pens: 38, mages: 9 },
  { name: "Ironmark", side: "A", gold: 250, cannons: 7, books: 14, pens: 61, mages: 3 },
  { name: "The Ashen Coast", side: "B", gold: 510, cannons: 8, books: 12, pens: 29, mages: 11 },
  { name: "Westhaven", side: "A", gold: 180, cannons: 6, books: 16, pens: 52, mages: 5 }
];

const UNIT_TYPES = [
  {key: "cannons", label: "Artillery", weight: 13, exposure: 0.7},
  {key: "books", label: "Archers", weight: 7, exposure: 0.85},
  {key: "pens", label: "Infantry", weight: 4, exposure: 1.15},
  {key: "mages", label: "Cavalry", weight: 10, exposure: 1}
];
const chaosLabels = {1: "Low", 2: "Limited", 3: "Moderate", 4: "High", 5: "Very high"};
const armySize = country => UNIT_TYPES.reduce((sum, unit) => sum + country[unit.key], 0);

const grid = document.querySelector("#countryGrid");
const template = document.querySelector("#countryTemplate");
const chaosLevel = document.querySelector("#chaosLevel");
const chaosText = document.querySelector("#chaosText");
const battleButton = document.querySelector("#battleButton");
const sampleButton = document.querySelector("#sampleButton");
const resetButton = document.querySelector("#resetButton");
const copyButton = document.querySelector("#copyButton");
const downloadButton = document.querySelector("#downloadButton");
const formMessage = document.querySelector("#formMessage");
const results = document.querySelector("#results");

let lastReport = "";
const alliances = new Set();
const enemies = new Set();
const allianceKey = (a, b) => [Number(a), Number(b)].sort((x, y) => x - y).join("-");

// Flood-fill only near-white pixels connected to the image edge.
function clearOuterWhite(data, width, height) {
  const seen = new Uint8Array(width * height), queue = [];
  function add(p) {
    if (seen[p]) return;
    seen[p] = 1;
    const k = p * 4, low = Math.min(data[k], data[k+1], data[k+2]), high = Math.max(data[k], data[k+1], data[k+2]);
    if (data[k+3] === 0 || (low >= 235 && high-low <= 20)) queue.push(p);
  }
  for(let x=0;x<width;x++){add(x);add((height-1)*width+x);}
  for(let y=0;y<height;y++){add(y*width);add(y*width+width-1);}
  for(let i=0;i<queue.length;i++) {
    const p=queue[i]; data[p*4+3]=0;
    if(p%width) add(p-1); if(p%width<width-1) add(p+1);
    if(p>=width) add(p-width); if(p<width*(height-1)) add(p+width);
  }
  return data;
}

function createCountryCards() {
  grid.innerHTML = "";
  for (let i = 0; i < COUNTRY_COUNT; i += 1) {
    const card = template.content.firstElementChild.cloneNode(true);
    const imageInput = card.querySelector(".heraldry-input");
    const imagePreview = card.querySelector(".heraldry-preview");
    const imageDrop = card.querySelector(".heraldry-drop");

    const removeWhite = card.querySelector('.remove-white');
    const restoreShield = card.querySelector('.restore-shield');
    removeWhite.addEventListener('click', () => {
      const img = new Image(); removeWhite.disabled = true;
      img.onload = () => {
        const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
        const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
        const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
        clearOuterWhite(pixels.data,canvas.width,canvas.height);ctx.putImageData(pixels,0,0);
        imagePreview.src=canvas.toDataURL('image/png');restoreShield.disabled=false;
        card.querySelector('.shield-status').textContent='Outside white is transparent. Restore original if any shield detail disappeared.';
        card.dispatchEvent(new Event('shieldloaded',{bubbles:true}));
      };
      img.onerror=()=>{removeWhite.disabled=false;card.querySelector('.shield-status').textContent='Could not process this shield. Try uploading it again.';};
      img.src=card.dataset.originalShield || imagePreview.src;
    });
    restoreShield.addEventListener('click',()=>{
      imagePreview.src=card.dataset.originalShield;restoreShield.disabled=true;removeWhite.disabled=false;
      card.querySelector('.shield-status').textContent='Original shield restored.';
      card.dispatchEvent(new Event('shieldloaded',{bubbles:true}));
    });
    const nameInput = card.querySelector(".country-name");

    nameInput.placeholder = `Country ${i + 1}`;
    nameInput.addEventListener("input", refreshCountryChoices);

    imageInput.addEventListener("change", () => {
      const file = imageInput.files && imageInput.files[0];
      if (!file) {
        imagePreview.removeAttribute("src");
        imageDrop.classList.remove("has-image");
        return;
      }

      if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
        formMessage.textContent = "Choose a shield image smaller than 8 MB.";
        imageInput.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const scale = Math.min(1, 256 / Math.max(img.width, img.height));
          canvas.width = Math.max(1, Math.round(img.width * scale)); canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          imagePreview.src = canvas.toDataURL("image/png");
          card.dataset.originalShield=imagePreview.src;removeWhite.disabled=false;restoreShield.disabled=true;
          card.querySelector(".shield-status").textContent="Removes outside white; enclosed white details stay.";
          imageDrop.classList.add("has-image");
          card.dispatchEvent(new Event("shieldloaded", {bubbles:true}));
        };
        img.onerror = () => { formMessage.textContent = "That image could not be opened. Try a PNG or JPEG shield."; };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

    const deployment = document.createElement('fieldset');
    deployment.className = 'wide-field deployment';
    deployment.innerHTML = '<legend>Commit to next battle</legend><p>Choose how many of each type to send if this nation joins. Blank means all available. The rest stay safely in reserve.</p>';
    UNIT_TYPES.forEach(unit => {
      const label = document.createElement('label');
      label.textContent = unit.label;
      const input = document.createElement('input');
      input.type = 'number'; input.min = '0'; input.max = '999999'; input.step = '1';
      input.placeholder = 'All available'; input.className = `commit-${unit.key}`;
      label.append(input); deployment.append(label);
    });
    const half = document.createElement('button'); half.type = 'button'; half.className = 'secondary-button'; half.textContent = 'Send half';
    half.addEventListener('click', () => {
      UNIT_TYPES.forEach(u => { card.querySelector(`.commit-${u.key}`).value = Math.floor(numberValue(card, `.country-${u.key}`) / 2); });
      card.dispatchEvent(new Event('input', {bubbles:true}));
    });
    const all = document.createElement('button'); all.type = 'button'; all.className = 'secondary-button'; all.textContent = 'Send all';
    all.addEventListener('click', () => {
      UNIT_TYPES.forEach(u => { card.querySelector(`.commit-${u.key}`).value = ''; });
      card.dispatchEvent(new Event('input', {bubbles:true}));
    });
    const summary = document.createElement('p'); summary.className = 'deployment-summary'; summary.setAttribute('aria-live','polite');
    deployment.append(half, all, summary); card.querySelector('.country-pens').parentElement.parentElement.append(deployment);
    const updateDeployment = () => {
      let available=0, committed=0;
      UNIT_TYPES.forEach(u => { const total=numberValue(card, `.country-${u.key}`); const input=card.querySelector(`.commit-${u.key}`); available+=total; committed+=input.value===''?total:Math.min(total,Math.max(0,Math.floor(Number(input.value)||0))); });
      summary.textContent = `${committed.toLocaleString()} committed · ${(available-committed).toLocaleString()} in reserve. Requests above availability use only available troops.`;
    };
    card.addEventListener('input', updateDeployment); updateDeployment();
    grid.appendChild(card);
  }
  refreshCountryChoices();
}

function refreshCountryChoices() {
  const cards = [...grid.querySelectorAll(".country-card")];
  const names = cards.map((card, i) => card.querySelector(".country-name").value.trim() || `Country ${i + 1}`);
  ["sideAName", "sideBName"].forEach((id, position) => {
    const select = document.getElementById(id);
    const previous = select.value;
    select.replaceChildren(...names.map((name, i) => new Option(name, String(i))));
    select.value = previous || String(position);
  });
  cards.forEach((card, i) => {
    [[".ally-options", alliances, enemies, "Ally"], [".enemy-options", enemies, alliances, "Enemy"]].forEach(([selector, relationships, opposite, kind]) => {
      const options = card.querySelector(selector);
      options.replaceChildren();
      names.forEach((name, j) => {
        if (i === j) return;
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.setAttribute("aria-label", `${kind}: ${name}`);
        checkbox.checked = relationships.has(allianceKey(i, j));
        checkbox.addEventListener("change", () => {
          const key = allianceKey(i, j);
          if (checkbox.checked) { relationships.add(key); opposite.delete(key); }
          else relationships.delete(key);
          refreshCountryChoices();
        });
        label.append(checkbox, document.createTextNode(name));
        options.append(label);
      });
    });
  });
}

function numberValue(card, selector) {
  const input = card.querySelector(selector);
  const value = Number(input.value);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(Number(input.max), Math.floor(value));
}

function getCountries() {
  return [...document.querySelectorAll(".country-card")].map((card, index) => ({
    index,
    name: card.querySelector(".country-name").value.trim(),
    side: null,
    commitment: Object.fromEntries(UNIT_TYPES.map(u => {const value=card.querySelector(`.commit-${u.key}`).value; return [u.key, value === '' ? null : Math.min(999999,Math.max(0,Math.floor(Number(value)||0)))];})),
    gold: numberValue(card, ".country-gold"),
    cannons: numberValue(card, ".country-cannons"),
    books: numberValue(card, ".country-books"),
    pens: numberValue(card, ".country-pens"),
    mages: numberValue(card, ".country-mages"),
    hasHeraldry: card.querySelector(".heraldry-drop").classList.contains("has-image")
  }));
}

function setSample() {
  const cards = [...document.querySelectorAll(".country-card")];
  sampleCountries.forEach((country, index) => {
    const card = cards[index];
    card.querySelector(".country-name").value = country.name;

    card.querySelector(".country-gold").value = country.gold;
    card.querySelector(".country-cannons").value = country.cannons;
    card.querySelector(".country-books").value = country.books;
    card.querySelector(".country-pens").value = country.pens;
    card.querySelector(".country-mages").value = country.mages;
  });
  alliances.clear();
  enemies.clear();
  ["0-2", "0-4", "1-3"].forEach(key => alliances.add(key));
  ["0-3", "2-4"].forEach(key => enemies.add(key));
  refreshCountryChoices();
  document.querySelector("#sideAName").value = "0";
  document.querySelector("#sideBName").value = "1";
  results.classList.add("hidden");
  lastReport = "";
  copyButton.disabled = true;
  downloadButton.disabled = true;
  formMessage.textContent = "Sample countries, armies, and relationships restored.";
}

function resetForm() {
  alliances.clear();
  enemies.clear();
  document.querySelector("#sideAName").value = "0";
  document.querySelector("#sideBName").value = "1";
  document.querySelector("#allyChance").value = "60";
  document.querySelector("#hatredChance").value = "60";
  document.querySelector("#betrayalChance").value = "40";
  document.querySelector("#terrain").value = "plains";
  chaosLevel.value = "3";
  chaosText.textContent = chaosLabels[3];
  createCountryCards();
  results.classList.add("hidden");
  formMessage.textContent = "";
  lastReport = "";
  copyButton.disabled = true;
  downloadButton.disabled = true;
}

function validate(countries) {
  if (countries.some((country) => !country.name)) {
    return "Name all five countries before starting the battle.";
  }
  if (document.querySelector("#sideAName").value === document.querySelector("#sideBName").value) {
    return "Choose two different countries to battle.";
  }
  const attacker = Number(document.querySelector("#sideAName").value);
  const defender = Number(document.querySelector("#sideBName").value);
  if (!armySize(countries[attacker]) || !armySize(countries[defender])) return "Both selected countries need an army before they can fight.";
  const deployed = prepareBattleForces(countries.map(c=>({...c,side:'A'})));
  if (!armySize(deployed[attacker]) || !armySize(deployed[defender])) return 'Both opponents must commit at least one unit. Their reserves cannot fight for them.';
  return "";
}

function prepareBattleForces(countries) {
  return countries.map(country => {
    const force={...country, available:{}, reserves:{}};
    UNIT_TYPES.forEach(({key}) => {
      const available=country[key];
      const requested=country.commitment?.[key];
      const committed=country.side ? requested == null ? available : Math.min(available,Math.max(0,Math.floor(Number(requested)||0))) : 0;
      force.available[key]=available; force.reserves[key]=available-committed; force[key]=committed;
    });
    if (!armySize(force)) force.side=null;
    return force;
  });
}

function countryBasePower(country) {
  const size = armySize(country);
  if (!size) return 0;
  const supply = 1 + Math.min(0.2, country.gold / Math.max(size * 100, 1));
  const combinedArms = UNIT_TYPES.every(unit => country[unit.key] > 0) ? 1.1 : 1;
  return UNIT_TYPES.reduce((sum, unit) => sum + country[unit.key] * unit.weight, 0)
    * supply * combinedArms * (country.hasHeraldry ? 1.03 : 1);
}

function scoreSide(countries, side) {
  const members = countries.filter((country) => country.side === side && armySize(country) > 0);
  const base = members.reduce((sum, country) => sum + countryBasePower(country), 0);
  const teamwork = base * Math.min(0.08, Math.max(0, members.length - 1) * 0.025);
  const diversity = 0;
  return {
    side,
    members,
    base,
    baseWithSynergy: base + teamwork + diversity
  };
}

function withChaos(base, chaos, random = Math.random) {
  return base * (1 + (random() * 2 - 1) * (0.025 + chaos * 0.025));
}

function simulateCombat(countries, chaos, terrain, random = Math.random) {
  const armies = countries.map(country => ({...country}));
  const initialA = scoreSide(armies, "A").baseWithSynergy;
  const initialB = scoreSide(armies, "B").baseWithSynergy;
  const defense = {plains: 1, hills: 1.15, fortifications: 1.3}[terrain] || 1;
  const rounds = [];
  const roundDetails = [];
  let finalA = 0, finalB = 0;
  for (let round = 1; round <= 6; round++) {
    finalA = withChaos(scoreSide(armies, "A").baseWithSynergy, chaos, random);
    finalB = withChaos(scoreSide(armies, "B").baseWithSynergy * defense, chaos, random);
    if (!finalA || !finalB) break;
    const losses = {A: 0, B: 0};
    const beforeRound=armies.map(c=>({...c}));
    // Both sides take losses from the same pre-round strength snapshot.
    armies.forEach(country => {
      if (!country.side) return;
      const own = country.side === "A" ? finalA : finalB;
      const enemy = country.side === "A" ? finalB : finalA;
      const rate = Math.min(0.38, 0.055 * enemy / Math.max(own, 1));
      UNIT_TYPES.forEach(unit => {
        const expected = country[unit.key] * rate * unit.exposure;
        const lost = Math.min(country[unit.key], Math.floor(expected) + (random() < expected % 1 ? 1 : 0));
        country[unit.key] -= lost;
        losses[country.side] += lost;
      });
    });
    rounds.push(`Round ${round}: attacker lost ${losses.A} units; defender lost ${losses.B} units.`);
    roundDetails.push({round, countries:armies.filter(c=>c.side).map(c=>{const before=beforeRound.find(b=>b.index===c.index);return {index:c.index,name:c.name,side:c.side,units:UNIT_TYPES.map(u=>({label:u.label,before:before[u.key],lost:before[u.key]-c[u.key],remaining:c[u.key]}))};}), losses:{...losses}, remaining:{A:armies.filter(c=>c.side==='A').reduce((n,c)=>n+armySize(c),0),B:armies.filter(c=>c.side==='B').reduce((n,c)=>n+armySize(c),0)}});
    const remainingA = scoreSide(armies, "A").baseWithSynergy;
    const remainingB = scoreSide(armies, "B").baseWithSynergy;
    if (remainingA < initialA * 0.45 || remainingB < initialB * 0.45) break;
  }
  const remainingA = scoreSide(armies, "A").baseWithSynergy;
  const remainingB = scoreSide(armies, "B").baseWithSynergy;
  const winnerSide = remainingA === 0 ? "B" : remainingB === 0 ? "A" : remainingA < initialA * 0.45 ? "B" : remainingB < initialB * 0.45 ? "A" : remainingA > remainingB * defense ? "A" : "B";
  const casualties = countries.map((country, index) => ({
    index: country.index, name: country.name, side: country.side,
    units: UNIT_TYPES.map(unit => ({...unit, before: country[unit.key], lost: country[unit.key] - armies[index][unit.key], remaining: armies[index][unit.key], reserve: country.reserves?.[unit.key] || 0, available: country.available?.[unit.key] ?? country[unit.key], nationalRemaining: armies[index][unit.key] + (country.reserves?.[unit.key] || 0)}))
  }));
  return {finalA: remainingA, finalB: remainingB * defense, winnerSide, casualties, rounds, roundDetails};
}

function resolveAllies(countries, attacker, defender, chance, random = Math.random, hatred = 60, betrayal = 40) {
  const responses = [];
  countries.forEach(country => {
    country.side = country.index === attacker ? "A" : country.index === defender ? "B" : null;
    if (country.side) return;
    const alliedA = alliances.has(allianceKey(country.index, attacker));
    const alliedB = alliances.has(allianceKey(country.index, defender));
    if (alliedA && alliedB) {
      responses.push(`${country.name} stayed neutral: allied with both opponents.`);
    } else if (alliedA || alliedB) {
      const leader = countries[alliedA ? attacker : defender].name;
      if (random() < chance / 100) {
        country.side = alliedA ? "A" : "B";
        responses.push(`${country.name} joined ${leader} (${chance}% help chance).`);
      } else {
        responses.push(`${country.name} did not answer ${leader}'s call (${chance}% help chance).`);
      }
    } else {
      responses.push(`${country.name} stayed neutral: no alliance with either opponent.`);
    }
  });
  // Hatred decisions use a fixed snapshot so card order cannot change the outcome.
  const initialSides = countries.map(country => country.side);
  countries.forEach(country => {
    if (country.index === attacker || country.index === defender) return;
    const foes = countries.filter(other => initialSides[other.index] && enemies.has(allianceKey(country.index, other.index)));
    const foeSides = new Set(foes.map(other => initialSides[other.index]));
    if (foeSides.size === 1) {
      const enemySide = [...foeSides][0];
      const target = enemySide === "A" ? "B" : "A";
      if (country.side === target) {
        responses.push(`${country.name} is already fighting against its enemy ${foes.map(foe => foe.name).join(", ")}.`);
      } else if (random() < hatred / 100) {
        country.side = target;
        responses.push(`${country.name} joined ${countries[target === "A" ? attacker : defender].name} out of hatred for ${foes.map(foe => foe.name).join(", ")} (${hatred}% chance).`);
      } else {
        responses.push(`${country.name} resisted joining against its enemies (${hatred}% hatred chance).`);
      }
    } else if (foeSides.size > 1) {
      responses.push(`${country.name} has enemies on both sides; hatred did not change its allegiance.`);
    }
  });
  // One simultaneous betrayal round; the two selected opponents always stay put.
  const beforeBetrayal = countries.map(country => country.side);
  countries.forEach(country => {
    if (country.index === attacker || country.index === defender) return;
    const incidents = [];
    countries.forEach(ally => {
      const side = beforeBetrayal[ally.index];
      if (!side || !alliances.has(allianceKey(country.index, ally.index))) return;
      const foe = countries.find(other => beforeBetrayal[other.index] === side && enemies.has(allianceKey(country.index, other.index)));
      if (foe) incidents.push({ally, foe, side});
    });
    if (!incidents.length) return;
    const sides = new Set(incidents.map(incident => incident.side));
    if (sides.size > 1) {
      responses.push(`${country.name} found conflicting betrayals on both sides and kept its current position.`);
      return;
    }
    const {ally, foe, side} = incidents[0];
    const target = side === "A" ? "B" : "A";
    if (country.side === target) {
      responses.push(`${country.name} is already opposing ally ${ally.name}, who sided with enemy ${foe.name}.`);
    } else if (random() < betrayal / 100) {
      country.side = target;
      responses.push(`${country.name} turned against ally ${ally.name} for helping enemy ${foe.name}, joining ${countries[target === "A" ? attacker : defender].name} (${betrayal}% betrayal chance).`);
    } else {
      responses.push(`${country.name} did not turn against ally ${ally.name} despite its support for enemy ${foe.name} (${betrayal}% betrayal chance).`);
    }
  });
  return responses;
}

function runBattle() {
  let countries = getCountries();
  const error = validate(countries);
  if (error) {
    formMessage.textContent = error;
    results.classList.add("hidden");
    lastReport = "";
    copyButton.disabled = true;
    downloadButton.disabled = true;
    return;
  }

  formMessage.textContent = "";
  const attacker = Number(document.querySelector("#sideAName").value);
  const defender = Number(document.querySelector("#sideBName").value);
  const sideAName = countries[attacker].name;
  const sideBName = countries[defender].name;
  const chance = Math.max(0, Math.min(100, Number(document.querySelector("#allyChance").value) || 0));
  const percentage = id => Math.max(0, Math.min(100, Number(document.getElementById(id).value) || 0));
  const responses = resolveAllies(countries, attacker, defender, chance, Math.random, percentage("hatredChance"), percentage("betrayalChance"));
  countries = prepareBattleForces(countries);
  countries.filter(c=>!c.side).forEach(c=>responses.push(`${c.name} commits no troops; its entire army stays in reserve.`));
  document.querySelector("#allyResponses").replaceChildren(...responses.map(text => {
    const item = document.createElement("li");
    item.textContent = text;
    return item;
  }));
  const chaos = Number(chaosLevel.value);
  const sideA = scoreSide(countries, "A");
  const sideB = scoreSide(countries, "B");
  const battlefield=typeof chooseMapBattlefield==='function'?chooseMapBattlefield(defender):null;
  if(battlefield)document.querySelector("#terrain").value=battlefield.terrain;
  const combat = simulateCombat(countries, chaos, document.querySelector("#terrain").value);
  const {finalA, finalB, winnerSide} = combat;
  const upset = {happened: winnerSide !== (sideA.baseWithSynergy >= sideB.baseWithSynergy ? "A" : "B"), reason: "Terrain and battlefield attrition overcame the initial strength advantage."};
  const loserSide = winnerSide === "A" ? "B" : "A";
  const winner = winnerSide === "A" ? sideA : sideB;
  const loser = loserSide === "A" ? sideA : sideB;
  const winnerName = winnerSide === "A" ? sideAName : sideBName;
  const loserName = loserSide === "A" ? sideAName : sideBName;
  const winnerFinal = winnerSide === "A" ? finalA : finalB;
  const loserFinal = loserSide === "A" ? finalA : finalB;
  const margin = Math.abs(winnerFinal - loserFinal);
  const total = Math.max(finalA + finalB, 1);

  const battleModel = {
    battlefield,
    combat,
    countries,
    sideA,
    sideB,
    sideAName,
    sideBName,
    finalA,
    finalB,
    winner,
    loser,
    winnerName,
    loserName,
    winnerSide,
    loserSide,
    winnerFinal,
    loserFinal,
    margin,
    total,
    chaos,
    upset
  };
  renderResults(battleModel);
  combat.casualties.forEach(record => {
    const card = grid.querySelectorAll(".country-card")[record.index];
    record.units.forEach(unit => { card.querySelector(`.country-${unit.key}`).value = unit.nationalRemaining; });
  });
  grid.querySelectorAll('.country-card').forEach(card=>card.dispatchEvent(new Event('input',{bubbles:true})));
  formMessage.textContent = "Losses applied only to committed troops. Army fields include returning survivors and untouched reserves.";
  if (typeof recordMapBattle === "function") recordMapBattle(battleModel);
}

function renderResults(model) {
  const {
    countries,
    sideA,
    sideB,
    sideAName,
    sideBName,
    finalA,
    finalB,
    winner,
    loser,
    winnerName,
    loserName,
    winnerSide,
    winnerFinal,
    loserFinal,
    margin,
    total,
    chaos,
    upset
  } = model;

  const story = `${winnerName} secured the battlefield after ${model.combat.rounds.length} combat rounds. ${loserName} withdrew. Losses include personnel killed, wounded, captured, or dispersed, and equipment destroyed or abandoned. All losses have been removed from available armies. This is a simplified strategy model, not a historical prediction.`;

  document.querySelector("#winnerTitle").textContent = `${winnerName} Wins`;
  document.querySelector("#upsetBadge").classList.toggle("hidden", !upset.happened);
  document.querySelector("#scoreATitle").textContent = sideAName;
  document.querySelector("#scoreBTitle").textContent = sideBName;
  document.querySelector("#scoreABar").style.width = `${Math.max(8, (finalA / Math.max(finalA, finalB)) * 100)}%`;
  document.querySelector("#scoreBBar").style.width = `${Math.max(8, (finalB / Math.max(finalA, finalB)) * 100)}%`;
  document.querySelector("#scoreASummary").textContent = `${Math.round(finalA)} final power from ${sideA.members.length} countries. Base strength: ${Math.round(sideA.baseWithSynergy)}.`;
  document.querySelector("#scoreBSummary").textContent = `${Math.round(finalB)} final power from ${sideB.members.length} countries. Base strength: ${Math.round(sideB.baseWithSynergy)}.`;
  document.querySelector("#storyText").textContent = story;

  document.querySelector("#roundLog").replaceChildren(...model.combat.rounds.map(text => {
    const li = document.createElement("li"); li.textContent = text; return li;
  }));
  renderCasualties(model.combat.casualties);
  renderCountryReport(countries, winnerSide);

  lastReport = buildTextReport({
    combat: model.combat,
    countries,
    sideAName,
    sideBName,
    finalA,
    finalB,
    winnerName,
    loserName,
    story,
    upset
  });
  copyButton.disabled = false;
  downloadButton.disabled = false;
  results.classList.remove("hidden");
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderCasualties(records) {
  const list = document.querySelector("#consequenceList");
  list.replaceChildren(...records.map(record => {
    const div = document.createElement("div");
    div.className = "consequence-item";
    const title = document.createElement("strong");
    title.textContent = `${record.name}${record.side ? "" : " — neutral"}`;
    const details = document.createElement("div");
    details.className = "loss-facts";
    record.units.forEach(unit => {
      const fact = document.createElement("p");
      fact.textContent = `${unit.label}: committed ${unit.before.toLocaleString()}; lost ${unit.lost.toLocaleString()}; ${unit.remaining.toLocaleString()} returned; ${unit.reserve.toLocaleString()} in reserve; ${unit.nationalRemaining.toLocaleString()} available nationally.`;
      details.append(fact);
    });
    div.append(title, details); return div;
  }));
}

function renderCountryReport(countries, winnerSide) {
  const report = document.querySelector("#countryReport");
  report.innerHTML = "";
  countries
    .map((country) => ({
      ...country,
      power: countryBasePower(country)
    }))
    .sort((a, b) => b.power - a.power)
    .forEach((country) => {
      const result = !country.side ? "Neutral — did not participate" : country.side === winnerSide ? "Winning side" : "Defeated side";
      const div = document.createElement("div");
      div.className = "country-result";
      div.innerHTML = `
        <strong>${escapeHtml(country.name)}</strong>
        <span>${result}. Starting power: ${Math.round(country.power)}. Best unit: ${escapeHtml(bestUnitName(country))}. ${country.hasHeraldry ? "Heraldry morale bonus active." : "No heraldry bonus yet."}</span>
      `;
      report.appendChild(div);
    });
}

function buildTextReport(data) {
  const countryLines = data.countries.map((country) => (
    `- ${country.name}: ${!country.side ? "Neutral" : country.side === "A" ? data.sideAName : data.sideBName}, gold ${country.gold}, artillery ${country.cannons}, archers ${country.books}, infantry ${country.pens}, cavalry ${country.mages}`
  ));
  return [
    "Kingdoms at War Report",
    "",
    `Winner: ${data.winnerName}`,
    `Defeated side: ${data.loserName}`,
    `Score: ${data.sideAName} ${Math.round(data.finalA)} vs ${data.sideBName} ${Math.round(data.finalB)}`,
    data.upset.happened ? `Upset: Yes. ${data.upset.reason}` : "Upset: No",
    "",
    data.story,
    "",
    "Diplomacy responses:",
    ...[...document.querySelectorAll("#allyResponses li")].map(item => item.textContent),
    "",
    "Casualties (before / lost / remaining):",
    ...data.combat.casualties.map(record => `${record.name}: ${record.units.map(unit => `${unit.label} ${unit.before}/${unit.lost}/${unit.remaining}, reserve ${unit.reserve}, national remaining ${unit.nationalRemaining}`).join("; ")}`),
    "",
    "Combat rounds:",
    ...data.combat.rounds,
    "",
    "Countries at battle start:",
    ...countryLines
  ].join("\n");
}

function bestUnitName(country) {
  if (!armySize(country)) return "None";
  return [...UNIT_TYPES].sort((a, b) => country[b.key] - country[a.key])[0].label;
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function copyReport() {
  if (!lastReport) return;
  try {
    await navigator.clipboard.writeText(lastReport);
    formMessage.textContent = "Report copied.";
  } catch {
    formMessage.textContent = "Copy was blocked by the browser. Use Download Report instead.";
  }
}

function downloadReport() {
  if (!lastReport) return;
  const blob = new Blob([lastReport], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "heraldry-battle-report.txt";
  link.click();
  URL.revokeObjectURL(url);
}

chaosLevel.addEventListener("input", () => {
  chaosText.textContent = chaosLabels[chaosLevel.value];
});

battleButton.addEventListener("click", runBattle);
sampleButton.addEventListener("click", setSample);
resetButton.addEventListener("click", resetForm);
copyButton.addEventListener("click", copyReport);
downloadButton.addEventListener("click", downloadReport);

createCountryCards();
