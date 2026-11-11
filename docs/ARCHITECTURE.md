# System Architecture

## 1. Architecture summary

The current repository implements a browser-first single-page application:

```text
Browser
└── React 19 application (Vite bundle)
    ├── App.tsx — state orchestration and timer lifecycle
    ├── UI components
    │   ├── LivingLens — Canvas 2D orb + timer controls
    │   ├── QuantumNebulaBackground — Three.js / WebGL shaders
    │   ├── ControlDock + control panels
    │   ├── HomeStageAtelier
    │   ├── overlays (Scenes, Chambers, Insights, Calibration)
    │   └── FloatingMiniWidget
    ├── Domain / utility modules
    │   ├── focusEngine — definitions, timer helpers, analytics, seed data
    │   ├── organicOrbEngine — procedural organism calculations
    │   ├── quantumNebulaShaders — shader source and parameter helpers
    │   └── soundSynthesizer — Web Audio generation and analysis
    ├── Browser APIs
    │   ├── localStorage
    │   ├── Canvas 2D
    │   ├── WebGL / Web Audio
    │   ├── Notifications API (permission-gated)
    │   ├── Fullscreen API
    │   └── pointer / keyboard / animation / timer events
    └── No repository-defined API server or database layer found
```

The Vite development server serves the frontend. The package manifest includes Express, but no server entry point or Express route implementation appears in the tracked source tree.

## 2. Build and runtime stack

| Concern | Implementation evidenced in repository |
|---|---|
| UI | React 19, TypeScript |
| Bundler/dev server | Vite 8 with React and Tailwind Vite plugins |
| Styling | Tailwind CSS 4 plus custom CSS/design tokens |
| Animation | `motion` package (imported as `motion/react`) |
| Icons | lucide-react |
| 3D / GPU rendering | Three.js, WebGL, custom GLSL shader strings |
| Central orb rendering | Canvas 2D |
| Audio | Browser Web Audio API |
| Local persistence | Browser localStorage |
| Tests | Node built-in test runner and strict assertions in one test file |
| Package lock | bun.lock |

Scripts in `package.json`:

- `dev`: Vite on port 3000, host 0.0.0.0.
- `build`: `vite build`.
- `preview`: Vite preview.
- `lint`: `tsc --noEmit`.
- `clean`: removes dist and server.js.

No dedicated test script is declared in the package manifest.

## 3. Frontend state ownership

`App.tsx` is the application-level state owner. It holds:

- `settings`: the typed user settings object.
- `sessions`: an array of `SessionRecord`.
- `sceneId`, `chamberId`, `secondaryChamberId`.
- `durationMinutes`, `sessionLabel`.
- `phase`, `status`, `totalSeconds`, `remainingSeconds`.
- `scrubberOpen`, `isSoundPlaying`.
- `activeOverlay`, `immersionMode`, `stageLayout`.
- Floating-widget and control-rail visibility.
- `targetEndTimestampRef`, a mutable timer deadline that does not itself trigger React rendering.

State updates are propagated to children through props and callback functions. Child components own only interaction-local state such as open dock group, active drag, hover, label editing and selected visual item.

This is a centralized state architecture rather than a global state library, reducer, context provider or external store.

## 4. Persistence and data model

There is no SQL/NoSQL schema or migration system in the repository. The practical data model is a set of TypeScript interfaces serialized into localStorage.

### 4.1 Stored keys

| Key | Value | Initialization / persistence |
|---|---|---|
| `aura_living_lens_settings_v2` | `UserSettings` JSON | Merged with `DEFAULT_USER_SETTINGS`; persisted on settings changes |
| `aura_living_lens_sessions_v2` | `SessionRecord[]` JSON | Parsed if non-empty array; otherwise generated seed records; persisted on changes |
| `aura_living_lens_state_v2` | Scene, chamber, duration, session label | Read by individual state initializers; persisted as one object |
| `aura_home_stage_layout_v1` | One stage-layout string | Read and persisted separately |

### 4.2 Session record

`SessionRecord` fields:

- `id`: generated string identifier.
- `label`: user intention/session name.
- `durationMinutes`: stored duration.
- `completedAt`: ISO timestamp.
- `isoDate`: local calendar date in YYYY-MM-DD form.
- `hourOfDay`: local hour.
- `sceneId`: one of five focus scenes.
- `chamberId`: one of nine chambers.

The record is denormalized: scene and chamber identifiers are stored directly alongside each session. Scene/chamber definitions are static application configuration, not database entities.

### 4.3 Data relationships

```text
UserSettings (one local JSON object)
        |
        +--> audio volumes / audio reactivity --> soundSynthesizer
        +--> reduced motion / contrast --------> UI and render components
        +--> orb design / background mix ------> LivingLens and shader scene
        +--> daily goal / break duration ------> timer and progress UI

Remembered UI state (one local JSON object)
        +--> FocusSceneId
        +--> ChamberId
        +--> durationMinutes
        +--> sessionLabel

SessionRecord[] (local JSON array)
        +--> sceneId --> FOCUS_SCENES[sceneId]
        +--> chamberId --> CHAMBERS[chamberId]
        +--> isoDate / durationMinutes / hourOfDay
                 --> daily totals, streaks, weekly rhythm,
                     time-of-day rhythm, favorites, heatmap
                 --> completed-session count --> Living Bloom growth
```

### 4.4 Persistence limitations

- localStorage is browser-origin scoped and does not sync across browsers/devices.
- No explicit schema version migration is present beyond versioned key names.
- Settings are merged with defaults, but session records are only checked for array shape at initialization.
- No retention limit or compaction is visible for session history.
- Storage exceptions are swallowed, so quota/security failures are not surfaced to the user.
- Seed history is written through the ordinary persistence effect, making initial demo data indistinguishable from genuine records in the current model.

## 5. Timer lifecycle and data flow

The timer deadline is stored in `targetEndTimestampRef`. When status becomes running, an effect starts a 250ms interval. Each tick calculates:

`remaining = max(0, ceil((targetEndTimestamp - Date.now()) / 1000))`

When remaining time reaches zero, the completion handler runs. Pause calculates and saves the current remaining time, clears the deadline and changes status. Resume creates a new deadline from the saved remaining time.

Timer actions and relevant dependencies:

| Action | State effect |
|---|---|
| Begin | Focus phase, duration initialized, deadline set, running |
| Pause | Remaining time snapshotted, deadline cleared, paused |
| Resume | Deadline rebuilt, running |
| Reset | Focus phase, configured duration restored, idle |
| Add minutes | Remaining and total adjusted; running deadline shifted |
| Change duration | Deadline cleared, timer reset to idle |
| Start break | Break phase and break duration, running |
| Complete | Completed status, remaining zero, sound stopped; focus record appended only for focus phase |

Potential implementation concern: the interval effect depends on `remainingSeconds`, and that value is updated by each interval tick. This causes effect cleanup and recreation on timer updates. Correctness should be tested under pause/resume, tab throttling and rapid adjustments.

## 6. Audio architecture

`soundSynthesizer.ts` exports a singleton `soundEngine`.

- Lazily creates an AudioContext and master GainNode.
- Connects master gain to an AnalyserNode and then to audio output.
- Creates pink/brown noise buffers procedurally.
- Creates filter/gain/oscillator/LFO graphs for each chamber.
- Tracks primary and secondary active layers.
- Fades layers out and schedules source-node cleanup.
- Provides amplitude, bass/mid/treble and frequency spectrum accessors.
- Generates a completion chime from sine oscillators.

`App.tsx` synchronizes chamber state and volumes to the engine in an effect. The visual background and central orb read analyser output for audio-reactive rendering.

Audio behavior is browser/device dependent. The source attempts to resume a suspended AudioContext, but actual autoplay/user-gesture behavior should be tested in target browsers.

## 7. Graphics architecture

### 7.1 LivingLens

A React component owns a Canvas 2D drawing loop using `requestAnimationFrame`. It keeps frequently changing render inputs in a ref to avoid restarting the draw loop on every state update. It draws the orb, internal caustics, particles, material effects, rim, progress arc and pointer ripples.

The timer text and radial duration scrubber are regular React/SVG/HTML elements layered over the canvas.

### 7.2 QuantumNebulaBackground

A React component initializes a Three.js renderer and scene, camera, environment reflection, lights, shader plane and particle field. Custom shader uniforms are updated from current scene, orb mode, timer state, progress, audio amplitude and background mix.

A software-renderer check selects a reduced pixel ratio/antialiasing path. The component tracks a WebGL initialization failure flag. Device-loss recovery, context restoration and fallback rendering should be validated in a browser.

## 8. API, integrations and backend assessment

### 8.1 Repository evidence

- No API route or server source directory appears in the complete recursive tree for the inspected commit.
- No database schema, migration, ORM model or repository layer appears in the tree.
- The app source uses browser APIs for persistence, rendering, audio, notifications and fullscreen.
- Package dependencies include `express` and `@google/genai`.
- `.env.example` documents `GEMINI_API_KEY` and `APP_URL`, with comments describing AI Studio/Cloud Run injection.
- `metadata.json` lists `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`.

### 8.2 What is not verified

The inspected frontend source did not establish any Gemini client invocation, Express server, API endpoint, OAuth implementation or remote database call. The package dependencies, environment template and metadata may be scaffolding or host-platform declarations. They must not be treated as working integrations without deployment configuration or server source.

### 8.3 Authentication and authorization

No login flow, session cookie handling, token storage, auth provider, protected route, role check or authorization policy was identified in the repository source tree. Current app behavior appears anonymous and browser-local. This is a statement about the inspected repository, not a guarantee about an upstream hosting platform.

## 9. Module dependency map

```text
main.tsx
  └── App.tsx
      ├── types/aura.ts
      ├── utils/focusEngine.ts
      │    ├── scene and chamber definitions
      │    ├── timer calculations
      │    ├── analytics
      │    └── seed history
      ├── utils/soundSynthesizer.ts
      │    └── Web Audio API
      ├── components/LivingLens.tsx
      │    ├── utils/focusEngine.ts
      │    ├── utils/organicOrbEngine.ts
      │    └── utils/soundSynthesizer.ts
      ├── components/QuantumNebulaBackground.tsx
      │    ├── three
      │    ├── utils/quantumNebulaShaders.ts
      │    └── utils/soundSynthesizer.ts
      ├── components/ControlDock.tsx
      │    ├── SoundControlPanel
      │    ├── TimeControlPanel
      │    ├── FocusControlPanel
      │    └── MoreControlPanel
      ├── components/HomeStageAtelier.tsx
      ├── components/AuraButton.tsx
      ├── overlays
      └── components/FloatingMiniWidget.tsx
```

## 10. Deployment and operational uncertainties

Vite scripts indicate a frontend build. The `dev` script binds to all interfaces on port 3000. `vite.config.ts` configures React and Tailwind plugins and conditionally disables HMR/file watching via `DISABLE_HMR`.

The repository does not contain a deployment workflow, Dockerfile, server entry point, infrastructure definition, hosting manifest or CI pipeline in the inspected tree. The production hosting target and whether an external platform injects server capabilities remain unknown.
