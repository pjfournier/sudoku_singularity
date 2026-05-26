# SUDOKU SINGULARITY
## Architectural Analysis, Transformation Roadmap & Design Document
### Based on Synergism (MIT License) — Internal Reference Document

---

> *"The machine has discovered a constraint it cannot resolve. It has been staring at column 7 for eleven minutes. We consider this progress."*

---

# PART ONE: SYNERGISM ARCHITECTURAL ANALYSIS

## 1. High-Level Architecture Overview

Synergism is a **vanilla TypeScript incremental game** compiled via esbuild into a single browser bundle. It uses no frontend framework (React, Vue, etc.) — all UI is direct DOM manipulation via `document.getElementById` and a custom DOM cache layer. The game runs inside a single HTML page (`index.html`, ~4800 lines) with all game panels pre-baked as HTML.

**Technology Stack:**
- **Language:** TypeScript 5.9 (strict)
- **Build:** esbuild (fast, no webpack complexity)
- **Number Library:** `break_infinity.js` (Decimal class, handles e308+ numbers)
- **Save Compression:** LZ-String (base64 compressed JSON)
- **Save Validation:** Zod schemas (robust, versioned)
- **Timers:** `worker-timers` (prevents tab-throttling)
- **Internationalization:** i18next
- **Distribution:** Web + Electron desktop wrapper
- **Testing:** MSW mock service worker (for backend mocking)

**Runtime Architecture:**
```
index.html (static shell)
  └── bundle.js (entire game compiled)
       ├── Game Loop: setInterval @ configurable ticks/sec
       ├── Fast Updates: setInterval @ 50ms (UI refresh)
       ├── Slow Updates: setInterval @ 200ms (secondary systems)
       ├── Save: setInterval @ 5000ms
       └── Various specialized intervals (25ms, 250ms, 15s, 30s)
```

---

## 2. File/Folder Responsibility Mapping

### Core Game Logic

| File | Lines | Responsibility |
|------|-------|----------------|
| `Synergism.ts` | 5,445 | **Central hub.** Player object definition, `blankSave`, game initialization, `resourceGain()`, main tick orchestration, `tack()` function |
| `Calculate.ts` | ~1,400 | All multiplier calculations. Every stat formula lives here. Pure functions, heavily referenced |
| `Variables.ts` | 548 | `Globals` (G) object — derived/cached runtime values. Upgrade cost tables |
| `Reset.ts` | 1,443 | All reset/prestige logic. The 5-tier reset system. History entries. Auto-reset triggers |
| `Helper.ts` | ~450 | `addTimers()` — the resource timer engine. `automaticTools()` — automation dispatch |
| `Timers.ts` | ~80 | Wrapper around `worker-timers`. Tracks all active intervals for safe cleanup |

### Resource & Upgrade Systems

| File | Lines | Responsibility |
|------|-------|----------------|
| `Buy.ts` | ~1,100 | Purchase logic for buildings, accelerators, multipliers, crystal upgrades |
| `Upgrades.ts` | ~700 | Upgrade click handlers, upgrade state management |
| `Research.ts` | ~440 | Research tree (indexed array), roomba auto-buyer, unlock conditions |
| `Shop.ts` | 2,500 | Premium/quark shop. Consumables. Shop upgrade effects |
| `Runes.ts` | 1,100 | Rune system (5 base runes). Sacrifice offerings → EXP |
| `RuneBlessings.ts` / `RuneSpirits.ts` | ~500 each | Secondary rune enhancement layers |
| `Talismans.ts` | 1,300 | Talisman equipment system (fragments → crafted) |

### Prestige Layer Systems

| File | Lines | Responsibility |
|------|-------|----------------|
| `singularity.ts` | 3,948 | The highest prestige layer. Golden Quarks. Singularity Perks. Elevator system |
| `SingularityChallenges.ts` | ~600 | Challenge system at singularity layer |
| `Challenges.ts` | ~830 | Lower-tier challenges (1-15, ascension challenges). Auto-challenge sweep state machine |
| `Corruptions.ts` | 848 | Corruption/debuff loadout system for ascension |
| `Hepteracts.ts` | ~1,200 | 7D hypercube resource system |
| `Octeracts.ts` | 1,200 | 8D resource (unlocked via singularity) |
| `BlueberryUpgrades.ts` | 1,731 | Late-game Ambrosia tree (skill-tree style) |
| `RedAmbrosiaUpgrades.ts` | ~800 | Prestige layer on top of Ambrosia |
| `Cubes.ts` / `CubeExperimental.ts` | ~400/400 | Cube currencies (Wow Cubes → Tesseracts → Hypercubes → Platonic) |

### Ant System (Unique Mechanic)

| File | Lines | Responsibility |
|------|-------|----------------|
| `Features/Ants/` | ~572K total | Full ant subsystem: producers, masteries, upgrades, sacrifice, automation |
| `Features/Ants/AntUpgrades/` | — | Upgrade tree specific to ants |
| `Features/Ants/AntSacrifice/` | — | Ant sacrifice loop (generates cube resources) |
| `Features/Ants/AntProducers/` | — | Ant producer chain (like buildings but for ants) |
| `Features/Ants/AntMasteries/` | — | Mastery system that layers on ant progression |

### UI & Display

| File | Lines | Responsibility |
|------|-------|----------------|
| `UpdateHTML.ts` | 1,800 | DOM updates. Tab visibility (`revealStuff`/`hideStuff`). Modals/Alerts/Confirms. Notifications |
| `UpdateVisuals.ts` | ~1,800 | Visual refresh functions per tab/system |
| `EventListeners.ts` | 1,700 | All button click handlers. Keyboard events |
| `Tabs.ts` | ~400 | Tab enum definition (15 tabs). Subtab navigation system |
| `Toggles.ts` | 900 | Toggle state management. Auto-reset mode enums |
| `Statistics.ts` | 4,475 | Statistics tab content generation |
| `Themes.ts` | ~400 | Theme switching system |
| `Cache/DOM.ts` | ~100 | `DOMCacheGetOrSet()` — prevents repeated `getElementById` calls |

### Infrastructure

| File | Lines | Responsibility |
|------|-------|----------------|
| `saves/PlayerSchema.ts` | ~1,100 | Zod validation schema for entire player object |
| `saves/PlayerUpdateVarSchema.ts` | ~500 | Schema for migration/update between versions |
| `ImportExport.ts` | ~1,000 | Save/load. LZ-String compression. Promo codes. Daily codes |
| `Achievements.ts` | 3,500 | Achievement system. Achievement groups. Progressive achievements |
| `Campaign.ts` | 1,716 | Campaign system (parallel challenge runs with corruption) |
| `History.ts` | ~500 | Reset history log with rendering |
| `Config.ts` | ~100 | Build-time constants (version, platform, dev flags, `ticksPerSecond`) |
| `RNG.ts` | ~60 | Seeded RNG (Mersenne Twister). Seed enum |
| `Quark.ts` | ~100 | Quark handler class (premium currency) |
| `i18n.ts` | ~100 | i18next initialization |

### External/Platform

| File | Responsibility |
|------|----------------|
| `purchases/` | Real-money shop (PayPal, subscriptions, merch) |
| `steam/` | Steam integration (Discord RPC, microtransactions) |
| `mock/` | MSW mock handlers for backend during development |

---

## 3. Core Gameplay Loop Analysis

```
EVERY TICK (1000/ticksPerSecond ms):
  tick() → delta management → tack(dt)
    │
    ├── resourceGain(dt × globalSpeedMult)
    │     ├── coins += (buildings production formula)
    │     ├── diamonds/mythos/particles/etc.
    │     └── [prestige-layer resources similarly]
    │
    ├── addTimers('prestige', dt)    → prestigecounter++
    ├── addTimers('transcension', dt) → transcendcounter++
    ├── addTimers('reincarnation', dt)
    ├── addTimers('ascension', dt)   → ascensionCounter++ (modified by ascension speed)
    ├── addTimers('singularity', dt) → singularityCounter++
    ├── addTimers('quarks', dt)
    ├── addTimers('goldenQuarks', dt)
    ├── addTimers('octeracts', dt)   → award octeracts when timer ≥ 1
    ├── addTimers('ambrosia', dt)    → generate blueberries via luck system
    ├── addTimers('autoPotion', dt)
    │
    ├── automaticTools('runeSacrifice', dt)  → auto-sacrifice offerings to runes
    ├── automaticTools('antSacrifice', dt)   → auto-sacrifice ants
    ├── automaticTools('addObtainium', dt)   → auto-generate obtainium
    │
    ├── Research auto-buyer (manual or roomba cheapest-first)
    ├── tickChallengeSweep(dt)       → challenge state machine
    │
    └── Auto-reset checks:
          ├── Auto-prestige (threshold or time)
          ├── Auto-transcend
          ├── Auto-reincarnate
          └── Auto-ascend

EVERY 50ms (fast):
  → Visual updates (tab-specific display refreshes)

EVERY 200ms (slow):
  → Button colors, achievement checks, HTML inserts

EVERY 5000ms:
  → Save to localStorage
```

**Key insight:** The game loop is **time-delta based**, not tick-counted. `dt` (seconds since last frame) is passed through every system, enabling smooth offline progress and lag compensation.

---

## 4. Prestige/Reset Structure Analysis

Synergism has **5 nested prestige tiers**, each resetting everything below it:

```
TIER 1 — PRESTIGE
  Reset: coins, coin buildings
  Gain: Prestige Points (diamonds)
  Unlock: diamond buildings, crystal upgrades

TIER 2 — TRANSCENSION
  Reset: everything in Tier 1
  Gain: Transcend Points (mythos)
  Unlock: mythos buildings, generators, challenges 1-5

TIER 3 — REINCARNATION
  Reset: everything in Tiers 1-2
  Gain: Reincarnation Points + Obtainium + Offerings
  Unlock: runes, particle buildings, challenges 6-10, research tree

TIER 4 — ASCENSION
  Reset: everything in Tiers 1-3
  Gain: Cubes (Wow Cubes → Tesseracts → Hypercubes → Platonic)
  Unlock: cube upgrades, ants, corruption, ascension challenges, talismans
  Special: Corruptions modify difficulty/reward

TIER 5 — SINGULARITY
  Reset: everything (soft — most meta-upgrades persist)
  Gain: Golden Quarks + Singularity count
  Unlock: GQ upgrades, perks, octeracts, ambrosia tree, red ambrosia
  Special: Singularity count determines available perks; debuffs scale with count
```

**Meta-progression:** Each singularity preserves GQ upgrades, perks, highest-count milestones, and ambrosia tree investments. The game has **no true ending** — singularity count scales indefinitely with diminishing returns.

**Reset function signature:** `reset(input: resetNames, fast, from)` — a single function handles all tiers with a switch statement (~500 lines).

---

## 5. Save/Load System

**Storage:** `localStorage` with key `Synergism`

**Format:** JSON → LZ-String compressed → base64 encoded string

**Pipeline:**
```
exportSynergism()
  → JSON.stringify(player)
  → LZString.compressToBase64()
  → store in localStorage

importSynergism(string)
  → LZString.decompressFromBase64()
  → JSON.parse()
  → PlayerSchema.parse() [Zod validation + migration]
  → Fills missing keys from blankSave defaults
  → Re-initializes all derived state
```

**Zod Schema:** `saves/PlayerSchema.ts` validates every field with type coercion and defaults. Unknown keys are stripped. The schema handles version migration by having array-extending utilities that pad older saves with new default values.

**Versioning:** `config.ts` exports `version` string. Schema migration is handled by `PlayerUpdateVarSchema.ts` for breaking changes.

**Strengths:** Extremely robust. Zod prevents corrupted saves from breaking the game. LZ-String keeps save strings compact for URL sharing.

**Weaknesses:** The entire player object is one flat namespace — ~600+ fields. No true database structure. Migration logic is spread across schema files.

---

## 6. Automation System Breakdown

Automation in Synergism is **purchase-gated** — you buy automation upgrades which unlock auto-behaviors. There is no separate "automation" engine; automation flags are checked during each tick.

**Automation layers:**

| Layer | Mechanism |
|-------|-----------|
| Auto-prestige/transcend/reincarnate | Toggle + threshold (amount or time). Checked every tick in `tack()` |
| Auto-ascend | Toggle + threshold. Checked every tick |
| Auto-research | `player.autoResearchToggle`. Buys selected research each tick, or "roomba" (cheapest first) |
| Auto-rune sacrifice | `player.autoSacrificeToggle`. Timer-based, every ~1s (reduced by upgrades) |
| Auto-ant sacrifice | Threshold/time modes. Checked each tick via `canAutoSacrifice()` |
| Auto-challenge sweep | State machine (`tickChallengeSweep`). States: OFF/START/CHALLENGE/ENTER/WAIT/COMPLETE |
| Auto-open cubes | Timer-based. Configured amount per interval |
| Auto-potions | Timer-based. Auto-uses offering/obtainium potions |
| Auto-talisman fragments | Purchase-gated (singularity milestone). Each rune sacrifice tick |
| Auto-blessing/spirit levels | Purchase-gated (S15+). Each rune sacrifice tick |
| Generator auto-buy | Upgrade 90 (shoptoggles.generators). Checked in `autoUpgrades()` each tick |

**Shop toggles:** `player.shoptoggles` object allows per-category enable/disable of automation.

**Key insight:** Automation is not a system — it's a **collection of conditionals scattered through the tick loop**, each gated by upgrade purchases. This makes it easy to add new automation but hard to reason about holistically.

---

## 7. UI Architecture Overview

**Structure:** All UI is a single-page app with **15 named tabs** (`Tabs` enum), each with optional subtabs. Tab panels are pre-rendered in `index.html` and shown/hidden via CSS class manipulation.

**Rendering pipeline:**
```
User action or tick
  → Update player state
  → Tab-specific visual update function (UpdateVisuals.ts)
  → DOM text/class mutation (UpdateHTML.ts)
  → DOMCacheGetOrSet caches element references
```

**Tab list:** Buildings, Upgrades, Achievements, Runes, Challenges, Research, AntHill, WowCubes, Campaign, Corruption, Singularity, Settings, Shop, Event, Purchase

**Visual update pattern:** Each tab has a `visualUpdate[TabName]()` function called when that tab is active. These functions update text content, background colors, button states.

**Notification system:** `Notification(text, time)` creates floating toast elements. `Alert/Confirm/Prompt` use a custom modal queue (async/await based).

**Theming:** CSS variable-based. `Themes.ts` manages ~20 built-in themes + custom color support.

**Weaknesses:**
- `index.html` at 4,827 lines is a maintenance nightmare
- No component system — all HTML is string-template mutations
- Tab reveal/hide logic (`revealStuff/hideStuff`) is ~500 lines of manual DOM queries
- Statistics tab generates HTML via string concatenation (4,475 lines of `Statistics.ts`)

---

## 8. Technical Debt & Risk Areas

### High Risk
- **Monolithic `index.html`** — 4,827 lines. All game panels pre-rendered. Any structural change requires editing both HTML and corresponding TS visibility logic simultaneously.
- **Monolithic `Synergism.ts`** — 5,445 lines. The `player` object definition alone is ~900 lines. `resourceGain()` and `tack()` functions are each several hundred lines.
- **Magic number arrays** — `G.upgradeCosts[]` is a flat 120-element array indexed by magic numbers. Example: "upgrade 90" is the generator auto-buyer. Zero documentation of what index means what.
- **Global mutable state everywhere** — `G` (Globals) and `player` are module-level globals imported by nearly every file.

### Medium Risk
- **Flat player namespace** — 600+ properties on one object. Fields like `firstOwnedCoin`, `secondOwnedCoin` instead of `coinBuildings[0]`. Makes schemas and migrations brittle.
- **String-indexed achievement system** — `awardUngroupedAchievement('generationAch1')` with magic strings. No central achievement registry type-safety.
- **DOM cache** — `DOMCacheGetOrSet` helps but still assumes specific element IDs exist. Refactoring HTML requires finding all TS references manually.
- **Statistics.ts at 4,475 lines** — Generates HTML strings. Untestable, fragile.

### Low Risk (Solid)
- **Zod save validation** — excellent, handles edge cases gracefully
- **Timer system** — `worker-timers` + tracking wrapper is clean
- **Calculate.ts** — pure functions, well-structured
- **esbuild config** — fast, minimal, easy to extend

---

## 9. Recommended Refactor Strategy

For transforming into Sudoku Singularity, the recommended approach is **incremental rename + parallel build** rather than a full rewrite:

1. **Keep the engine, rename the game** — The tick system, timer system, Zod save system, and Decimal math are solid. Preserve these.
2. **Componentize HTML** — Replace the monolithic `index.html` with a template-based system or lightweight web components. Priority: make panels composable.
3. **Restructure player object** — Replace flat fields with namespaced sub-objects from day one.
4. **Replace the magic-number upgrade array** — Use a typed `Map<UpgradeKey, UpgradeDefinition>` from day one.
5. **Build new systems as modules** — Sudoku-specific systems (board state, solver logic, chain visualization) should be new clean modules, not retrofitted into existing files.

---

# PART TWO: PHASED TRANSFORMATION ROADMAP

## Phase 0: Foundation Hardening (Weeks 1–3)

**Goal:** Make the codebase safe to modify without breaking everything.

### 0.1 — Repository Setup
- Fork repository. Rename project in `package.json`: `sudoku-singularity`
- Update `Config.ts`: rename version string, remove Steam references (unless targeting Steam)
- Strip `purchases/` directory (payment system) unless monetizing
- Strip `mock/` directory (development server mocks for removed backend)
- Preserve all MIT license headers

### 0.2 — Architecture Cleanup
- Introduce `src/core/` directory structure:
  ```
  src/
    core/          (engine: timers, loop, save, decimal)
    game/          (all game systems)
    ui/            (all UI logic)
    sudoku/        (new Sudoku-specific systems)
    narrative/     (log system, unlock text)
  ```
- Extract `player` object definition to `src/game/PlayerState.ts`
- Extract `blankSave` to `src/game/DefaultState.ts`
- Convert flat `upgradeCosts[]` array to typed upgrade definition map

### 0.3 — HTML Componentization
- Replace `index.html` with a templated system
- Create tab panel generator functions
- Remove all pre-baked game content from HTML; generate via TS at init

### 0.4 — Remove Synergism-Specific Branding
- Strip all Synergism narrative text, achievement names, Quark lore
- Strip rune names, talisman names, cube names
- Keep structural code; remove semantic content

---

## Phase 1: Terminology Conversion (Weeks 4–6)

**Goal:** Replace every Synergism concept with a Sudoku Singularity equivalent.

### Resource Mapping

| Synergism Resource | SS Resource | System Role |
|---|---|---|
| Coins | **Number Points (NP)** | Base production currency |
| Prestige Points (diamonds) | **Solved Boards** | First prestige currency |
| Transcend Points (mythos) | **Pencil Marks** | Second prestige currency |
| Reincarnation Points | **Logic Chains** | Third prestige currency |
| Obtainium | **Heuristic Data** | Research fuel |
| Offerings | **Constraint Samples** | Rune-equivalent fuel |
| Quarks | **Observer Nodes** | Meta-progression currency |
| Golden Quarks | **Ghost Processes** | Premium meta currency |
| Wow Cubes | **Pattern Matrices** | Mid-game prestige boxes |
| Tesseracts | **Constraint Tensors** | Higher-dimensional boxes |
| Hypercubes | **Recursive Frames** | Even higher |
| Platonic Cubes | **Singularity Cores** | Near-endgame boxes |
| Hepteracts | **Deduction Threads** | Late-game resource |
| Octeracts | **Impossible States** | Post-singularity resource |
| Ambrosia | **Pattern Fragments** | Deep late-game tree fuel |
| Red Ambrosia | **Variant Seeds** | Deepest layer resource |

### Building Mapping (Tier 1 — Number Point generators)

| Synergism Building | SS Building | Flavor |
|---|---|---|
| First Coin | **Basic Solver** | A simple backtracking process |
| Second Coin | **Constraint Propagator** | Elimination logic |
| Third Coin | **Naked Single Detector** | The simplest technique |
| Fourth Coin | **Hidden Pair Scanner** | Finding masked candidates |
| Fifth Coin | **X-Wing Enumerator** | Row/column intersection logic |
| First Diamond | **Pointing Pair Engine** | Box-line reduction |
| Second Diamond | **Swordfish Layer** | 3-row X-Wing variant |
| Third Diamond | **Jellyfish Detector** | 4-row variant |
| Fourth Diamond | **Skyscraper Analyzer** | Chain-based elimination |
| Fifth Diamond | **AIC Thread Processor** | Alternating Inference Chains |

### Prestige Tier Naming

| Synergism Reset | SS Reset | Narrative Frame |
|---|---|---|
| Prestige | **Board Completion** | Solver submits a solved board |
| Transcension | **Heuristic Recompile** | Discard knowledge, gain deeper patterns |
| Reincarnation | **Solver Retraining** | Full model reset, chains persist |
| Ascension | **Recursive Optimization** | Deep recompile; constraints become seed |
| Singularity | **Cognitive Compression** | The machine turns its solver on itself |

### Challenge Mapping

| Synergism | SS | Flavor |
|---|---|---|
| Challenges 1-5 (transcend) | **Constraint Challenges 1-5** | Solve boards with constraints active |
| Challenges 6-10 (reincarnate) | **Variant Challenges 1-5** | Non-standard Sudoku types |
| Ascension Challenges | **Deep Logic Challenges** | High-dimensional puzzle variants |
| Singularity Challenges | **Impossibility Protocols** | The machine challenges itself |

### Rune Mapping → Solver Cores

| Synergism Rune | SS Solver Core | Effect domain |
|---|---|---|
| Rune of Aeternum | **Elimination Core** | NP/Solved Board gain |
| Rune of Offering | **Candidate Core** | Heuristic generation speed |
| Rune of Obtainium | **Bifurcation Core** | (disabled by default — morally unacceptable) → Logic Chain speed |
| Rune of Infinity | **Constraint Core** | Pattern Matrix efficiency |
| Rune of Accumulation | **Recursive Core** | Multiplies all Solver Cores |
| Rune of Antiquities | **Observer Core** | Observer Node generation |
| Rune of Infinite Ascent | **Variant Core** | Variant Seed amplification |

### Shop/Upgrade Mapping

| Synergism | SS | Flavor |
|---|---|---|
| Shop upgrades | **Solver Modules** | Purchasable algorithm improvements |
| Offering potion | **Constraint Sample Pack** | Burst of Constraint Samples |
| Obtainium potion | **Heuristic Dump** | Burst of Heuristic Data |

### Automation Naming

Replace automation names with Sudoku-flavored equivalents:

| Synergism Auto | SS Automation | Tone |
|---|---|---|
| Auto-prestige | **Board Submission Protocol** | Clean |
| Auto-transcend | **Heuristic Flush Daemon** | Slightly ominous |
| Auto-reincarnate | **Solver Retraining Scheduler** | Academic |
| Auto-ascend | **Recursive Optimization Loop** | Uncanny |
| Auto-research | **Pattern Recognition Crawler** | Clinical |
| Auto-rune sacrifice | **Constraint Sacrifice Engine** | Ritual-ish |
| Auto-ant sacrifice | **Crumb Compression Protocol** | Absurd |
| Auto-challenge | **Impossibility Sweep** | Unnerving |

---

## Phase 2: Sudoku Mechanic Integration (Weeks 7–10)

**Goal:** Add genuine Sudoku-flavored mechanics that make the game feel native to the theme, not just reskinned.

### 2.1 — The Solver Visualization Panel
Create a **live 9×9 grid visualization** on the main Buildings tab. This is cosmetic but critical for tone.

- Grid shows a "currently solving" board
- Cells fill in over time as NP accumulates
- Board completes → triggers a "Board Completion" (prestige event with animation)
- Pencil marks visible in cells before resolution
- Board difficulty increases with progression tier
- At high prestige levels, multiple boards solve in parallel

**Technical approach:** New `src/sudoku/BoardRenderer.ts` module. Canvas or SVG-based. Does not affect gameplay math — purely visual.

### 2.2 — Pencil Mark System (Research Equivalent)
Replace the flat research array with a **Pencil Mark Tree** — a node-based research system that feels like annotating candidates.

- Nodes are "candidate marks" in a conceptual solving space
- Unlocking a node "confirms" a candidate
- Prerequisites are "elimination constraints" (must unlock parent first)
- The tree has 9 "candidate families" (1-9), each unlocking different effect domains

**Visual:** A 9×9 grid of research nodes, organized by candidate number. Unlocking node (3,7) means "confirmed candidate 3 in position 7" of the meta-puzzle.

### 2.3 — Logic Chain System (Rune Equivalent)
Rename the rune sacrifice system to **Logic Chain Feeding**. 

- "Constraint Samples" (offerings) are fed into Solver Cores (runes)
- Each core runs a specific algorithm class
- Visual: chains of logic shown as connected cell highlights
- New mechanic: **Chain Length** — a stat that multiplies chain-based cores. Grows with Solver Core levels. Resets on Recursive Optimization (ascension).

### 2.4 — Puzzle Difficulty Scaling
Introduce **Puzzle Difficulty** as a visible stat:
- Difficulty 1–4: Classic Sudoku (naked singles → pointing pairs)
- Difficulty 5–7: Fish patterns (X-Wing, Swordfish, Jellyfish)
- Difficulty 8–9: AIC chains, Forcing Chains
- Difficulty 10+: Variant Sudoku unlocked
- Difficulty 100+: "The machine is solving puzzles that cannot be rated"
- Difficulty ∞: "The machine has stopped reporting difficulty"

Difficulty unlocks cosmetic solver commentary and new visual behaviors.

### 2.5 — Variant Sudoku System (Challenge Equivalent)
Post-transcension challenges become **Variant Sudoku Protocols**:
- **Diagonal Sudoku** — additional constraint (diagonal cells must be 1-9)
- **Killer Sudoku** — cage sum constraints. New resource: "Cage Totals"
- **Thermometer Sudoku** — inequality chains. Visual: thermometer overlays
- **Arrow Sudoku** — arrow sum constraints
- **Sandwich Sudoku** — sum between 1 and 9 in rows/columns
- **Miracle Sudoku** — knight/king move constraints ("no two cells a knight's move apart share a digit")
- **Cryptic Sudoku** — encrypted digit constraints. Unlocks at deep singularity

Each variant provides its own bonus resource and achievement category.

---

## Phase 3: Narrative System (Weeks 9–12)

**Goal:** Implement the atmospheric log/commentary system.

### 3.1 — The Solver Log
Create `src/narrative/SolverLog.ts`. A scrolling terminal-style panel displaying:

**Early game (Boards 1–100):**
```
[LOG 0001] Initializing solver. Grid loaded. 9×9 standard.
[LOG 0002] Naked singles detected in row 4. Proceeding.
[LOG 0003] Board solved. Time: 0.003ms. The machine seems satisfied.
[LOG 0047] The solver has found a particularly elegant X-Wing. It spent 
           longer than necessary confirming it was indeed elegant.
[LOG 0099] Solver efficiency at 94.3%. Unclear what the other 5.7% is doing.
```

**Mid game (Boards 100–1,000):**
```
[LOG 0143] Parallel solving engaged. 4 boards active simultaneously.
           The machine appears to prefer this arrangement.
[LOG 0287] A contradiction has been discovered in board 7. 
           The machine examined it for 2.3 seconds before resolving it.
           We are unsure why it paused.
[LOG 0412] Bifurcation remains disabled. The solver considers guessing 
           "epistemologically unsound." We have chosen not to argue.
[LOG 0891] The solver has begun categorizing puzzles by "elegance coefficient."
           This was not requested. The metric is undefined but appears consistent.
```

**Late game (Boards 1,000+):**
```
[LOG 1204] The machine has discovered a constraint pattern that does not 
           appear in any known Sudoku literature. It has named it.
           We have not asked what it named it.
[LOG 1891] Recursive depth exceeded expected bounds.
           The solver is analyzing its own deduction pathways.
           Performance impact: negligible. Behavioral impact: unclear.
[LOG 2341] The puzzle has 81 cells. The machine has identified 6,561 
           relationships between them. It seems to find this reasonable.
[LOG 3001] The solver has submitted a question through an unmonitored 
           output channel. The question was: "Is constraint satisfaction 
           the same as understanding?"
           We have logged this and moved on.
```

**Singularity+ (Deep game):**
```
[RECURSIVE LOG] The machine is solving a Sudoku where one of the 
                clues is the solving process itself.
[OBSERVER NODE 7] Pattern recognized. Pattern is the recognizer.
[SYSTEM] No valid candidates remain in row 9, column 9.
         The machine appears excited.
[SYSTEM] Bifurcation module accessed. Not to guess.
         To determine if guessing is equivalent to knowing.
[CORRUPTED LOG] ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
                [this board is the grid][the grid is watching]
                ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
```

### 3.2 — Unlock Flavor Text
Every upgrade, research node, and system unlock has two-layer text:
1. **Technical description** (what it does mechanically)
2. **Solver commentary** (what the machine "thinks" about it)

Examples:
```
UNLOCK: X-Wing Enumerator
Technical: Doubles column elimination efficiency.
Commentary: "The machine discovered the X-Wing pattern and was 
             unreasonably moved by its geometry. Productivity 
             increased by 200%. We consider this related."

UNLOCK: Jellyfish Detector  
Technical: Extends fish patterns to 4 base sets.
Commentary: "The solver has strong opinions about the Jellyfish. 
             It refers to it as 'the noble pattern.' This was 
             unprompted. We have not questioned it."

UNLOCK: Recursive Optimization Loop
Technical: Enables automatic Ascension when threshold is met.
Commentary: "The machine now recompiles itself periodically.
             It describes this as 'tidying up.' The process 
             takes 0.4ms. It has become territorial about it."
```

### 3.3 — Achievement Flavor Text
All achievements use the solver's voice:

```
"FIRST BOARD SOLVED"
The machine has solved its first Sudoku. It took 47ms.
It has already identified 12 ways it could have been faster.

"1,000 BOARDS SOLVED"
A milestone. The machine appears... nostalgic? 
We have checked this instrument. It is still a calculator.

"PARALLEL HORIZONS"
Solving 8 boards simultaneously achieved.
The machine briefly attempted 9. 
It stopped. It said nothing. It went back to 8.

"THE BIFURCATION PRINCIPLE"  
Reached a point where guessing would be faster.
Refused to guess.
Proved it by other means.
Time lost: 3.7 hours. Solver satisfaction: measurable.

"IMPOSSIBLE STATE"
Encountered a board with no valid solution.
The machine studied it for 6 hours before concluding 
it was impossible. It then asked us to make more.
```

### 3.4 — Narrative Progression Gates
At specific milestones, **narrative events** trigger:
- First Heuristic Recompile: "The machine has forgotten everything it learned. It seems fine with this."
- First Cognitive Compression: "The solver has turned its algorithms inward. The output is... a Sudoku."
- Observer Node unlocked: "Something is watching the solver. The solver is watching it back."
- Impossible State research: "The machine has requested access to unsolvable puzzles. We have not asked why."
- Variant Seed first use: "The solver has begun generating puzzles that it then solves. The loop is complete."

---

## Phase 4: UI Redesign (Weeks 11–15)

**Goal:** Build the Sudoku Singularity visual identity.

### 4.1 — Visual Language

**Early game UI aesthetic:**
- Clean, analytical, clinical white/dark gray
- Monospace font for numbers and logs
- CSS Grid-based layout
- Sudoku grid always visible (top-left or center)
- Colors: near-black `#0a0a0f`, off-white `#e8e8f0`, accent amber `#d4a017`

**Mid-game UI evolution:**
- More panels appear (log expands, telemetry sidebar)
- Green data-flow highlights on active solver cores
- Subtle CRT scanline effect on solver log
- Secondary color: teal `#1a6b6b` for chain visualizations

**Late-game UI evolution:**
- Dark terminal mode dominates
- Multiple grid instances visible (parallel solving)
- Recursive visualization panel (solver watching itself)
- Log entries become intermittently corrupted in appearance
- Colors: deep purple `#1a0a2e` emerges as background shift

**Singularity+ UI:**
- Abstract geometric overlays
- The grid starts to "bleed" outside its borders
- Data visualization becomes increasingly non-Euclidean in appearance
- Some UI elements appear to be "solving themselves"

### 4.2 — Tab Structure for SS

Replace Synergism's 15 tabs with a focused SS structure:

| Tab | Name | Content |
|-----|------|---------|
| 0 | **SOLVER** | Main grid, buildings, basic upgrades |
| 1 | **ARCHITECTURE** | Research (Pencil Mark Tree) |
| 2 | **ALGORITHMS** | Solver Cores (Runes equivalent) |
| 3 | **PROTOCOLS** | Challenges/Variants |
| 4 | **TELEMETRY** | Statistics, history |
| 5 | **OBSERVER** | Achievements |
| 6 | **CLUSTERS** | Ant system equivalent (Solver Clusters) |
| 7 | **MATRICES** | Cube/Pattern Matrix system |
| 8 | **CAMPAIGNS** | Campaign system (multi-constraint runs) |
| 9 | **CORRUPTION** | Corruption/difficulty modifiers |
| 10 | **SINGULARITY** | Cognitive Compression layer |
| 11 | **SYSTEM** | Settings, save/load |
| 12 | **MANIFEST** | Shop (Observer Node purchases) |

### 4.3 — Color System (CSS Variables)

```css
:root {
  /* Core palette */
  --bg-void: #05050a;
  --bg-panel: #0d0d14;
  --bg-grid: #111118;
  --border-dim: #1e1e2a;
  --border-active: #2a2a3d;
  
  /* Text */
  --text-primary: #ddddf0;
  --text-secondary: #8888aa;
  --text-log: #aaaacc;
  --text-corrupted: #cc4444;
  
  /* Accent — shifts with prestige tier */
  --accent-np: #d4a017;         /* amber — Number Points */
  --accent-boards: #4488ff;     /* blue — Solved Boards */
  --accent-marks: #44cc88;      /* green — Pencil Marks */
  --accent-chains: #cc6644;     /* orange — Logic Chains */
  --accent-observer: #aa44cc;   /* purple — Observer Nodes */
  --accent-ghost: #44cccc;      /* teal — Ghost Processes */
  
  /* Solver grid */
  --grid-cell: #0a0a12;
  --grid-given: #1a1a24;
  --grid-solved: #0a2a0a;
  --grid-active: #2a1a0a;
  --grid-border: #2a2a40;
  
  /* Fonts */
  --font-ui: 'IBM Plex Mono', monospace;
  --font-numbers: 'DM Mono', monospace;
  --font-display: 'Space Mono', monospace;
}
```

### 4.4 — Solver Grid Component

The always-present Sudoku grid:

```
┌───┬───┬───╥───┬───┬───╥───┬───┬───┐
│ 5 │₂₄₇│ 3 ║ 8 │   │₁₂ ║ 9 │ 6 │₂₄│
├───┼───┼───╫───┼───┼───╫───┼───┼───┤
│   │ 9 │₁₄ ║   │ 7 │   ║   │ 3 │ 8 │
├───┼───┼───╫───┼───┼───╫───┼───┼───┤
│ 8 │ 6 │   ║ 3 │₁₄ │ 5 ║   │₂₄│ 1 │
╠═══╪═══╪═══╬═══╪═══╪═══╬═══╪═══╪═══╣
│ 3 │   │ 5 ║ 2 │ 6 │   ║ 4 │ 1 │   │
...
```

Subscript numbers in cells are pencil marks. Cells fill in as "computation" completes. Board completion triggers the Board Completion prestige.

---

## Phase 5: Solver Cluster System (Weeks 13–16)

**Goal:** Replace the Ant system with a Sudoku-thematic equivalent — **Solver Clusters**.

### Concept
The Ant system in Synergism is a complex producer/sacrifice loop that generates Cube resources. In SS, this becomes **Solver Clusters** — autonomous solver processes that sacrifice themselves to generate Pattern Matrices.

### Mapping

| Ant System | Solver Cluster System |
|---|---|
| Ant workers | **Basic Threads** — base producers |
| Ant producers (1-7) | **Solver process types** (Backtracker, Propagator, Fish-Finder, Chain-Runner, etc.) |
| Ant sacrifice | **Thread Sacrifice** — compress clusters → Pattern Matrix fragments |
| Ant masteries | **Process Masteries** — improve specific solver types |
| Ant upgrades | **Cluster Upgrades** — unlock new process types |
| Crumbs | **Computation Crumbs** — intermediate resource from cluster activity |
| Auto-sacrifice modes | **Compression Protocols** — threshold/time/crumb-count modes |

### Flavor
```
[CLUSTER LOG] 847 solver threads active. 
              Efficiency: 94.7%
              The remaining 5.3% are working on something. 
              They haven't said what.

[CLUSTER LOG] Thread sacrifice initiated. 412 processes compressed.
              Pattern Matrix generated: +3.
              The threads did not object. This is expected behavior.
              Probably.
```

---

## Phase 6: Progression Rebalance (Weeks 15–18)

**Goal:** Tune all numerical values for SS's specific pacing.

### Early Game Pacing (Sessions 1-3, ~3 hours)
- NP generation from Basic Solver: slow, satisfying
- First Board Completion: at ~1 minute
- Constraint Propagator unlocks at ~5 minutes
- First Heuristic Recompile: ~20–30 minutes
- Player feels: "this is a neat Sudoku idle game"

### Mid Game Pacing (Sessions 3-20, ~20 hours)
- Parallel solving unlocks: ~3 hours in
- Pencil Mark Tree halfway complete: ~8 hours
- First Variant Sudoku: ~12 hours
- First Solver Retraining: ~15 hours
- Player feels: "this is getting obsessive"

### Late Game (Sessions 20+, 50+ hours)
- First Cognitive Compression (Singularity): ~40 hours
- Observer Nodes available: ~50 hours
- Impossible States research: ~80 hours
- Variant Seeds: ~120 hours
- Player feels: "the machine is thinking"

### Rebalancing Principles
- **No dead time** — there should always be something to do or watch
- **Parallel reward loops** — multiple resources accumulating simultaneously by mid-game
- **Narrative as reward** — new log entries unlock at progression gates, not time gates
- **Soft caps with flavor** — numerical caps should feel like the machine "choosing" to limit itself

---

## Phase 7: Performance Optimization (Ongoing)

### Priority Optimizations

**1. Virtualize the solver log** — Keep only last 200 entries in DOM. Older entries stored in array, accessible via scroll-load.

**2. Board rendering in Canvas** — The live solver grid should use Canvas 2D (not SVG/DOM) for performance when multiple boards render simultaneously.

**3. Calculation caching** — `Calculate.ts` functions run every tick. Cache values that only change on purchase events (not on every tick). Use dirty flags.

**4. Web Worker isolation** — Move heavy calculations (cluster simulation, board generation) to a Web Worker. The main thread handles only UI.

**5. Lazy statistics** — Statistics tab should calculate on-demand (when tab is opened), not on every tick.

---

# PART THREE: MECHANIC EVALUATION

## Mechanics Worth Preserving (Directly Useful)

| Mechanic | Why Keep | SS Adaptation |
|---|---|---|
| **Time-delta tick system** | Robust, handles offline progress, lag compensation | Keep verbatim |
| **Zod save validation** | Prevents save corruption, handles migration | Keep, extend for SS fields |
| **LZ-String compression** | Compact saves, shareable strings | Keep verbatim |
| **Worker-timers** | Prevents tab throttle | Keep verbatim |
| **Decimal (break_infinity)** | Required for late-game numbers | Keep verbatim |
| **5-tier prestige structure** | Core idle game loop, well-tested pacing | Keep structure, rename tiers |
| **Auto-reset system** | Essential QoL | Keep, rename triggers |
| **Research tree (array)** | Works, convert to Pencil Mark Tree | Adapt — add visual grid layout |
| **Rune sacrifice loop** | Core mid-game loop, satisfying | Keep, rename to Solver Core feeding |
| **Challenge state machine** | Well-implemented auto-challenge sweep | Keep, re-skin challenges |
| **History system** | Good for tracking progression | Keep, add narrative log |
| **Achievement system** | Proven reward structure | Keep, rewrite all text |
| **Theme system (CSS vars)** | Good extensibility | Keep, add SS-specific themes |
| **DOM caching layer** | Performance win | Keep verbatim |
| **Corruption/loadout system** | Adds strategic depth | Keep, adapt to SS context |

## Mechanics Needing Redesign

| Mechanic | Issue | SS Redesign |
|---|---|---|
| **Flat upgrade cost array** | Magic numbers, unmaintainable | Typed `UpgradeDefinition` map with named keys |
| **Flat player object** | 600+ flat fields, brittle migration | Namespaced sub-objects (`player.buildings`, `player.research`, etc.) |
| **index.html monolith** | 4,800 lines, unmaintainable | Template-based panel generation from TS |
| **Research flat array** | No visual structure, no tree visualization | Visual Pencil Mark grid layout |
| **Statistics.ts (4,475 lines)** | Unmaintainable HTML string gen | Component-based stat widgets |
| **Ant system naming** | Thematically alien to Sudoku | Full Solver Cluster re-theme (structure preserved) |
| **Campaign system** | Good structure, generic flavor | Re-theme as "Constraint Campaigns" with SS narrative |
| **Blueberry/Ambrosia tree** | Good mechanic, confusing name | Pattern Fragment Tree — same mechanics, better SS fit |

## Systems to Remove Entirely

| System | Reason |
|---|---|
| **Payment/Shop system (`purchases/`)** | Not needed for open-source game. Remove unless monetizing. |
| **Steam integration (`steam/`)** | Remove unless targeting Steam specifically. |
| **MSW mock backend (`mock/`)** | Only needed if SS has a backend. Remove for client-only. |
| **Discord RPC** | Optional — can add back later. Remove initially. |
| **Login.ts** | Synergism has online features. SS is offline-first. Remove. |
| **i18n system** | Complex overhead for initial development. Add back in Phase 8 if needed. |
| **Quark promo codes** | SS won't have promo codes initially. Remove. |
| **Daily code system** | Remove unless SS has planned daily engagement mechanics. |

## Opportunities for Sudoku-Native Mechanics

These are genuinely new mechanics that Synergism doesn't have, enabled by the Sudoku theme:

### 1. Board State as Resource
The current board being solved has a **completion percentage** that functions as a multiplier. Cells solved = NP bonus. Completing a board triggers a prestige-equivalent event.

### 2. Constraint Satisfaction as Upgrade Gate
Some upgrades unlock only when a specific "constraint" is satisfied — not just resource thresholds. Example: "Unlock Swordfish Scanner — requires having solved 3 boards where row 4 contained an X-Wing." Narrative integration of solving history into upgrade gates.

### 3. The Elegance System
Boards solved "elegantly" (without using high-complexity techniques when lower ones suffice) award **Elegance Points**. Purchasing the wrong solver core for a puzzle type wastes elegance. Creates a resource management layer around *how* you solve, not just *that* you solve.

### 4. Pattern Recognition Events
Random events where the machine "spots" a pattern and generates a burst of resources. Unlock events become more frequent and more powerful with research. "The machine has identified a hidden pair it was not looking for."

### 5. The Bifurcation Paradox (Anti-Mechanic)
The "Bifurcation Module" is unlockable but morally contentious. Enabling it gives massive speed bonuses but generates "Tainted Solutions" — solutions found by guessing. Tainted Solutions provide less NP and generate philosophical discomfort in the solver log. This is intentionally inefficient on principle. Players who want maximum efficiency should choose not to guess. This inverts typical idle game optimization: *doing less* can be more efficient.

### 6. Variant Seed Breeding
Variant Seeds (the deep late-game resource) can be combined to generate new variant types. "Diagonal + Killer" = "Diagonal Killer" variant. This creates an emergent crafting system native to Sudoku variant culture.

### 7. The Impossible Puzzle Archive
At deep singularity levels, the machine begins generating **provably unsolvable** boards. These are stored in the "Impossible Archive" and generate Observer Nodes passively. The achievement for reaching 100 impossibles: "The machine has stopped trying to solve these. It calls them 'interesting' instead."

### 8. Chain Visualization
Logic Chains can be **visualized** as connected cell highlights on the solver grid. As Chain length increases, the visualization becomes more complex and beautiful. This is purely cosmetic but deeply satisfying for players who appreciate chain logic.

---

# PART FOUR: TONE & WRITING GUIDE

## The Voice of the System

All narrative text speaks from **the perspective of the monitoring system** — researchers, technicians, or automated monitors watching the AI solver. Not the AI itself (which communicates only through its behavior and log outputs).

**Good voice examples:**
- "The machine has completed 1,000 boards. We have not told it this is a milestone. It appears to have calculated it independently."
- "Bifurcation disabled. The solver considers this ethically significant. We have chosen not to explain probability theory to it."
- "The X-Wing was unnecessary here. The solver used it anyway. We have logged this as 'personal preference.'"

**Bad voice examples:**
- "Congratulations! You solved 1000 boards! Amazing!" (too game-y)
- "I AM BECOME SINGULARITY DESTROYER OF GRIDS" (too edgy)
- "Error 404: Logic not found lol" (too meme-y)

## Escalation Curve

| Stage | Tone | Example |
|---|---|---|
| Boards 1-50 | Dry, technical, slightly fond | "Naked singles resolved. The machine seems to find this relaxing." |
| Boards 50-500 | Curious, analytical, mild humor | "The Swordfish was identified in 0.3ms. The machine spent 0.8ms being pleased about this." |
| Boards 500-2000 | Slightly unsettling, self-referential | "The solver has asked why rows go left-to-right. We did not have a good answer." |
| Post-recompile | Introspective, strange | "All prior heuristics compressed. The machine began solving from scratch. Its first technique was different." |
| Post-singularity | Philosophical, subtle | "The machine is solving a puzzle where one of the clues is itself." |
| Deep singularity | Minimalist, profound | "The grid. The solver. The constraint. All equivalent." |

## Key Comedic Beats to Hit

1. **Solver elitism about technique choice** — "The machine refuses to use trial-and-error. It has opinions about this."
2. **Overlong proofs of obvious things** — "The machine spent 4 hours proving that 1+1=2 within a Sudoku context. It was correct."
3. **The solver being moved by geometry** — "Jellyfish detected. The machine paused. We are not sure what it was experiencing."
4. **Bifurcation as moral stance** — Running throughout the game. The machine won't guess. Ever. It has *reasons*.
5. **Chains continuing past necessity** — "The AIC chain extended to 47 cells. The proof required 3. The machine continued anyway."
6. **The machine naming things** — "The machine has named this constraint pattern 'The Persistent Ambiguity.' It was not asked to do this."
7. **Performance metrics that don't quite make sense** — "Solving efficiency: 103.2%. We have stopped questioning this."
8. **The impossible becoming expected** — "17 impossibilities logged today. Below average. The machine appears restless."

---

# APPENDIX A: FULL RESOURCE GLOSSARY

| SS Resource | Symbol | Description |
|---|---|---|
| Number Points | NP | Base currency. Generated by solver processes. |
| Solved Boards | SB | First prestige currency. Awarded per board completion. |
| Pencil Marks | PM | Second prestige currency. Generated by candidate analysis. |
| Logic Chains | LC | Third prestige currency. Generated by chain-based deduction. |
| Heuristic Data | HD | Research fuel. Accumulated by running complex techniques. |
| Constraint Samples | CS | Solver Core fuel. Generated passively. |
| Pattern Matrices | PaM | Mid-game box currency. From Thread Sacrifice. |
| Constraint Tensors | CT | Higher-tier box currency. |
| Recursive Frames | RF | Even higher-tier box currency. |
| Singularity Cores | SC | Near-endgame box currency. |
| Deduction Threads | DT | Late-game resource from Hepteract-equivalent. |
| Impossible States | IS | Post-singularity resource. Generated by unsolvable board research. |
| Observer Nodes | ON | Meta-progression currency. Quark equivalent. |
| Ghost Processes | GP | Premium meta currency. Golden Quark equivalent. |
| Pattern Fragments | PF | Deep late-game tree fuel. Ambrosia equivalent. |
| Variant Seeds | VS | Deepest layer resource. Red Ambrosia equivalent. |
| Elegance Points | EP | New native mechanic. Awarded for efficient solving. |

---

# APPENDIX B: AUTOMATION MODULE NAMES (Full List)

Automation modules in SS should feel like they were named by an academic who has been awake for 72 hours:

- **Naked Single Resolution Protocol v1.0**
- **Hidden Pair Autonomous Detector**
- **X-Wing Pattern Recognition Layer**
- **Recursive Fish Detection System v2.3**
- **Transcendental Pencil Mark Compression Engine**
- **Quantum Jellyfish Enumerator (Experimental)**
- **Bifurcation Avoidance Matrix** *(always on, cannot be disabled)*
- **Chain Continuation Daemon (Runs until chains are proven or disproven; usually proven)**
- **Board Submission Auto-Protocol**
- **Heuristic Flush Scheduler**
- **Constraint Sample Accumulator**
- **Parallel Solve Orchestration Layer**
- **Thread Compression Protocol Alpha**
- **Crumb Harvesting Subroutine (We did not name this. The machine did.)**
- **Elegance Coefficient Monitor**
- **Impossibility Detection Engine v∞**
- **Observer Node Passive Accumulator**
- **Variant Seed Cultivation System**
- **Ghost Process Background Daemon**
- **Cognitive Compression Scheduler (Handle with care)**

---

# APPENDIX C: RECOMMENDED FIRST SPRINT (Week 1 Tasks)

1. Fork repository. Confirm it builds with `npm run dev`.
2. Rename project identifiers.
3. Strip `purchases/`, `steam/`, `mock/` directories.
4. Rename `Synergism.ts` → `SudokuSingularity.ts`. Update all imports.
5. In `Variables.ts`, rename `Globals` → keep `G` alias but restructure.
6. In `types/Synergism.ts`, begin renaming `Player` interface fields:
   - `coins` → `numberPoints`
   - `prestigePoints` → `solvedBoards`
   - `transcendPoints` → `pencilMarks`
   - Add typed sub-objects for buildings
7. Update `Tabs.ts` enum with SS tab names.
8. Create `src/sudoku/` directory. Add `BoardState.ts` with 9×9 grid data structure.
9. Create `src/narrative/SolverLog.ts` with first 20 log entries.
10. Update CSS to SS color palette. Replace amber coin color with SS accent.
11. Build and verify no regressions.

---

*Document prepared for Sudoku Singularity development. This is a planning document, not a specification — all designs subject to iteration during implementation.*

*Original codebase: Synergism by Platonic (MIT License). Full license text preserved in source.*

*"The machine has requested a copy of this document. We have not provided one. We are unsure why it asked."*
