# Riftbrawl

A co-op roguelike platform fighter. It has Smash-style combat with damage % and knockback, a Subspace Emissary–style side-scrolling run, and cartoon fighters.

**Play:** open the GitHub Pages link for this repo (https://userunderscore.github.io/riftbrawl/) in Chrome or Edge.

## Online co-op
1. One player picks **ONLINE: HOST** and reads out the 4-letter code.
2. The other opens the same link, picks **ONLINE: JOIN**, and types the code.

The two browsers connect directly to each other over WebRTC. [PeerJS](https://peerjs.com)'s free public server is only used to introduce them. No accounts are needed.

## The run (~35 min)
- 12 randomly generated stages in 3 acts, with a boss at the end of each act: The Gatekeeper, the Hive Matriarch, and The Hollow Crown.
- Arena lock-ins with enemy waves, random stage modifiers, and random events: chests, healing springs, and elite fights.
- **Pick 1 of 3 boons** after every stage. Press SHIELD to reroll the offer.
- **Duo boons** appear once you own both of their prerequisite boons.
- **Choose your path** after each stage:
  - Rift Road: normal
  - Proving Grounds: elites, rare+ boon
  - Quiet Grove: healing
  - Shard Vault: double shards
  - Gauntlet: an extra arena, epic boon
  - Lifeline Trial: tougher enemies, +1 life
- Beating The Hollow Crown unlocks **Endless Mode**.
- **Rift Shards** are earned every run. Spend them in the **RIFT FORGE** on permanent upgrades.
- A Smash-style **results screen** shows each player's damage, KOs, best combo, techs, parries and falls, plus an MVP.

## Fighters
- **Rook:** brawler
- **Vela:** sword
- **Pip:** mage with elemental magic, 3 jumps
- **Grom:** heavy hammer

Each fighter has:
- jab, tilts and a dash attack
- 3 charged smash attacks
- 5 aerials
- 4 specials
- grab, pummel and 4 throws
- shield, roll, spot dodge and air dodge
- ledge grab, plus ledge climb, roll and attack options

Hitboxes follow the limbs and weapons that swing them (with sweep between frames), so attacks connect where they look like they should.

## Smash techniques
| Technique | How |
|---|---|
| **Tech** | Press SHIELD just before you hit the ground, a wall, or a ceiling while launched. |
| Tech roll | Tech while holding left or right. |
| Wall tech jump | Press JUMP during a wall tech. |
| Missed tech | You get knocked down. Then ATTACK for a getup attack, a direction to roll, or JUMP/SHIELD to stand. |
| **Parry** | Release SHIELD right as an attack hits you. |
| Grab / throw | SHIELD + ATTACK to grab, then a direction to throw or ATTACK to pummel. |
| Wall jump | JUMP while touching a wall and holding away from it. |
| DI | Hold a direction when you get launched to bend your trajectory. |
| Fast fall | Flick down at the top of a jump. |
| Short hop | Tap JUMP. |

Other rules:
- Inputs are buffered for 9 frames.
- You can still jump for 6 frames after you walk off a ledge.
- Aerials auto-cancel if you land before or after their hitbox.
- Using the same move over and over makes it weaker (stale moves).

### Rift Burst
Your meter fills as you deal damage. When it is full, press **SHIELD + SPECIAL** for a screen-wide super with a cut-in.

## Items
- **Food** drops after waves and lowers your damage %.
- **Rift Crates** are scattered through stages. Break them for food or bombs.
- **Rift Bombs** work like this:
  - ATTACK picks one up. ATTACK again throws it.
  - Hold up or down to aim.
  - Flick to throw harder.
  - Down while on the ground sets it down.
  - It explodes on contact.

## Training mode
Pick **TRAINING** to practice against dummies, with infinite stocks and a combo counter. Pause to use these options:
- **HITBOXES: ON**: shows hitboxes (red), hurtboxes (yellow, or green while invincible) and launch trajectory lines
- **DUMMY:** STAND / SHIELD / JUMP / CPU
- **RESET POSITIONS**

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

Music and SFX volume sliders are in the main menu and the pause menu.

## Development
The source is in `src/`. Run `./build.sh` to rebuild `index.html`.

`peerjs.min.js` is PeerJS 1.5.4 (MIT license).
