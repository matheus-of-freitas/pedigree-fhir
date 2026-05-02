import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagesDir = path.join(repoRoot, 'dist', 'pages');
const docsBuildDir = path.join(repoRoot, 'apps', 'docs', 'build');
const storybookBuildDir = path.join(repoRoot, 'apps', 'storybook', 'storybook-static');

const run = (command, env = process.env) => {
  execSync(command, {
    cwd: repoRoot,
    env,
    stdio: 'inherit',
  });
};

rmSync(pagesDir, { recursive: true, force: true });

run('pnpm -F @pedigree/docs build');
run('pnpm -F @pedigree/storybook build');

mkdirSync(pagesDir, { recursive: true });
cpSync(docsBuildDir, pagesDir, { recursive: true });

if (!existsSync(storybookBuildDir)) {
  throw new Error(`Expected Storybook build output at ${storybookBuildDir}`);
}

cpSync(storybookBuildDir, path.join(pagesDir, 'storybook'), { recursive: true });
