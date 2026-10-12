# Eggbog

A two-player card game in a single HTML file. It has a normal mode, a Crazy mode with random card effects and Jokers, computer opponents (Easy to Expert), and online play with a friend.

- `eggbog.html`: the whole game. The rules engine sits between the `// ==ENGINE==` and `// ==END ENGINE==` markers.
- `test_engine.js`: engine tests. Run `node test_engine.js` from this folder. It takes a few minutes because of the Expert games.
- `sims/`: simulation scripts. `bash sims/run_crazy.sh` then `node sims/report.js crazy` writes `sims/results.md` (Crazy mode, about 18 minutes on 4 cores).
- `vercel.json`: serves `eggbog.html` at the site root.

To play locally, open `eggbog.html` in a browser.
