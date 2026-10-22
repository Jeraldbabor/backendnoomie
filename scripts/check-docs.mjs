// Keeps docs/ in sync with the API. Run with `npm run docs:check`.
//
//   1. Every route in src/features/**/*.controller.ts is in the docs/README.md endpoint table
//      and has a detailed entry in docs/api/*.md, and the docs list no routes that are gone.
//   2. Every relative link and #anchor in README.md and docs/ resolves.
//   3. With `--since <git ref>`: if API code changed since that ref, docs/CHANGELOG.md changed
//      too. A commit message containing [no-docs] skips this for internal-only changes.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const walk = (dir, ext) =>
  fs
    .readdirSync(path.join(root, dir), { withFileTypes: true })
    .flatMap((entry) => {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(rel, ext);
      return entry.name.endsWith(ext) ? [rel.split(path.sep).join('/')] : [];
    });
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// --- 1. Routes in code vs. routes in docs -----------------------------------------------

const setup = read('src/app.setup.ts');
const globalPrefix = setup.match(/setGlobalPrefix\(\s*'([^']*)'/)?.[1] ?? '';
const defaultVersion = setup.match(/defaultVersion:\s*'([^']*)'/)?.[1];

function routesInCode() {
  const routes = [];
  for (const file of walk('src/features', '.controller.ts')) {
    const source = read(file);
    const controller =
      source.match(/@Controller\(\s*'([^']*)'\s*\)/) ??
      source.match(/@Controller\(\s*\{[^}]*path:\s*'([^']*)'[^}]*\}\s*\)/);
    if (!controller) {
      errors.push(
        `${file}: can't read the @Controller path; update scripts/check-docs.mjs`,
      );
      continue;
    }
    const versioned =
      !/version:\s*VERSION_NEUTRAL/.test(controller[0]) && defaultVersion;
    const prefix = [
      '',
      globalPrefix,
      versioned ? `v${defaultVersion}` : '',
      controller[1],
    ]
      .filter((part, index) => index === 0 || part)
      .join('/');
    for (const [, method, sub] of source.matchAll(
      /@(Get|Post|Put|Patch|Delete)\(\s*(?:'([^']*)')?\s*\)/g,
    )) {
      routes.push(
        `${method.toUpperCase()} ${sub ? `${prefix}/${sub}` : prefix}`,
      );
    }
  }
  return routes;
}

const codeRoutes = routesInCode();
const indexRoutes = [
  ...read('docs/README.md').matchAll(
    /^\|\s*(GET|POST|PUT|PATCH|DELETE)\s*\|\s*`([^`]+)`/gm,
  ),
].map(([, method, route]) => `${method} ${route}`);
const apiPages = walk('docs/api', '.md').filter(
  (file) => !file.endsWith('_template.md'),
);
const apiLines = apiPages.flatMap((file) => read(file).split('\n'));

for (const route of codeRoutes) {
  const [method, url] = route.split(' ');
  if (!indexRoutes.includes(route)) {
    errors.push(`${route} is not in the endpoint table in docs/README.md`);
  }
  const mentioned = new RegExp(`${escape(url)}(?![\\w/:-])`);
  if (!apiLines.some((line) => line.includes(method) && mentioned.test(line))) {
    errors.push(
      `${route} has no entry in docs/api/ (copy docs/api/_template.md for a new feature)`,
    );
  }
}
for (const route of indexRoutes) {
  if (!codeRoutes.includes(route)) {
    errors.push(
      `docs/README.md lists ${route}, but no controller has that route`,
    );
  }
}

// --- 2. Links and anchors -----------------------------------------------------------------

const slug = (heading) =>
  heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .trim()
    .replace(/\s/g, '-');
let linkCount = 0;
for (const file of ['README.md', ...walk('docs', '.md')]) {
  const text = read(file).replace(/```[\s\S]*?```/g, '');
  for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^[a-z]+:/i.test(target)) continue;
    linkCount += 1;
    const [targetPath, anchor] = target.split('#');
    const resolved = targetPath
      ? path.join(path.dirname(file), targetPath).split(path.sep).join('/')
      : file;
    if (!fs.existsSync(path.join(root, resolved))) {
      errors.push(`${file}: broken link ${target}`);
      continue;
    }
    if (anchor) {
      const headings = (read(resolved).match(/^#+ .+$/gm) ?? []).map((line) =>
        slug(line.replace(/^#+ /, '')),
      );
      if (!headings.includes(anchor))
        errors.push(`${file}: no heading for #${anchor} in ${resolved}`);
    }
  }
}

// --- 3. API changes need a changelog entry -------------------------------------------------

const sinceIndex = process.argv.indexOf('--since');
const sinceRef = sinceIndex === -1 ? undefined : process.argv[sinceIndex + 1];
const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const affectsApi = (file) =>
  (/^src\/(features|common|config)\//.test(file) &&
    !file.endsWith('.spec.ts')) ||
  file === 'src/app.setup.ts' ||
  file === 'prisma/schema.prisma' ||
  file.startsWith('prisma/migrations/');

if (sinceRef && !/^0+$/.test(sinceRef)) {
  let base;
  try {
    base = git('merge-base', sinceRef, 'HEAD');
  } catch {
    console.log(
      `Skipping the changelog check: can't compare with "${sinceRef}".`,
    );
  }
  if (base) {
    const changed = new Set([
      ...git('diff', '--name-only', base).split('\n'),
      ...git('ls-files', '--others', '--exclude-standard').split('\n'),
    ]);
    const apiFiles = [...changed].filter(affectsApi);
    const skipped = git('log', '--format=%B', `${base}..HEAD`).includes(
      '[no-docs]',
    );
    if (apiFiles.length > 0 && !changed.has('docs/CHANGELOG.md') && !skipped) {
      errors.push(
        `API code changed (${apiFiles.slice(0, 3).join(', ')}${apiFiles.length > 3 ? ', …' : ''}) ` +
          'but docs/CHANGELOG.md did not. Add a dated entry and update docs/api/. ' +
          'For internal-only changes, put [no-docs] in a commit message.',
      );
    }
  }
}

if (errors.length > 0) {
  console.error(
    `Docs are out of date:\n${errors.map((error) => `  - ${error}`).join('\n')}`,
  );
  process.exit(1);
}
console.log(
  `Docs OK: ${codeRoutes.length} routes documented, ${linkCount} links resolve` +
    (sinceRef ? ', changelog check passed.' : '.'),
);
