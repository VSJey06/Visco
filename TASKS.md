# Visco — Tasks

## Milestone status

- [x] Milestone 2 — Interactive graph prototype
- [x] Milestone 2.1 — Mobile graph UX refinement

Phase 2 remains open for the later exploration items listed below.

## Phase 0 — Foundation (complete)

- [x] Initialise git repository on `main`
- [x] Scaffold React + TypeScript + Vite app with npm
- [x] Replace template demo with a mobile-first Visco shell
- [x] Install Cytoscape.js as the graph-rendering dependency
- [x] Add light and dark theme tokens
- [x] Write `PROJECT.md`, `ARCHITECTURE.md`, `TASKS.md`, `README.md`
- [x] Verify `npm run build`

## Phase 1 — Graph foundation (complete)

- [x] Define the knowledge node/edge domain types
- [x] Add a 20-node, 30-edge local sample dataset
- [x] Validate unique IDs, resolved edge endpoints, and no self-edges
- [x] Create the Cytoscape lifecycle wrapper with cleanup
- [x] Render a restrained, read-only graph canvas
- [x] Add responsive sizing using container dimensions
- [x] Fit the graph to the viewport and provide a fit control
- [x] Verify mouse and touch panning plus wheel and pinch zooming at 320 px
      and above
- [x] Measure the production bundle: ~700 kB JS raw / ~220 kB gzip,
      ~8.2 kB CSS raw / ~2.6 kB gzip
- [ ] Lazy-load the renderer
  - Deferred: the graph is the primary screen, so splitting adds a loading
    state without shrinking the first view. Revisit if a landing or non-graph
    route is added.

## Phase 2 — Exploration interactions (in progress)

- [x] Tap a concept to focus it and highlight immediate neighbours
- [x] Show a quiet detail panel for concepts and connections
- [x] Add curved relationship labels that follow Cytoscape's Bézier geometry
- [x] Add zoom-driven disclosure for concept and relationship labels
- [x] Filter relationship labels by collision, short path length, and steep
      orientation
- [x] Reveal selected connection endpoints above the mobile sheet or beside
      the desktop card
- [x] Dismiss panels with a close button or Escape
- [x] Auto-focus the close button when a panel opens
- [x] Verify focus, dimming, and endpoint highlighting for selections
- [ ] Support a back/forward trail through visited nodes
- [ ] Add calm empty and loading states
- [x] Disable CSS panel/control/label transitions for
      `prefers-reduced-motion`
- [ ] Cover Cytoscape style transitions and fit animation under reduced motion

## Phase 3 — Content and authoring (blocked)

- [ ] Add, edit, and remove local nodes
- [ ] Create and remove edges between nodes
- [ ] Validate duplicate and self-referencing edges
- [ ] Provide a simple search or filter by title and tags
- [ ] Decide on local persistence with explicit scope approval

## Phase 4 — Polish and validation (blocked)

- [ ] Add automated tests for disclosure helpers, data integrity, and label
      transforms
- [ ] Run accessibility checks for keyboard and screen-reader use
- [ ] Profile on a low-end mobile viewport
- [ ] Finalise documentation after review feedback

## Milestone 2 verification (complete)

- [x] `npm run lint`
- [x] `npm run build`
- [x] No horizontal page overflow at 320 px and 390 px widths
- [x] Desktop layout at 1440 px
- [x] Overview, concepts, relations, and detail label thresholds
- [x] Curved labels track pan/zoom and remain screen-legible
- [x] Touch pan and pinch zoom
- [x] Mouse pan and wheel zoom
- [x] Concept and connection selection
- [x] Mobile bottom sheet and desktop side card
- [x] Fit control restores the initial view
- [x] No new runtime dependencies

## Milestone 2.1 — Mobile graph UX refinement (complete)

- [x] Cytoscape renders the local graph with preset node positions
- [x] Organic connections use `unbundled-bezier` curves
- [x] Relationship labels use an SVG `textPath` overlay
- [x] Zoom levels reveal concept and relationship detail progressively
- [x] Collision filtering keeps non-selected visible labels clear of nodes and
      other labels
- [x] Short and excessively steep label paths are hidden
- [x] Selected-edge, incident-label, and tier priority determine label order
- [x] Concept selection highlights the closed neighbourhood and dims unrelated
      elements
- [x] Connection selection highlights the edge and both endpoints, and dims
      unrelated elements
- [x] Mobile bottom sheet and desktop side card remain the detail surfaces
- [x] Selecting a connection fits both endpoints into the unobstructed
      viewport
- [x] Mobile pan, pinch zoom, selection, and panel behavior verified
- [x] No new runtime dependencies

### Known limitations

- Extremely long edges may not completely fit in the usable viewport, even at
  the graph's minimum zoom.
- A selected edge label may remain hidden when endpoint fitting drops the zoom
  below the relations threshold, or when its path is excessively steep. The
  detail panel still shows the relationship text.

## Milestone 2.1 verification (complete)

- [x] `npm run lint`
- [x] `npm run build`
- [x] No horizontal page overflow at 320 px and 390 px widths
- [x] Desktop layout at 1440 px
- [x] No visible relationship-label-to-label overlaps at 320 px, 390 px, and
      1440 px
- [x] Label counts change correctly across disclosure thresholds
- [x] Long-edge selection reveals both endpoints above the mobile sheet
- [x] Readable selected labels keep their curve and textPath alignment
- [x] Concept selection keeps incident labels related and unrelated labels
      dimmed
- [x] Touch pan and pinch zoom continue to work
- [x] No runtime console errors

## Backlog — not approved

These items are recorded only so they are not accidentally introduced:

- Authentication or accounts
- Backend services
- Database or cloud sync
- PDF extraction or file ingestion
- AI APIs or generated summaries
- Android or native app tooling
- Import/export formats
- Graph editing, search, and trails before explicit approval

## Working agreement

- One milestone at a time, reviewed before the next begins.
- Keep the dependency list minimal and justify every addition.
- Mobile-first is a gate, not a later optimisation.
- Do not start authoring or ingestion work without explicit approval.
