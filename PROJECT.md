# Visco — Project Brief

## What Visco is

Visco is an interactive organic knowledge-web learning app. Ideas live as
nodes in a living map, and connections between them form the paths a learner
follows. Instead of browsing a flat list of notes, the learner explores a
spatial web that grows as their understanding grows.

## Why it exists

Most note-taking tools optimise for capture, not comprehension. Notes pile up
in folders and get revisited rarely. Visco makes relationships visible: every
idea can be seen in the context of what it connects to, so learners can follow
curiosity, spot gaps, and build a durable mental model of a subject.

## Audience

Curious self-directed learners who study across many small ideas and want to
see how those ideas fit together. The first experience is designed for a phone
in hand, not a desktop workstation.

## Product principles

1. **Organic, not rigid.** Structure should emerge from connections, not from
   a fixed hierarchy imposed on the learner.
2. **Mobile-first.** Touch is the primary input. Layouts, hit targets, and
   gestures are designed at phone width first, then enhanced for larger
   screens.
3. **Lightweight.** Fast startup, small bundles, no unnecessary dependencies.
   The app must stay comfortable on modest hardware (8 GB RAM) and mobile
   devices.
4. **Calm and focused.** Learning space should be quiet: no feeds, streaks,
   notifications, or gamified pressure.
5. **Inspectable.** Content and relationships belong to the learner and should
   remain understandable and portable.
6. **Progressive.** Ship a small, solid foundation before adding new layers of
   interaction, persistence, or content ingestion.

## Core concepts

- **Node** — a single unit of knowledge (an idea, note, or concept).
- **Edge** — a meaningful connection between two nodes.
- **Knowledge web** — the graph formed by nodes and edges; the primary canvas
  of the app.
- **Focus** — the currently selected node and its immediate neighbourhood.
- **Trail** — the path of nodes a learner visited while exploring.

## Completed milestones

### Milestone 1 — Foundation

- React + TypeScript + Vite application
- Mobile-first app shell
- Cytoscape.js installed as the graph-rendering dependency
- Project, architecture, task, and readme documentation
- A passing production build

### Milestone 2 — Interactive graph prototype

- Interactive Cytoscape graph with a local 20-concept, 30-connection sample
  dataset
- Mouse, touch, and pinch pan/zoom with fit-to-screen control
- Zoom-driven progressive disclosure of concept and relationship detail
- Curved relationship labels drawn with an SVG `textPath` overlay
- Selectable concepts and connections with mobile bottom-sheet and desktop
  side-card detail panels
- Focused neighbourhood highlighting and Escape-to-close behavior
- Responsive verification at 320 px, 390 px, and 1440 px widths
- Passing lint and production build

### Milestone 2.1 — Mobile graph UX refinement

- Collision-aware edge-label filtering hides labels that would overlap nodes
  or other labels
- Labels on short or excessively steep paths are suppressed
- Label priority favours the selected edge, then relationships incident to a
  selected concept, then higher-tier connections
- Selecting a connection reveals both endpoints in the usable canvas above the
  mobile sheet or beside the desktop card
- Selected endpoints, incident relationships, and dimmed surrounding context
  remain visually distinct
- Mobile panning, pinch zoom, selection, and panel behavior re-verified at
  320 px and 390 px widths
- Passing lint and production build with no new runtime dependencies

### Milestone 3 — PDF upload and text extraction

- Local PDF upload through a file picker and drag-and-drop, restricted to PDF
  files with clear invalid-file, corrupted-file, and empty-file errors
- In-browser text extraction with PDF.js, page by page, preserving page
  numbers, line boundaries, and the document's own reading order
- Document metadata extraction when the PDF provides it
- Heuristic chapter and section detection from text patterns and formatting
  information, with detected headings kept distinct from confirmed structure
- Page ranges recorded for every detected chapter and section
- Pages with little or no extractable text marked as requiring OCR, with an
  explicit warning that OCR is not implemented
- A document workspace with upload, extraction progress and cancellation,
  metadata summary, reading map, page navigation, and per-page extracted text
- Extraction progress reporting and cancellation with full cleanup of the
  PDF.js loading task and temporary object URL
- The graph remains mounted and unchanged behind the document workspace
- Verified against a normal PDF, a multi-page PDF, a PDF with two-column and
  table formatting, a scanned PDF, invalid and corrupted files, and a
  160-page PDF

## Current limitations

- Content is a local sample fixture; there is no graph authoring, and no AI
  extraction of document text into knowledge nodes.
- There is no persistence, search, back/forward trail, or empty-state flow.
- OCR is not implemented. Pages that need it are only flagged.
- Heading detection is heuristic. It can miss headings that use unusual
  styling and can flag false positives on short, bold, or numbered lines.
- Extracted text is plain text. Page images, layout fidelity, tables, and
  figures are not reproduced.
- Reading order follows the PDF's own content order. Documents that encode
  text in an unusual order may extract in that order.
- Cytoscape is imported eagerly. Code-splitting is deferred because the graph
  is the primary screen rather than a secondary route.
- There is no automated test runner yet. Graph data and interactions have been
  verified manually and with temporary headless-browser probes.
- Extremely long edges may not completely fit in the usable viewport, even at
  the graph's minimum zoom.
- Selected edge labels may remain hidden when endpoint fitting drops the zoom
  below the relationship disclosure threshold, or when their path is
  excessively steep. The detail panel still shows the relationship text.

## Explicitly out of scope

The following are **not** part of this milestone and must not be added without
explicit approval:

- Authentication or user accounts
- Backend services or APIs
- Databases or remote persistence
- AI APIs or generated content
- OCR implementation
- Android or other native mobile tooling
- Graph editing, authoring, search, trails, or other exploration features

## Milestone 2 success criteria

- `npm run build` and `npm run lint` complete without errors.
- The graph renders without horizontal page overflow at 320 px width and up.
- Touch panning, mouse panning, wheel zooming, pinch zooming, and fit work.
- Overview, concepts, relations, and detail thresholds reveal progressively
  more labels.
- Relationship labels follow curves and remain aligned through pan and zoom.
- Concepts and connections can be selected, read, and dismissed by pointer,
  close button, or Escape.
- No runtime dependency beyond React, React DOM, and Cytoscape.js is added.
- Documentation describes the implemented state and deferred work.

## Milestone 2.1 success criteria

- Visible, non-selected relationship labels do not overlap nodes or other
  labels; selected labels may overlap nodes but still obey path filters.
- Short and excessively steep relationship labels are filtered out.
- Selecting a connection reveals both endpoints without covering them with the
  detail panel.
- Selected-endpoint, incident-edge, and dimmed-context styles remain distinct.
- Mobile pan, pinch, selection, and panel behavior continue to work at 320 px
  and 390 px widths.
- `npm run build` and `npm run lint` complete without errors.

## Milestone 3 success criteria

- A PDF can be uploaded by file picker or drag-and-drop, and non-PDF files are
  rejected with a clear message.
- Text is extracted page by page with correct page counts, page numbers, and
  readable reading order.
- Document metadata is shown when the PDF provides it.
- Likely chapters and sections are detected from patterns and formatting, are
  labelled as detected rather than confirmed, and carry page ranges. Missing
  headings are never invented.
- Pages with little or no text are flagged as needing OCR, and the interface
  states plainly that OCR is not available.
- Extraction progress is visible, cancellation stops the work, and temporary
  resources are released.
- The graph renders and behaves exactly as before, including while the
  document workspace is open.
- The upload and document interfaces work at 320 px and 390 px widths without
  horizontal overflow.
- `npm run build` and `npm run lint` complete without errors.
