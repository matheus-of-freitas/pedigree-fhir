import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';
import { themes as prismThemes } from 'prism-react-renderer';

const repoUrl = 'https://github.com/matheus-of-freitas/pedigree';
const docsiteUrl = process.env.DOCSITE_URL ?? 'https://pedigree-fhir.example.com';
const docsiteBaseUrl = process.env.DOCSITE_BASE_URL ?? '/';
const storybookUrl = process.env.STORYBOOK_URL ?? 'http://localhost:6006';

const config: Config = {
  title: 'pedigree-fhir',
  tagline: 'Headless pedigree docs, API reference, and playground examples.',
  favicon: 'img/favicon.ico',
  future: {
    v4: true,
  },
  url: docsiteUrl,
  baseUrl: docsiteBaseUrl,
  organizationName: 'matheus-of-freitas',
  projectName: 'pedigree',
  onBrokenLinks: 'throw',
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  customFields: {
    repoUrl,
    storybookUrl,
  },
  presets: [
    [
      'classic',
      {
        docs: {
          path: '../../docs',
          routeBasePath: 'docs',
          sidebarPath: './sidebars.ts',
          numberPrefixParser: false,
          editUrl: `${repoUrl}/tree/main/`,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  plugins: [
    [
      'docusaurus-plugin-typedoc',
      {
        entryPoints: ['../../packages/core/src/index.ts', '../../packages/react/src/index.ts'],
        tsconfig: '../../tsconfig.docs.json',
        out: '../../docs/api',
        readme: 'none',
        excludePrivate: true,
        excludeProtected: true,
        excludeInternal: true,
        sidebar: {
          autoConfiguration: false,
        },
      },
    ],
  ],
  themes: ['@docusaurus/theme-mermaid'],
  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'pedigree-fhir',
      logo: {
        alt: 'pedigree-fhir',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/docs/api',
          label: 'API',
          position: 'left',
        },
        {
          to: '/docs/playground',
          label: 'Playground',
          position: 'left',
        },
        {
          href: storybookUrl,
          label: 'Storybook',
          position: 'right',
        },
        {
          href: repoUrl,
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Introduction',
              to: '/docs/intro',
            },
            {
              label: 'Getting started',
              to: '/docs/getting-started',
            },
            {
              label: 'API reference',
              to: '/docs/api',
            },
          ],
        },
        {
          title: 'Explore',
          items: [
            {
              label: 'Playground guide',
              to: '/docs/playground',
            },
            {
              label: 'Storybook',
              href: storybookUrl,
            },
          ],
        },
        {
          title: 'Project',
          items: [
            {
              label: 'GitHub',
              href: repoUrl,
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} pedigree-fhir.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
