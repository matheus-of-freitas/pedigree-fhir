# @pedigree/core

Framework-agnostic core for FHIR-driven pedigree graphs: parsing, relationship inference, PSC semantics, layout, state, editing, history, and validation.

## Responsibilities

`@pedigree/core` owns the domain and state model for the library. It does **not** depend on React and does **not** render anything. Instead, it gives consumers:

- FHIR parsing from `Patient` and `FamilyMemberHistory`
- relationship inference for common pedigree topology
- PSC-aware semantics and layout geometry
- a headless store with selection, layout options, edits, and history
- validation rules and registry composition

## Public surface

The package currently exports these main areas:

- `fhir/*`
  - `parsePedigree`
  - `serializePedigree`
  - genetics extension helpers
  - relationship-code helpers
- `model/*`
  - graph and individual/couple types
  - ID helpers
  - `inferRelationships`
- `psc/*`
  - pedigree semantics such as sex, vital state, carrier state, twins, and adoption
- `layout/*`
  - layout types
  - `computeLayout`
- `state/*`
  - `createPedigreeStore`
  - individual, graph, and couple edits
  - history helpers
- `validation/*`
  - `defaultRegistry`
  - custom registry composition
  - diagnostic/rule types

See [`src/index.ts`](src/index.ts) for the actual export list.

## Core workflow

For most consumers, the canonical flow is:

```ts
import {
  createPedigreeStore,
  defaultRegistry,
  inferRelationships,
  parsePedigree,
} from '@pedigree/core';

const parsed = parsePedigree(patient, familyHistory);
const graph = inferRelationships(parsed);

const store = createPedigreeStore({
  graph,
  layoutOptions: {},
});

const diagnostics = defaultRegistry().validate(store.getState().graph);
```

## Parsing and inference

`parsePedigree(patient, familyHistory)` performs the deterministic FHIR-to-graph conversion:

- constructs the proband from `Patient`
- turns `FamilyMemberHistory` records into individuals
- reads genetics-parent and genetics-sibling extension data
- creates explicit couples and child-of relationships when the source is clear
- groups twin declarations transitively

`inferRelationships(graph)` then fills in structural relationships from pedigree evidence such as:

- direct mother/father/sibling relationships
- maternal and paternal grandparent sides
- fabricated parents or grandparents where the topology is strongly implied

This split is deliberate: parsing handles explicit source data, while inference handles predictable pedigree structure recovery.

## Layout

`computeLayout(graph, options)` returns headless geometry rather than a rendered chart. The important outputs are:

- `nodes`: individual positions
- `partnerEdges`: partner-line SVG path strings, including consanguinity handling
- `parentDrops`: sibship drop geometry and twin-junction metadata
- `bounds`: overall chart bounds

That geometry is what downstream renderers consume.

## Store and edits

`createPedigreeStore` produces a framework-agnostic external store with:

- `getState()`
- `dispatch(action)`
- `subscribe(listener)`

The store keeps:

- the current `graph`
- `layoutOptions`
- selected individual ID
- edit history

The action surface includes:

- selection changes
- layout option updates
- individual semantic edits
- graph edits such as adding/removing relatives
- couple edits such as consanguinity and twin state
- undo/redo

## Validation

The built-in validation registry currently includes:

- completeness checks
- sex/relationship consistency checks
- cycle detection
- unknown code detection

Use `defaultRegistry()` for the standard rule set, or `createRegistry()` to customize the active rules.

## Design constraints

The core package is intentionally:

- **headless**: no UI assumptions
- **pure-data-first**: graph and geometry are explicit outputs
- **editable**: state mutations happen through a typed action surface
- **test-heavy**: the repo’s package coverage bar is 100%

## See also

- [Root README](../../README.md)
- [Architecture docs](../../docs/architecture.md)
- [Development docs](../../docs/development.md)
- [`@pedigree/react` README](../react/README.md)
