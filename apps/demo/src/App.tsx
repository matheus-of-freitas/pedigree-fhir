import { createPedigreeStore, inferRelationships, parsePedigree } from '@pedigree/core';
import { PedigreeProvider } from '@pedigree/react';
import { useMemo } from 'react';
import { PedigreeView } from './PedigreeView.js';
import { familyHistory, proband } from './fixture.js';

export function App() {
  const store = useMemo(() => {
    const graph = inferRelationships(parsePedigree(proband, familyHistory));
    return createPedigreeStore({ graph, layoutOptions: {} });
  }, []);

  return (
    <PedigreeProvider store={store}>
      <main className="page">
        <header>
          <h1>pedigree-fhir demo</h1>
          <p>
            Same headless library, two different consumer-supplied themes. The library ships only
            positions and SVG path strings — visuals are entirely the consumer's choice.
          </p>
        </header>

        <section>
          <h2>Variant: minimal</h2>
          <PedigreeView variant="minimal" />
        </section>

        <section>
          <h2>Variant: themed</h2>
          <PedigreeView variant="themed" />
        </section>
      </main>
    </PedigreeProvider>
  );
}
