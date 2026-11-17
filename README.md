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
pages. The sample graph content is still a development fixture; AI extraction,
OCR, persistence, authentication, and backend services are not implemented.

## Requirements

- Node.js 22.13+ or 24+ (developed with Node.js 24.16)
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

## Stack

- React 19 + TypeScript
- Vite 8
- Cytoscape.js 3.35 for canvas graph rendering
- SVG `textPath` overlay for curved relationship labels
- PDF.js (`pdfjs-dist`) for in-browser PDF text extraction
- Plain CSS with system font stack and dark theme tokens
- Oxlint

## Project structure

```text
src/
├── main.tsx                    # React bootstrap
├── App.tsx                     # Mounts the graph and the lazy document workspace
├── App.css                     # Graph, control, panel, and header styles
├── index.css                   # Theme tokens and global styles
├── types/
│   ├── graph.ts                # Node, edge, tier, and disclosure types
│   └── document.ts             # Metadata, page, block, heading, and status types
├── lib/
│   ├── disclosure.ts           # Zoom thresholds and label visibility helpers
│   ├── edgeLabels.ts           # Curve geometry, text measurement, and collision filtering
│   ├── pdfExtractor.ts         # PDF.js extraction, structure heuristics, OCR flags
│   └── documentFormat.ts       # File size, date, and page-range formatting
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
network request. Please see [PROJECT.md](PROJECT.md) before proposing
additions.

## Design priorities

- Mobile-first: designed at phone width, enhanced for larger screens
- Lightweight: minimal dependencies; Cytoscape and PDF.js are the only graph
  and document runtimes, and both are code-split from the initial view
- Calm: no feeds, streaks, or notification pressure
- Local: the app makes no runtime network requests
