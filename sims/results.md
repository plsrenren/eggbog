# Eggbog simulation results

Computer vs computer, using the game engine as of 2026-10-12. Seats alternate every game. Expert uses its normal in-game thinking time.

## Crazy mode

### Win rate of the row level against the column level

| | Easy | Normal | Hard | Expert |
|---|---|---|---|---|
| **Easy** | (2000 mirror games) | 27% ±2 (2000) | 14% ±2 (2000) | 9% ±6 (100) |
| **Normal** | 73% ±2 (2000) | (2000 mirror games) | 37% ±2 (2000) | 19% ±8 (100) |
| **Hard** | 86% ±2 (2000) | 63% ±2 (2000) | (2000 mirror games) | 30% ±9 (100) |
| **Expert** | 91% ±6 (100) | 81% ±8 (100) | 70% ±9 (100) | (60 mirror games) |

Each cell: win rate, 95% margin, (games played).

### How games go (all 12360 games)

- Games end by a player running out of cards: 100%. By winning 2 rounds: 0%.
- Games that reached round 3 (the death match): 26%.
- Concedes by round: round 1: 9051, round 2: 3230, round 3: 0.
- Average rounds per game: 1.99. Average moves per game: 43.
- Concedes: 0.99 per game; at least one in 73% of games.
- Concedes per game by level (a level counted once per game it played in): Easy 0.44, Normal 0.24, Hard 0.79, Expert 0.83.
- Deck reshuffles: 0.21 per game; in 11% of games.
- Full-hand burns: 0.45 cards per game; at least one in 9% of games.

### Effects (from the 6060 games where both sides were the same level)

| Effect | Plays per game | Games a player used it | Win rate of that player |
|---|---|---|---|
| Greed | 2.12 | 61% | 53% |
| Joker | 1.02 | 39% | 52% |
| Steal | 1.88 | 62% | 51% |
| Deathrattle | 2.06 | 62% | 50% |
| Wipe | 1.97 | 64% | 50% |
| Cleave | 2.05 | 64% | 49% |
| Last stand | 2.07 | 62% | 49% |
| Mirror | 2.07 | 63% | 49% |
| Sturdy | 1.92 | 62% | 48% |
| Discover | 2.23 | 60% | 47% |
| Purge | 1.92 | 61% | 46% |
| Swap | 1.76 | 56% | 43% |

Win rate for an effect is how often a player who played that effect at least once went on to win. It shows association, not cause: effects that are played late or by the player who is behind can look weaker than they are.

## Compared with the run of 2026-10-11

The old Crazy-mode numbers are in `results-2026-10-11.md`. Since then, conceding was limited to once per player per game and blocked in round 3, so:

- No game can be won on rounds anymore. Every game now ends by a player running out of cards (was 92%).
- 26% of games reach round 3, the death match. All concedes happen in rounds 1 and 2.
- Concedes are about the same: 0.99 per game (was 1.06), at least one in 73% of games (same).
- The difficulty order still holds: Easy < Normal < Hard < Expert. Differences from the old table are within the margins.
- Swap is still the weakest effect (43%, was 43%). Greed and Joker are still the strongest (53% and 52%).
- No game got stuck (2 did in the old run, before the Joker fix).
