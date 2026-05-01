# Development

This document covers day-to-day work in the repository: installing dependencies, running apps, understanding verification expectations, and navigating the proof surfaces.

## Toolchain

- Node.js 20+
- PNPM 9.12.0

Install dependencies from the repository root:

```bash
pnpm install
```

## Workspace layout

```text
packages/core       headless domain + layout + state + validation
packages/react      React adapter for the core store/layout
apps/demo           minimal consumer application
apps/storybook      story-driven proof surface
e2e                 Playwright flow and visual coverage
```

## Commands

Run all commands from the repo root unless noted otherwise.

### Quality and verification

| Command | What it does |
| --- | --- |
| `pnpm run lint` | Run Biome across the repo |
| `pnpm run typecheck` | Type-check all workspace projects |
| `pnpm run test` | Run package tests |
| `pnpm run test:coverage` | Run package tests with coverage |
| `pnpm run build` | Build the publishable packages |
| `pnpm run e2e` | Run Playwright flow and visual suites |
| `pnpm run e2e:update` | Refresh Playwright visual baselines |

### App surfaces

| Command | What it does |
| --- | --- |
| `pnpm -F @pedigree/demo dev` | Run the demo app |
| `pnpm -F @pedigree/demo build` | Build the demo app |
| `pnpm -F @pedigree/storybook dev` | Run Storybook on port 6006 |
| `pnpm -F @pedigree/storybook build` | Build Storybook static output |

## Coverage expectation

The project standard is **100% package coverage**.

That expectation currently applies to the package test suites and is enforced in CI via:

```bash
pnpm -r --filter "./packages/*" run test:coverage
```

Practical implications:

- new package code should arrive with tests
- defensive branches should only be excluded with explicit justification
- coverage erosion is treated as a correctness problem, not just a reporting issue

## CI surface

The main CI workflow runs:

1. dependency install
2. Biome lint
3. workspace typecheck
4. package coverage
5. package builds
6. Storybook build
7. Playwright flow + visual tests

There is also a separate workflow that refreshes Playwright visual baselines on demand or on a schedule.

## How to use the proof surfaces

### Demo app

Use the demo app when you want to sanity-check the library as a consumer would:

- store creation
- React provider wiring
- custom SVG rendering
- styling differences across consumer-owned themes

### Storybook

Use Storybook when you want focused examples for:

- primitive APIs
- empty/partial/read-only compositions
- selection and compact mode
- editing and undo/redo
- validation diagnostics
- PSC layout semantics
- theme wrappers

### Playwright

The Playwright suite is split into two projects:

- **flows**: interaction and behavior checks
- **visual**: screenshot baselines for important rendered surfaces

The config starts Storybook and a built/previewed demo app automatically.

## Documentation expectations

When behavior or public surface area changes, update the matching docs as part of the same work:

- root README for project-level understanding
- package READMEs for public usage changes
- architecture docs for model or layering changes
- this development doc for workflow/verification changes

## Recommended workflow for feature work

1. Understand whether the change belongs in `@pedigree/core`, `@pedigree/react`, or only in the proof surfaces.
2. Add or update tests before considering the work complete.
3. Use Storybook to inspect the behavior in isolation.
4. Use Playwright when the behavior matters in the browser or visually.
5. Update markdown docs for any user-facing or architectural changes.

## Related docs

- [Root README](../README.md)
- [Architecture](architecture.md)
- [`@pedigree/core` README](../packages/core/README.md)
- [`@pedigree/react` README](../packages/react/README.md)
