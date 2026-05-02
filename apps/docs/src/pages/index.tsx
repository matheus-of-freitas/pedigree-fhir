import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Heading from '@theme/Heading';
import Layout from '@theme/Layout';
import type { ReactNode } from 'react';

import styles from './index.module.css';

type SiteFields = {
  storybookUrl?: string;
};

const quickLinks = [
  {
    title: 'Getting started',
    body: 'Install the packages, parse FHIR input, and render a first pedigree with your own SVG.',
    to: '/docs/getting-started',
  },
  {
    title: 'Package map',
    body: 'Understand how @pedigree/core, @pedigree/react, the demo app, and Storybook fit together.',
    to: '/docs/package-map',
  },
  {
    title: 'API reference',
    body: 'Browse the generated public API for the core and React packages.',
    to: '/docs/api',
  },
];

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const storybookUrl = (siteConfig.customFields as SiteFields | undefined)?.storybookUrl;

  return (
    <Layout
      title="Docs and playground"
      description="Guides, architecture notes, API reference, and interactive Storybook demos for pedigree-fhir."
    >
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.kicker}>Headless FHIR pedigree toolkit</div>
          <Heading as="h1" className={styles.title}>
            Parse pedigree-aware FHIR, compute layout, and render it with your own UI.
          </Heading>
          <div className={styles.subtitle}>
            Docusaurus owns the guides and API reference. Storybook stays focused on live examples,
            themed demos, and playground-style exploration.
          </div>
          <div className={styles.actions}>
            <Link className="button button--primary button--lg" to="/docs/intro">
              Read the docs
            </Link>
            <Link
              className="button button--secondary button--lg"
              href={storybookUrl ?? 'http://localhost:6006'}
            >
              Open Storybook
            </Link>
          </div>
        </div>
      </header>
      <main className={styles.main}>
        <section className={styles.grid}>
          {quickLinks.map((link) => (
            <article key={link.title} className={styles.card}>
              <Heading as="h2">{link.title}</Heading>
              <p>{link.body}</p>
              <Link to={link.to}>Open section</Link>
            </article>
          ))}
          <article className={styles.card}>
            <Heading as="h2">Playground</Heading>
            <p>
              Use Storybook to inspect primitives, editing flows, PSC semantics, validation, and the
              oncology overlay profile in a live environment.
            </p>
            <Link href={storybookUrl ?? 'http://localhost:6006'}>Launch Storybook</Link>
          </article>
        </section>
      </main>
    </Layout>
  );
}
