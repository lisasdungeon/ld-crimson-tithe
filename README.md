# LD | Crimson Tithe (`ld-crimson-tithe`)

Standalone Foundry VTT module for Foundry v13+ (verified v14).

Crimson Tithe tracks and awards **Crimson Points (CP)** for player actions in combat, exploration, and roleplay. The GM Hub gives the GM full control; the Player Hub gives characters a read-only view of their balance.

---

## Entry Point
`crimson-tithe-service-entry.js`

---

## Scene Controls
- **GM** → Opens the **Crimson Tithe GM Hub** (full add / subtract / per-actor controls for the whole party)
- **Player** → Opens the **Crimson Tithe Player Hub** (read-only CP balance for the character assigned to the user)

---

## Key Systems

| Path | Purpose |
|---|---|
| `crimson-tithe-service-entry.js` | Sole boot file. No top-level imports. Registers hooks, scene control, socket bridge, and `game['ld-crimson-tithe'].Tithe` API. |
| `crimson-tithe-config.js` | Event definitions - every hook that can award CP is declared here with `condition` callbacks. |
| `crimson-tithe-scripts/crimson-tithe-scripts-eventTracker.js` | Registers all config-driven hooks at `setup` (GM only). |
| `crimson-tithe-scripts/crimson-tithe-scripts-pointsManager.js` | `getCrimsonPoints` / `setCrimsonPoints` / `awardCrimsonPoints`. Reads `ld-crimson-tithe` first and falls back to leftover actor flag data without calling `getFlag` on a retired id. |
| `crimson-tithe-scripts/crimson-tithe-scripts-audioPlayer.js` | Plays a random award phrase audio clip (`cp_N_phrase_M.mp3`) at `ready`. |
| `crimson-tithe-scripts/crimson-tithe-scripts-chatNotifier.js` | Posts a styled chat card when CP is awarded. |
| `crimson-tithe-scripts/crimson-tithe-utils.js` | `safeGetFlag` utility - null-safe flag reads with default value. |
| `crimson-tithe-scripts/crimson-tithe-scripts-ui/crimson-tithe-scripts-ui-gmHub.js` | `CrimsonTitheGMHub` - ApplicationV2 panel. Shows all player characters, add/subtract per card, socket popup emission. |
| `crimson-tithe-scripts/crimson-tithe-scripts-ui/crimson-tithe-scripts-ui-playerHub.js` | `CrimsonTithePlayerHub` - ApplicationV2 panel. Read-only CP balance + portrait. Auto-re-renders on actor update. |
| `crimson-tithe-scripts/crimson-tithe-scripts-ui/crimson-tithe-scripts-ui-popUpUI.js` | `CrimsonTithePopUp` - floating award notification, auto-closes after 5 s. Shown to owning player via socket. |
| `crimson-tithe-templates/gmHub.html` | Handlebars template for the GM Hub. |
| `crimson-tithe-templates/playerHub.html` | Handlebars template for the Player Hub. |
| `crimson-tithe-templates/popUpUI.html` | Handlebars template for the award pop-up. |
| `crimson-tithe-assets/crimson-tithe-sounds/` | `cp_N_phrase_M.mp3` audio files (N = 1-10 CP, M = 1-5 phrase index). |
| `crimson-tithe-lang/en.json` | English localisation. |
| `crimson-tithe-style.css` | Module styles. |

---

## Public API

Available on `game['ld-crimson-tithe'].Tithe` after `ready`:

```js
// Open the GM Hub from a macro
game['ld-crimson-tithe'].Tithe.openGMHub();

// Award CP to an actor by ID
await game['ld-crimson-tithe'].Tithe.awardPoints(actorId, 5, "Defeated the Warlord");
```

---

## Socket

Uses a raw Foundry socket bridge on channel `module.ld-crimson-tithe` with scope prefix `ld-crimson-tithe.crimsonTithe`.

Registered event: `showAwardPopup(actorId, points, description)` - fired by the GM Hub after manual awards; received by owning player clients to display the pop-up.

---

## Flag Keys

| Flag scope | Key | Description |
|---|---|---|
| `ld-crimson-tithe` | `liveCP` | Current Crimson Points balance |
| `ld-crimson-tithe` | `transformationPoints` | Accumulated Transformation Points |

---

## Folder Structure

```
crimson-tithe/
├── module.json
├── crimson-tithe-service-entry.js        ← sole boot file
├── crimson-tithe-main.js                 ← legacy init (kept, not loaded by Foundry)
├── crimson-tithe-config.js               ← CP event definitions
├── crimson-tithe-style.css
├── crimson-tithe-assets/
│   └── crimson-tithe-sounds/             ← cp_N_phrase_M.mp3
├── crimson-tithe-lang/
│   └── en.json
├── crimson-tithe-scripts/
│   ├── crimson-tithe-utils.js
│   ├── crimson-tithe-scripts-audioPlayer.js
│   ├── crimson-tithe-scripts-chatNotifier.js
│   ├── crimson-tithe-scripts-eventTracker.js
│   ├── crimson-tithe-scripts-eventTracker-Wohdan.js
│   ├── crimson-tithe-scripts-pointsManager.js
│   └── crimson-tithe-scripts-ui/
│       ├── crimson-tithe-scripts-ui-gmHub.js
│       ├── crimson-tithe-scripts-ui-playerHub.js   ← new
│       └── crimson-tithe-scripts-ui-popUpUI.js
├── crimson-tithe-templates/
│   ├── gmHub.html
│   ├── playerHub.html                    ← new
│   └── popUpUI.html
└── scripts/
    └── rnk-localize-helper.js            ← legacy helper (not loaded by Foundry)
```
