# Visco

Visco is an interactive organic knowledge-web learning app. Ideas live as
nodes in a living map, and their connections form paths for exploration. It is
built to make relationships between ideas visible, so learning feels like
following a web rather than browsing a list.

## Status

Foundation milestone. The mobile-first app shell is in place, and Cytoscape.js
is installed for the upcoming graph layer. **The graph UI is not implemented
yet** and will not be started until it is approved.

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

## Stack

- React 19 + TypeScript
- Vite 8
- Cytoscape.js 3.35 (graph rendering dependency, not yet wired up)
- Plain CSS with system font stack and light/dark themes
- Oxlint

## Project structure

```text
src/
├── main.tsx    # React bootstrap
├── App.tsx     # App shell (no graph yet)
├── App.css     # Mobile-first shell styles
└── index.css   # Theme tokens and global styles
```

## Documentation

- [PROJECT.md](PROJECT.md) — vision, audience, principles, and scope
- [ARCHITECTURE.md](ARCHITECTURE.md) — stack, structure, and graph plan
- [TASKS.md](TASKS.md) — phased roadmap and approval gates

## Scope guardrails

This phase deliberately excludes authentication, backends, databases, PDF
extraction, AI APIs, Android tooling, and graph interaction. Please see
[PROJECT.md](PROJECT.md) before proposing additions.

## Design priorities

- Mobile-first: designed at phone width, enhanced for larger screens
- Lightweight: minimal dependencies and a small production bundle
- Calm: no feeds, streaks, or notification pressure
- Local: the current shell makes no network requests
