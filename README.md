# Riftbrawl

A co-op roguelike platform fighter: Smash-style combat with damage % and knockback, a Subspace Emissary–style side-scrolling run, and stick-figure fighters.

**Play:** open the GitHub Pages link for this repo in Chrome or Edge.

## Online co-op
1. One player picks **ONLINE: HOST** and reads out the 4-letter code.
2. The other opens the same link, picks **ONLINE: JOIN**, and types the code.

The two browsers connect directly to each other over WebRTC. [PeerJS](https://peerjs.com)'s free public server is only used to introduce them. No accounts are needed.

## The run (~35 min)
- 12 randomly generated stages in 3 acts, with a boss at the end of each act: The Gatekeeper, the Hive Matriarch, and The Hollow Crown.
- Arena lock-ins with enemy waves, random stage modifiers, and random events: chests, healing springs, and elite fights.
- Pick 1 of 3 boons after every stage.
- Beating The Hollow Crown unlocks **Endless Mode**.

## Fighters
- **Rook:** brawler
- **Vela:** sword
- **Pip:** mage, 3 jumps
- **Grom:** heavy hammer

Each has jab, tilts, dash attack, 3 smashes, 5 aerials, 4 specials, shield/roll/dodge, air dodge, and ledge grab.

## Controls
**Switch Pro / gamepad** (positional, Smash layout):
- A = attack
- B = special
- X/Y = jump
- L/R/ZL/ZR = shield
- Right stick = smash attacks / aerials
- Flick the stick + A = smash attack
- \+ = pause

If buttons feel off, use **CONTROLLER SETUP**.

**Keyboard:**

| Action | P1 | P2 |
|---|---|---|
| Move | WASD | Arrows |
| Attack | J | , |
| Special | K | . |
| Jump | Space | Right Shift |
| Shield | L | / |
| Smash | I | ; |
| Pause | Esc | Backspace |

## Development
The source is in `src/`. Run `./build.sh` to rebuild `index.html`.

`peerjs.min.js` is PeerJS 1.5.4 (MIT license).
