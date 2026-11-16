# Visco — Architecture

## Status

Foundation only. The app shell is implemented. The graph layer is **not**
implemented; Cytoscape.js is installed and intentionally unused until the graph
work is approved.

## Stack

| Concern | Choice | Notes |
| --- | --- | --- |
| UI runtime | React 19 | Function components, hooks |
| Language | TypeScript 7 | Strict compilation via project references |
| Build tool | Vite 8 | Dev server, production bundling |
| Graph renderer | Cytoscape.js 3.35 | Installed, not yet imported |
| Linting | Oxlint | Configured with React and TypeScript rules |
| Styling | Plain CSS | No CSS framework or runtime style library |
| State | React local state | No global state library yet |
| Routing | None | Single screen; add only when navigation exists |

## Constraints

- **Target hardware:** Windows 11 dev machine with 8 GB RAM, plus mobile
  browsers.
- **Mobile-first:** base styles target small touch screens; larger layouts are
  progressive enhancements via `min-width` media queries.
- **Lightweight:** avoid dependencies that duplicate built-in capabilities.
  Keep the production bundle small and startup work minimal.
- **No network dependency at runtime:** the current shell is fully local.
- **No backend, auth, database, ingestion, or AI services** in this phase.

## Directory structure

```text
Visco/
├── index.html              # App entry document and metadata
├── package.json            # Scripts and dependencies
├── package-lock.json       # Locked dependency tree
├── vite.config.ts          # Vite + React plugin configuration
├── tsconfig.json           # Project references
├── tsconfig.app.json       # App compiler options
├── tsconfig.node.json      # Tooling compiler options
├── .oxlintrc.json          # Lint rules
├── public/
│   └── favicon.svg         # Static favicon
├── src/
│   ├── main.tsx            # React root bootstrap
│   ├── App.tsx             # Visco app shell
│   ├── App.css             # Shell styles (mobile-first)
│   └── index.css           # Theme tokens and global styles
├── PROJECT.md              # Product brief and scope
├── ARCHITECTURE.md         # This document
├── TASKS.md                # Phased plan and approval gates
└── README.md               # Setup and usage
```

## Shell architecture

`src/main.tsx` mounts `<App />` into `#root` inside `StrictMode`.
`src/App.tsx` is a static, semantic single screen: brand header, introduction,
a status card that clearly communicates the graph is not active, and a footer
with product constraints. There is no router, data fetching, or persistence.

Theming lives in `src/index.css` as CSS custom properties. Light is the default;
dark tokens are applied through `prefers-color-scheme`. Layout uses fluid type,
`svh` units, and safe-area padding for mobile browsers. `src/App.css` contains
only screen-level layout and component styles.

## Planned graph layer

When approved, the graph should be introduced behind a narrow boundary so the
renderer stays replaceable and testable:

```text
src/
├── graph/
│   ├── GraphCanvas.tsx     # React lifecycle wrapper around Cytoscape
│   ├── cytoscape.ts        # Imperative instance setup/teardown
│   └── types.ts            # Renderer-facing element types
├── model/
│   └── knowledge.ts        # Node/edge domain types and helpers
└── data/
    └── sample.ts           # Small local fixture for development
```

### Proposed domain model

```ts
type KnowledgeNode = {
  id: string
  title: string
  summary?: string
  tags?: string[]
}

type KnowledgeEdge = {
  id: string
  source: string
  target: string
  label?: string
}
```

This model is a proposal, not implemented code. It is deliberately minimal and
renderer-agnostic.

### Integration rules

1. **Keep Cytoscape at the edge.** Only `src/graph/` imports Cytoscape. UI
   components consume plain data and callbacks.
2. **One instance per canvas.** Initialise on mount, destroy on unmount, and
   only update elements when data changes.
3. **Lazy-load the graph.** Import Cytoscape only when the graph screen mounts
   so the landing shell stays small.
4. **Touch first.** Enable panning and zooming, use generous node hit areas,
   and test at 320–430 px widths before desktop.
5. **Budget the bundle.** Measure the production build after adding the graph
   and avoid renderer plugins until a concrete need is proven.
6. **No hidden network calls.** Graph data remains local in this phase.

## Performance notes

- Use Vite's production build and check the generated asset sizes after each
  phase.
- Prefer CSS for decorative effects; the current shell ships no images or
  fonts.
- Avoid global state libraries and layout libraries until measured complexity
  justifies them.
- Cytoscape should render to canvas on mobile and use a restrained style sheet
  (limited colours, simple shapes, no expensive shadows).

## Testing strategy

There is no test runner configured in the foundation phase. Before graph work
begins, add a lightweight test setup for domain helpers and graph-data
transforms. Renderer behaviour should be validated with a small number of
browser-level smoke tests once interaction exists.

## Decision log

| Decision | Rationale |
| --- | --- |
| Vite + React + TypeScript | Fast local feedback, minimal configuration, small output |
| Plain CSS | No extra runtime; theme tokens cover the current needs |
| Cytoscape.js | Mature canvas graph rendering with touch support |
| No router yet | One screen; routing adds no value at this stage |
| No state library yet | Local state is sufficient for the shell |
| No data persistence yet | Belongs to a later milestone with explicit scope |
