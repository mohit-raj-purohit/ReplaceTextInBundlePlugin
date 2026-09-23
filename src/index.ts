import type {Compiler} from 'webpack';
import {findReplacements, Replacer as ReplacerT} from './replace';
import {normalizeOptions, assetMatches, Option as OptionT, AssetMatcher as AssetMatcherT} from './options';

const PLUGIN = 'ReplaceTextInBundlePlugin';

function describeMatcher(m: AssetMatcherT): string {
	return typeof m === 'function' ? '[function]' : String(m);
}

class ReplaceTextInBundlePlugin {
	private readonly options: OptionT[];

	constructor(options: OptionT | OptionT[]) {
		this.options = normalizeOptions(options);
	}

	apply(compiler: Compiler): void {
		const {Compilation, WebpackError, sources} = compiler.webpack;

		compiler.hooks.thisCompilation.tap(PLUGIN, (compilation) => {
			compilation.hooks.processAssets.tap(
				{name: PLUGIN, stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE},
				() => {
					for (const option of this.options) {
						const targets = compilation
							.getAssets()
							.filter((a) => assetMatches(option.bundle, a.name));

						if (targets.length === 0) {
							compilation.errors.push(
								new WebpackError(`${PLUGIN}: no asset matched '${describeMatcher(option.bundle)}'`)
							);
							continue;
						}

						for (const asset of targets) {
							const raw = asset.source.source();
							const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : raw;
							const replacements = findReplacements(text, option.from, option.to);

							if (replacements.length === 0) {
								compilation.warnings.push(
									new WebpackError(`${PLUGIN}: '${String(option.from)}' was not found in '${asset.name}'`)
								);
								continue;
							}

							// ReplaceSource preserves the original source map; its end index is inclusive.
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

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace ReplaceTextInBundlePlugin {
	export type Option = OptionT;
	export type AssetMatcher = AssetMatcherT;
	export type Replacer = ReplacerT;
}

// `require()` returns the class directly; `.default` is kept for `import X from` under interop.
(ReplaceTextInBundlePlugin as any).default = ReplaceTextInBundlePlugin;

export = ReplaceTextInBundlePlugin;
