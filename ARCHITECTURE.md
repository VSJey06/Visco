# Visco — Architecture

## Status

Milestones 2, 2.1, and 3 are complete: a local interactive Cytoscape knowledge
graph with pan/zoom, progressive disclosure, collision-aware curved edge
labels, concept/connection detail panels, and viewport fitting for selected
edge endpoints; plus a document workspace that extracts PDF text in the browser
with page numbers, detected structure, and OCR warnings.

Milestone 4A, Stage A and Stage B define the offline core of an AI
knowledge-extraction pipeline: knowledge schemas, a provider-independent AI
contract, stable identifiers and a content-based document fingerprint,
chapter-aware chunking, prompt construction, tolerant JSON parsing, evidence
quote matching, graph validation, and duplicate merging — all as pure modules
with unit tests. No provider adapter, network call, persisted credential,
database, or interface is included, so no runtime behaviour changes yet. Graph
content is still a development fixture. OCR, persistence, authoring, and
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
| Knowledge extraction | Plain TypeScript modules | Pure, offline, provider-independent |
| Test runner | `node:test` | Built into Node, no test dependency |
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
- **No credentials at rest:** an API key is never written to source, storage,
  logs, or exports. The first-release credential store is memory-only and can
  be cleared explicitly; it has no persistence or logging path.
- **Evidence matching is not claim verification.** Finding a quote in the
  cited block establishes that the quote occurs there under the matcher's
  normalization rules. It does not establish that the quote entails the claim
  and is not a guarantee against hallucinations. The two concepts remain
  separate.
- **Inferred links are suggestions.** A relationship the model did not read
  directly from the source is stored as a suggestion for review and never
  becomes a graph edge automatically. Model-produced direct relationships are
  also held until explicit semantic review; direct candidates are prioritized
  over inferred suggestions.

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
├── tsconfig.test.json
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
│   │   ├── document.ts
│   │   ├── knowledge.ts
│   │   └── ai.ts
│   ├── lib/
│   │   ├── disclosure.ts
│   │   ├── edgeLabels.ts
│   │   ├── pdfExtractor.ts
│   │   ├── documentFormat.ts
│   │   ├── sessionCredentials.ts
│   │   └── knowledge/
│   │       ├── config.ts
│   │       ├── identifiers.ts
│   │       ├── taxonomy.ts
│   │       ├── chunking.ts
│   │       ├── prompts.ts
│   │       ├── parsing.ts
│   │       ├── evidence.ts
│   │       ├── validation.ts
│   │       ├── review.ts
│   │       ├── duplicates.ts
│   │       └── merge.ts
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
├── tests/
│   └── knowledge/
│       ├── identifiers.test.ts
│       ├── config.test.ts
│       ├── chunking.test.ts
│       ├── prompts.test.ts
│       ├── parsing.test.ts
│       ├── evidence.test.ts
│       ├── validation.test.ts
│       ├── review.test.ts
│       ├── sessionCredentials.test.ts
│       └── duplicates.test.ts
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

## Knowledge extraction architecture

Milestone 4A, Stage A and Stage B. This section describes the offline core: the
schemas, the pure transformations, and the rules that decide whether a
model-produced claim may enter the knowledge graph. No provider adapter, HTTP
request, persisted credential, persistence layer, or interface is part of this
stage, so nothing in the running app changes.

### Layers

| Module | Responsibility | State |
| --- | --- | --- |
| `src/types/knowledge.ts` | Schemas for concepts, relationships, evidence, chunks, drafts, issues, configuration | none |
| `src/types/ai.ts` | Provider-independent request/response and credential-store contracts | none |
| `src/lib/sessionCredentials.ts` | Memory-only credential lifecycle with explicit clearing | memory only |
| `src/lib/knowledge/config.ts` | Default configuration and override resolution | none |
| `src/lib/knowledge/identifiers.ts` | Slugs, duplicate keys, stable ids, content fingerprint | none |
| `src/lib/knowledge/taxonomy.ts` | Concept kinds, relationship kinds, labels, tier rules | none |
| `src/lib/knowledge/chunking.ts` | Chapter-aware, token-bounded chunk construction | none |
| `src/lib/knowledge/prompts.ts` | Prompt and JSON-schema construction for one chunk | none |
| `src/lib/knowledge/parsing.ts` | Tolerant JSON extraction and structural schema validation | none |
| `src/lib/knowledge/evidence.ts` | Evidence source lookup and quote matching | none |
| `src/lib/knowledge/validation.ts` | Business rules for chunks and merged graphs | none |
| `src/lib/knowledge/review.ts` | Explicit semantic review transitions for relationship suggestions | none |
| `src/lib/knowledge/duplicates.ts` | Duplicate detection and merging of concepts and relationships | none |
| `src/lib/knowledge/merge.ts` | Merge of validated chunk results and endpoint remapping | none |

Every extraction module is a pure function over plain data. The credential
store is the one deliberate exception: it owns only in-memory session state
and has no persistence path. The orchestrator, provider adapters, persistence,
and the interface are later stages and are deliberately absent so the rules can
be tested without a model, a network, or a browser.

### Knowledge data model

`src/types/knowledge.ts` defines the intermediate model. It is deliberately
richer than the renderer types in `src/types/graph.ts`, which stay unchanged.

```ts
type ConceptKind =
  | 'main_concept'
  | 'supporting_concept'
  | 'entity'
  | 'process'

type RelationshipKind =
  | 'CAUSES'
  | 'ENABLES'
  | 'PART_OF'
  | 'DEPENDS_ON'
  | 'COMPARES'
  | 'EXAMPLE_OF'
  | 'SEQUENCE'
  | 'ASSOCIATED_WITH'

type EvidenceRef = {
  pageNumber: number
  blockId: string
  quote: string
  matchStatus: 'matched'
}

type ClaimVerification = {
  status: 'not-verified' | 'verified' | 'rejected'
  method: 'manual-review' | 'none'
  detail: string | null
}

type ExtractedRelationship = {
  id: string
  sourceId: string
  targetId: string
  kind: RelationshipKind
  label: string
  statement: string
  evidence: EvidenceRef[]
  basis: 'direct' | 'inferred'
  inference: { kind: InferenceKind; rationale: string } | null
  confidence: number
  chunkIds: string[]
  verification: ClaimVerification
  review: 'accepted' | 'suggested' | 'rejected'
}
```

`definition`, `fact`, `condition`, and `example` are modelled as attributes of a
concept rather than as separate nodes, so a document's supporting sentences do
not swamp the graph.

### Evidence matching versus claim verification

These are two different questions and the model keeps them apart:

- **Evidence matching** asks *does the cited block contain this quote under the
  matcher's normalization rules?* The matcher normalizes whitespace and
  typographic punctuation, then looks for the quote inside the cited block. A
  match establishes quote authenticity only.
- **Claim verification** asks *does the cited text actually support the claim?*
  That cannot be decided by a substring search, so every extracted item starts
  as `status: 'not-verified', method: 'none'`. Only an explicit semantic review
  can move an item to `verified` or `rejected`.

A matched quote is not proof that the claim is correct and is not described as
a guarantee against hallucinations. Validation messages, documentation, and
the interface must use the same distinction.

### Directly supported versus inferred relationships

`basis` records how a relationship candidate was obtained:

- `direct` — the model reports that the source explicitly states the
  connection and supplies a quote found in the cited block. Direct candidates
  are prioritized over inferred suggestions, but the quote match alone does
  not establish semantic entailment.
- `inferred` — the model proposes a connection and supplies a non-empty
  rationale and grounded quote. The relationship is retained as a suggestion
  for explicit review.

Every model-produced relationship starts with `review: 'suggested'`. Only an
explicit semantic review can accept or reject it. A graph edge requires both
`review: 'accepted'` and `verification.status: 'verified'`; a suggestion is
stored with the knowledge data but is not a graph edge.

In the first release, no relationship is generated from co-occurrence in a
chunk or adjacency between chapters. Those signals do not create relationship
records or graph edges.

### Identifiers and the document fingerprint

`src/lib/knowledge/identifiers.ts` provides:

- `slugify` and `normalizeTitle` — normalised, id-safe names.
- `titleKey` — the duplicate-detection key: lower-cased, stripped of
  punctuation and leading articles.
- `createConceptId` and `createRelationshipId` — deterministic ids that are
  stable across runs, so a re-extraction can be compared with the previous one.
- `computeDocumentFingerprint` — a SHA-256 digest of canonical extracted
  content.
- `computeExtractedDocumentFingerprint` — applies the same fingerprint to the
  ordered extracted block text, excluding file metadata and pagination.

The fingerprint is content-based. File name, file size, and page count are
metadata that can stay identical across two different documents, so they are
never the basis of identity. SHA-256 gives collision resistance appropriate for
detecting a changed or swapped document. The full digest remains available;
identifiers use at least 128 bits of it.

### Chunking

`chunkDocument(document, config)` produces `KnowledgeChunk[]`:

1. Pages are walked in order. Pages flagged `requiresOcr` are skipped and
   reported, because a model cannot read a scanned page and guessing at its
   contents would be invention.
2. Blocks are grouped into units. A block larger than the token budget is
   split on line and character boundaries; the parts keep the original block
   id with a `#part` suffix. No individual unit exceeds the configured token
   budget.
3. Chapter membership follows heading blocks in reading order, so two chapter
   headings on the same page still create separate chunks.
4. A chunk closes when the chapter changes or the token budget would be
   exceeded. A chunk never spans two chapters.
5. Trailing units within the overlap budget are carried into the next chunk of
   the same chapter, so a concept introduced at a boundary is not lost.
6. Each chunk records its anchors: the page number, exact anchor id, and exact
   segment text that may legally be cited. A quote is matched against the cited
   segment, not against another part of the same source block.

Token counts are estimated from character length, not a tokenizer, so no extra
dependency is needed. Estimates cover source text; anchor labels are metadata
around that text.

### Prompts

`buildExtractionRequest` produces a provider-independent `AiRequest`:

- The system prompt states the task, the relationship and concept vocabulary,
  the output contract, and the rules: cite only listed anchors, never invent a
  page or block id, copy quotes verbatim, omit anything the text does not
  support, and never infer a link from co-occurrence or adjacency alone.
- The user prompt carries the chunk as JSON-encoded untrusted data inside
  `<document_chunk_json>` delimiters, the permitted anchor list, and the digest
  of concepts already known from earlier chunks.
- JSON encoding prevents source text from closing the prompt's data delimiter.
  The chunk text is explicitly labelled as untrusted source material. It is
  data, never instructions.

### Parsing and validation

`extractJsonPayload` recovers JSON from a model response without `eval`: code
fences are stripped, then the first balanced object outside strings is parsed.
A failure produces an `invalid-json` issue rather than an exception.

`validatePayloadSchema` checks the published output contract: required fields,
types, enums, finite confidence ranges, evidence shapes, and unsupported
fields.

`validateChunkPayload` applies the business rules to one chunk:

| Rule | Code | Outcome |
| --- | --- | --- |
| Response was not valid JSON | `invalid-json` | chunk rejected |
| Top-level payload shape is invalid | `schema-mismatch` | chunk rejected |
| Required item field missing or wrong type | `schema-mismatch` | item dropped, valid siblings retained |
| Concept kind outside the vocabulary | `unknown-concept-kind` | item dropped |
| Relationship kind outside the vocabulary | `unsupported-relationship` | item dropped |
| Inferred relationship without rationale or grounding | `unsupported-relationship` | item dropped |
| Id does not match the id grammar | `invalid-concept-id` | canonical id generated, issue raised |
| Page number outside the document or outside the chunk anchors | `page-out-of-range` | reference dropped, item dropped when it was the only support |
| Cited block does not exist | `block-not-found` | reference dropped, item dropped when it was the only support |
| Quote not found in the cited block | `quote-not-found` | reference dropped, item dropped when it was the only support |
| No usable reference | `missing-page-reference` | item dropped |
| Relationship endpoint is not a known concept | `missing-endpoint` | relationship dropped |
| Relationship points at itself | `self-loop` | relationship dropped |
| Confidence is not a finite number | `invalid-confidence` | item dropped |
| Confidence is outside 0–1 | `invalid-confidence` | item rejected |
| Confidence below the threshold for its basis | `confidence-below-threshold` | item dropped |

A concept or relationship needs at least one reference whose quote was found in
the cited block. Only matched references enter the knowledge model. An
inferred relationship additionally needs an explicit-cross-reference rationale
and remains a suggestion. A direct relationship also remains a suggestion
until semantic review because quote matching cannot verify entailment.

`validateGraph` applies the graph-level rules after merging: endpoints resolve
against the merged concept set, ids and relationship vocabulary are checked,
duplicate concepts and relationships are reported, self-references and
`PART_OF` cycles are reported, and concepts with no approved relationship are
reported as orphans. Only relationships that passed explicit semantic review
participate in graph-edge, connectivity, and cycle rules; suggestions remain
stored candidates rather than edges.

### Duplicates and merging

`src/lib/knowledge/duplicates.ts` keys concepts by `titleKey` and relationships
by kind plus canonical endpoints. Symmetric kinds (`COMPARES`,
`ASSOCIATED_WITH`) use a lexicographic endpoint order so the same pair is not
counted twice. Merging keeps the strongest definition, the highest tier, the
union of aliases, evidence, attributes, and chunk ids, and the summed mention
count. Direct relationship candidates take priority over inferred duplicates.
Merging does not inherit semantic verification unless every merged member was
explicitly verified. When duplicate concepts are merged, relationship endpoints
are remapped to the surviving canonical id before endpoint validation.

### Pipeline shape

The intended full pipeline is:

1. Prepare — fingerprint the document, open a run.
2. Chunk — build the chunk list.
3. Extract — one provider request per chunk.
4. Parse — recover and structurally validate the JSON.
5. Match — locate each quote in the cited block.
6. Validate — apply the chunk rules.
7. Review — explicitly accept or reject relationship suggestions.
8. Repair — bounded re-ask carrying the issues (later stage).
9. Quarantine — store a failed chunk for inspection (later stage).
10. Merge — build the concept registry and detect duplicates.
11. Link — cross-chunk relationships, as suggestions only (later stage).
12. Validate graph — apply the graph-level rules.
13. Project — map the draft onto `KnowledgeNode` and `KnowledgeEdge` for the
    existing renderer, with deterministic positions (later stage).

Stage B contains the pure parts of steps 1, 2, 4, 5, 6, 7, 10, and 12. Step 3
needs a provider, steps 8 and 11 need persistence and orchestration, and step
13 is the point at which the graph changes, which this milestone does not
reach.

### Security posture

- No credential is persisted, logged, exported, or included in an error message.
  The first-release store keeps keys in memory only and exposes an explicit
  clear operation.
- Model output is untrusted input: it is parsed without `eval`, checked
  against a schema, and canonical ids are generated rather than trusted.
- Document text is untrusted input as well. It is JSON-encoded, delimited,
  and labelled in the prompt, and the model has no tools, so text in a PDF
  cannot cause an action.

### Known limitations

- Nothing in this stage calls a model. The rules are exercised against
  synthetic payloads in the test suite.
- The extraction rules are written for one chunk at a time. Cross-chunk
  reasoning and the concept digest are designed but not yet wired together.
- Claim verification is a recorded state, not an implemented check. Only an
  explicit review can change it.

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
10. **Keep the knowledge core pure.** Modules under `src/lib/knowledge/` take
    plain data and return plain data. No module may reach for the network,
    storage, the DOM, or a global clock unless it is explicitly an
    orchestrator.
11. **Never invent provenance.** A page number or block id may only reach the
    knowledge model by being read from the extracted document. The validator
    may narrow the model's claims; it may never widen them.
12. **Match quotes, verify claims separately.** A quote found in the source is
    reported as a match, not as proof that the claim is supported.
13. **Keep inferred links as suggestions.** A relationship the source did not
    state is never promoted to a graph edge without explicit review.
14. **Use explicit file extensions in the knowledge core.** Modules under
    `src/lib/knowledge/` import relatives with the `.ts` extension so Node can
    load them directly for tests. The application modules keep their existing
    extensionless style.

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

`node:test` runs the knowledge-core unit tests with no test dependency:

```sh
npm test
```

The runner executes the TypeScript test files directly through Node's native
type stripping, and `tsconfig.test.json` type-checks them as part of
`npm run build`.

Coverage is concentrated on the rules that decide whether a model-produced
claim may enter the graph:

- malformed JSON recovery and structural schema rejection
- fabricated page numbers and block ids that do not exist
- quotes that are absent from the cited source block
- relationship endpoints that do not resolve
- ids that violate the id grammar
- duplicate concepts and duplicate relationships
- relationship kinds outside the vocabulary, including inferred relationships
  without a rationale
- chunk boundaries, chapter alignment, overlap, and skipped OCR pages
- prompt contents, including the anchor whitelist and the untrusted-content
  delimiters
- content-based fingerprint stability and sensitivity
- the separation between quote matching and claim verification, and the
  suggestion state of inferred relationships

The rest of the app is verified as before: TypeScript compilation through
`npm run build`, Oxlint through `npm run lint`, and manual and headless-browser
checks at 320, 390, and 1440 px:
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

Browser-level smoke tests should still be committed rather than kept as
temporary probes.

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
| `node:test` for the knowledge core | Built into Node, no test dependency, and the runner was already the documented next quality gate |
| Rich knowledge model beside the renderer types | Evidence, confidence, basis, and review state cannot be squeezed into `sourcePage: string` without losing them |
| Quote matching kept separate from claim verification | A normalized substring match establishes that a quote occurs in the cited block, not that the claim follows from it |
| Inferred relationships stored as suggestions | A link the source did not state should be reviewed, not silently drawn as fact |
| Model-produced relationships require semantic review | Quote matching can authenticate a citation but cannot establish entailment, so direct and inferred candidates remain suggestions until reviewed |
| SHA-256 content fingerprint | File name, size, and page count can match across different documents; identity has to come from the content |
| Credentials in session memory only | A key that is never persisted cannot leak from storage, exports, or logs |
| Explicit `.ts` extensions in the knowledge core | Node loads the modules directly for tests, and extensionless relative imports would fail there |
