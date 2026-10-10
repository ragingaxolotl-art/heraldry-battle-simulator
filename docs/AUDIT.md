# Battle simulator audit — 9 October 2026

Scope: active browser application: army input, diplomacy, combat, formations, map/report rendering, saves, imports, heraldry, and the campaign/regiment source present during this review. The older Godot prototype received a static review of its battle/report code only; it was not run. Concurrent campaign work means this is a snapshot review, not certification of future edits.

## Implemented for this request

All 12 formations and 7 maneuvers have phase-aware narration (84 combinations). Narration includes exact round losses, surviving committed troops, and national reserves. Maneuvers are described as orders, not proven tactical successes. Missing infantry for a square and missing cavalry for a cavalry advance are explicitly described.

Map badges and accessible image descriptions show deployed, engaged, recorded losses, victory, defeat/withdrawal, and committed force lost. A destroyed contingent receives the force-lost badge even if its coalition wins. Existing destroyed-counter crosses and directional arrows remain. Withdrawal is a result convention, not a modeled retreat path. National reserves stay off the battlefield.

## Fixed findings

- **High — save recovery:** null entries in optional replay arrows/formations/units could throw and prevent recovery of otherwise valid national armies. These entries are now rejected without dereferencing null. Startup preserves unreadable JSON under `kingdoms-student-world-v1-recovery` before replacing the active save. If preserving it fails, autosave pauses instead of overwriting it. Download My Progress remains available for the new in-memory world.
- **Medium — import integrity:** imported coordinates outside declared map dimensions could generate a world that failed later save validation. Out-of-bounds coordinates and duplicate state identifiers are rejected. Custom biome indices and vertex/state counts are bounded.
- **Medium — asynchronous map loading:** an old image load could replace the current background. Completion now checks both world identity and image source.
- **Low — result illustration:** a winning formation with a withdrawal plan could display a defeat-style withdrawal arrow in its outcome. Outcome arrows now follow the recorded winning/losing side.

## Verification

All current non-browser test scripts pass: diplomacy, casualty conservation, exact per-round facts, commitments/reserves, neutral troops, repeated battles, world generation and restoration, Azgaar imports, map terrain selection, shield processing, all 84 formation/maneuver layouts and narration combinations, malformed replay entries, and regiment allocation/losses.

Chrome regression passed: five-country battle with heraldry; PNG download; two pictures per scene; wipeout with reserves preserved; replay/reload without repeated casualty deductions; persisted formation snapshots; zero-force rejection; mobile page width; no JavaScript errors. A separate Chrome recovery check confirmed original malformed JSON preservation and no overwrite when recovery storage fails. Twelve formation images were rendered, and the updated map image was visually inspected.

## Remaining findings and limits

- **Medium — no draw outcome:** simultaneous annihilation awards victory to the defender because `simulateCombat` checks attacker exhaustion first. Exact strength ties also favor the defender. A proper draw requires changes across outcome records, stories, badges, and save validation. This was not silently changed during presentation work.
- Maneuvers and formations are illustrations; they do not change combat odds, resolve flanking success, or avoid rivers/coasts. The map is a crop of saved geography, not newly generated tactical terrain. Combat uses aggregate attrition and terrain modifiers.
- General personalities and their story lines are fictional flavor, not independent combat actions. Campaign allocation was checked with pure tests; every atlas editing interaction was not exhaustively browser tested.
- Recovery JSON is retained in browser storage, but there is no dedicated recovery-download button yet. If recovery storage is unavailable, autosave stays paused for that page session.
- Large image histories can exceed browser storage quota. The app reports this and offers Download My Progress; browser storage is not a durable backup.
- Legacy Godot code uses a different scoring/upset system and decorative round log. It does not implement this browser app's saved tactical rounds or partial commitments; it has not been runtime validated.
- No production deployment, penetration test, cross-browser matrix, or exhaustive accessibility audit was performed. Narration added here applies to newly generated battles; older saved narration is preserved.
