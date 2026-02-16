# GitHub Copilot instructions for Prompt‑Kritikal 🔧

Summary

- Short: Interactive 3D nuclear escalation simulator (React + three.js via react-three/fiber) with a modular, data-driven simulation engine in `src/sim` and visual rendering in `src/components`.
- Goal: Help agents be productive immediately—where to run, how the simulation is structured, and concrete examples to change behavior safely.

Quick start (commands)

- Install: `npm install`
- Dev server: `npm run dev` Vite; open http:
- Build: `npm run build`
- Preview built site: `npm run preview`
- Lint & format: `npm run lint`, `npm run format`

Big picture architecture

- Frontend: React app entry `src/app/App.jsx` which wires UI + 3D Canvas (`@react-three/fiber`). Main visual pieces live in `src/components` (e.g., `Arc.jsx`, `Explosion.jsx`, `CountryFillManager.jsx`).
- Simulation: Deterministic-ish CPU-side simulation in `src/sim/*` (see `simulator.js` for the main loop). Simulation is independent of rendering and returns an array of events that the renderer consumes.
- Data: Static domain data in `src/data` (notably `nations.json`, `bilateral-relations.json`). The world object is returned by `src/utils/loadData.js`.
- Hooks/Timing: `src/hooks/useEventTimeline.js` and `useSimulationClock.js` control timeline progression and smoothing for visuals.

Key files & responsibilities (examples)

- `src/sim/simulator.js` — simulateEscalation(...) produces ordered events (entrypoint for programmatic runs)
- `src/sim/strikes.js` — how a launch event is created (adds events to state.events)
- `src/sim/targeting.js` — target selection logic (weighted selection; common place to change decision making)
- `src/components/Arc.jsx` — consumes `launch` events and draws arcs
- `src/components/Explosion.jsx` — translates events into impact effects (uses `computeTrajectory`)
- `src/hooks/useEventTimeline.js` — visible events = events.filter(e => e.t <= currentTick)
- `src/config/settings.json` — runtime defaults (tickStep, antialias, pixelRatioLimit, texture)

Event & state shapes (concrete examples)

- Simulation event example (launch):

```
{
  t: <number tick>,
  type: 'launch',
  from: 'USA',
  to: 'RUS',
  weapon: 'icbm',
  count: 5,
  fromCity, toCity

}
```

- Simulation entry: `simulateEscalation({ initiator: 'USA', firstTarget: 'RUS', world: loadWorld() })` returns an array of events.
- Escalation state: created by `createEscalationState()` in `src/sim/state.js` — includes `time`, `remaining` (stocks), `devProgress`, `events`, `nextEventId`, `involved`, `struck`.

Rendering & performance patterns

- Uses `@react-three/fiber` and `three.js` primitives (e.g., `instancedMesh` in `Explosion.jsx`) for performance; adding heavy per-frame work should prefer instancing or off-main-thread calculations.
- Visual components expect event timestamps (`t`) and compute interpolation with `useFrame` and `useEventTimeline`.

Project conventions & patterns

- Keep simulation code pure and deterministic where possible: functions in `src/sim/*` accept `state` and `world` objects and mutate state explicitely (this repo uses plain objects/sets, not classes).
- Data keys are ISO-like country codes (e.g., `USA`, `RUS`) — use these as canonical references. Check `src/data/nations.json` for fields like `weapons`, `powerTier`, `lat`, `lon`, `majorCities`.
- UI code uses monospace, retro theme and places controls as fixed UI overlays; CSS lives in `src/index.css`.
- IDs: some events rely on a non-enumerable `id` (see `src/sim/strikes.js:makeLaunchEvent`). Rendering components must tolerate missing `id` (use the `${from}-${to}-${t}` fallback).

Testing & verification

- There are no automated tests in the repo. Preferred verification path is `npm run dev` and manual inspection of scenarios in the UI panel or programmatic calls to `simulateEscalation()` in the console.

Tooling & style

- Linting: ESLint config (root), run `npm run lint`.
- Formatting: Prettier – run `npm run format` before commits/PRs.

When changing simulation logic — checklist

1. Modify behavior in `src/sim/*` (e.g., `targeting.js`, `strikes.js`, `weapons.js`).
2. Keep pure functions small and document inputs/outputs. Use `world` (from `loadWorld()`) rather than reading files directly.
3. Run `npm run dev` and a scenario from the Control Panel; check event shapes in the event log (bottom-right) and visuals (arcs/explosions).
4. Run `npm run lint` and `npm run format` before PR.

Notes & gotchas

- Event timing uses a `t` integer tick value; rendering components compare `currentTime >= e.t` and interpolation may smooth visuals—follow `useSimulationClock` and `useEventTimeline` if you add time-based features.
- Graphics settings (antialias, pixel ratio, power preference) are live-controlled from `SettingsPanel` and default to `src/config/settings.json`.
- Audio auto-play may be blocked; `Audio.jsx` attaches a one-time user gesture to resume playback as needed.
