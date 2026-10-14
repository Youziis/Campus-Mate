# Campus Mate frontend redesign plan

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
| `/recommendations` | `recommendations` | `views/DiscoverView.vue` |
| `/activities/:id` | `activity-detail` | `views/ActivityDetailView.vue` |
| `/my/activities` | `my-activities` | `views/MyActivitiesView.vue` |
| `/favorites` | `favorites` | `views/MyActivitiesView.vue` |
| `/notifications` | `notifications` | `views/NotificationsView.vue` |
| `/profile` | `profile` | `views/ProfileView.vue` |
| `/admin` | `admin` | `views/AdminView.vue` |

Shared API state and actions live in `stores/campus.js`. Reusable cards, layout, and dialogs live under `components/`; GSAP route transitions and hover behavior live under `composables/` and `directives/`.

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

