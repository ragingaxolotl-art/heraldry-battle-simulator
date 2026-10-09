# Kingdoms at War

A fictional strategy simulator with five countries, diplomacy, terrain, combat rounds, and army attrition.

## Play with your class

Open https://ragingaxolotl-art.github.io/heraldry-battle-simulator/ in a browser. No installation or student account is needed.

1. Click **Load Sample** for a quick demonstration, or name all five countries.
2. Choose the attacking and defending countries from the dropdowns, and enter resources and units.
3. Optionally upload heraldry images for a morale bonus.
4. Choose allies and enemies for each country, adjust the help, hatred, betrayal, and battlefield uncertainty settings, then click **Run Battle**.
5. Use **Copy Report** or **Download Report** to keep the outcome.

Each browser runs its own simulation; this is not a shared multiplayer session. Refreshing or resetting clears entries. Download the report before leaving. Uploaded images stay in the browser.

## Run locally

Open `index.html` directly, or run `python3 -m http.server 8000` in this folder and visit `http://localhost:8000`. There are no build dependencies. If clipboard access is unavailable, use **Download Report**.

## What students can enter

- Country name
- Heraldry image upload
- Mutual allies and enemies
- Attacking and defending country selections
- Ally help, hatred, and betrayal probabilities
- Gold
- Artillery
- Archers
- Infantry
- Cavalry

## How to use on GitHub Pages

1. Create a new GitHub repository.
2. Upload `index.html`, `styles.css`, `app.js`, `.nojekyll`, and this `README.md` to the repository root.
3. In GitHub, open **Settings -> Pages**.
4. Set the source to **Deploy from a branch**.
5. Choose the `main` branch and `/root`.
6. Save. GitHub will give you a Pages URL after it deploys.

The app uses only browser-side JavaScript. Student uploads stay in the browser and are not saved to a server.

## Combat and losses

Armies use infantry, archers, cavalry, and artillery. Weighted unit strength, combined arms, limited supply support from gold, heraldry morale, and defensive terrain affect combat. Gold alone cannot fight. Each battle resolves up to six rounds with simultaneous losses; a force may withdraw after falling below 45% of its initial strength. The surviving effective strength decides battles that reach the round limit; exact ties favor the defender. Random forced upsets have been removed.

The casualty table and downloadable report show each unit type's starting amount, losses, and survivors. Losses cover personnel unavailable through death, wounds, capture, or dispersal, plus equipment losses. These are abstract game units and estimated outcomes, not historically calibrated predictions.

Army fields are reduced immediately after a battle, including allies and enemies who join. Neutral armies are unchanged. The next battle uses those survivors. Countries with no units cannot be selected to lead another battle. Refreshing resets the session; Load Sample replenishes the example forces. Download reports to retain results.

## Diplomacy rules

Allies and enemies are mutual and mutually exclusive. The two selected opponents always fight on their original sides. Other countries first roll to help a direct ally (60% by default); allies shared by both opponents initially stay neutral. Next, countries may join against participating enemies (60% by default). If enemies are on both sides, hatred leaves their position unchanged. Finally, a country whose ally fights alongside its enemy may turn against that ally (40% by default). Conflicting betrayal triggers on both sides leave its position unchanged. Each stage uses a fixed snapshot so country ordering cannot affect decisions. There is one betrayal round, with no endless chain of switches.

All probabilities can be set from 0% to 100%. Only participating countries contribute power or receive defeat consequences. The diplomacy log explains each decision and is included in the report. Relationships are not permanently changed by a battle.

Run diplomacy tests with `node tests/alliances.cjs`.
