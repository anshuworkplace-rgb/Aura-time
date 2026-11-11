# Product and Module Reference

## 1. Product purpose

AURA TIME describes itself in `index.html` and `metadata.json` as a “Digital Focus Environment”. The implementation combines a configurable focus/break timer with immersive visual and procedural audio experiences. Its interaction model is centered on one primary timer action, with secondary controls progressively disclosed through a four-group dock and overlays.

The product appears designed for an individual using one browser profile. No account model, user identity, collaboration, remote synchronization or server-backed history is present in the inspected application code.

## 2. Repository structure

| Path | Responsibility |
|---|---|
| `src/main.tsx` | React root creation and global CSS import |
| `src/App.tsx` | Application composition, top-level state, timer lifecycle, persistence and cross-component orchestration |
| `src/types/aura.ts` | Domain types for scenes, chambers, sessions, timer states, overlays and settings |
| `src/utils/focusEngine.ts` | Static scene/chamber configuration, timer helpers, session analytics and seed data |
| `src/utils/organicOrbEngine.ts` | Pure/procedural calculations for orb appearance, jelly tentacles and bloom growth |
| `src/utils/quantumNebulaShaders.ts` | Shader source and shader parameter/interpolation helpers |
| `src/utils/soundSynthesizer.ts` | Web Audio API sound generation, chamber layers, analyser data and completion chime |
| `src/components/LivingLens.tsx` | Main procedural canvas orb and interactive timer display |
| `src/components/QuantumNebulaBackground.tsx` | Three.js/WebGL full-screen shader and particle background |
| `src/components/ControlDock.tsx` | Four-group control surface and panel orchestration |
| `src/components/AuraButton.tsx` | Reusable branded action button |
| `src/components/HomeStageAtelier.tsx` | Stage layout, orbital frame and stage switcher |
| `src/components/SceneSelectorOverlay.tsx` | Scene, orb-design and background-mix selection |
| `src/components/ChambersOverlay.tsx` | Sound chamber and volume configuration |
| `src/components/InsightsOverlay.tsx` | Local session analytics and visual journal |
| `src/components/CalibrationOverlay.tsx` | Settings/calibration and command interface |
| `src/components/FloatingMiniWidget.tsx` | Compact floating timer controls |
| `src/components/SoundControlPanel.tsx` | Primary/secondary ambience and audio controls |
| `src/components/TimeControlPanel.tsx` | Duration and timer adjustment controls |
| `src/components/FocusControlPanel.tsx` | Focus scene and immersion controls |
| `src/components/MoreControlPanel.tsx` | Additional utilities/settings controls |
| `src/components/ChambersOverlay.tsx` | Chamber selection UI |
| `src/components/CalibrationOverlay.tsx` | Application settings and command overlay |
| `src/index.css` | Global design tokens, glass surfaces, contrast and reduced-motion CSS |
| `src/utils/focusEngine.test.ts` | Node test suite for timer, analytics, shader and procedural-engine helpers |

The repository also contains Vite, TypeScript, package and lock configuration, an HTML shell, `.env.example` and `metadata.json`.

## 3. Product features and verified implementation

### 3.1 Focus timer

Domain states in `aura.ts`:

- Phase: `focus` or `break`.
- Status: `idle`, `running`, `paused` or `completed`.
- Immersion mode: `standard`, `deep` or `minimal`.

The main action in `App.tsx` maps state to Begin, Pause, Resume or Start again. A ref stores a target wall-clock end timestamp. While running, an interval recalculates remaining seconds from that timestamp rather than subtracting one from a counter. This reduces cumulative drift when browser scheduling is delayed.

Duration can be set directly or adjusted by minute increments. The radial scrubber in `LivingLens.tsx` maps a circular pointer angle to 15–120 minutes and magnetically snaps near 25, 45, 60 and 90 minutes.

### 3.2 Focus scenes

`focusEngine.ts` defines five typed scenes:

- Deep Current
- Chromatic Flow
- Night Signal
- Electric Quiet
- Solar Drift

Each scene supplies descriptive copy, a color palette, motion parameters, a suggested sound chamber and a completion phrase. Selecting a scene while idle also selects its suggested chamber; while a timer is active, the scene changes without automatically replacing the chamber.

### 3.3 Sound chambers

Nine typed chambers are defined, including Rain Chamber, Low Orbit, Vinyl Library, Afterhours Cafe, Coastal Static, Forest 2AM, Brown Noise, Soft Drone and Deep Quiet.

`soundSynthesizer.ts` creates audio procedurally using oscillators, generated noise buffers, filters, gain nodes and low-frequency modulation. The sound engine can layer a primary chamber and an optional secondary chamber. It exposes analyser-derived amplitude, frequency bands and spectrum values for visual reactivity. Completion plays a generated multi-note chime.

This is generated browser audio, not a remote audio-streaming integration.

### 3.4 Procedural orb and background

Three orb designs are represented by the type `OrbDesignId`: Original, Celestial Jelly and Living Bloom. `LivingLens.tsx` draws the central lens using Canvas 2D and delegates organism calculations to `organicOrbEngine.ts`. The Living Bloom design uses completed-session count to calculate a cosmetic growth stage.

`QuantumNebulaBackground.tsx` uses Three.js, WebGL, a RoomEnvironment reflection environment, custom ShaderMaterial shaders and a particle field. It reads sound analyser data and current scene/timer state to drive visual parameters. A software-WebGL guard reduces rendering quality when a software renderer is detected. The component tracks a WebGL failure state; exact fallback behavior should be checked in a live browser.

### 3.5 Insights / Visual Focus Journal

Session history is stored locally and passed into `InsightsOverlay.tsx`. The overlay calculates:

- Today’s focus total.
- Number of session records.
- Current and longest streak.
- Seven-day rhythm.
- Time-of-day distribution.
- Favorite scene and chamber.
- A 28-day heatmap.
- A constellation-style view of recent sessions.

The calculations are implemented in `focusEngine.ts`; this is local analytics, not server-side analytics.

### 3.6 Settings and accessibility

The `UserSettings` interface and defaults include daily goal, break length, primary/secondary ambience volumes, alert volume, audio reactivity, reduced motion, high contrast, timer text scale, desktop notifications, background mix and orb design.

Global CSS includes high-contrast glass overrides and a `prefers-reduced-motion` media rule. The application also has a user-controlled reduced-motion setting, which is passed to visual components.

### 3.7 Additional interactions

- Floating mini timer widget.
- Three home-stage layouts: Atelier, Horizon and Sculpture.
- Fullscreen toggle.
- Keyboard shortcuts: Space, F, M, R, S and Cmd/Ctrl+K.
- Automatic control-rail hiding while running, with pointer/keyboard activity revealing it.
- Browser document title reflects remaining time and session label while running or paused.
- Optional desktop notification on completion, if browser permission is already granted.

The inspected code checks notification permission but does not request it. A user-facing permission-enablement flow was not identified.

## 4. Frontend component architecture

`App.tsx` owns the primary state and passes values and callbacks into mostly controlled child components.

**Main composition:**

1. `QuantumNebulaBackground` renders the global visual environment.
2. Header presents brand, stage selector, today signal and calibration trigger.
3. Main stage presents `HomeStageOrbitalFrame`, `LivingLens`, primary action and `ControlDock`.
4. Footer presents daily-goal progress.
5. Overlays mount for scene selection, chamber selection, insights and calibration.
6. `FloatingMiniWidget` is available as a compact timer interface.

`ControlDock` composes Sound, Time, Focus and More panels. Its own local state controls which group is open; the application-level state remains in `App.tsx`.

## 5. Core user journeys

### Journey A — First launch

1. React mounts `App`.
2. Settings, session history and remembered timer defaults are read from `localStorage`.
3. If no usable session array is present, `generateSeedSessions(todayIsoDate)` supplies demo-like history.
4. Effects persist settings, sessions, remembered defaults and stage layout.
5. The user sees the idle timer, default scene, chamber and visual stage.

Important: the initial seeded session history is not empty. It can make the Insights view and today’s focus signal appear populated before the user completes a real session. The seed data is persisted by the normal sessions effect.

### Journey B — Start, pause and resume focus

1. User selects duration, scene, chamber and optional session label.
2. Begin sets focus phase, total and remaining seconds, target end timestamp and running status.
3. Sound is enabled when the selected chamber is not Deep Quiet and ambience volume is positive.
4. The timer interval updates remaining time from the target timestamp.
5. Pause snapshots the remaining wall-clock time, clears the target timestamp and stops ambience.
6. Resume creates a new target timestamp from the saved remaining time and restarts ambience.

### Journey C — Complete a focus session

1. Timer reaches zero or a completion action invokes `handleCompleteSession`.
2. Completion chime is played.
3. If the phase is focus, a `SessionRecord` is prepended to session history.
4. If desktop notifications are enabled and permission is already granted, a notification is displayed.
5. Status becomes completed, remaining time becomes zero and ambience stops.
6. The central lens presents the completion phrase and offers break or restart actions.

The record’s duration is currently derived from `totalSeconds`, not measured elapsed focus time. This matters when the user manually completes/skips a session early or changes its duration mid-run; see the findings document.

### Journey D — Start a break

1. The completion experience offers Take a break.
2. `handleStartBreak` sets phase to break, initializes the configured break duration and starts the timer.
3. On completion, the handler does not append a focus session because the phase is break.

### Journey E — Review focus history

1. User clicks the today signal.
2. `InsightsOverlay` receives current session records and the current local date.
3. Memoized selectors calculate streak, weekly rhythm, time-of-day rhythm and favorites.
4. The overlay renders history-derived visualizations locally.

### Journey F — Configure sound and visuals

1. User opens a dock group or corresponding overlay.
2. Panel callbacks update `App` state.
3. Settings changes are persisted to localStorage.
4. Scene, chamber, volume, audio reactivity, orb design and background mix flow into the canvas, shader and sound-engine components.

## 6. Business rules and dependencies

- Scene selection suggests a chamber only while idle.
- A Deep Quiet primary chamber suppresses the automatic ambience-on behavior; the sound engine can still play a non-quiet secondary chamber if its play condition is met.
- The main timer uses a wall-clock target timestamp as its source of truth while running.
- Focus completions are recorded; break completions are not.
- Daily goal ratio is capped at 100% for the footer progress indicator.
- The radial duration range is 15–120 minutes, with magnetic snap points.
- The orb growth stage depends on the number of stored session records, not a verified count of unique successful sessions.
- Session analytics depend entirely on locally stored records and their `isoDate`, `hourOfDay`, scene and chamber fields.

## 7. Current scope boundaries

The inspected code does not establish:

- User accounts, sign-in, roles or authorization.
- A remote API contract or backend service.
- A relational/document database, migrations or ORM.
- Cross-device synchronization or cloud backup.
- Server-side analytics or authoritative timekeeping.
- OAuth callbacks or a working Gemini-powered feature.

These may exist in hosting infrastructure or uninspected external configuration, but they are not evidenced by the current repository source tree.
