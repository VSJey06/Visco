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
6. **Progressive.** Ship a small, solid foundation before adding graph
   interaction, persistence, or content ingestion.

## Core concepts

- **Node** — a single unit of knowledge (an idea, note, or concept).
- **Edge** — a meaningful connection between two nodes.
- **Knowledge web** — the graph formed by nodes and edges; the primary canvas
  of the app.
- **Focus** — the currently selected node and its immediate neighbourhood.
- **Trail** — the path of nodes a learner visited while exploring.

## Current milestone (foundation)

The initial milestone establishes the project shell only:

- React + TypeScript + Vite application
- Mobile-first landing shell with light and dark appearance
- Cytoscape.js installed as the future graph-rendering dependency
- Project, architecture, task, and readme documentation
- A passing production build

## Explicitly out of scope

The following are **not** part of this milestone and must not be added without
explicit approval:

- Authentication or user accounts
- Backend services or APIs
- Databases or remote persistence
- PDF extraction or document ingestion
- AI APIs or generated content
- Android or other native mobile tooling
- The graph UI itself

## Success criteria for the foundation

- `npm run build` completes without errors.
- The app renders a usable mobile-first shell at 320 px width and up.
- No runtime dependency beyond React, React DOM, and Cytoscape.js.
- Documentation accurately describes the current state and the next gate.
