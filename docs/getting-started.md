---
title: Getting started
description: Install the packages, parse a pedigree from FHIR input, and render a first chart.
sidebar_position: 2
---

# Getting started

## Install

Choose the packages you need:

```bash
pnpm add @pedigree/core @pedigree/react
```

`@pedigree/core` is enough for parsing, inference, layout, and validation. Add
`@pedigree/react` when you want the React provider, hooks, and render-prop
primitives.

## Parse FHIR and create a store

```ts
import {
  createPedigreeStore,
  inferRelationships,
  parsePedigree,
  validateFhirInput,
} from '@pedigree/core';

const inputDiagnostics = validateFhirInput(patient, familyHistory);
const graph = inferRelationships(parsePedigree(patient, familyHistory));

const store = createPedigreeStore({
  graph,
  layoutOptions: {},
});
```

## Provide the store in React

```tsx
import { PedigreeProvider } from '@pedigree/react';

export function App() {
  return <PedigreeProvider store={store}>{/* your SVG/UI */}</PedigreeProvider>;
}
```

## Render your own SVG

The library is deliberately headless. The common pattern is:

1. parse input resources with `@pedigree/core`
2. infer missing structural relationships
3. create a store and compute layout
4. use `@pedigree/react` to read the graph/layout and render your own SVG

If you want a working visual reference before integrating it into your own app,
use the [Playground](./playground.mdx) and Storybook examples.
