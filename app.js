const COUNTRY_COUNT = 5;

const sampleCountries = [
  { name: "Algebravia", side: "A", gold: 420, cannons: 12, books: 9, pens: 46, mages: 7 },
  { name: "The Republic of Recess", side: "B", gold: 350, cannons: 16, books: 5, pens: 38, mages: 9 },
  { name: "Pencilvania", side: "A", gold: 250, cannons: 7, books: 14, pens: 61, mages: 3 },
  { name: "The Chalk Coast", side: "B", gold: 510, cannons: 8, books: 12, pens: 29, mages: 11 },
  { name: "Binderburg", side: "A", gold: 180, cannons: 6, books: 16, pens: 52, mages: 5 }
];

const roundOpeners = [
  "The gym floor trembled as {country} rolled out {unit} with suspicious confidence.",
  "{country} tried a brilliant hallway maneuver using {unit}, and everyone pretended it was in the treaty.",
  "A dramatic banner wave from {country} gave {side} a loud morale boost.",
  "{country} used spare gold to buy glitter stickers for the battle map. Somehow, it worked.",
  "{country} attempted a cafeteria flank and accidentally discovered a better route.",
  "{country} formed a defensive rectangle around the pencil sharpener.",
  "A sudden quiz announcement stunned the battlefield for six whole seconds.",
  "{country} shouted a battle slogan so catchy that even the other side clapped once."
];

const unitMoments = {
  cannons: [
    "basketball cannons launched foam volleys in perfect arcs",
    "basketball cannons bounced shots off the backboard of destiny",
    "basketball cannons created a rolling orange wall of gym-class panic"
  ],
  books: [
    "book launchers fired dictionaries with excellent citations",
    "book launchers made a textbook blizzard across the field",
    "book launchers sent novels spinning like scholarly comets"
  ],
  pens: [
    "pen fighters fenced bravely with capped markers",
    "pen fighters guarded the supply cart with heroic posture",
    "pen fighters drew tactical arrows on everything"
  ],
  mages: [
    "screech mages hit a note that made the windows reconsider their choices",
    "screech mages cast the ancient spell of Too Much Volume",
    "screech mages distracted everyone with legendary playground noise"
  ]
};

const winnerEndings = [
  "won after the other side's battle plan got covered in correction tape.",
  "won because their supply line stayed organized and their banners looked extremely official.",
  "won when the judges ruled that their strategy was confusing, but technically effective.",
  "won after a final notebook charge scattered the last defenders into a harmless pile of backpack straps.",
  "won because their screech mages saved one perfect yell for the exact wrong moment for the opposition.",
  "won when their book launchers created enough homework fog to hide the winning maneuver."
];

const consequenceBank = [
  { rank: "Knocked out", className: "knockout", text: "Sent to the recovery bench with a juice box and a very serious clipboard." },
  { rank: "In-school detention", className: "detention", text: "Assigned to silently organize the royal pencil drawer during lunch." },
  { rank: "After-school detention", className: "detention", text: "Required to clean confetti off the battle map while humming the losing anthem." },
  { rank: "Suspension", className: "suspension", text: "Suspended from the next tournament round for excessive dramatic pointing." },
  { rank: "Expelled", className: "expelled", text: "Expelled from the tournament realm and banished to the far end of the cafeteria line." },
  { rank: "Knocked out", className: "knockout", text: "Briefly defeated by a flying notebook and a confusing rule clarification." },
  { rank: "In-school detention", className: "detention", text: "Must rewrite the peace treaty in neat handwriting." },
  { rank: "After-school detention", className: "detention", text: "Must return every launched book to the correct shelf by genre." },
  { rank: "Suspension", className: "suspension", text: "Benched from diplomacy because the ambassador kept yelling 'objection' at clouds." },
  { rank: "Expelled", className: "expelled", text: "Expelled from the council of snack privileges until the next fictional era." }
];

const chaosLabels = {
  1: "Predictable",
  2: "Orderly",
  3: "Balanced",
  4: "Wild",
  5: "Total Nonsense"
};

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

function createCountryCards() {
  grid.innerHTML = "";
  for (let i = 0; i < COUNTRY_COUNT; i += 1) {
    const card = template.content.firstElementChild.cloneNode(true);
    const imageInput = card.querySelector(".heraldry-input");
    const imagePreview = card.querySelector(".heraldry-preview");
    const imageDrop = card.querySelector(".heraldry-drop");

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

      const reader = new FileReader();
      reader.onload = () => {
        imagePreview.src = reader.result;
        imageDrop.classList.add("has-image");
      };
      reader.readAsDataURL(file);
    });

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
  formMessage.textContent = "Sample countries and alliances loaded. Allies each have a chance to help.";
}

function resetForm() {
  alliances.clear();
  enemies.clear();
  document.querySelector("#sideAName").value = "0";
  document.querySelector("#sideBName").value = "1";
  document.querySelector("#allyChance").value = "60";
  document.querySelector("#hatredChance").value = "60";
  document.querySelector("#betrayalChance").value = "40";
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
  return "";
}

function getUnitHighlight(country) {
  const units = [
    { key: "cannons", count: country.cannons },
    { key: "books", count: country.books },
    { key: "pens", count: country.pens },
    { key: "mages", count: country.mages }
  ].sort((a, b) => b.count - a.count);
  const top = units[0].key;
  return pick(unitMoments[top]);
}

function countryBasePower(country) {
  const goldPower = Math.sqrt(country.gold) * 3.2;
  const unitPower =
    country.cannons * 13 +
    country.books * 11 +
    country.pens * 4 +
    country.mages * 16;
  const combinedArmsBonus = Math.min(country.cannons, country.books, country.mages) * 5;
  const heraldryBonus = country.hasHeraldry ? 35 : 0;
  const tooMuchGoldPenalty = country.gold > 5000 ? Math.log10(country.gold) * 12 : 0;
  return Math.max(1, unitPower + goldPower + combinedArmsBonus + heraldryBonus - tooMuchGoldPenalty);
}

function scoreSide(countries, side) {
  const members = countries.filter((country) => country.side === side);
  const base = members.reduce((sum, country) => sum + countryBasePower(country), 0);
  const teamwork = members.length > 1 ? members.length * 18 : 0;
  const diversity =
    Math.min(30, members.reduce((sum, country) => sum + Math.min(country.cannons, country.books, country.pens, country.mages), 0));
  return {
    side,
    members,
    base,
    baseWithSynergy: base + teamwork + diversity
  };
}

function withChaos(base, chaos) {
  const swing = 0.08 + chaos * 0.065;
  const multiplier = 1 + (Math.random() * 2 - 1) * swing;
  return Math.max(1, base * multiplier + Math.random() * chaos * 25);
}

function maybeUpset(sideA, sideB, finalA, finalB, chaos) {
  const stronger = sideA.baseWithSynergy >= sideB.baseWithSynergy ? "A" : "B";
  const weaker = stronger === "A" ? "B" : "A";
  const finalWinner = finalA >= finalB ? "A" : "B";

  if (finalWinner === weaker) {
    return { happened: true, winner: weaker, reason: "The underdog's chaos roll overtook the stronger starting army." };
  }

  const strongerScore = Math.max(sideA.baseWithSynergy, sideB.baseWithSynergy);
  const weakerScore = Math.min(sideA.baseWithSynergy, sideB.baseWithSynergy);
  const gap = strongerScore - weakerScore;
  const closeness = Math.max(0, 1 - gap / Math.max(strongerScore, 1));
  const upsetChance = 0.04 + chaos * 0.025 + closeness * 0.12;

  if (Math.random() < upsetChance) {
    return { happened: true, winner: weaker, reason: "A surprise ruling, lucky bounce, and loud hallway echo flipped the result." };
  }

  return { happened: false, winner: finalWinner, reason: "" };
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
  const countries = getCountries();
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
  document.querySelector("#allyResponses").replaceChildren(...responses.map(text => {
    const item = document.createElement("li");
    item.textContent = text;
    return item;
  }));
  const chaos = Number(chaosLevel.value);
  const sideA = scoreSide(countries, "A");
  const sideB = scoreSide(countries, "B");
  const finalA = withChaos(sideA.baseWithSynergy, chaos);
  const finalB = withChaos(sideB.baseWithSynergy, chaos);
  const upset = maybeUpset(sideA, sideB, finalA, finalB, chaos);
  const winnerSide = upset.happened ? upset.winner : finalA >= finalB ? "A" : "B";
  const loserSide = winnerSide === "A" ? "B" : "A";
  const winner = winnerSide === "A" ? sideA : sideB;
  const loser = loserSide === "A" ? sideA : sideB;
  const winnerName = winnerSide === "A" ? sideAName : sideBName;
  const loserName = loserSide === "A" ? sideAName : sideBName;
  const winnerFinal = winnerSide === "A" ? finalA : finalB;
  const loserFinal = loserSide === "A" ? finalA : finalB;
  const margin = Math.abs(winnerFinal - loserFinal);
  const total = Math.max(finalA + finalB, 1);

  renderResults({
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
  });
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

  const winVerb = pick(winnerEndings);
  const closeness = margin / total;
  const verdict = closeness < 0.06 ? "by a squeaky hallway squeaker margin" : closeness < 0.18 ? "after a close contest" : "with a commanding scoreboard";
  const upsetLine = upset.happened ? ` This counts as an upset: ${upset.reason}` : "";
  const story = `${winnerName} ${winVerb} They defeated ${loserName} ${verdict}. Nobody was harmed; the defeated side was simply knocked out of the fictional match and sent to consequence court.${upsetLine}`;

  document.querySelector("#winnerTitle").textContent = `${winnerName} Wins`;
  document.querySelector("#upsetBadge").classList.toggle("hidden", !upset.happened);
  document.querySelector("#scoreATitle").textContent = sideAName;
  document.querySelector("#scoreBTitle").textContent = sideBName;
  document.querySelector("#scoreABar").style.width = `${Math.max(8, (finalA / Math.max(finalA, finalB)) * 100)}%`;
  document.querySelector("#scoreBBar").style.width = `${Math.max(8, (finalB / Math.max(finalA, finalB)) * 100)}%`;
  document.querySelector("#scoreASummary").textContent = `${Math.round(finalA)} final power from ${sideA.members.length} countries. Base strength: ${Math.round(sideA.baseWithSynergy)}.`;
  document.querySelector("#scoreBSummary").textContent = `${Math.round(finalB)} final power from ${sideB.members.length} countries. Base strength: ${Math.round(sideB.baseWithSynergy)}.`;
  document.querySelector("#storyText").textContent = story;

  renderRounds(countries.filter(country => country.side), winnerName, loserName, chaos);
  renderConsequences(loser, winnerName, loserName, closeness, chaos);
  renderCountryReport(countries, winnerSide);

  lastReport = buildTextReport({
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

function renderRounds(countries, winnerName, loserName, chaos) {
  const roundLog = document.querySelector("#roundLog");
  roundLog.innerHTML = "";
  const rounds = Math.min(9, 5 + chaos);
  for (let i = 0; i < rounds; i += 1) {
    const country = pick(countries);
    const sideName = country.side === "A"
      ? document.querySelector("#sideAName").selectedOptions[0].textContent
      : document.querySelector("#sideBName").selectedOptions[0].textContent;
    const text = pick(roundOpeners)
      .replace("{country}", country.name)
      .replace("{side}", sideName)
      .replace("{unit}", getUnitHighlight(country));
    const item = document.createElement("li");
    item.textContent = i === rounds - 1
      ? `${winnerName} sealed the match while ${loserName} requested a very official re-count of the snack tokens.`
      : text;
    roundLog.appendChild(item);
  }
}

function renderConsequences(loser, winnerName, loserName, closeness, chaos) {
  const list = document.querySelector("#consequenceList");
  list.innerHTML = "";
  const maxSeverity = closeness < 0.06 ? 2 : closeness < 0.18 ? 3 : chaos >= 4 ? 5 : 4;
  const chosen = [];

  loser.members.forEach((country, index) => {
    const severityRoll = Math.min(maxSeverity, 1 + Math.floor(Math.random() * maxSeverity));
    const filtered = consequenceBank.filter((item) => severityScore(item.rank) <= severityRoll + 1);
    const consequence = pick(filtered);
    chosen.push({
      country: country.name,
      consequence,
      text: `${country.name} from ${loserName}: ${consequence.text}`
    });
  });

  if (chosen.length < 3) {
    chosen.push({
      country: winnerName,
      consequence: { rank: "Victory paperwork", className: "knockout" },
      text: `${winnerName}: Must write a humble victory speech that uses the word "sportsmanship" twice.`
    });
  }

  chosen.forEach((entry) => {
    const div = document.createElement("div");
    div.className = `consequence-item ${entry.consequence.className}`;
    div.innerHTML = `<strong>${entry.consequence.rank}</strong><span>${escapeHtml(entry.text)}</span>`;
    list.appendChild(div);
  });
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
        <span>${result}. Power: ${Math.round(country.power)}. Best unit: ${escapeHtml(bestUnitName(country))}. ${country.hasHeraldry ? "Heraldry morale bonus active." : "No heraldry bonus yet."}</span>
      `;
      report.appendChild(div);
    });
}

function buildTextReport(data) {
  const countryLines = data.countries.map((country) => (
    `- ${country.name}: ${!country.side ? "Neutral" : country.side === "A" ? data.sideAName : data.sideBName}, gold ${country.gold}, basketball cannons ${country.cannons}, book launchers ${country.books}, pen fighters ${country.pens}, screech mages ${country.mages}`
  ));
  return [
    "Heraldry Battle Simulator Report",
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
    "Countries:",
    ...countryLines
  ].join("\n");
}

function bestUnitName(country) {
  const units = [
    { name: "basketball cannons", count: country.cannons },
    { name: "book launchers", count: country.books },
    { name: "pen fighters", count: country.pens },
    { name: "screech mages", count: country.mages }
  ].sort((a, b) => b.count - a.count);
  return units[0].name;
}

function severityScore(rank) {
  if (rank === "Expelled") return 5;
  if (rank === "Suspension") return 4;
  if (rank === "After-school detention") return 3;
  if (rank === "In-school detention") return 2;
  return 1;
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
