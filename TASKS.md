# Visco — Tasks

## Phase 0 — Foundation (complete)

- [x] Initialise git repository on `main`
- [x] Scaffold React + TypeScript + Vite app with npm
- [x] Replace template demo with a mobile-first Visco shell
- [x] Install Cytoscape.js as the graph-rendering dependency
- [x] Keep the graph layer unimplemented
- [x] Add light and dark theme tokens
- [x] Write `PROJECT.md`, `ARCHITECTURE.md`, `TASKS.md`, `README.md`
- [x] Verify `npm run build`

## Phase 1 — Graph foundation (blocked: requires approval)

Do not start until the foundation is reviewed and the graph work is approved.

- [ ] Define and test the knowledge node/edge domain types
- [ ] Add a small local sample dataset for development
- [ ] Create the Cytoscape lifecycle wrapper with cleanup
- [ ] Render a read-only graph canvas with a restrained mobile style
- [ ] Add responsive sizing using container dimensions
- [ ] Lazy-load the renderer so the shell stays small
- [ ] Verify touch panning and zooming on a phone-sized viewport
- [ ] Measure the production bundle and document the result

## Phase 2 — Exploration interactions (blocked)

- [ ] Tap a node to focus it and highlight immediate neighbours
- [ ] Show a quiet detail panel for the focused node
- [ ] Support a back/forward trail through visited nodes
- [ ] Add a calm empty and loading state
- [ ] Respect `prefers-reduced-motion` for animated transitions

## Phase 3 — Content and authoring (blocked)

- [ ] Add, edit, and remove local nodes
- [ ] Create and remove edges between nodes
- [ ] Validate duplicate and self-referencing edges
- [ ] Provide a simple search or filter by title and tags
- [ ] Decide on local persistence with explicit scope approval

## Phase 4 — Polish and validation (blocked)

- [ ] Add automated tests for domain helpers and graph transforms
- [ ] Run accessibility checks for keyboard and screen-reader use
- [ ] Profile on a low-end mobile viewport
- [ ] Finalise documentation for the graph milestone

## Backlog — not approved

These items are recorded only so they are not accidentally introduced:

- Authentication or accounts
- Backend services
- Database or cloud sync
- PDF extraction or file ingestion
- AI APIs or generated summaries
- Android or native app tooling
- Import/export formats

## Working agreement

- One milestone at a time, reviewed before the next begins.
- Keep the dependency list minimal and justify every addition.
- Mobile-first is a gate, not a later optimisation.
- The graph UI starts only after explicit approval.
