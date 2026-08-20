# Changelog

## [Unreleased]

- Rebrand to Lisa's Dungeon (`ld-*` module ids).
- Copy actor flags from the retired `rnk-*` id on first ready.
- Add LICENSE, package.json, syntax and validate checks.
- Keep existing worlds working via `ld-legacy-migrate.js`.


## [1.0.3] - 2026-07-20

### Fixed
- Inject scene control into token tools (array + object control shapes) with `onClick` + `onChange`.
- Active-GM-only event awards and API awards (no multi-GM double CP).
- ApplicationV2 hubs/popup: AbortController listeners, `render({ force: true })`, instance reuse.
- GM hub live-refresh watches all player actors' `liveCP` flags (previously never registered).
- `safeGetFlag` / `getCrimsonPoints` are synchronous (Foundry `getFlag` is sync).
- Chat cards use `CHAT_MESSAGE_STYLES` when available (v12+).
- Fear event matches `name` / statuses (not only deprecated `label`).
- Audio uses `foundry.audio.AudioHelper` with legacy fallbacks.
- Registered English language pack in `module.json`.

### Changed
- Stripped package bloat (`backups/`, release zips).
- Bumped version to `1.0.3`.

## [1.0.2] - 2026-04-15
- Verified compatibility against Foundry VTT 14.
