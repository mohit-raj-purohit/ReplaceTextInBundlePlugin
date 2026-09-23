import {describe, it, expect} from 'vitest';
import {SourceMapConsumer} from 'source-map';
import {sources, util} from 'webpack';
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
			output: {filename: '[name].[contenthash].js'},
			optimization: {realContentHash: true},
			plugins: [opt({bundle: /^main\..*\.js$/, from: '"${temp_base_url}"', to: '"X"'})],
		});
		expect(r.stats.hasErrors()).toBe(false);
		const name = r.files.find((f) => f.endsWith('.js'))!;
		const content = r.read(name);
		expect(content).toContain('"X"');
		const hash = (util.createHash('md4').update(content).digest('hex') as string).slice(0, 20);
		expect(name).toBe(`main.${hash}.js`);
	});

	it('reports a compilation error (not an exception) when no asset matches', async () => {
		const r = await build({plugins: [opt({bundle: 'missing.js', from: 'a', to: 'b'})]});
		expect(r.stats.hasErrors()).toBe(true);
		expect(r.stats.toJson().errors![0].message).toMatch(/no asset matched 'missing\.js'/);
	});

	it('warns when the text is not found', async () => {
		const r = await build({plugins: [opt({bundle: 'main.js', from: 'zzz-not-here', to: 'b'})]});
		expect(r.stats.hasErrors()).toBe(false);
		expect(r.stats.hasWarnings()).toBe(true);
		expect(r.stats.toJson().warnings![0].message).toMatch(/'zzz-not-here' was not found in any asset matching 'main\.js'/);
	});

	it('applies multiple options to the same asset in order', async () => {
		const r = await build({plugins: [opt([
			{bundle: 'main.js', from: '"${temp_base_url}"', to: 'A'},
			{bundle: 'main.js', from: 'A + "/api"', to: 'B'},
		])]});
		expect(r.read('main.js')).toContain('= B');
	});

	it('keeps source maps aligned after a length-changing replacement', async () => {
		const r = await build({
			devtool: 'source-map',
			plugins: [opt({bundle: 'main.js', from: '"${temp_base_url}"', to: '"a much longer replacement string"'})],
		});
		const map = JSON.parse(r.read('main.js.map'));
		const lines = r.read('main.js').split('\n');
		const line = lines.findIndex((l) => l.includes('other = "a much longer'));
		expect(line).toBeGreaterThan(-1);
		await SourceMapConsumer.with(map, null, (c) => {
			const pos = c.originalPositionFor({line: line + 1, column: lines[line].indexOf('other')});
			expect(pos.source).toMatch(/entry\.js$/);
			expect(pos.line).toBe(2);
		});
	});

	it('handles Buffer-backed assets', async () => {
		const inject = {
			apply(c: any) {
				c.hooks.thisCompilation.tap('t', (comp: any) =>
					comp.hooks.processAssets.tap(
						{name: 't', stage: c.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS},
						() => comp.emitAsset('bin.txt', new sources.RawSource(Buffer.from('hello ${x}')))
					)
				);
			},
		};
		const r = await build({plugins: [inject, opt({bundle: 'bin.txt', from: '${x}', to: 'world'})]});
		expect(r.stats.hasErrors()).toBe(false);
		expect(r.read('bin.txt')).toBe('hello world');
	});

	it('exposes itself as .default for CJS/ESM interop', () => {
		expect((ReplaceTextInBundlePlugin as any).default).toBe(ReplaceTextInBundlePlugin);
	});

	it('throws from the constructor on invalid options', () => {
		expect(() => opt([{bundle: 'a', from: ''}])).toThrow(/ReplaceTextInBundlePlugin/);
	});
});
