---
title: Package map
description: Understand how the core package, React package, demo app, docsite, and Storybook relate.
sidebar_position: 3
---

# Package map

The monorepo is split into publishable packages plus proof surfaces:

| Package/App | Purpose |
| --- | --- |
| `@pedigree/core` | Headless parsing, graph/model, PSC semantics, layout, state, editing, history, and validation |
| `@pedigree/react` | React provider, hooks, and render-prop primitives on top of the core store/layout surface |
| `@pedigree/docs` | Docusaurus site for guides, architecture notes, and API reference |
| `@pedigree/storybook` | Interactive playground and examples surface |
| `@pedigree/demo` | Minimal consumer application |
| `e2e` | Playwright flow and visual coverage |

## Which package do I need?

- Use **`@pedigree/core` only** if you want parsing, inference, layout, and
  validation in a non-React environment.
- Add **`@pedigree/react`** if your application is in React and you want the
  provider/hook/render-prop integration layer.
- Use **Storybook** when you want to inspect behavior, compare themes, or explore
  example use cases before building your own renderer.

## Proof surfaces

The repo keeps two separate interactive surfaces on purpose:

- **Docusaurus** explains how the library works
- **Storybook** demonstrates how the library behaves

That split keeps guides and API reference clean while preserving a true playground.
