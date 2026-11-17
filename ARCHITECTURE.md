# Visco — Architecture

## Status

Milestones 2, 2.1, and 3 are complete: a local interactive Cytoscape knowledge
graph with pan/zoom, progressive disclosure, collision-aware curved edge
labels, concept/connection detail panels, and viewport fitting for selected
edge endpoints; plus a document workspace that extracts PDF text in the browser
with page numbers, detected structure, and OCR warnings. Graph content is still
a development fixture. AI extraction, OCR, persistence, authoring, and
networking are not implemented.

## Stack

| Concern | Choice | Notes |
| --- | --- | --- |
| UI runtime | React 19 | Function components, hooks |
| Language | TypeScript 7 | Strict compilation via project references |
| Build tool | Vite 8 | Dev server, production bundling |
| Graph renderer | Cytoscape.js 3.35 | Canvas rendering, gestures, selection, viewport |
| Label overlay | SVG | `textPath` labels on the same Bézier curves |
| PDF parsing | PDF.js (`pdfjs-dist`) 6.5 | In-browser text extraction and metadata |
| Linting | Oxlint | Configured with React and TypeScript rules |
| Styling | Plain CSS | No CSS framework or runtime style library |
| State | React local state | Selection, viewport, and document state in the workspace |
| Routing | None | Single screen |

## Constraints

- **Target hardware:** Windows 11 dev machine with 8 GB RAM, plus mobile
  browsers.
- **Mobile-first:** base styles target small touch screens; larger layouts are
  progressive enhancements via `min-width` media queries.
- **Lightweight:** avoid dependencies that duplicate built-in capabilities.
  Keep the production bundle small and startup work minimal.
- **No network dependency at runtime:** the app reads local sample data and
  makes no API calls. Uploaded PDFs are parsed in the browser and never leave
  the device.
- **No backend, auth, database, or AI services** in this phase.
- **Read-only graph:** nodes and edges cannot be edited or created yet.

## Directory structure

```text
Visco/
├── index.html
├── package.json
├── package-lock.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── .oxlintrc.json
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   ├── types/
│   │   ├── graph.ts
│   │   └── document.ts
│   ├── lib/
│   │   ├── disclosure.ts
│   │   ├── edgeLabels.ts
│   │   ├── pdfExtractor.ts
│   │   └── documentFormat.ts
│   ├── data/
│   │   └── sampleGraph.ts
│   └── components/
│       ├── GraphWorkspace.tsx
│       ├── KnowledgeGraph.tsx
│       ├── CurvedEdgeLabels.tsx
│       ├── GraphControls.tsx
│       ├── NodeDetailPanel.tsx
│       ├── EdgeDetailPanel.tsx
│       ├── DocumentWorkspace.tsx
│       ├── PdfUpload.tsx
│       ├── ExtractionProgress.tsx
│       ├── DocumentOutline.tsx
│       └── ExtractedTextViewer.tsx
├── PROJECT.md
├── ARCHITECTURE.md
├── TASKS.md
└── README.md
```

## Data model

`src/types/graph.ts` defines renderer-agnostic domain types:

```ts
type KnowledgeNode = {
  id: string
  title: string
  type: string
  tier: 'core' | 'major' | 'supporting'
  definition: string
  keyPoints: string[]
  sourcePage: string
  position: { x: number; y: number }
}

type KnowledgeEdge = {
  id: string
  source: string
  target: string
  relationship: string
  label: string
  explanation: string
  supportingPoints: string[]
  curve: number
}
```

`src/data/sampleGraph.ts` supplies 20 nodes and 30 edges for a nervous-system
sample. IDs are unique, every edge resolves to existing nodes, and there are no
self-references. Node positions are preset; no automatic layout runs.

## Graph architecture

### Composition

- `src/App.tsx` mounts `GraphWorkspace` with the sample subject, nodes, and
  edges.
- `GraphWorkspace` owns selection and viewport state, renders the graph,
  controls, and either detail panel. After an edge is selected it measures the
  panel's footprint and asks the graph to reveal the edge endpoints.
- `KnowledgeGraph` owns the Cytoscape instance and exposes an imperative
  `GraphHandle` (`zoomIn`, `zoomOut`, `fit`, `revealEdge`). It also owns graph
  styling, selection classes, gesture configuration, and endpoint fitting.
- `CurvedEdgeLabels` receives the live Cytoscape instance and renders the
  SVG label overlay, including collision-aware visibility resolution.
- `GraphControls` and the two detail panels are presentational.

### Lifecycle

The Cytoscape instance is created once per graph data change in a React effect.
The effect:

1. Builds Cytoscape node and edge definitions from domain data.
2. Creates the instance with `layout: preset`, no grabbing, no automatic node
   selection, and zoom limits of `0.32`–`3.4`.
3. Registers tap, hover, pan, and viewport listeners.
4. Observes the container with `ResizeObserver`.
5. Fits the graph and synchronizes the disclosure state on the next animation
   frame.
6. Destroys the instance, disconnects the observer, and cancels the frame on
   cleanup.

Mutable selection callbacks are kept in a ref so listener registration does not
need to be torn down when React callbacks change.

### Progressive disclosure

`src/lib/disclosure.ts` is the single source of truth:

| Zoom | Level | Visibility |
| --- | --- | --- |
| `< 0.65` | Overview | Core + major concept labels; supporting nodes dimmed; no edge labels |
| `0.65–1.25` | Concepts | Core + major concept labels; no edge labels |
| `1.25–2.0` | Relations | Relationship labels + supporting concept labels |
| `>= 2.0` | Detail | Relationship labels + concept type/source metadata |

The viewport listener derives the level from the current zoom and updates React
state only when the level or rounded zoom changes. This drives the control
readout and the overlay.

Node labels have a screen-size floor so the overview remains legible on small
phones. Core labels are at least 11 CSS px, major and supporting labels at
least 10 CSS px. When the graph is zoomed out below that size, Cytoscape's
model-space font size and maximum text width are scaled inversely to keep the
label readable without changing its line wrapping.

### Curved relationship labels

Cytoscape edges use `unbundled-bezier` curves. The SVG overlay reconstructs each
edge's geometry from the live instance:

1. Read `sourceEndpoint()`, `targetEndpoint()`, and `controlPoints()`.
2. Build a quadratic path: `M from Q control to`.
3. Reverse the path when the edge runs right-to-left or vertically upward, so
   labels stay upright.
4. Attach each label with `<textPath startOffset="50%" textAnchor="middle">`.
5. Apply the Cytoscape pan/zoom to an SVG group with
   `translate(pan.x pan.y) scale(zoom)`.
6. Set `--label-scale: 1 / zoom` so SVG label text and stroke stay at a
   constant screen size.

The overlay uses `pointer-events: none`; interaction still belongs to the
Cytoscape canvas. Label geometry is rebuilt when the dataset or disclosure
level changes, while the group transform updates on Cytoscape `viewport` and
`resize` events through a single animation frame. Hidden labels are removed
from the overlay entirely: their `<defs>` path and `<text>` node are not
rendered.

#### Collision-aware label filtering

`src/lib/edgeLabels.ts` builds candidate label geometry and resolves which
labels are safe to show at the current viewport:

- Text width is measured with a canvas using the same 11 px (relations) or
  12 px (detail) font, weight, and tracking as the SVG overlay.
- A label is hidden when the rendered path is shorter than its text width plus
  18 px of breathing room.
- The curve tangent is sampled across the text span; labels whose maximum tilt
  exceeds 58° from horizontal are hidden.
- Candidate labels are approximated as screen-space boxes and rejected when
  they intersect a node's rendered box (including node labels) or an
  already-placed relationship label.
- Candidates are prioritised in this order: the selected edge, relationships
  incident to the selected concept, then connections between higher-tier
  nodes. Selected-edge labels bypass node collisions but still obey the
  short-path and steep-path filters.

Visibility is recalculated on zoom, disclosure-level, and selection changes
through `requestAnimationFrame`. Panning translates labels and nodes together,
so relative overlaps do not change and no recalculation is needed.

### Interaction and selection

- Node and edge taps are handled by Cytoscape, not the SVG overlay.
- Selecting a node adds focus styles, highlights its closed neighbourhood,
  and dims unrelated elements.
- Selecting an edge highlights the edge, emphasises both endpoint nodes, and
  dims unrelated elements.
- Tapping empty canvas clears selection.
- Selection state is lifted to `GraphWorkspace`, which opens the matching
  panel and clears the other selection.
- Escape clears selection globally.
- Selecting an edge also triggers endpoint fitting. `GraphWorkspace` measures
  the open detail panel: on phones it passes the bottom-sheet height as a
  bottom inset; at `56rem` and wider it passes the side card's width as a right
  inset.
- `revealEdge` uses the endpoint nodes' body bounds, an 18 px viewport
  padding, and a 6 px inner gap. It zooms out only when both endpoints cannot
  fit at the current zoom, never zooms in, and otherwise applies only the
  minimum pan needed. If a zoom-out is required, the endpoints are centred in
  the unobstructed canvas region.
- Endpoint fitting preserves the nearest disclosure floor (relations at `1.25`
  or concepts at `0.65`) when the required zoom would fall less than `0.05`
  below it. Zoom and pan animate over 240 ms and 200 ms respectively, or snap
  when `prefers-reduced-motion` is set.
- Panning is enabled for mouse and touch; pinch zoom is provided by Cytoscape.
- Edge hit testing uses Cytoscape's built-in tolerance (24 CSS px for touch,
  8 CSS px for pointer), giving each fine line a larger invisible target
  without adding extra render elements.
- The close button is auto-focused when a panel opens. The mobile sheet uses
  safe-area padding and scrolls independently of the graph.

The canvas is hidden from assistive technology. A screen-reader-only summary
describes graph size and gestures, and a polite live region announces the
selected concept or connection.

### Responsive layout

The graph fills the space below the header. On small screens the detail panel
is a fixed bottom sheet capped at `min(64dvh, 36rem)`. At `56rem` and wider, the
panel becomes an absolute right-side card. The header hides counts and gesture
hints at narrow widths to prevent overflow.

A debounced `ResizeObserver` calls `resize()` when the container changes. In
overview it also re-fits the graph so a viewport resize cannot leave the initial
map clipped; deeper zoom levels preserve the learner's viewport.

### Known limitations

- Extremely long edges may not completely fit in the usable viewport, even at
  the graph's minimum zoom.
- A selected edge label may remain hidden when endpoint fitting drops the zoom
  below the relations threshold, or when the label path exceeds the steep-path
  limit. The connection detail panel always displays the relationship text.

## Document architecture

### Composition

- `src/App.tsx` renders `GraphWorkspace` and a lazy-loaded `DocumentWorkspace`.
  The graph stays mounted behind the workspace so opening a document never
  rebuilds or resets it.
- `DocumentWorkspace` owns the document lifecycle: upload, extraction, error,
  cancellation, and removal. It renders one of four states — upload, progress,
  error, or ready.
- `PdfUpload` is presentational. It handles the file picker and drag-and-drop
  and reports the chosen file upward.
- `ExtractionProgress` shows status, percentage, and the cancel action.
- `DocumentOutline` renders detected chapters and sections with page ranges.
- `ExtractedTextViewer` renders one page at a time with page navigation.
- `src/lib/pdfExtractor.ts` owns all PDF.js work. `src/lib/documentFormat.ts`
  owns display formatting for sizes, dates, and page ranges.

### Document data model

`src/types/document.ts` defines the document types:

```ts
type DocumentMetadata = {
  title: string | null
  author: string | null
  subject: string | null
  keywords: string | null
  creator: string | null
  producer: string | null
  creationDate: string | null
  modificationDate: string | null
}

type DocumentTextBlock = {
  id: string
  pageNumber: number
  text: string
  fontSize: number
  isBold: boolean
  heading: DocumentHeading | null
}

type ExtractedPage = {
  pageNumber: number
  width: number
  height: number
  text: string
  blocks: DocumentTextBlock[]
  characterCount: number
  requiresOcr: boolean
}

type ExtractedDocument = {
  fileName: string
  fileSize: number
  pageCount: number
  metadata: DocumentMetadata
  pages: ExtractedPage[]
  chapters: DocumentChapter[]
  sections: DocumentHeadingEntry[]
  ocrPages: number[]
  detectedHeadingCount: number
}
```

Every `DocumentTextBlock` carries its own `pageNumber`, so page provenance
survives regardless of how blocks are later grouped or displayed.

### Extraction pipeline

`extractPdf(file, { signal, onProgress })` runs the following steps:

1. Validate the file type and size before any PDF.js work.
2. Create an object URL for the `File` and hand it to PDF.js.
3. Read the document metadata.
4. Iterate pages in order. For each page, request its text content and build
   lines and blocks, then yield to the browser so the interface stays
   responsive.
5. Report progress after each page.
6. Release the PDF.js loading task and revoke the object URL in a `finally`
   block, on success, failure, and cancellation alike.

Cancellation uses an `AbortSignal`. The signal is checked between pages and
raises a dedicated cancellation error that the workspace treats as a
user-initiated stop rather than a failure.

### Text and line reconstruction

`buildLines` walks the text items in the order PDF.js returns them, which is
the order the PDF itself draws them. Items continue the current line when they
share a baseline, move left to right, and are not separated by a wide gap.
Using the document's own order rather than sorting by coordinate preserves
multi-column reading order, which coordinate sorting destroys.

`buildBlocks` then groups lines into paragraphs using the dominant body font
size, vertical gaps, and formatting changes, and `detectHeading` scores each
block as a likely chapter or section using text patterns (chapter, section,
appendix, and hierarchical numbering) together with relative font size, weight,
case, and surrounding spacing.

Detected headings carry `status: 'detected'`. There is no confirmed-structure
state in this milestone, and headings are never synthesised: a document with no
recognisable headings yields an empty outline.

Page ranges are computed from heading order: a heading's range ends on the page
before the next heading of the same or a higher level, and runs to the end of
the document otherwise.

### Scanned-page detection

A page whose extracted text contains fewer than 40 non-whitespace characters is
marked `requiresOcr`. The interface lists those pages and states explicitly
that OCR is not implemented. No OCR engine, stub, or placeholder text is
included.

### Errors

The extractor maps failures to a small set of codes: `not-pdf`, `empty-pdf`,
`password-protected`, `invalid-pdf`, `page-failed`, and `extraction-failed`.
Each code has a plain-language message, and the workspace shows the file name
and size alongside retry and choose-another-file actions.

### Integration with the graph

The workspace is an overlay layered over the graph rather than a separate
route. The graph keeps its mounted state, selection, and viewport while a
document is open. Escape inside the workspace closes it and stops the event
before the graph's own Escape handler runs, so the two layers do not conflict.
Focus is trapped inside the overlay while it is open and returns to the import
button when it closes.

### Known limitations

- Heading detection is heuristic and can produce false positives or misses.
- OCR is not implemented; affected pages are flagged only.
- Extracted text is plain text. Page images, layout, tables, and figures are
  not reproduced.
- Reading order follows the PDF's own content order.
- PDF.js configuration options are not exposed.

## Integration rules

1. **Keep Cytoscape at the boundary.** Runtime imports live in
   `KnowledgeGraph.tsx`; `CurvedEdgeLabels.tsx` imports only the `Core` type.
   UI panels consume plain domain types.
2. **One instance per canvas.** Create on mount, tear down on unmount, and
   avoid recreating the instance for selection-only changes.
3. **Preserve touch first.** Any new interaction must work at 320–430 px before
   desktop.
4. **Use disclosure helpers.** Do not duplicate zoom thresholds in components.
5. **Budget the bundle.** Re-measure after renderer or dependency changes.
6. **No hidden network calls.** Sample data remains local, and uploaded PDFs
   are parsed in the browser without any request.
7. **Keep PDF.js in the service.** Components receive plain document types.
   Only `pdfExtractor.ts` imports PDF.js, and it does so dynamically so the
   parser is not part of the initial bundle.
8. **Release what you acquire.** Any new object URL, worker, or PDF.js loading
   task must be released on completion, failure, and cancellation.
9. **Do not change graph behavior.** The document workspace layers over the
   graph; it must not remount, re-layout, or reset it.

## Performance notes

The current production build is approximately:

- Initial JavaScript: `702.94 kB` raw / `221.02 kB` gzip
- Initial CSS: `9.20 kB` raw / `2.72 kB` gzip
- Document workspace JavaScript: `27.86 kB` raw / `8.45 kB` gzip
- Document workspace CSS: `21.35 kB` raw / `4.41 kB` gzip
- PDF.js chunk: `444.23 kB` raw / `133.64 kB` gzip
- PDF.js worker: `1,271.91 kB`, loaded only when a PDF is opened

Vite warns that the main JavaScript chunk exceeds 500 kB. Most of that is
Cytoscape. Lazy-loading is currently deferred because the graph is the primary
screen; splitting the renderer would add a loading step without reducing the
data needed for the first view. Revisit if a landing screen or non-graph route
is introduced. Cytoscape style transitions and the SVG overlay use only simple
shapes and no image assets.

The document workspace and PDF.js are code-split. The workspace chunk is
requested when the user opens the workspace, and the PDF.js chunk and worker
are requested only when a PDF is actually parsed. Neither is part of the
initial graph view.

## Testing strategy

There is no automated test runner configured. Current verification consists of:

- TypeScript compilation through `npm run build`
- Oxlint through `npm run lint`
- Manual and headless-browser checks at 320, 390, and 1440 px:
  - page overflow
  - initial fit
  - mouse/touch panning and pinch zoom
  - threshold label changes
  - curved label alignment through zoom
  - collision-free visible labels across overview-to-detail zoom levels
  - node/edge selection, dimming, endpoint emphasis, panel layout, focus, and
    Escape
  - selected-edge endpoint fitting around the mobile sheet and desktop card
  - no unexpected console errors
  - PDF upload by picker and drag-and-drop, page counts, page navigation,
    detected headings and page ranges, scanned-page warnings, error states,
    progress, cancellation, and cleanup
  - a 160-page PDF for incremental extraction and interface responsiveness
  - a two-column and table PDF for reading order
  - graph selection preserved while the document workspace is open
  - production preview serving the workspace chunk, PDF.js chunk, and worker

Before the next feature milestone, add a lightweight runner (for example
`node:test` or Vitest) for disclosure helpers, graph-data integrity, edge
label geometry, and PDF extraction helpers. Browser-level smoke tests should
then be committed rather than kept as temporary probes.

## Decision log

| Decision | Rationale |
| --- | --- |
| Vite + React + TypeScript | Fast local feedback, minimal configuration |
| Plain CSS | No extra runtime; theme tokens cover current needs |
| Cytoscape.js | Mature canvas graph rendering with touch support |
| Preset node positions | Stable narrative layout for a small curated sample |
| SVG `textPath` labels | Canvas text cannot follow a Bézier path; SVG can, while Cytoscape continues to own interaction |
| Inverse-scaled label geometry | Labels stay attached to edges and readable through zoom |
| Collision-aware label filtering | Keeps dense relationship views readable; hidden labels are omitted from the SVG rather than merely faded |
| Panel-aware endpoint fitting | On phones the bottom sheet covers most of the graph, so a selected connection must fit into the remaining canvas without changing panel design |
| Preserve disclosure floors during reveal | Avoids losing relationship labels for a marginal zoom-out |
| Never zoom in on edge selection | Avoids an unexpected scale change when both endpoints already fit |
| Screen-size floor for node labels | Overview labels are unreadable if they scale down with the graph on phones |
| No router or global state | One screen with local state is sufficient |
| Eager renderer import | Graph is the primary screen; code-splitting deferred with a documented trigger |
| PDF.js via `pdfjs-dist` | Maintained reference implementation; runs entirely in the browser |
| Dynamic PDF.js import | Keeps the parser and its 1.3 MB worker out of the initial bundle |
| Follow the PDF's content order for lines | Coordinate sorting interleaves multi-column text; the document's own order is the safer reading-order signal |
| Flag low-text pages instead of adding OCR | OCR is out of scope; marking the pages honestly is better than a placeholder reader |
| No automated tests yet | No runner configured; manual verification is documented and test setup is the next quality gate |
