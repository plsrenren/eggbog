# Starting hand value vs winning

Computer vs computer, 20,000 games per row, engine as of 2026-10-12. Both players are at the same level. "Hand value" is the sum of card values in the hand you start round 1 with (after the mulligan or pack choice). The diff is your hand value minus your opponent's. Margins are about ±1.5 points per bucket.

## Win rate by hand-value difference

| Mode, level | 15+ behind | 8–14 behind | 3–7 behind | about even (±2) | 3–7 ahead | 8–14 ahead | 15+ ahead |
|---|---|---|---|---|---|---|---|
| Crazy, Hard | 43.7% | 47.5% | 48.5% | 49.7% | 51.5% | 52.2% | 55.9% |
| Crazy, Normal | 47.4% | 48.4% | 48.7% | 50.3% | 50.4% | 51.8% | 52.6% |

Normal mode uses wider buckets because a 10-card hand has a wider range (20+ / 10–19 / 4–9 / ±3):

| Mode, level | 20+ behind | 10–19 behind | 4–9 behind | about even | 4–9 ahead | 10–19 ahead | 20+ ahead |
|---|---|---|---|---|---|---|---|
| Normal, Hard | 46.4% | 48.8% | 50.3% | 50.1% | 49.3% | 51.6% | 53.0% |
| Normal, Normal | 42.5% | 46.6% | 46.2% | 50.1% | 52.8% | 53.7% | 57.0% |

## Summary

| Mode, level | Typical hand (10th–90th pct) | Player with the higher hand wins | Correlation, diff vs win | Player who moves first wins |
|---|---|---|---|---|
| Crazy, Hard | 34–55 (7 cards) | 52.8% | 0.07 | 45.2% |
| Crazy, Normal | 34–55 | 51.5% | 0.03 | 47.0% |
| Normal, Hard | 30–53 (10 cards) | 50.5% | 0.03 | 44.3% |
| Normal, Normal | 33–56 | 53.3% | 0.08 | 42.0% |

Crazy, Hard: holding Jokers at the start wins 49.4% with none, 51.7% with one, 53.3% with two (580 cases).

## Takeaways

- Starting hand value matters, but only a little. Even the most lopsided starts (15+ points ahead in Crazy) win only 56%, and hand value explains well under 1% of the variation in who wins.
- In Normal mode the Hard computer mulligans 79% of the time, which almost erases the hand-value edge (50.5%). The Normal-level computer, which mulligans less well, shows the biggest edge (57% when 20+ ahead).
- Moving first is a bigger factor than hand value: the first player wins only 42–47%. (The first mover is whoever drew the lowest start card.)

Scripts: `handsim.js` (node handsim.js <normal|crazy> <level> <games> > file.jsonl) and `an.js` (expects crazy-hard, crazy-normal, normal-hard, normal-normal .jsonl in the working directory).

## Balancing the first-player disadvantage (2026-10-12)

`firstsim.js` tests fixes. Each row is 10,000 Hard-vs-Hard games, and the number is how often the player who started round 1 went on to win the game (fair = 50%, margin about ±1).

| Fix | Crazy | Normal |
|---|---|---|
| None (today) | 45.7% | 44.9% |
| Highest start card goes first | 47.0% | 44.2% |
| Starter draws 1 extra card (round 1) | 60.3% | 52.7% |
| Starter draws 1 extra card (every round) | 60.2% | 52.3% |
| Free plain deck card on starter's field (round 1) | 56.5% | 56.6% |
| Free plain deck card on starter's field (every round) | 56.1% | 55.9% |
| **1-point token on starter's field (round 1), so the other player moves first** | **52.5%** | **50.0%** |
| 3-point token (round 1) | 53.1% | 56.1% |
| 5-point token (round 1) | 55.6% | 58.0% |

The disadvantage comes from moving first, not from having the low start card: swapping it to "highest goes first" barely helps. A spare card is worth too much (about +15 points in Crazy). A 1-point token is close to even in both modes.

Later rounds are unchanged in the tests: the round's loser chooses who starts, and the Hard CPU always gives the start to the opponent.

### Is removal the cause? (effects switched off)

Same test, today's rules, Hard vs Hard, 10,000 games each. The number is the round-1 starter's game win rate.

| Effects on | Normal mode | Crazy mode |
|---|---|---|
| All (default) | 43.7% | 45.8% |
| Without removal (no Cleave/Purge/Wipe) | 40.6% | 50.8% |
| No effects at all (plain cards) | 40.0% | n/a |

In Normal mode the disadvantage comes from the core rule (40% with plain cards), and removal actually softens it. In Crazy mode, taking removal out makes it fair.

Run with: `node firstsim.js <mode> hard 10000 base <comma-separated effect keys | none>`.

### Egg given to the starter's hand instead (Renato's variant)

The round-1 starter gets a plain Egg card in hand (random suit) and still moves first. 10,000 games each; the number is the starter's win rate.

| Egg value | Crazy, Hard | Normal, Hard | Normal, Normal |
|---|---|---|---|
| none (today) | 45.8% | 44.0% | 42.0%* |
| 1 point | 52.9% | 39.2% | 37.9% |
| 5 points | 55.3% | 48.6% | |
| 9 points | | 53.6% | |
| random deck card (for comparison) | 60.3% | 52.4% | |

*from the 20k-game hand-value run.

In Crazy, a 1-point Egg in hand is about as fair as the auto-played one. In Normal it makes things worse, and the cause isn't confirmed. Likely reasons: it takes up a slot in the 10-card hand, so drawn cards burn sooner, and a 1-point card is almost never enough to get ahead. In Normal, the Egg needs to be worth about 5–9.

Variant names in firstsim.js: egghand, egghand5, egghand9.
