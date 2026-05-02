# @pedigree-fhir/react

Headless React adapter for `@pedigree-fhir/core`: provider, hooks, and render-prop primitives for consuming the pedigree store and layout surface without imposing styling.

## What this package is for

`@pedigree-fhir/react` exists to make the core package ergonomic in React applications while preserving the headless design:

- **you** create the store with `@pedigree-fhir/core`
- **you** decide how to memoize and provide it
- **you** own the final SVG or UI
- this package only exposes the store cleanly to React and scopes render helpers around the layout data

It is intentionally not a prebuilt chart widget.

## Main exports

### Provider

- `PedigreeProvider`
- `usePedigreeStore`

### Hooks

- `usePedigree`
- `useNode`
- `useEdge`
- `useDrop`
- `useSelection`
- `useCompact`
- `useEditor`
- `useValidation`
- `useInputValidation`

### Primitives

- `Pedigree`
- `Node`
- `Edge`
- `Sibship`

See [`src/index.ts`](src/index.ts) for the exact export surface.

## Typical usage

Create the store in application code:

```ts
import { createPedigreeStore, inferRelationships, parsePedigree } from '@pedigree-fhir/core';

const graph = inferRelationships(parsePedigree(patient, familyHistory));
const store = createPedigreeStore({ graph, layoutOptions: {} });
```

Then provide it to React:

```tsx
import { PedigreeProvider } from '@pedigree-fhir/react';

<PedigreeProvider store={store}>{children}</PedigreeProvider>;
```

## Render-prop pattern

The package centers around `Pedigree`, which gives you the current graph and layout:

```tsx
import { Edge, Node, Pedigree, PedigreeProvider, Sibship } from '@pedigree-fhir/react';
import { resolveIndividualDisplayLabel } from '@pedigree-fhir/core';

<PedigreeProvider store={store}>
  <Pedigree>
    {({ graph, layout }) => (
      <svg
        viewBox={`${layout.bounds.minX - 30} ${layout.bounds.minY - 30} ${layout.bounds.width + 60} ${layout.bounds.height + 60}`}
      >
        {layout.partnerEdges.map((edge) => (
          <Edge key={edge.coupleId} coupleId={edge.coupleId}>
            {(data) => <path d={data.path} fill="none" stroke="currentColor" />}
          </Edge>
        ))}

        {layout.parentDrops.map((drop) => (
          <Sibship key={drop.coupleId} coupleId={drop.coupleId}>
            {(data) => <path d={data.path} fill="none" stroke="currentColor" />}
          </Sibship>
        ))}

        {layout.nodes.map((node) => (
          <Node key={node.id} id={node.id}>
            {({ individual, position }) => (
              <g transform={`translate(${position.x}, ${position.y})`}>
                <text>
                  {resolveIndividualDisplayLabel(individual, {
                    preferRelationshipLabel: true,
                  }) ?? individual.id}
                </text>
              </g>
            )}
          </Node>
        ))}
      </svg>
    )}
  </Pedigree>
</PedigreeProvider>;
```

That pattern is what keeps the package theme-free: the library gives you topology and geometry, not final design.

## Hooks by concern

### Read current state

- `usePedigree()`: full graph + layout + layout options
- `useNode(id)`: one individual and its position
- `useEdge(coupleId)`: one partner-edge surface
- `useDrop(coupleId)`: one sibship drop surface

### Interactivity and display state

- `useSelection()`: selected node and selection actions
- `useCompact()`: maternal/paternal aunt/uncle compaction toggles

### Editing and validation

- `useEditor()`: semantic edits, graph edits, couple edits, undo, redo
- `useValidation(registry?)`: graph-level diagnostics for the current pedigree store
- `useInputValidation(patient, familyHistory)`: raw-FHIR diagnostics before parsing/inference

## Design constraints

This package is intentionally:

- **thin**: the domain logic stays in `@pedigree-fhir/core`
- **unstyled**: no opinionated visual system is shipped
- **store-backed**: hooks subscribe to the external core store
- **composable**: hooks and primitives can be mixed depending on the UI you are building

## Where to look next

- [Root README](../../README.md)
- [`@pedigree-fhir/core` README](../core/README.md)
- [Architecture docs](../../docs/architecture.md)
- [Development docs](../../docs/development.md)
