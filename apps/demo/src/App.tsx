import { createPedigreeStore, inferRelationships, parsePedigree } from '@pedigree-fhir/core';
import { PedigreeProvider } from '@pedigree-fhir/react';
import { useMemo } from 'react';
import { CancerHistoryView } from './CancerHistoryView.js';
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

        <section>
          <h2>Use case: family cancer history</h2>
          <p>
            Same headless graph and layout, but the oncology profile is enabled here to add
            quartered cancer markers, a legend, and age plus diagnosis-age labels without changing
            the generic pedigree renderer.
          </p>
          <CancerHistoryView />
        </section>
      </main>
    </PedigreeProvider>
  );
}
