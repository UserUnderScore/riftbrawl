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

Hitboxes are big and follow the limbs and weapons that swing them, sweeping between frames, so attacks connect where they look like they should.

Every fighter has their own moveset and feel:
- **Rook (agile):** a punch flurry, a step-in kick, a flying knee, a flip kick, a breakdance sweep, a tornado kick, a triple hook, and a stomp that bounces him off enemies.
- **Vela (agile, long reach):**
  - Sword attacks: a hundred-stab jab, a lunge with a tipper sweetspot, and the Crescent Cleave, Rising Moon and Sky Arc slashes.
  - Plunge: a stall, then a dive downward.
- **Pip:** every normal attack is an elemental spell (fire, ice, shock, wind or arcane).
- **Grom (heavy):**
  - Smash attacks have super armor during the wind-up, and slams crack the ground and send out shockwaves.
  - Fair: an Overhead Smash that spikes enemies downward (a meteor).
  - Dair: the Anvil Drop, which hits the ground with a quake.

Heavy moves wind up, tremble, and hit with screen shake, dust, debris and longer hit-stop. Agile moves snap out with afterimages and speed lines.

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

## Smash Ultimate mechanics
- **Movement:**
  - Initial dash, dash dancing, and a skidding run turnaround.
  - Walking when you tilt the stick slightly.
  - Teetering at ledge edges, and idle fidgets.
  - Fast-fall sparkle.
  - Wavedashing / wavelanding (air dodge into the floor).
  - Shield-drop through platforms (shield + down-diagonal).
  - **Footstools:** jump on an enemy's head.
  - **Ledges:** grabbing one gives brief intangibility that shrinks on regrabs, and grabbing an occupied one "trumps" the player hanging there.
- **Offense:**
  - Short-hop aerials (JUMP + ATTACK together), which deal 0.85× damage like in Ultimate.
  - B-reverse.
  - Dash grab.
  - Up-special and up-smash out of shield, plus jump-cancelled grabs and up smashes.
  - Rage: more knockback at high damage.
  - A freshness bonus for unused moves.
  - Grounded attacks **clank** when they collide, and attacks swat weak projectiles.
- **Defense:**
  - Smash DI during hitlag.
  - Crouch canceling.
  - Hitstun canceling.
  - Dodge staling.
  - Grab release.
  - Jab resets.
- **Special hits:**
  - Grom's down tilt **buries** grounded foes, and Rook's and Vela's down tilts **trip** them.
  - Meteor smashes spark.
  - Huge hits on tough foes get a **critical-hit zoom**.
- **Presentation:**
  - A 3-2-1-GO! countdown with character entrances.
  - A GAME! splash.
  - **Star KOs** and **Screen KOs** off the top.
  - A magnifying bubble when you're off-screen.
  - A charge glint on full-charged smashes.
  - Rage steam, dizzy stars on shield break, and a revival platform.
  - Shield bubbles that tilt with the stick.
  - Damage % with decimals.
  - A crowd cheer and an announcer voice (both use your SFX volume).
- **Taunts:** T (P1), ' (P2) or the minus button. Hold up, side or down for different taunts.

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
- **SPEED:** 1x / 1/2x / 1/4x
- **DUMMY %:** sets the dummies' starting damage
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
