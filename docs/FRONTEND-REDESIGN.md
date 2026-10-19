# Campus Mate frontend redesign plan

## Global quick menu

App mounts one persistent RadialMenu on every route. All pages share browse,
publish, recommendations, my activities and AI companion actions. Browsing from
another page navigates to discovery before scrolling to the activity list.
Existing login checks and publish actions are preserved.

## Notification deletion

Notifications retain read and mark-all-read actions. Each row now has a separate
delete button with confirmation and pending feedback. DELETE /api/notifications/:id
enforces ownership; successful deletion removes the local row and updates the
computed unread badge. Failures retain the notification. Multiline cancellation
announcements preserve line breaks.

## Activity cancellation form

The hosted activity card's cancel action now opens CancellationDialog. It requires
a reason and announcement before DELETE /api/activities/:id. Submission is locked
while pending; failures retain inputs, success refreshes hosted/joined lists and
removes the deleted activity from local favorites. The backend sends durable
notifications and deletes the activity atomically. Build and API regression pass.

## Unified activity member information

Activity details retain GET /api/activities/:id. Organizers load applications
through GET /api/activities/:id/applications and retain approval/rejection actions.
Approved participants use GET /api/activities/:id/contact. Both roles now open
ApplicantsDialog with the same member rows and contact copy controls. Participants
see themselves without contact details, then the organizer and other members;
only organizers see pending applications and review actions. Empty animation
targets are skipped during page transitions, and the account user SVG path is fixed.

## AI assistant Live2D integration

Current interface: the character appears on the left instead of the former chat
panel. Single click toggles a bottom-centered composer; double click opens the
function menu. The latest assistant reply appears in a scrollable character
bubble. Menu actions include history, persona, touch interactions, and a named
1–180 minute timer. Timers use a deadline to avoid background-tab interval drift,
but remain page-local and are cleared when the assistant closes or page reloads.
Browser verification covered real AI replies, double-click isolation, timer
creation, settings, history, and model cleanup with no page errors.

- Existing actions: open/close assistant, send messages, view session history,
  customize persona, and use study timer.
- Existing API calls: `/api/ai/sessions`, `/api/ai/sessions/:id`,
  `/api/ai/sessions/:id/messages`, `/api/ai/persona`.
- `StudyAssistant.vue` mounts `Live2DAvatar.vue` while the assistant is visible.
  The character floats at the bottom right and is destroyed on close.
- Loads local `public/hiyori_vts/hiyori.model3.json` and local Cubism Web Core.
  Registers the existing m01 idle motion at runtime; original model files stay intact.
- Renderer uses 30 FPS, caps pixel ratio at 1.5, and pauses on hidden tabs.
- Validation: production build and core API test passed; Edge browser smoke
  confirmed visible model, no browser errors, and canvas removal on close.
- Speech, lip sync, and AI-driven expression selection are future work.

## Baseline

- Stack: Vue 3, Vite, Element Plus, and a single large `src/App.vue` with global `src/style.css`.
- Backend integration: core API test passes for health, login, activity listing, application approval, contact privacy, favorites, notifications, statistics, and administrator access.
- Production build: passes. Vite reports a large JavaScript chunk warning, which should be addressed during component and route splitting.
- The former single component structure has been replaced with route views, shared components, and a centralized frontend store. Future page work should stay inside these boundaries.

## Implemented frontend architecture

The frontend now uses Vue Router and route level code splitting. `App.vue` only owns the application shell, global dialogs, and route outlet.

| URL | Route name | Page component |
| --- | --- | --- |
| `/` | `discover` | `views/DiscoverView.vue` |
| `/recommendations` | `recommendations` | `views/RecommendationView.vue` |
| `/activities/:id` | `activity-detail` | `views/ActivityDetailView.vue` |
| `/my/activities` | `my-activities` | `views/MyActivitiesView.vue` |
| `/account/favorites` | `favorites` | `components/layout/AccountLayout.vue` → `views/MyActivitiesView.vue` |
| `/account/notifications` | `notifications` | `components/layout/AccountLayout.vue` → `views/NotificationsView.vue` |
| `/account/profile` | `profile` | `components/layout/AccountLayout.vue` → `views/ProfileView.vue` |
| `/account/admin` | `admin` | `components/layout/AccountLayout.vue` → `views/AdminView.vue` |

Shared API state and actions live in `stores/campus.js`. Reusable cards, layout, and dialogs live under `components/`; GSAP route transitions and hover behavior live under `composables/` and `directives/`.

Profile, favorites, notifications, and administration share `AccountLayout.vue`: navigation stays in the left column while the selected route renders in the right content column. “我的活动” remains a standalone page and is exposed immediately to the left of the account avatar.

## Branch and review policy

- Working branch: `design/frontend-redesign`.
- Keep `main` as the protected baseline.
- Use one commit per completed page or coherent flow.
- Push the working branch and open a pull request; merge only after review and validation.
- Suggested commit format: `design(discover): rebuild activity discovery page`.

## Required validation for every page

1. Start the API and Vite development servers with `npm run dev`.
2. Exercise the page with real seeded data and the documented demo accounts.
3. Check desktop width, tablet width, and a mobile width near 390 px.
4. Verify loading, empty, error, logged out, and permission dependent states that apply to the page.
5. Run `npm run build`.
6. Run `npm test`.
7. Commit only the finished page and its shared primitives.

## Page sequence

### 1. Discovery and recommendation

Preserve:

- `GET /api/activities` search and category filtering.
- `GET /api/recommendations` for signed in recommendations.
- Favorite toggling, login gating, activity detail opening, and publish entry.

Design work:

- Replace the decorative hero with a useful discovery lead area.
- Improve search, categories, date/capacity scanning, card hierarchy, and responsive behavior.
- Add loading, empty, and failed request presentations.
- Give recommendations a separate card deck experience: staggered full-screen cards, shuffle refresh, random draw, detail navigation, loading, empty, and error states.

### 2. Activity detail and application

Preserve:

- `GET /api/activities/:id` and organizer reviews.
- Application creation, withdrawal, organizer actions, member contact privacy, reporting, and post activity review.

Design work:

- Separate event story, facts, organizer trust, membership state, and actions.
- Surface capacity and approval state before the primary action.

### 3. Authentication

Preserve:

- Registration, login, JWT storage, logout, and refresh of current user data.

Design work:

- Add inline field validation, pending state, useful error placement, and accessible focus order.

### 4. Publish and edit activity

Preserve:

- Activity create/update request bodies, date conversion, interests, capacity, and image upload.

Design work:

- Convert the crowded dialog into a structured flow with image preview, clear required fields, and final review.

### 5. My activities and applications

Preserve:

- Created activities, applications, approval decisions, withdrawal, cancellation, contact access, and reviews.

Design work:

- Separate organizer and participant tasks. Highlight pending decisions and upcoming commitments.

### 6. Profile, interests, availability, and statistics

Preserve:

- Profile update, interests, weekly availability, reviews, and personal statistics.
- Current API contract: `GET /api/users/:id`, `GET /api/users/me/availability`, `GET /api/users/me/stats`, and `PATCH /api/users/me`.
- Current user actions: upload and replace an avatar; edit public name, bio, major and year; select interests; toggle weekly availability; save the profile; open personal activities, favorites, notifications, and administrator tools; log out.

Design work:

- Make weekly availability easier to scan and operate on mobile. Clarify public and private profile fields.

### 7. Favorites and notifications

Preserve:

- Favorite listing, individual notification read state, and navigation targets.

Design work:

- Add informative empty states, better time hierarchy, and a visible unread state.

### 8. Administration

Preserve:

- Administrator role guard, report status changes, activity listing, and activity removal.

Design work:

- Build a compact moderation queue with evidence, status, audit feedback, and explicit destructive confirmation.

## OpenDesign handoff

Use `DESIGN.md` as the visual contract. For each page, OpenDesign should produce a focused prototype that includes desktop and mobile states plus loading, empty, and error examples. Codex then maps the approved structure into real Vue components while retaining the API calls listed above.

