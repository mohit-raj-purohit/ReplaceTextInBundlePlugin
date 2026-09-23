import {describe, it, expect} from 'vitest';
import {SourceMapConsumer} from 'source-map';
import {sources} from 'webpack';
import {build} from './helpers/build';
import ReplaceTextInBundlePlugin from '../src/index';
import {findReplacements} from '../src/replace';
import {assetMatches} from '../src/options';

const opt = (o: any) => new ReplaceTextInBundlePlugin(o);
const twoEntries = {entry: {a: './entry.js', b: './plain.js'}, output: {filename: '[name].js'}};

describe('review fixes', () => {
	it('C1: external source map is updated after a length-changing replacement (production)', async () => {
		const cfg = {mode: 'production' as const, entry: './sourcemap.js', devtool: 'source-map' as const};
		const control = await build(cfg);
		const r = await build({...cfg, plugins: [opt({bundle: 'main.js', from: '"__X__"', to: '"__X__ but made thirty characters longer!"'})]});
		expect(r.stats.hasErrors()).toBe(false);
		const cols = async (b: any) => {
			const out: number[] = [];
			await SourceMapConsumer.with(JSON.parse(b.read('main.js.map')), null, (c) => c.eachMapping((m) => out.push(m.generatedColumn)));
			return out;
		};
		const before = await cols(control);
		const after = await cols(r);
		const delta = '"__X__ but made thirty characters longer!"'.length - '"__X__"'.length;
		const replacementStart = control.read('main.js').indexOf('"__X__"');
		// Segments after the replacement must shift by the length delta; a stale map would not move.
		// ReplaceSource may add a boundary segment at the replacement end, so check containment.
		expect(after).toEqual(expect.arrayContaining(before.map((c) => (c > replacementStart ? c + delta : c))));
		expect(after).not.toEqual(expect.arrayContaining(before.filter((c) => c > replacementStart)));
		expect(before.some((c) => c > replacementStart)).toBe(true);
	});

	it('C2: Buffer asset with multibyte text before the match is replaced correctly', async () => {
		const inject = {
			apply(c: any) {
				c.hooks.thisCompilation.tap('t', (comp: any) =>
					comp.hooks.processAssets.tap({name: 't', stage: c.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS}, () =>
						comp.emitAsset('bin.txt', new sources.RawSource(Buffer.from('😀é __X__ tail')))));
			},
		};
		const r = await build({plugins: [inject, opt({bundle: 'bin.txt', from: '__X__', to: 'Y'})]});
		expect(r.read('bin.txt')).toBe('😀é Y tail');
	});

	it('I1: a g-flagged bundle RegExp matches every asset', async () => {
		const r = await build({entry: {a: './entry.js', b: './entry.js', c: './entry.js'}, output: {filename: '[name].js'},
			plugins: [opt({bundle: /\.js$/g, from: '"${temp_base_url}"', to: '"X"'})]});
		for (const n of ['a.js', 'b.js', 'c.js']) expect(r.read(n)).toContain('"X"');
		expect(assetMatches(/\.js$/g, 'a.js') && assetMatches(/\.js$/g, 'a.js')).toBe(true);
		const re = /\.js$/g;
		expect(assetMatches(re, 'a.js')).toBe(true);
		expect(assetMatches(re, 'b.js')).toBe(true);
	});

	it('I2: sees assets emitted at OPTIMIZE_INLINE by plugins listed later (html-webpack-plugin case)', async () => {
		const lateEmitter = {
			apply(c: any) {
				c.hooks.thisCompilation.tap('late', (comp: any) =>
					comp.hooks.processAssets.tap({name: 'late', stage: c.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE}, () =>
						comp.emitAsset('index.html', new sources.RawSource('<a href="__BASE__/x">'))));
			},
		};
		const r = await build({plugins: [opt({bundle: 'index.html', from: '__BASE__', to: '/cdn'}), lateEmitter]});
		expect(r.stats.hasErrors()).toBe(false);
		expect(r.read('index.html')).toBe('<a href="/cdn/x">');
	});

	it('I3: a replacer returning undefined is coerced and a throwing matcher becomes a compilation error', async () => {
		expect(findReplacements('ab', 'a', (() => undefined) as any)).toEqual([{start: 0, end: 1, text: 'undefined'}]);
		const r = await build({plugins: [opt({bundle: () => { throw new Error('boom'); }, from: 'a', to: 'b'})]});
		expect(r.stats.hasErrors()).toBe(true);
		expect(r.stats.toJson().errors![0].message).toMatch(/ReplaceTextInBundlePlugin: .*boom/);
	});

	it('I4: broad matcher warns only when from is found in none of the matched assets', async () => {
		const found = await build({...twoEntries, plugins: [opt({bundle: /\.js$/, from: '"${temp_base_url}"', to: '"X"'})]});
		expect(found.stats.hasWarnings()).toBe(false);
		const none = await build({...twoEntries, plugins: [opt({bundle: /\.js$/, from: 'zzz-nope', to: '"X"'})]});
		expect(none.stats.toJson().warnings).toHaveLength(1);
	});
});
