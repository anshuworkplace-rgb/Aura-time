# Technical Findings, Improvement Opportunities and Open Questions

## 1. Audit confidence and limitations

This review is based on tracked source files in the default branch at commit `2ed9345f0c065084b45dd48429a49d99be328b25`. It was a source inspection, not a live execution. No build, lint, browser compatibility, accessibility or test command was run through the repository connection. Findings below are therefore code-level observations and hypotheses to validate, not runtime incident claims.

## 2. Verified findings

### F-01 — No backend or database implementation in the inspected tree

**Evidence:** the recursive tree contains frontend source, utility modules, config and tests, but no server entry point, API route directory, database schema, migrations or ORM.

**Impact:** session data and settings are browser-local. No verified multi-device sync, centralized backup, user identity or server-side reporting exists.

**Recommendation:** confirm whether local-only operation is intentional. If cloud sync is a product requirement, design identity, API, storage, ownership and migration requirements before implementation.

### F-02 — Seeded history can be mistaken for actual user activity

**Evidence:** when there is no non-empty stored session array, `App.tsx` calls `generateSeedSessions(todayIsoDate)`. The helper intentionally creates populated records, including 140 minutes for the current date. The regular persistence effect then writes the array to localStorage.

**Impact:** first-run focus totals, streaks, favorites and journal views can show plausible activity that the user did not perform. Those seeded records then persist as if they were real history.

**Recommendation:** decide whether demo content is desired. If yes, label it as sample data and keep it separate from actual session records. If not, initialize with an empty list. Add an explicit reset/demo-data path.

### F-03 — Completion records planned duration, not measured elapsed duration

**Evidence:** `handleCompleteSession` calculates `elapsedMins` from `totalSeconds`, even though the handler can be invoked before the target deadline (for example, keyboard shortcut S or the mini-widget skip/complete callback).

**Impact:** early completion can be recorded as if the entire planned duration was completed. Adjusting the timer while running also changes total time and may affect the stored result.

**Recommendation:** define what a completed session means. Store start time and actual focused elapsed time, distinguish natural completion from manual stop/skip, and avoid counting unworked time. Add tests for early completion, extension and duration changes.

### F-04 — Desktop notification permission is checked but not requested

**Evidence:** completion checks `Notification.permission === 'granted'` before constructing a notification. No permission request was identified in the inspected application source.

**Impact:** enabling the desktop-notifications setting may not produce notifications for users who have not already granted permission through another mechanism.

**Recommendation:** provide an explicit user-initiated permission flow with graceful unsupported/denied states and a clear settings explanation.

### F-05 — localStorage data validation and migration are limited

**Evidence:** settings JSON is merged with defaults; remembered scene is checked against the scene registry, but chamber and numeric values receive limited validation. Session history is checked primarily for array shape and non-empty length.

**Impact:** malformed, stale or manually edited values can enter state. Versioned key names exist, but no migration process is visible. Browser storage failures are silently ignored.

**Recommendation:** introduce runtime schema validation, bounds checking, versioned migrations and visible storage-error handling. Consider exporting/importing local data.

### F-06 — Session history is unbounded

**Evidence:** completed focus records are prepended to the local array and no retention, pagination or compaction mechanism is visible.

**Impact:** long-term use can increase localStorage payload size and the cost of analytics calculations and rendering.

**Recommendation:** measure expected usage, add efficient selectors and pagination/retention only after defining history requirements. Preserve export/backup if records matter to users.

### F-07 — Timer interval effect is coupled to the remaining-time state

**Evidence:** the running timer effect updates `remainingSeconds` every 250ms and includes `remainingSeconds` in its dependency list.

**Impact:** the effect is cleaned up and re-created as remaining time changes. This may be unnecessary interval churn and deserves testing for scheduling edge cases.

**Recommendation:** keep the deadline as the source of truth and use a stable interval/effect lifecycle, with refs for current callbacks if needed. Validate tab suspension, visibility changes, pause/resume and timer extension.

### F-08 — Package and metadata advertise capabilities not evidenced in application source

**Evidence:** `package.json` declares Express and `@google/genai`; `.env.example` documents Gemini and APP_URL; `metadata.json` advertises a server-side Gemini API capability. The tracked tree contains no Express server or Gemini invocation found during inspection.

**Impact:** dependency and platform expectations are unclear. Unused dependencies increase install surface and can mislead maintainers about the runtime architecture.

**Recommendation:** determine whether server code lives outside this repository or whether these entries are obsolete scaffolding. Retain only dependencies/configuration used by the actual deployment; document external services precisely.

### F-09 — No authentication/authorization implementation was found

**Evidence:** no sign-in, identity provider, protected route, auth token handling, role model or authorization policy appears in the inspected source tree.

**Impact:** the current application has no repository-level multi-user boundary. This is consistent with a local-only personal tool, but incompatible with assumptions of account-based cloud persistence.

**Recommendation:** clarify product tenancy and privacy expectations before adding backend storage or sharing.

### F-10 — Test coverage is concentrated in pure utility logic

**Evidence:** one test file covers formatting, radial duration mapping, progress, extensions, analytics, scene/chamber counts, shader helpers, sound helper contracts and procedural orb calculations.

**Impact:** central integration behaviors are not covered by the visible test suite: React state transitions, persistence, audio lifecycle, notifications, keyboard interactions, overlay interactions, WebGL fallback and session record semantics.

**Recommendation:** add timer transition tests, component tests and browser-level tests for core journeys. Keep GPU/audio tests appropriately isolated or mocked.

## 3. Additional risks to validate

| Area | Risk / question | Suggested validation |
|---|---|---|
| Timer semantics | Does manual stop count as completion? Is the full planned time intended to be credited? | Test S shortcut, mini-widget completion, break completion and timer extension |
| Date/time | `isoDate` and `hourOfDay` use local time, while some analytics construct UTC dates | Test near midnight, DST transitions and multiple time zones |
| Session identity | IDs use `Date.now()` | Trigger rapid duplicate completion paths and check collisions |
| Sound engine | AudioContext is lazily created and resumed; cleanup uses delayed timers | Test browser gesture policies, repeated chamber switching and unmount |
| Audio gain | Primary layer starts with fixed layer gain while master gain follows ambience volume; secondary layer uses its own gain | Confirm intended balance and whether primary/secondary volume semantics are intuitive |
| WebGL | Renderer initialization, context loss and software fallback paths | Test integrated GPU, software renderer, disabled WebGL and context loss |
| Performance | Multiple animation loops and particle systems can be GPU/CPU intensive | Profile low-power laptop, high-DPI display, long sessions and reduced-motion mode |
| Accessibility | Complex SVG/canvas interactions and overlays need keyboard/focus behavior verification | Keyboard-only, screen reader, contrast and focus-trap testing |
| Responsive design | Product copy calls it desktop-focused; many layouts use fixed orb sizes | Test narrow viewport, touch and zoom |
| Storage | localStorage failures are swallowed | Test private browsing, quota exceeded and corrupted JSON |
| Build | Current dependency versions are recent and package scripts are limited | Run install, `npm run lint`, `npm run build` and test command in a controlled checkout |

## 4. Improvement roadmap (not changes made)

### Priority 0 — Product semantics and correctness

1. Decide whether seeded history is demo content or product history.
2. Define manual completion, skip, early-stop and break accounting rules.
3. Record actual elapsed focus duration and start/end timestamps.
4. Specify whether the app is intentionally local-only.
5. Clarify the intended Gemini/Express/Cloud Run architecture or remove the expectation from product documentation.

### Priority 1 — Reliability

1. Validate and migrate local persisted data.
2. Add notification permission UX.
3. Stabilize the timer effect and cover pause/resume/visibility behavior.
4. Handle WebGL/audio initialization failures and device context loss explicitly.
5. Add error reporting for persistence and unsupported browser APIs.

### Priority 2 — Maintainability and testability

1. Extract timer state transitions into a reducer or dedicated timer controller with explicit invariants.
2. Separate persistence and session repository concerns from the React view.
3. Split large orchestration/rendering components where useful, without prematurely fragmenting cohesive visual logic.
4. Add component and end-to-end tests for primary user journeys.
5. Add a documented test script and CI checks for typecheck, build and tests.

### Priority 3 — Product capabilities (only if confirmed by requirements)

1. Add account identity and cloud synchronization.
2. Add export/import and backup of session history.
3. Add analytics filters and longer-term history performance controls.
4. Add cross-device timer recovery only with an agreed source-of-truth/time model.
5. Add server-side AI only after defining concrete user-facing use cases, data handling and security boundaries.

## 5. Questions requiring product/technical clarification

### Product behavior

1. Is AURA TIME intentionally a single-user, browser-local application, or is account-based cloud sync planned?
2. Should the first launch contain sample focus history, or should the journal start empty?
3. Should pressing S or using the mini-widget completion action count as a fully completed session, a partial session, or a skipped session?
4. Should changing duration during an active session change the amount of focus credit recorded?
5. Should a break be offered only after natural focus completion, or also after manual completion?

### Platform and integrations

6. Is the application deployed through Google AI Studio / Cloud Run, as the environment comments suggest?
7. Is Gemini functionality planned but not yet implemented, or is `@google/genai` and the server-side Gemini metadata now obsolete?
8. Does an external backend exist outside this repository? If yes, where is its source and API contract?
9. Is Express intended to serve the built frontend, provide API endpoints, or is it an unused dependency?

### Data and privacy

10. Is session history considered sensitive personal data, and should users have export/delete controls?
11. Is localStorage sufficient, or are backup, sync and retention requirements needed?
12. Should demo records be distinguishable in analytics and excluded from goal/streak calculations?

### Quality and support

13. Which browsers, operating systems and minimum GPU capabilities are officially supported?
14. Is mobile/touch support a requirement or is desktop the intended supported form factor?
15. What accessibility target is expected (for example, WCAG 2.2 AA)?
16. Are there existing production bugs, performance complaints or deployment constraints that should guide prioritization?

## 6. Recommended verification plan before any code changes

1. Obtain the intended deployment URL/environment and confirm whether the live product matches this branch.
2. Run dependency installation, typecheck, build and the existing Node tests in a clean checkout.
3. Exercise the start/pause/resume/reset/extend/complete/break flows in a browser.
4. Inspect localStorage before and after first launch, a real session and a browser reload.
5. Verify the notification permission flow and browser support.
6. Profile WebGL, Canvas and Web Audio on representative target devices.
7. Confirm whether Gemini, Express, OAuth or external storage exists outside this repository.
8. Review the product questions above and agree on expected session-accounting semantics.

---

**Approval boundary:** no application code changes are proposed or made in this audit. Any implementation work should wait for explicit approval of the findings, product decisions and prioritized scope.
