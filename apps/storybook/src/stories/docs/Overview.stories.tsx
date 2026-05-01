import type { Meta, StoryObj } from '@storybook/react-vite';

function Overview() {
  return (
    <main
      style={{
        maxWidth: 960,
        color: 'var(--pedigree-text)',
        fontFamily: 'var(--pedigree-font-family, "Avenir Next", sans-serif)',
      }}
    >
      <section
        style={{
          display: 'grid',
          gap: 18,
          padding: 28,
          borderRadius: 24,
          background:
            'linear-gradient(135deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.55))',
          border: '1px solid rgba(31, 41, 51, 0.12)',
          boxShadow: '0 22px 60px rgba(31, 41, 51, 0.12)',
        }}
      >
        <p style={{ margin: 0, letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: 12 }}>
          Headless FHIR pedigree library
        </p>
        <h1 style={{ margin: 0, fontSize: 40, lineHeight: 1.05 }}>
          Parse family-history FHIR, compute PSC-aware pedigree layout, render it with any UI kit.
        </h1>
        <p style={{ margin: 0, maxWidth: 760, fontSize: 17, lineHeight: 1.55 }}>
          This Storybook is the docs surface for the v1 plan: primitives prove the headless React
          adapter, milestone stories exercise interactions and validation, and visual snapshots lock
          down subtle PSC symbols.
        </p>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 14,
          marginTop: 18,
        }}
      >
        {[
          ['Core', 'Parse, infer, serialize, validate, and lay out a pedigree without React.'],
          ['React', 'Expose provider, hooks, and render-prop primitives while staying theme-free.'],
          [
            'PSC',
            'Render twins, consanguinity, pregnancy outcomes, adoption, proband, and vital marks.',
          ],
          ['Evidence', 'Vitest coverage gates plus Playwright flow and visual snapshots.'],
        ].map(([title, body]) => (
          <article
            key={title}
            style={{
              padding: 18,
              minHeight: 128,
              borderRadius: 18,
              background: 'rgba(255, 255, 255, 0.72)',
              border: '1px solid rgba(31, 41, 51, 0.1)',
            }}
          >
            <h2 style={{ margin: '0 0 10px', fontSize: 18 }}>{title}</h2>
            <p style={{ margin: 0, lineHeight: 1.5 }}>{body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

const meta: Meta<typeof Overview> = {
  title: 'Docs/Overview',
  component: Overview,
  parameters: {
    docs: {
      description: {
        component:
          'A Storybook-native documentation landing page that summarizes the v1 architecture and verification surface.',
      },
    },
  },
};

export default meta;

export const Landing: StoryObj<typeof Overview> = {
  globals: { theme: 'minimal' },
};
