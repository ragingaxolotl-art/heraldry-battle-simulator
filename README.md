# Heraldry Battle Simulator

A GitHub Pages-ready classroom simulator. Students create five fictional countries, upload heraldry images, invent resources and silly army units, then run a no-killing fictional battle that produces a winner, an upset chance, and school-themed consequences.

## Play with your class

Open https://ragingaxolotl-art.github.io/heraldry-battle-simulator/ in a browser. No installation or student account is needed.

1. Click **Load Sample** for a quick demonstration, or name all five countries.
2. Assign at least one country to each side and enter resources and units.
3. Optionally upload heraldry images for a morale bonus.
4. Choose the chaos level and click **Run Battle**.
5. Use **Copy Report** or **Download Report** to keep the outcome.

Each browser runs its own simulation; this is not a shared multiplayer session. Refreshing or resetting clears entries. Download the report before leaving. Uploaded images stay in the browser.

## Run locally

Open `index.html` directly, or run `python3 -m http.server 8000` in this folder and visit `http://localhost:8000`. There are no build dependencies. If clipboard access is unavailable, use **Download Report**.

## What students can enter

- Country name
- Heraldry image upload
- Side A or Side B
- Gold
- Basketball cannons
- Book launchers
- Pen fighters
- Screech mages

## How to use on GitHub Pages

1. Create a new GitHub repository.
2. Upload `index.html`, `styles.css`, `app.js`, `.nojekyll`, and this `README.md` to the repository root.
3. In GitHub, open **Settings -> Pages**.
4. Set the source to **Deploy from a branch**.
5. Choose the `main` branch and `/root`.
6. Save. GitHub will give you a Pages URL after it deploys.

The app uses only browser-side JavaScript. Student uploads stay in the browser and are not saved to a server.

## Classroom note

The simulator is intentionally fictional and non-lethal. Results use "knocked out" and pretend school consequences like detention, suspension, and being expelled from the fictional tournament realm.
