# Visco — Tasks

## Milestone status

- [x] Milestone 2 — Interactive graph prototype
- [x] Milestone 2.1 — Mobile graph UX refinement
- [x] Milestone 3 — PDF upload and text extraction
- [~] Milestone 4A — AI knowledge extraction core (Stage A and Stage B complete)

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

- [x] Add a lightweight automated test runner (`node:test`) and cover the
      Milestone 4A knowledge core
- [ ] Add automated tests for disclosure helpers, graph-data integrity, and
      label transforms
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

## Milestone 3 — PDF upload and text extraction (complete)

- [x] Add `pdfjs-dist` as the only new runtime dependency
- [x] Define document metadata, page, text block, heading, chapter, section,
      and extraction status types
- [x] Accept PDF files through a file picker and drag-and-drop
- [x] Reject non-PDF files, empty files, and damaged PDFs with clear errors
- [x] Extract text page by page with progress reporting and cancellation
- [x] Preserve page numbers, line boundaries, and reading order
- [x] Extract document metadata when available
- [x] Detect likely chapter and section headings from text and formatting
- [x] Mark detected headings as detected rather than confirmed
- [x] Record page ranges for detected chapters and sections
- [x] Flag pages with little or no text as requiring OCR
- [x] State plainly that OCR is not implemented
- [x] Build the document workspace: upload, progress, summary, reading map,
      page viewer, and error states
- [x] Support removing the current document and starting over
- [x] Release the PDF.js loading task and temporary object URL on completion,
      cancellation, and failure
- [x] Keep the graph mounted and unchanged behind the document workspace
- [x] Lazy-load the document workspace and PDF.js so the graph stays fast
- [x] Verify the upload and document interfaces at 320 px and 390 px widths
- [x] No runtime network requests; documents never leave the browser

### Known limitations

- Heading detection is heuristic. Short, bold, uppercase, or numbered body
  lines can be flagged, and headings with unusual styling can be missed.
- OCR is not implemented. Pages needing it are flagged, not read.
- Extracted text is plain text. Page images, layout, tables, and figures are
  not reproduced.
- Reading order follows the PDF's own content order.
- No PDF.js configuration options are exposed; the extractor uses defaults.

## Milestone 3 verification (complete)

- [x] `npm run lint`
- [x] `npm run build`
- [x] Normal text-based PDF: 4 pages, 8 detected headings, correct outline and
      page ranges
- [x] Multi-page PDF: page count, page navigation, and per-page text verified
- [x] PDF with unusual formatting: two-column text and a table extract in
      reading order
- [x] Scanned PDF: 2 pages flagged as requiring OCR, 0 invented headings
- [x] Invalid file, corrupted PDF, and wrong file type: clear error states
- [x] Extraction progress visible; cancellation stops the work and reports it
- [x] Large PDF: 160 pages and 160 detected headings, page 160 reachable
- [x] Graph selection survives opening the workspace; Escape in the workspace
      closes it without clearing the graph selection
- [x] Mobile upload and document interfaces at 320 px and 390 px with no
      horizontal overflow
- [x] Production build serves the workspace chunk, PDF.js chunk, and worker
      correctly
- [x] No runtime console errors

## Milestone 4A — AI knowledge extraction core (in progress)

Scope: the offline core of the knowledge-extraction pipeline. No provider
adapter, network call, persisted credential, database, or interface.

### Stage A — foundations (complete)

- [x] Define the knowledge schemas: concepts, relationships, evidence, claim
      verification, chunks, drafts, validation issues, configuration
- [x] Define the provider-independent AI request, response, and provider
      contract with no vendor, endpoint, or key
- [x] Define a provider-independent session-memory credential store that is
      never persisted, logged, or serialized with its key
- [x] Add stable concept, relationship, document, and run identifiers
- [x] Add a SHA-256 content fingerprint for document identity
- [x] Add pure configuration types with defaults and override resolution

### Stage B — extraction rules (complete)

- [x] Build chapter-aware chunking that never crosses a chapter
- [x] Skip pages that require OCR and report them
- [x] Split oversized blocks into parts that keep their block id
- [x] Build prompts that restrict citations to the chunk anchors
- [x] Treat the document text as untrusted data in the prompt
- [x] Recover JSON from a model response without `eval`
- [x] Validate the payload structure
- [x] Match evidence quotes against the cited source block
- [x] Keep quote matching separate from claim verification
- [x] Validate chunks: vocabulary, ids, page range, evidence, endpoints,
      confidence, and self references
- [x] Validate graphs: endpoints, duplicates, cycles, and orphans
- [x] Detect and merge duplicate concepts and relationships
- [x] Keep inferred relationships as suggestions and require explicit semantic
      review before any model-produced relationship becomes a graph edge
- [x] Reject co-occurrence and chapter-adjacency relationship generation
- [x] Add `node:test` unit tests and a `tsconfig.test.json` project
- [x] Add `npm test` and type-check the tests in `npm run build`

### Verification (complete)

- [x] `npm test` — 113 tests, 15 suites, all passing
- [x] `npm run lint`
- [x] `npm run build`
- [x] Malformed JSON is reported rather than thrown
- [x] A fabricated page number is rejected and never enters the model
- [x] A quote absent from the source text is rejected and the item is dropped
- [x] A relationship with an unresolved endpoint is dropped
- [x] An invalid concept id is reported and regenerated
- [x] Duplicate concepts are detected, merged, and relationship endpoints are
      remapped to the surviving concept
- [x] A relationship kind outside the vocabulary is rejected
- [x] An inferred relationship without an explicit cross-reference is rejected
- [x] An explicitly grounded inferred relationship is kept as a suggestion
- [x] A matched quote leaves the claim verification state untouched
- [x] A matching quote does not auto-accept a direct relationship
- [x] Co-occurrence and chapter adjacency do not create graph edges
- [x] The document fingerprint is independent of file metadata
- [x] The session credential store does not serialize or persist its key
- [x] The production bundle is unchanged

### Known limitations

- Nothing in this milestone calls a model. The rules are exercised against
  synthetic payloads.
- Claim verification is a recorded state, not an implemented check. Only an
  explicit review can move an item to `verified` or `rejected`.
- The concept digest and cross-chunk reconciliation are designed but not yet
  wired to an orchestrator.
- The graph renderer is untouched, so the extracted knowledge cannot be shown
  yet.

## Backlog — not approved

These items are recorded only so they are not accidentally introduced:

- Authentication or accounts
- Backend services
- Database or cloud sync
- OCR implementation
- AI extraction of document text into knowledge nodes (Stage A and Stage B of
  the approved Milestone 4A core are in place; a provider, a network call, and
  a graph change are not)
- Android or native app tooling
- Import/export formats
- Graph editing, search, and trails before explicit approval

## Working agreement

- One milestone at a time, reviewed before the next begins.
- Keep the dependency list minimal and justify every addition.
- Mobile-first is a gate, not a later optimisation.
- Do not start authoring or ingestion work without explicit approval.
