# pedigree-fhir

Headless TypeScript toolkit for parsing pedigree-relevant FHIR resources, inferring family structure, computing PSC-aware pedigree layout, and rendering the result with consumer-owned UI.

The repository is organized as a PNPM monorepo:

| Package/App | Purpose |
| --- | --- |
| `@pedigree/core` | Framework-agnostic parsing, graph/model, PSC semantics, layout, state, editing, history, and validation |
| `@pedigree/react` | React provider, hooks, and render-prop primitives on top of the headless core store |
| `@pedigree/docs` | Docusaurus docs site for guides and API reference |
| `apps/demo` | Minimal Vite consumer proving the packages can drive different SVG presentations |
| `apps/storybook` | Story-driven proof surface for primitives, interactivity, editing, validation, PSC, and themes |
| `e2e` | Playwright flow and visual regression coverage |

## What this project does

The core package takes a `Patient` plus related `FamilyMemberHistory` resources, turns them into a pedigree graph, fills in predictable structural relationships, computes display geometry, and exposes validation diagnostics. The React package does **not** add styling or a prebuilt chart component; it gives you the store, hooks, and render-prop primitives needed to render the pedigree with your own SVG or UI system.

That design goal shows up throughout the repo:

- **FHIR-aware**: starts from `Patient` and `FamilyMemberHistory`, including genetics extension data.
- **PSC-aware**: models twins, consanguinity, pregnancy outcomes, adoption, proband markers, vital state, and related pedigree semantics.
- **Headless**: exports graph and layout data rather than imposing a theme or component library.
- **Editable**: state, graph edits, couple edits, and history/undo-redo live in the core store.
- **Verified**: CI enforces lint, typecheck, builds, Playwright, and 100% test coverage for the packages.

## High-level flow

```mermaid
flowchart LR
  A["Patient + FamilyMemberHistory"] --> B["parsePedigree"]
  B --> C["inferRelationships"]
  C --> D["PedigreeGraph"]
  D --> E["createPedigreeStore"]
  D --> F["computeLayout"]
  E --> G["React provider + hooks"]
  F --> G
  D --> H["Validation registry"]
  H --> G
  G --> I["Consumer-owned SVG / app UI"]
```

For a deeper explanation, see [Architecture](docs/architecture.md).

## Repository structure

```text
.
├── packages/
│   ├── core/        # headless FHIR + pedigree engine
│   └── react/       # React adapter over the core store/layout surface
├── apps/
│   ├── docs/        # Docusaurus docsite
│   ├── demo/        # minimal consumer app
│   └── storybook/   # proof surface and visual examples
├── e2e/             # Playwright flow and visual tests
└── docs/            # markdown architecture and contributor docs
```

## Local development

### Prerequisites

- Node.js 20+
- PNPM 9.12.0

### Install

```bash
pnpm install
```

### Common commands

| Command | Purpose |
| --- | --- |
| `pnpm run lint` | Biome checks the repo |
| `pnpm run typecheck` | Type-check all workspace projects |
| `pnpm run test` | Run package Vitest suites |
| `pnpm run test:coverage` | Run package tests with coverage |
| `pnpm run mutation` | Run the opt-in Stryker mutation workflow for both packages |
| `pnpm run build` | Build `@pedigree/core` and `@pedigree/react` |
| `pnpm run docs:dev` | Start the local docs stack: Docusaurus + Storybook |
| `pnpm run docs:build` | Build the Docusaurus docsite |
| `pnpm run pages:build` | Build a combined GitHub Pages artifact with the docsite at `/` and Storybook at `/storybook` |
| `pnpm run e2e` | Run Playwright flow + visual tests |
| `pnpm -F @pedigree/demo dev` | Start the demo app |
| `pnpm -F @pedigree/storybook dev` | Start Storybook on port 6006 |

## Verification standard

The repo treats documentation and verification as first-class concerns. The current CI flow runs:

1. lint
2. typecheck
3. package coverage with a **100% threshold**
4. package builds
5. Storybook build
6. docsite build
7. Playwright docs, flow, and visual tests

Mutation testing is available as a **local, opt-in investigation workflow** via Stryker. It is intentionally separate from the main CI gate until its runtime and signal justify promotion.

See [.github/workflows/ci.yml](.github/workflows/ci.yml) and [Development](docs/development.md) for details.

## GitHub Pages deployment shape

The production doc experience is intended to publish as a **single GitHub Pages artifact**:

- Docusaurus at the site root
- Storybook under `/storybook`

Use `pnpm run pages:build` to assemble that artifact locally into `dist/pages`.

## Package entry points

- [`packages/core/README.md`](packages/core/README.md): parsing, graph, layout, state, validation
- [`packages/react/README.md`](packages/react/README.md): provider, hooks, render-prop primitives

## Minimal example

This is the smallest accurate end-to-end flow represented in the repo today:

```ts
import { createPedigreeStore, inferRelationships, parsePedigree } from '@pedigree/core';

const graph = inferRelationships(parsePedigree(patient, familyHistory));
const store = createPedigreeStore({
  graph,
  layoutOptions: {},
});
```

In React, you then provide that store and render your own UI:

```tsx
import { PedigreeProvider, Pedigree } from '@pedigree/react';

<PedigreeProvider store={store}>
  <Pedigree>
    {({ graph, layout }) => {
      // render your own SVG using layout.nodes, layout.partnerEdges, layout.parentDrops
      return null;
    }}
  </Pedigree>
</PedigreeProvider>;
```

## Documentation map

- [Introduction](docs/intro.md)
- [Getting started](docs/getting-started.md)
- [Package map](docs/package-map.md)
- [Playground guide](docs/playground.mdx)
- [Architecture](docs/architecture.md)
- [Development](docs/development.md)
- [`@pedigree/core` README](packages/core/README.md)
- [`@pedigree/react` README](packages/react/README.md)

## Documentation surfaces

- **Docusaurus** owns the narrative docs and autogenerated API reference.
- **Storybook** owns the interactive playground and proof stories.

That split keeps the docs simple while preserving a real demo surface.
