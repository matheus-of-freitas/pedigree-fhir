---
title: Introduction
description: What pedigree-fhir is, how the repo is organized, and where to go next.
sidebar_position: 1
---

# Introduction

`pedigree-fhir` is a headless TypeScript toolkit for parsing pedigree-relevant FHIR
resources, inferring family structure, computing PSC-aware layout, and rendering
the result with consumer-owned UI.

The library is intentionally split into two publishable packages:

- `@pedigree/core` for parsing, inference, layout, state, editing, and validation
- `@pedigree/react` for the provider, hooks, and render-prop primitives that make
  the headless core ergonomic in React

The repository also ships two proof surfaces:

- a minimal demo app
- a Storybook app used as the interactive playground and examples surface

## What makes the library different

- **FHIR-aware:** starts from `Patient` and `FamilyMemberHistory`
- **PSC-aware:** models twins, consanguinity, pregnancy outcomes, adoption,
  proband markers, carrier state, and vital state
- **Headless:** exports data and geometry instead of a fixed chart widget
- **Editable:** exposes store actions and history helpers for interactive use cases
- **Verified:** package coverage is held at 100%, with builds and Playwright flows
  covering the proof surfaces

## Read next

- [Getting started](./getting-started.md)
- [Package map](./package-map.md)
- [Playground](./playground.mdx)
- [Architecture](./architecture.md)
