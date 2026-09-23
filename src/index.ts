import type {Compiler} from 'webpack';
import {findReplacements, Replacer as ReplacerT} from './replace';
import {normalizeOptions, assetMatches, Option as OptionT, AssetMatcher as AssetMatcherT} from './options';

const PLUGIN = 'ReplaceTextInBundlePlugin';

function describeMatcher(m: AssetMatcherT): string {
	return typeof m === 'function' ? '[function]' : String(m);
}

function errorMessage(e: unknown): string {
	return e instanceof Error ? e.message : String(e);
}

class ReplaceTextInBundlePlugin {
	private readonly options: OptionT[];

	constructor(options: OptionT | OptionT[]) {
		this.options = normalizeOptions(options);
	}

	apply(compiler: Compiler): void {
		const {Compilation, WebpackError, sources} = compiler.webpack;

		compiler.hooks.thisCompilation.tap(PLUGIN, (compilation) => {
			// Per-compilation bookkeeping so errors/warnings are reported once, after all assets exist.
			const matched = new Set<number>();
			const found = new Set<number>();

			compilation.hooks.processAssets.tap(
				{
					name: PLUGIN,
					// After minification (Terser runs at OPTIMIZE_SIZE) but before SourceMapDevToolPlugin
					// extracts .map files at DEV_TOOLING, so the updated map is what gets written.
					stage: Compilation.PROCESS_ASSETS_STAGE_DEV_TOOLING - 1,
					// Also receive assets emitted later in processAssets (e.g. html-webpack-plugin).
					additionalAssets: true,
				},
				(assets) => {
					for (const name of Object.keys(assets)) {
						this.options.forEach((option, i) => {
							try {
								if (!assetMatches(option.bundle, name)) return;
								matched.add(i);

								const asset = compilation.getAsset(name);
								if (!asset) return;
								const raw = asset.source.source();
								const isBuffer = Buffer.isBuffer(raw);
								const text = isBuffer ? raw.toString('utf8') : raw;
								const replacements = findReplacements(text, option.from, option.to);
								if (replacements.length === 0) return;
								found.add(i);

								// Offsets are UTF-16 string indices; ReplaceSource slices a Buffer-backed
								// source by byte, so re-wrap Buffers as string sources (they carry no map).
								const base = isBuffer ? new sources.RawSource(text) : asset.source;
								const next = new sources.ReplaceSource(base, PLUGIN);
								for (const r of replacements) next.replace(r.start, r.end - 1, r.text, PLUGIN);
								compilation.updateAsset(name, next);
							} catch (e) {
								compilation.errors.push(
									new WebpackError(`${PLUGIN}: options[${i}] failed on '${name}': ${errorMessage(e)}`)
								);
							}
						});
					}
				}
			);

			compilation.hooks.afterProcessAssets.tap(PLUGIN, () => {
				this.options.forEach((option, i) => {
					if (!matched.has(i)) {
						compilation.errors.push(
							new WebpackError(`${PLUGIN}: no asset matched '${describeMatcher(option.bundle)}'`)
						);
					} else if (!found.has(i)) {
						compilation.warnings.push(
							new WebpackError(`${PLUGIN}: '${String(option.from)}' was not found in any asset matching '${describeMatcher(option.bundle)}'`)
						);
					}
				});
			});
		});
	}
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace ReplaceTextInBundlePlugin {
	export type Option = OptionT;
	export type AssetMatcher = AssetMatcherT;
	export type Replacer = ReplacerT;
}

// `require()` returns the class directly; `.default` is kept for `import X from` under interop.
(ReplaceTextInBundlePlugin as any).default = ReplaceTextInBundlePlugin;

export = ReplaceTextInBundlePlugin;
