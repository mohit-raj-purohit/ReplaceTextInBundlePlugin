# ReplaceTextInBundlePlugin v2 Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every defect from the 2026-09-23 review: broken CJS interop, wrong webpack hook, unsafe replacement, Buffer crash, fatal errors in watch mode, lost source maps, exact-name-only asset targeting, and packaging/repo hygiene.

**Architecture:** Rewrite the plugin as a plain CommonJS TypeScript package built by `tsc` (no rollup). The plugin validates options in its constructor, registers on `thisCompilation` → `processAssets` at `PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE`, matches assets by string/RegExp/function, and rewrites them with `ReplaceSource` so source maps and content hashes stay correct. Failures become `compilation.errors`/`warnings` instead of thrown exceptions.

**Tech Stack:** TypeScript 5, webpack 5 (peer dep), vitest + memfs for tests, GitHub Actions for CI.

**Spec:** The review delivered in chat on 2026-09-23 (issues 1–21). Summarised in Global Constraints below.

## Global Constraints

- Node `>=14`, webpack peer range `^5.0.0`. No runtime dependencies.
- Public API: `new ReplaceTextInBundlePlugin(options: Option | Option[])` where `Option = { bundle: string | RegExp | ((name: string) => boolean); from: string | RegExp; to: string | ((substring: string, ...args: any[]) => string) }`. Existing `{bundle, from, to}` string configs must keep working unchanged.
- Must work with `require('replace-text-in-bundle-plugin')` (class directly), `require(...).default`, and `import X from '...'`.
- Ship `.d.ts`. `dist/` is not committed.
- Never throw inside webpack hooks. Constructor may throw on invalid options.
- Only `.js` files under `dist/` are published (`files: ["dist"]`).

## Review Focus

1. `from` string containing regex metacharacters (`"${x}"`, `a.b`, `(y)`) must match literally. → Task 2 unit test.
2. `to` containing `$&`, `$$`, `$1` must be inserted literally when `from` is a string. → Task 2 unit test.
3. Asset whose `source()` returns a `Buffer` must be handled as UTF-8 text. → Task 4 integration test.
4. Option whose `bundle` matches no asset must produce a compilation error, not kill the process. → Task 4 integration test.
5. Two options targeting the same asset must both apply, in order. → Task 4 integration test.

---

### Task 1: Toolchain reset (tsc build, vitest, package.json, hygiene)

**Files:**
- Modify: `package.json`
- Create: `tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`, `LICENSE`, `.github/workflows/ci.yml`
- Modify: `.gitignore`
- Delete: `yarn.lock`, `dist/**` (from git)

**Interfaces:**
- Produces: `npm test`, `npm run build`, `npm run typecheck` commands used by every later task.

- [ ] **Step 1: Remove tracked build output and yarn lockfile**

```bash
git rm -r --cached dist && git rm yarn.lock
```

- [ ] **Step 2: Write `.gitignore`**

```
node_modules/
dist/
coverage/
.DS_Store
*.log
.env
```

- [ ] **Step 3: Write `package.json`**

```json
{
  "name": "replace-text-in-bundle-plugin",
  "version": "2.0.0",
  "description": "A webpack 5 plugin for replacing text patterns in emitted assets during the build, preserving source maps and content hashes.",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "engines": { "node": ">=14" },
  "sideEffects": false,
  "repository": {
    "type": "git",
    "url": "https://github.com/mohit-raj-purohit/ReplaceTextInBundlePlugin"
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "prepublishOnly": "npm run typecheck && npm test && npm run build"
  },
  "keywords": ["webpack", "webpack-plugin", "replace", "string", "placeholder", "text replacement", "bundle", "processAssets"],
  "author": "Mohit Raj Purohit",
  "license": "MIT",
  "peerDependencies": { "webpack": "^5.0.0" },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "memfs": "^4.0.0",
    "typescript": "^5.0.0",
    "vitest": "^2.0.0",
    "webpack": "^5.90.0"
  }
}
```

- [ ] **Step 4: Write `tsconfig.json` and `tsconfig.build.json`**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2019",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src"]
}
```

`tsconfig.build.json`:
```json
{ "extends": "./tsconfig.json", "exclude": ["**/*.test.ts", "test"] }
```

- [ ] **Step 5: Write `vitest.config.ts`**

```ts
import {defineConfig} from 'vitest/config';
export default defineConfig({test: {include: ['test/**/*.test.ts']}});
```

- [ ] **Step 6: Write `LICENSE` (MIT, author Mohit Raj Purohit, year 2023-2026)**

- [ ] **Step 7: Write `.github/workflows/ci.yml`**

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "${{ matrix.node }}", cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

- [ ] **Step 8: Install and verify**

Run: `rm -rf node_modules package-lock.json && npm install && npx tsc -p tsconfig.json --noEmit`
Expected: install succeeds; typecheck reports the existing `string | Buffer` error in `src/utils/bundleUtils.ts` (proves type checking now works). That error is fixed in Task 3.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "chore: replace rollup-scripts with tsc, add vitest, fix packaging and gitignore"
```

---

### Task 2: Pure replacement helper (`src/replace.ts`)

**Files:**
- Create: `src/replace.ts`
- Test: `test/replace.test.ts`
- Delete: `src/utils/utils.ts`, `src/utils/index.ts`, `src/utils/bundleUtils.ts`, `src/constants/**` (deleted in Task 3 when index.ts stops importing them)

**Interfaces:**
- Produces:
  ```ts
  export interface Replacement { start: number; end: number; text: string } // end exclusive
  export function findReplacements(source: string, from: string | RegExp, to: string | ((substring: string, ...args: any[]) => string)): Replacement[];
  ```

- [ ] **Step 1: Write failing tests**

`test/replace.test.ts`:
```ts
import {describe, it, expect} from 'vitest';
import {findReplacements} from '../src/replace';

describe('findReplacements', () => {
  it('matches a literal string with regex metacharacters', () => {
    expect(findReplacements('a="${x}";', '"${x}"', 'y')).toEqual([{start: 2, end: 8, text: 'y'}]);
  });
  it('finds every occurrence', () => {
    expect(findReplacements('ab ab', 'ab', 'c')).toEqual([{start: 0, end: 2, text: 'c'}, {start: 3, end: 5, text: 'c'}]);
  });
  it('inserts $ patterns literally for string from', () => {
    expect(findReplacements('x', 'x', 'cost: $& $$ $1')).toEqual([{start: 0, end: 1, text: 'cost: $& $$ $1'}]);
  });
  it('supports RegExp from with capture groups via function to', () => {
    expect(findReplacements('v1 v22', /v(\d+)/g, (_m, d) => `n${d}`)).toEqual([{start: 0, end: 2, text: 'n1'}, {start: 3, end: 6, text: 'n22'}]);
  });
  it('supports RegExp from with string to and expands $1', () => {
    expect(findReplacements('v1', /v(\d+)/, '$1!')).toEqual([{start: 0, end: 2, text: '1!'}]);
  });
  it('adds the global flag to a non-global RegExp', () => {
    expect(findReplacements('aa', /a/, 'b')).toHaveLength(2);
  });
  it('returns empty array when nothing matches', () => {
    expect(findReplacements('abc', 'z', 'y')).toEqual([]);
  });
  it('calls function to with substring for string from', () => {
    expect(findReplacements('abc', 'b', (m) => m.toUpperCase())).toEqual([{start: 1, end: 2, text: 'B'}]);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run test/replace.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement `src/replace.ts`**

```ts
export type Replacer = (substring: string, ...args: any[]) => string;

export interface Replacement {
  start: number;
  /** exclusive */
  end: number;
  text: string;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toGlobalRegExp(from: string | RegExp): RegExp {
  if (typeof from === 'string') return new RegExp(escapeRegExp(from), 'g');
  return from.global ? new RegExp(from.source, from.flags) : new RegExp(from.source, from.flags + 'g');
}

/** Expand $&, $$, $`, $', $n, $<name> the way String.prototype.replace does. */
function expandTemplate(template: string, match: RegExpExecArray, source: string): string {
  // Delegate to the engine: replace the matched substring only.
  const groupsCount = match.length - 1;
  return match[0].replace(
    new RegExp('^[\\s\\S]*$'),
    () => template.replace(/\$([$&`']|\d{1,2}|<([^>]+)>)/g, (whole, token: string, name?: string) => {
      if (token === '$') return '$';
      if (token === '&') return match[0];
      if (token === '`') return source.slice(0, match.index);
      if (token === "'") return source.slice(match.index + match[0].length);
      if (name !== undefined) return match.groups?.[name] ?? whole;
      const n = Number(token);
      if (n >= 1 && n <= groupsCount) return match[n] ?? '';
      return whole;
    })
  );
}

export function findReplacements(source: string, from: string | RegExp, to: string | Replacer): Replacement[] {
  const re = toGlobalRegExp(from);
  const literalTo = typeof from === 'string' && typeof to === 'string';
  const out: Replacement[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    if (m[0].length === 0) { re.lastIndex++; continue; }
    let text: string;
    if (typeof to === 'function') text = to(m[0], ...m.slice(1), m.index, source, m.groups);
    else if (literalTo) text = to;
    else text = expandTemplate(to, m, source);
    out.push({start: m.index, end: m.index + m[0].length, text});
  }
  return out;
}
```

- [ ] **Step 4: Run** `npx vitest run test/replace.test.ts` → PASS.

- [ ] **Step 5: Commit** `git add src/replace.ts test/replace.test.ts && git commit -m "feat: pure replacement helper with literal string and RegExp support"`

---

### Task 3: Option validation (`src/options.ts`)

**Files:**
- Create: `src/options.ts`
- Test: `test/options.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type AssetMatcher = string | RegExp | ((name: string) => boolean);
  export interface Option { bundle: AssetMatcher; from: string | RegExp; to: string | Replacer }
  export function normalizeOptions(input: unknown): Option[]; // throws Error with plugin prefix
  export function assetMatches(matcher: AssetMatcher, name: string): boolean;
  ```

- [ ] **Step 1: Write failing tests**

`test/options.test.ts`:
```ts
import {describe, it, expect} from 'vitest';
import {normalizeOptions, assetMatches} from '../src/options';

describe('normalizeOptions', () => {
  it('accepts an array', () => {
    expect(normalizeOptions([{bundle: 'a.js', from: 'x', to: 'y'}])).toHaveLength(1);
  });
  it('wraps a single object', () => {
    expect(normalizeOptions({bundle: 'a.js', from: 'x', to: 'y'})).toHaveLength(1);
  });
  it('rejects non-object input', () => {
    expect(() => normalizeOptions('nope')).toThrow(/ReplaceTextInBundlePlugin: options must be an object or array/);
  });
  it('rejects empty from', () => {
    expect(() => normalizeOptions([{bundle: 'a.js', from: '', to: 'y'}])).toThrow(/options\[0\]\.from must be a non-empty string or RegExp/);
  });
  it('rejects missing to', () => {
    expect(() => normalizeOptions([{bundle: 'a.js', from: 'x'}])).toThrow(/options\[0\]\.to must be a string or function/);
  });
  it('rejects invalid bundle', () => {
    expect(() => normalizeOptions([{bundle: 42, from: 'x', to: 'y'}])).toThrow(/options\[0\]\.bundle must be a non-empty string, RegExp or function/);
  });
  it('accepts RegExp and function forms', () => {
    expect(() => normalizeOptions([{bundle: /\.js$/, from: /a/, to: () => 'b'}])).not.toThrow();
  });
});

describe('assetMatches', () => {
  it('string is exact', () => { expect(assetMatches('a.js', 'a.js')).toBe(true); expect(assetMatches('a.js', 'ba.js')).toBe(false); });
  it('RegExp tests', () => expect(assetMatches(/\.css$/, 'x.css')).toBe(true));
  it('function is called', () => expect(assetMatches((n) => n.startsWith('main'), 'main.abc.js')).toBe(true));
});
```

- [ ] **Step 2: Run** `npx vitest run test/options.test.ts` → FAIL.

- [ ] **Step 3: Implement `src/options.ts`**

```ts
import type {Replacer} from './replace';

export type AssetMatcher = string | RegExp | ((name: string) => boolean);

export interface Option {
  bundle: AssetMatcher;
  from: string | RegExp;
  to: string | Replacer;
}

const PREFIX = 'ReplaceTextInBundlePlugin';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function normalizeOptions(input: unknown): Option[] {
  const list = Array.isArray(input) ? input : [input];
  if (!isRecord(input)) throw new Error(`${PREFIX}: options must be an object or array of objects`);
  return list.map((opt, i) => {
    if (!isRecord(opt)) throw new Error(`${PREFIX}: options[${i}] must be an object`);
    const {bundle, from, to} = opt;
    const bundleOk = (typeof bundle === 'string' && bundle.length > 0) || bundle instanceof RegExp || typeof bundle === 'function';
    if (!bundleOk) throw new Error(`${PREFIX}: options[${i}].bundle must be a non-empty string, RegExp or function`);
    const fromOk = (typeof from === 'string' && from.length > 0) || from instanceof RegExp;
    if (!fromOk) throw new Error(`${PREFIX}: options[${i}].from must be a non-empty string or RegExp`);
    if (typeof to !== 'string' && typeof to !== 'function') throw new Error(`${PREFIX}: options[${i}].to must be a string or function`);
    return {bundle, from, to} as Option;
  });
}

export function assetMatches(matcher: AssetMatcher, name: string): boolean {
  if (typeof matcher === 'string') return matcher === name;
  if (matcher instanceof RegExp) return matcher.test(name);
  return matcher(name);
}
```

- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `git add src/options.ts test/options.test.ts && git commit -m "feat: constructor-time option validation and asset matchers"`

---

### Task 4: Plugin rewrite on processAssets (`src/index.ts`) with integration tests

**Files:**
- Rewrite: `src/index.ts`
- Delete: `src/utils/`, `src/constants/`
- Test: `test/plugin.test.ts`, `test/fixtures/entry.js`, `test/fixtures/style.css`, `test/helpers/build.ts`

**Interfaces:**
- Consumes: `findReplacements`, `normalizeOptions`, `assetMatches`, `Option`.
- Produces: `export = ReplaceTextInBundlePlugin` with merged namespace exporting `Option`, `AssetMatcher`, `Replacer` types. `module.exports.default` also set.

- [ ] **Step 1: Write test helper `test/helpers/build.ts`**

```ts
import webpack, {Configuration, Stats} from 'webpack';
import {createFsFromVolume, Volume} from 'memfs';
import path from 'path';

export interface BuildResult { stats: Stats; read: (name: string) => string; files: string[] }

export function build(config: Configuration): Promise<BuildResult> {
  const fs = createFsFromVolume(new Volume());
  const outDir = '/out';
  const compiler = webpack({
    mode: 'none',
    context: path.resolve(__dirname, '../fixtures'),
    entry: './entry.js',
    output: {path: outDir, filename: 'main.js'},
    ...config,
  });
  compiler.outputFileSystem = fs as any;
  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err || !stats) return reject(err);
      compiler.close(() => {
        const files = fs.readdirSync(outDir) as string[];
        resolve({stats, files, read: (n) => fs.readFileSync(path.join(outDir, n), 'utf8') as string});
      });
    });
  });
}
```

Fixture `test/fixtures/entry.js`:
```js
export const url = "${temp_base_url}" + "/api";
export const other = "${temp_base_url}";
```

- [ ] **Step 2: Write failing tests `test/plugin.test.ts`**

```ts
import {describe, it, expect} from 'vitest';
import {build} from './helpers/build';
import ReplaceTextInBundlePlugin from '../src/index';

const opt = (o: any) => new ReplaceTextInBundlePlugin(o);

describe('ReplaceTextInBundlePlugin', () => {
  it('replaces literal text in a named asset (v1 compatible config)', async () => {
    const r = await build({plugins: [opt([{bundle: 'main.js', from: '"${temp_base_url}"', to: 'window.base'}])]});
    expect(r.stats.hasErrors()).toBe(false);
    expect(r.read('main.js')).toContain('window.base + "/api"');
    expect(r.read('main.js')).not.toContain('${temp_base_url}');
  });

  it('inserts $ sequences literally', async () => {
    const r = await build({plugins: [opt({bundle: 'main.js', from: '"${temp_base_url}"', to: '"$$ $& $1"'})]});
    expect(r.read('main.js')).toContain('"$$ $& $1" + "/api"');
  });

  it('matches hashed filenames with a RegExp bundle and keeps contenthash consistent', async () => {
    const r = await build({
      output: {path: '/out', filename: '[name].[contenthash].js'},
      optimization: {realContentHash: true},
      plugins: [opt({bundle: /^main\..*\.js$/, from: '"${temp_base_url}"', to: '"X"'})],
    });
    const name = r.files.find((f) => f.endsWith('.js'))!;
    const content = r.read(name);
    expect(content).toContain('"X"');
    const {createHash} = await import('crypto');
    const hash = createHash('md4').update(content).digest('hex').slice(0, 20);
    expect(name).toBe(`main.${hash}.js`);
  });

  it('reports a compilation error (not an exception) when no asset matches', async () => {
    const r = await build({plugins: [opt({bundle: 'missing.js', from: 'a', to: 'b'})]});
    expect(r.stats.hasErrors()).toBe(true);
    expect(r.stats.toJson().errors![0].message).toMatch(/no asset matched 'missing\.js'/);
  });

  it('warns when the text is not found', async () => {
    const r = await build({plugins: [opt({bundle: 'main.js', from: 'zzz-not-here', to: 'b'})]});
    expect(r.stats.hasWarnings()).toBe(true);
    expect(r.stats.toJson().warnings![0].message).toMatch(/'zzz-not-here' was not found in 'main\.js'/);
  });

  it('applies multiple options to the same asset in order', async () => {
    const r = await build({plugins: [opt([
      {bundle: 'main.js', from: '"${temp_base_url}"', to: 'A'},
      {bundle: 'main.js', from: 'A + "/api"', to: 'B'},
    ])]});
    expect(r.read('main.js')).toContain('B');
  });

  it('keeps source maps aligned', async () => {
    const r = await build({devtool: 'source-map', plugins: [opt({bundle: 'main.js', from: '"${temp_base_url}"', to: '"a much longer replacement string"'})]});
    const {SourceMapConsumer} = await import('source-map');
    const map = JSON.parse(r.read('main.js.map'));
    const js = r.read('main.js');
    const line = js.split('\n').findIndex((l) => l.includes('other = "a much longer'));
    await SourceMapConsumer.with(map, null, (c) => {
      const pos = c.originalPositionFor({line: line + 1, column: js.split('\n')[line].indexOf('other')});
      expect(pos.source).toMatch(/entry\.js$/);
      expect(pos.line).toBe(2);
    });
  });

  it('handles Buffer-backed assets', async () => {
    const {sources} = await import('webpack');
    const inject = {apply(c: any) { c.hooks.thisCompilation.tap('t', (comp: any) => comp.hooks.processAssets.tap({name: 't', stage: c.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS}, () => comp.emitAsset('bin.txt', new sources.RawSource(Buffer.from('hello ${x}'))))); }};
    const r = await build({plugins: [inject, opt({bundle: 'bin.txt', from: '${x}', to: 'world'})]});
    expect(r.stats.hasErrors()).toBe(false);
    expect(r.read('bin.txt')).toBe('hello world');
  });

  it('works via require() without .default', () => {
    const P = require('../src/index');
    expect(typeof P).toBe('function');
    expect(P.default).toBe(P);
  });

  it('throws from the constructor on invalid options', () => {
    expect(() => opt([{bundle: 'a', from: ''}])).toThrow(/ReplaceTextInBundlePlugin/);
  });
});
```

Add `source-map` to devDependencies: `npm i -D source-map`.

- [ ] **Step 3: Run** `npx vitest run test/plugin.test.ts` → FAIL.

- [ ] **Step 4: Rewrite `src/index.ts`; delete `src/utils` and `src/constants`**

```ts
import type {Compiler, Compilation} from 'webpack';
import {findReplacements, Replacer} from './replace';
import {normalizeOptions, assetMatches, Option, AssetMatcher} from './options';

const PLUGIN = 'ReplaceTextInBundlePlugin';

function describe(m: AssetMatcher): string {
  return typeof m === 'function' ? '[function]' : String(m);
}

class ReplaceTextInBundlePlugin {
  private readonly options: Option[];

  constructor(options: Option | Option[]) {
    this.options = normalizeOptions(options);
  }

  apply(compiler: Compiler): void {
    const {Compilation, WebpackError, sources} = compiler.webpack;
    compiler.hooks.thisCompilation.tap(PLUGIN, (compilation) => {
      compilation.hooks.processAssets.tap(
        {name: PLUGIN, stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE},
        () => {
          for (const option of this.options) {
            const targets = compilation.getAssets().filter((a) => assetMatches(option.bundle, a.name));
            if (targets.length === 0) {
              compilation.errors.push(new WebpackError(`${PLUGIN}: no asset matched '${describe(option.bundle)}'`));
              continue;
            }
            for (const asset of targets) {
              const raw = asset.source.source();
              const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : raw;
              const replacements = findReplacements(text, option.from, option.to);
              if (replacements.length === 0) {
                compilation.warnings.push(new WebpackError(`${PLUGIN}: '${String(option.from)}' was not found in '${asset.name}'`));
                continue;
              }
              const next = new sources.ReplaceSource(asset.source, PLUGIN);
              for (const r of replacements) next.replace(r.start, r.end - 1, r.text, PLUGIN);
              compilation.updateAsset(asset.name, next);
            }
          }
        }
      );
    });
  }
}

namespace ReplaceTextInBundlePlugin {
  export type {Option, AssetMatcher, Replacer};
}

// Make `require()` return the class directly while also supporting `.default`.
(ReplaceTextInBundlePlugin as any).default = ReplaceTextInBundlePlugin;

export = ReplaceTextInBundlePlugin;
```

Note: `ReplaceSource.replace(start, end, text)` takes an **inclusive** end, hence `r.end - 1`. Buffer sources: `ReplaceSource` over a Buffer-backed `RawSource` converts to string internally, so offsets computed on the UTF-8 string are correct.

- [ ] **Step 5: Run all** `npm run typecheck && npx vitest run` → PASS. If the source-map test fails because `mode: 'none'` line numbers differ, adjust only the expected `pos.line` after inspecting the fixture; do not weaken the `source` assertion.

- [ ] **Step 6: Commit** `git add -A && git commit -m "feat!: rewrite on processAssets with ReplaceSource, matcher assets, non-fatal errors, CJS interop"`

---

### Task 5: README, changelog, build verification

**Files:**
- Rewrite: `README.md`
- Create: `CHANGELOG.md`

- [ ] **Step 1: Rewrite README** covering: install; CJS + ESM + TS usage (`require(...)` returns the class directly); option table (`bundle` string/RegExp/function, `from` string/RegExp, `to` string/function, `$` sequences are literal for string `from`, expanded for RegExp `from`); hashed filenames example with `/^main\..*\.js$/`; behaviour notes (runs in `processAssets` before content hashing so `[contenthash]` is correct; source maps preserved; missing asset → compilation error; no match → warning); migration from v1 (drop `.default`, empty `from` now rejected).

- [ ] **Step 2: Write `CHANGELOG.md`** with a `2.0.0` entry listing breaking changes: `require()` shape, errors are now compilation errors, empty `from` rejected, `webpack` is a peerDependency, Node >=14.

- [ ] **Step 3: Verify the published shape**

```bash
npm run build && node -e "const P=require('./dist/index.js'); console.log(typeof P, P.default===P)" && ls dist && npm pack --dry-run
```
Expected: `function true`; `dist` contains `index.js`, `index.d.ts`, `options.*`, `replace.*`; pack lists only `dist/`, `package.json`, `README.md`, `LICENSE`, `CHANGELOG.md`.

- [ ] **Step 4: Commit** `git add -A && git commit -m "docs: v2 README and changelog"`
