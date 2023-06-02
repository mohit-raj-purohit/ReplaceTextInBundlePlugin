import {Compilation, sources} from 'webpack';

export function getBundleSource(
	compilation: Compilation,
	bundle: string
): string {
	const asset = compilation.assets[bundle];
	if (!asset) {
		throw new Error(
			`ReplaceTextInBundlePlugin: Bundle '${bundle}' not found`
		);
	}
	return asset.source();
}

export function updateBundleSource(
	compilation: Compilation,
	bundle: string,
	source: string
): void {
	compilation.assets[bundle] = new sources.RawSource(source);
}

const bundleUtils = {
	getBundleSource,
	updateBundleSource,
};

export default bundleUtils;
