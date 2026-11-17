# Visco

Visco is an interactive organic knowledge-web learning app. Ideas live as
nodes in a living map, and their connections form paths for exploration. It is
built to make relationships between ideas visible, so learning feels like
following a web rather than browsing a list.

## Status

Milestones 2 and 2.1 complete. The app renders a local sample knowledge web of
20 nervous-system concepts and 30 connections using Cytoscape.js, with touch
and mouse pan/zoom, progressive disclosure, collision-aware curved relationship
labels, and detail panels for concepts and connections. Selecting a connection
fits both endpoints into the space not covered by the detail panel. The sample
content is a development fixture; document ingestion, AI, persistence,
authentication, and backend services are not implemented.

## Requirements

- Node.js 20.19+ (developed with Node.js 24)
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

## Known limitations

- Extremely long connections may not completely fit in the usable viewport,
  even at minimum zoom.
- A selected relationship label may remain hidden when endpoint fitting drops
  below the relationships zoom level, or when its path is excessively steep.
  The connection panel still shows the relationship text.

## Stack

- React 19 + TypeScript
- Vite 8
- Cytoscape.js 3.35 for canvas graph rendering
- SVG `textPath` overlay for curved relationship labels
- Plain CSS with system font stack and dark theme tokens
- Oxlint

## Project structure

```text
src/
├── main.tsx                    # React bootstrap
├── App.tsx                     # Mounts the graph workspace with sample data
├── App.css                     # Graph, control, and panel styles
├── index.css                   # Theme tokens and global styles
├── types/
│   └── graph.ts                # Node, edge, tier, and disclosure types
├── lib/
│   ├── disclosure.ts           # Zoom thresholds and label visibility helpers
│   └── edgeLabels.ts           # Curve geometry, text measurement, and collision filtering
├── data/
│   └── sampleGraph.ts          # 20 nodes and 30 edges of sample nervous-system content
└── components/
    ├── GraphWorkspace.tsx      # Selection/viewport state, panel insets, and detail panels
    ├── KnowledgeGraph.tsx      # Cytoscape lifecycle, styling, selection, and endpoint reveal
    ├── CurvedEdgeLabels.tsx    # Collision-aware SVG textPath label overlay
    ├── GraphControls.tsx       # Zoom readout, zoom buttons, and fit control
    ├── NodeDetailPanel.tsx     # Concept detail sheet/card
    └── EdgeDetailPanel.tsx     # Connection detail sheet/card
```

## Documentation

- [PROJECT.md](PROJECT.md) — vision, audience, principles, and scope
- [ARCHITECTURE.md](ARCHITECTURE.md) — stack, graph design, and constraints
- [TASKS.md](TASKS.md) — phased roadmap and approval gates

## Scope guardrails

This phase deliberately excludes authentication, backends, databases, PDF
extraction, AI APIs, Android tooling, content authoring, search, and
persistence. The graph reads local sample data only. Please see
[PROJECT.md](PROJECT.md) before proposing additions.

## Design priorities

- Mobile-first: designed at phone width, enhanced for larger screens
- Lightweight: minimal dependencies; Cytoscape is the only graph runtime
- Calm: no feeds, streaks, or notification pressure
- Local: the app makes no runtime network requests
