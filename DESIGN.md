# Campus Mate design system

## Product character

Campus Mate is a student activity matching product. The interface should feel like a well curated campus notice board: warm, active, trustworthy, and easy to scan. It should avoid the visual language of a corporate analytics dashboard and the common purple gradient AI style.

The memorable quality is a layered editorial activity board: strong event imagery, compact factual labels, warm paper like surfaces, and restrained green accents.

## Color palette and roles

Use CSS custom properties and semantic names. Do not place new raw colors throughout page components.

| Token | Value | Role |
| --- | --- | --- |
| `--cm-canvas` | `#F6F4EE` | App background |
| `--cm-surface` | `#FFFEFA` | Primary surface |
| `--cm-surface-muted` | `#ECEFE7` | Secondary surface and selected filters |
| `--cm-ink` | `#20332F` | Primary text |
| `--cm-ink-muted` | `#66756F` | Secondary text |
| `--cm-line` | `#DDE3DC` | Borders and dividers |
| `--cm-brand` | `#176B52` | Primary actions and active state |
| `--cm-brand-hover` | `#105540` | Hover and pressed action |
| `--cm-accent` | `#D9834A` | Time sensitive and recommendation accents |
| `--cm-danger` | `#B84A43` | Destructive and error state |
| `--cm-success` | `#377A57` | Confirmed and completed state |

Accent colors should mark decisions and status. Large backgrounds should use neutral canvas and surface colors.

## Typography

- Display and page titles: `Noto Sans SC`, 700 to 800, compact line height, slightly negative letter spacing.
- Interface and body: `DM Sans`, `Noto Sans SC`, 400 to 600.
- Dates, counts, and compact metadata: enable `font-variant-numeric: tabular-nums`.
- Body copy should stay near 65 Chinese characters per line on wide screens.
- Use sentence case and direct Chinese wording. Avoid decorative English headings when a clear Chinese label is available.

## Layout

- Maximum content width: `1440px` with responsive page gutters.
- Desktop navigation stays at the top. Core content uses an asymmetric 12 column grid.
- Discovery prioritizes one lead activity and a varied activity grid instead of four identical cards across every row.
- Operational pages such as applications and administration use denser rows and stronger alignment.
- Mobile layout begins below `800px`; controls must remain reachable without horizontal page scrolling.
- Avoid fixed viewport heights. Use content driven sections and `min-height` where a stable shell is needed.

## Components

- Buttons use three levels: filled primary, quiet secondary, and text action. Destructive actions always use the danger role.
- Cards use surface contrast and spacing before shadow. Reserve elevation for interactive overlays and selected items.
- Activity covers use uploaded images when present and a consistent category illustration fallback when absent.
- Tags use compact rounded rectangles; do not make every label a pill.
- Avatars use rounded squares for organizers and circles for member stacks, making the two roles visually distinct.
- Forms show labels, help text, validation, pending state, and submission feedback in place.
- Dialogs are reserved for short decisions. Publishing and profile editing should become full page or drawer flows when redesigned.

## Interaction and state coverage

- Every interactive element needs hover, active, focus visible, and disabled styling.
- Use 160 to 240 ms transitions based on opacity and transform.
- Lists need skeleton loading, useful empty states, and inline retry errors.
- Respect `prefers-reduced-motion`.
- Keyboard focus must remain visible and the document should include a skip link to the main content.
- Text and controls must meet WCAG AA contrast.

## Responsive behavior

- `>= 1200px`: full navigation, lead layout, four column support only where content density warrants it.
- `800px–1199px`: compact navigation and two or three column activity layouts.
- `< 800px`: stacked page flow, bottom safe spacing, full width primary actions, two column filters where appropriate.
- `< 480px`: single column cards and simplified metadata, without hiding required actions.

## Page direction

1. Discovery and recommendation: editorial activity board, strong search and filters, clear availability and capacity.
2. Activity detail: readable story, facts rail, organizer trust, application state, member privacy, and reviews.
3. Authentication: compact and reassuring, with clear demo account support and validation.
4. Publish and edit: structured multi section form with image preview and review step.
5. My activities: separate organizing and participating responsibilities; make pending approvals visible.
6. Profile and availability: identity, interests, weekly schedule, stats, and review history.
7. Favorites and notifications: fast scanning, meaningful empty states, and bulk notification actions.
8. Administration: dense moderation queue with status, evidence, and irreversible action confirmation.

## Engineering constraints

- Preserve Vue 3, Vite, Element Plus, all current API paths, request bodies, response handling, permissions, and business behavior.
- New visual primitives should live in reusable Vue components as the monolithic `App.vue` is incrementally split.
- Use `DESIGN.md` as the contract for OpenDesign prototypes and for Codex implementation.
- Do not merge a page until its production build, API tests, and browser smoke flow pass.

