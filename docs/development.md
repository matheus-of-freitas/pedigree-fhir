---
title: Development
description: Day-to-day repo setup, commands, proof surfaces, and verification expectations.
sidebar_position: 6
---

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
apps/docs           Docusaurus docsite
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
| `pnpm run mutation` | Run the opt-in mutation workflow for both packages |
| `pnpm run mutation:core` | Run Stryker against `@pedigree-fhir/core` |
| `pnpm run mutation:react` | Run Stryker against `@pedigree-fhir/react` |
| `pnpm run build` | Build the publishable packages |
| `pnpm run docs:build` | Build the Docusaurus docsite |
| `pnpm run pages:build` | Build the combined GitHub Pages artifact with Docusaurus at `/` and Storybook at `/storybook` |
| `pnpm run release:check` | Run the full verification bar before publishing to npm |
| `pnpm run release:pack` | Create local npm tarballs for `@pedigree-fhir/core` and `@pedigree-fhir/react` in `.release-tmp/` |
| `pnpm run release:publish:core` | Publish `@pedigree-fhir/core` to npm |
| `pnpm run release:publish:react` | Publish `@pedigree-fhir/react` to npm |
| `pnpm run e2e` | Run Playwright flow and visual suites |
| `pnpm run e2e:update` | Refresh Playwright visual baselines |

### App surfaces

| Command | What it does |
| --- | --- |
| `pnpm -F @pedigree/demo dev` | Run the demo app |
| `pnpm -F @pedigree/demo build` | Build the demo app |
| `pnpm docs:dev` | Run the local docs stack: Docusaurus on port 3000 and Storybook on port 6006 |
| `pnpm -F @pedigree/docs start` | Run the Docusaurus docsite on port 3000 |
| `pnpm -F @pedigree/docs build` | Build the docsite static output |
| `pnpm -F @pedigree/storybook dev` | Run Storybook on port 6006 |
| `pnpm -F @pedigree/storybook build` | Build Storybook static output |

## Cross-linking the docs and playground

The docsite and Storybook are intentionally separate surfaces:

- Docusaurus owns the guides and API reference
- Storybook owns the interactive playground and examples

By default the two apps assume these local URLs:

- docsite: `http://localhost:3000`
- Storybook: `http://localhost:6006`

You can override the Storybook link used by Docusaurus with:

```bash
STORYBOOK_URL=https://example.com/storybook pnpm -F @pedigree/docs build
```

For GitHub Pages deployment, the production build also needs:

```bash
DOCSITE_URL=https://<owner>.github.io \
DOCSITE_BASE_URL=/pedigree/ \
STORYBOOK_URL=https://<owner>.github.io/pedigree/storybook/ \
STORYBOOK_DOCSITE_URL=https://<owner>.github.io/pedigree/ \
STORYBOOK_BASE_URL=/pedigree/storybook/ \
pnpm run pages:build
```

That produces a single static artifact in `dist/pages` with:

- the docsite at the artifact root
- Storybook copied into `dist/pages/storybook`

## Manual npm release

The repo is prepared for a **manual first npm release** of:

- `@pedigree-fhir/core`
- `@pedigree-fhir/react`

### Prerequisites

1. own or control the npm scope `@pedigree-fhir`
2. log in with `npm login`
3. make sure the worktree is clean before publishing

### Release steps

1. run the full verification bar:

   ```bash
   pnpm run release:check
   ```

   This disables Playwright server reuse on purpose, so the release check does
   not silently rely on already-running local docs, demo, or Storybook servers.

2. build local tarballs and inspect them:

   ```bash
   pnpm run release:pack
   ```

3. publish the core package first:

   ```bash
   pnpm run release:publish:core
   ```

4. publish the React package second:

   ```bash
   pnpm run release:publish:react
   ```

5. verify npm sees the versions:

   ```bash
   npm view @pedigree-fhir/core version
   npm view @pedigree-fhir/react version
   ```

6. verify installability from a clean consumer app

### Why the order matters

`@pedigree-fhir/react` publishes with a semver dependency on
`@pedigree-fhir/core`, so the core package must exist on npm before the React
package is published.

## Automated npm publish

After the `@pedigree-fhir` scope exists and npm trusted publishing is configured
for this repository, releases can be triggered from GitHub Actions with the
**Publish npm packages** workflow.

### Recommended trigger model

The first automation pass is intentionally **manual**:

- trigger the workflow with `workflow_dispatch`
- run it only from `main`
- keep version bumps explicit in committed package manifests

This avoids accidental publishes while still removing the manual shell steps.

### Workflow behavior

The workflow:

1. installs dependencies and Playwright browsers
2. runs `pnpm run release:check`
3. checks whether `@pedigree-fhir/core` and `@pedigree-fhir/react` at the
   committed versions already exist on npm
4. publishes core first if the version is not already present
5. verifies that the core version exists on npm before attempting React
6. publishes React if its version is not already present

### npm configuration prerequisite

The workflow is designed for **npm trusted publishing** from GitHub Actions.

Before using it, configure npm so each package trusts this repository/workflow.
If npm requires the package entry to exist before trusted publishing can be
configured, do the first successful publish manually, then switch to the
workflow for later releases.

## Package registry visibility

For this repository, **npmjs is the package registry source of truth**.

- published package visibility in the repo README should link to the npm package
  pages for `@pedigree-fhir/core` and `@pedigree-fhir/react`
- GitHub Packages npm publishing is intentionally out of scope under the current
  repository owner namespace (`matheus-of-freitas`) because it does not cleanly
  match the published package scope `@pedigree-fhir/*`
- if dual-registry publishing is required later, the clean path is moving to a
  matching GitHub organization/owner namespace rather than using different names
  across npmjs and GitHub Packages

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

## Mutation testing

Mutation testing is available as a **manual investigation workflow** on top of the normal 100% coverage gate.

- `pnpm run mutation` runs both package mutation suites in sequence
- `pnpm run mutation:core` and `pnpm run mutation:react` let you focus on one package at a time
- package-level Stryker configs live in `packages/core/stryker.config.json` and `packages/react/stryker.config.json`
- local Stryker output is ignored from git via `reports/mutation` and `stryker-tmp`

This workflow is intentionally **not** part of the main CI pipeline yet. The first goal is to prove that the extra runtime yields useful signal beyond the existing Vitest + Playwright verification stack.

## CI surface

The main CI workflow runs:

1. dependency install
2. Biome lint
3. workspace typecheck
4. package coverage
5. package builds
6. Storybook build
7. docsite build
8. Playwright docs + flow + visual tests

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

The Playwright suite is split into three projects:

- **docs**: basic docsite smoke coverage
- **flows**: interaction and behavior checks
- **visual**: screenshot baselines for important rendered surfaces

The config starts the docsite, Storybook, and a built/previewed demo app automatically.

## Documentation expectations

When behavior or public surface area changes, update the matching docs as part of the same work:

- root README for project-level understanding
- package READMEs for public usage changes
- architecture docs for model or layering changes
- this development doc for workflow/verification changes

## Recommended workflow for feature work

1. Understand whether the change belongs in `@pedigree-fhir/core`, `@pedigree-fhir/react`, or only in the proof surfaces.
2. Add or update tests before considering the work complete.
3. Use Storybook to inspect the behavior in isolation.
4. Use Playwright when the behavior matters in the browser or visually.
5. Update markdown docs for any user-facing or architectural changes.

## Related docs

- [Introduction](intro.md)
- [Architecture](architecture.md)
- [Package map](package-map.md)
- [API reference](/docs/api)
