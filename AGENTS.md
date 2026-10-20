# Campus Mate agent workflow

These rules apply to every automated agent working in this repository.

## Source of truth

- `DESIGN.md` defines the visual direction, tokens, responsive behavior, and component rules.
- `docs/API.md` defines the current backend contract.
- Existing authentication, permission checks, API paths, request bodies, and response handling must remain compatible during frontend work.

## Frontend redesign workflow

1. Work from a feature branch created from an up-to-date `main`. Never implement a redesign directly on `main`.
2. Change one page or one tightly related flow at a time.
3. Keep the existing Vue 3, Vite, and Element Plus stack unless the user explicitly approves a migration.
4. Before changing a page, record its current API calls and user actions in `docs/FRONTEND-REDESIGN.md`.
5. After changing a page, run `npm run build`, `npm test`, and a browser smoke test of that page against the local API.
6. Commit a completed page separately so it can be reviewed or reverted without affecting other pages.
7. Merge through a pull request after review. Keep `main` releasable.

## Safety boundaries

- Do not rename or remove API endpoints as part of visual work.
- Do not weaken login, role, ownership, membership, or contact privacy checks.
- Do not replace real API data with permanent mock data.
- Preserve loading, empty, error, disabled, and permission denied states.
- Per the user's data-sharing request, track `server/data/campus-mate.snapshot.db`
  and `server/uploads/` so collaborators receive current data and images.
- Export snapshots with `npm run data:export`; never track the live database,
  its WAL/SHM files, local backups, `.env`, dependencies, caches or build output.

