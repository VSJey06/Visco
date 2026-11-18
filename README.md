# Visco

Visco is an interactive organic knowledge-web learning app. Ideas live as
nodes in a living map, and their connections form paths for exploration. It is
built to make relationships between ideas visible, so learning feels like
following a web rather than browsing a list.

## Status

Milestones 2, 2.1, and 3 are complete. The app renders a local sample knowledge
web of 20 nervous-system concepts and 30 connections using Cytoscape.js, with
touch and mouse pan/zoom, progressive disclosure, collision-aware curved
relationship labels, and detail panels for concepts and connections. Selecting
a connection fits both endpoints into the space not covered by the detail
panel. A document workspace accepts a PDF, extracts its text page by page in
the browser, and shows detected chapters and sections alongside the extracted
pages.

Milestone 4A is in progress. The offline core of an AI knowledge-extraction
pipeline is in place: knowledge schemas, a provider-independent AI contract,
content-based document fingerprints, chapter-aware chunking, prompt
construction, tolerant JSON parsing, evidence quote matching, graph
validation, and duplicate merging, covered by unit tests. Nothing calls a
model yet, so no extraction has run against a real document. The sample graph
content is still a development fixture; OCR, persistence, authentication, and
backend services are not implemented.

## Requirements

- Node.js 22.18+ or 24+ (developed with Node.js 24.16)
- npm 10+ (developed with npm 11)

## Getting started

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (by default `http://localhost:5173`).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server with HMR |
| `npm run build` | Type-check and create a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run Oxlint over the project |
| `npm test` | Run the unit tests with `node:test` |

## Interaction

- Drag empty space to pan; scroll or pinch to zoom.
- Zoom levels progressively reveal information:
  - **Overview:** core and major concepts; supporting concepts quiet.
  - **Concepts:** core and major concept labels; no relationship labels.
  - **Relations:** supporting concept labels and relationship labels along
    curved connections.
  - **Detail:** relationship labels plus concept type/source metadata.
- Unselected relationship labels that would collide with a concept or another
  label are hidden. Labels on short or excessively steep paths are also hidden;
  selected relationship labels still obey the short and steep path filters.
- Select a concept or connection to open its detail panel. On phones this is a
  bottom sheet; on wider screens it is a side card. Selecting a connection also
  pans or zooms out just enough to bring both endpoints above the sheet or
  beside the card.
- Close a panel with the button or press Escape.
- The fit control restores the full graph.

## Document workspace

- Select **Import PDF** in the header, or drop a PDF onto the upload area.
  Only PDF files are accepted; the file never leaves the browser.
- Extraction runs page by page with a progress indicator. **Cancel extraction**
  stops the work and releases the document.
- The summary shows the document title, page count, detected heading count,
  file size, and metadata when the PDF provides it.
- The reading map lists detected chapters and sections with their page ranges.
  Every entry is labelled **detected**: nothing is confirmed, and missing
  headings are not invented.
- The viewer shows extracted text for one page at a time. Use the arrows or the
  page field to move between pages; selecting an outline entry jumps to its
  page.
- Pages with little or no extractable text are marked as needing OCR. OCR is
  not implemented in this version, so those pages are flagged rather than
  read.
- **Remove PDF** clears the document and returns to the upload state.

## Knowledge extraction core

Milestone 4A adds the offline rules that decide whether a model-produced claim
may enter the knowledge graph. The modules are pure and are not wired into the
interface yet.

- Documents are identified by a SHA-256 digest of their content, not by name,
  size, or page count.
- Text is chunked by chapter, then by token budget. Pages that need OCR are
  skipped, oversized blocks are split, and each chunk records the page and
  block anchors that may legally be cited.
- A prompt lists those anchors, states the citation rules, and wraps the
  document text as untrusted data.
- A response is parsed without `eval`. Every quote is looked up in the cited
  block.
- A quote that is found in the cited block establishes quote authenticity
  under the matcher's normalization rules. It does not prove the claim follows
  from it and is not a guarantee against hallucinations, so every claim stays
  `not-verified` until someone reviews it.
- A relationship the source did not state is stored as a suggestion for
  review. Co-occurrence and chapter adjacency never create a relationship.
  Model-produced direct relationships are prioritized but also require explicit
  semantic review before becoming graph edges.
- API keys use a memory-only session store with explicit clearing. There is no
  persistence, logging, export, or provider integration in this stage.

## Known limitations

- Extremely long connections may not completely fit in the usable viewport,
  even at minimum zoom.
- A selected relationship label may remain hidden when endpoint fitting drops
  below the relationships zoom level, or when its path is excessively steep.
  The connection panel still shows the relationship text.
- Heading detection is heuristic. It can miss headings with unusual styling
  and can flag short, bold, uppercase, or numbered body lines.
- OCR is not implemented; pages that need it are only flagged.
- Extracted text is plain text. Page images, layout, tables, and figures are
  not reproduced.
- Reading order follows the PDF's own content order.
- The knowledge-extraction core is offline only. Nothing calls a model yet, so
  no extraction has run against a real document, and the graph still shows the
  sample fixture.
- A quote that matches the cited block establishes quote authenticity under the
  matcher's normalization rules, not that the claim it supports is correct.
- The automated tests cover the knowledge core. The graph and document
  interfaces are verified manually.

## Stack

- React 19 + TypeScript
- Vite 8
- Cytoscape.js 3.35 for canvas graph rendering
- SVG `textPath` overlay for curved relationship labels
- PDF.js (`pdfjs-dist`) for in-browser PDF text extraction
- Plain CSS with system font stack and dark theme tokens
- Oxlint
- `node:test` for unit tests

## Project structure

```text
src/
├── main.tsx                    # React bootstrap
├── App.tsx                     # Mounts the graph and the lazy document workspace
├── App.css                     # Graph, control, panel, and header styles
├── index.css                   # Theme tokens and global styles
├── types/
│   ├── graph.ts                # Node, edge, tier, and disclosure types
│   ├── document.ts             # Metadata, page, block, heading, and status types
│   ├── knowledge.ts            # Concept, relationship, evidence, chunk, and draft types
│   └── ai.ts                   # Provider-independent request, response, and credential types
├── lib/
│   ├── disclosure.ts           # Zoom thresholds and label visibility helpers
│   ├── edgeLabels.ts           # Curve geometry, text measurement, and collision filtering
│   ├── pdfExtractor.ts         # PDF.js extraction, structure heuristics, OCR flags
│   ├── documentFormat.ts       # File size, date, and page-range formatting
│   ├── sessionCredentials.ts   # Memory-only API key lifecycle
│   └── knowledge/
│       ├── config.ts           # Defaults and override resolution
│       ├── identifiers.ts      # Slugs, stable ids, and the content fingerprint
│       ├── taxonomy.ts         # Concept kinds, relationship kinds, labels, tier rules
│       ├── chunking.ts         # Chapter-aware, token-bounded chunk construction
│       ├── prompts.ts          # Prompt and JSON-schema construction
│       ├── parsing.ts          # Tolerant JSON recovery and structural validation
│       ├── evidence.ts         # Evidence lookup and quote matching
│       ├── validation.ts       # Chunk and graph rules
│       ├── review.ts           # Explicit semantic review transitions
│       ├── duplicates.ts       # Duplicate detection and merging
│       └── merge.ts            # Merge of validated chunk results
├── data/
│   └── sampleGraph.ts          # 20 nodes and 30 edges of sample nervous-system content
└── components/
    ├── GraphWorkspace.tsx      # Selection/viewport state, panel insets, and detail panels
    ├── KnowledgeGraph.tsx      # Cytoscape lifecycle, styling, selection, and endpoint reveal
    ├── CurvedEdgeLabels.tsx    # Collision-aware SVG textPath label overlay
    ├── GraphControls.tsx       # Zoom readout, zoom buttons, and fit control
    ├── NodeDetailPanel.tsx     # Concept detail sheet/card
    ├── EdgeDetailPanel.tsx     # Connection detail sheet/card
    ├── DocumentWorkspace.tsx   # Upload, progress, summary, and workspace state
    ├── PdfUpload.tsx           # File picker and drag-and-drop target
    ├── ExtractionProgress.tsx  # Extraction status and cancellation
    ├── DocumentOutline.tsx     # Detected chapters and sections with page ranges
    └── ExtractedTextViewer.tsx # Page navigation and per-page extracted text
```

## Documentation

- [PROJECT.md](PROJECT.md) — vision, audience, principles, and scope
- [ARCHITECTURE.md](ARCHITECTURE.md) — stack, graph design, and constraints
- [TASKS.md](TASKS.md) — phased roadmap and approval gates

## Scope guardrails

This phase deliberately excludes authentication, backends, databases, OCR, AI
APIs, Android tooling, content authoring, search, and persistence. The graph
reads local sample data only, and PDFs are parsed in the browser without any
network request. The approved Milestone 4A work adds the offline knowledge
core — schemas, chunking, prompting, parsing, evidence matching, validation,
and merging — with no provider, no network call, and no graph change. Please
see [PROJECT.md](PROJECT.md) before proposing additions.

## Design priorities

- Mobile-first: designed at phone width, enhanced for larger screens
- Lightweight: minimal dependencies; Cytoscape and PDF.js are the only graph
  and document runtimes, and both are code-split from the initial view
- Calm: no feeds, streaks, or notification pressure
- Local: the app makes no runtime network requests
