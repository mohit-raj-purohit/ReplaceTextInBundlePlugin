import {Compiler, Compilation} from 'webpack';
import {Option} from './constants';
import {
	getBundleSource,
	updateBundleSource,
	replaceText,
	escapeSpecialCharacters,
} from './utils';

class ReplaceTextInBundlePlugin {
	private options: Option[];

	constructor(options: Option[]) {
		this.options = options;
	}

	apply(compiler: Compiler): void {
		if (!Array.isArray(this.options)) {
			throw new Error(
				'ReplaceTextInBundlePlugin: Expected an array in options'
			);
		}

		compiler.hooks.emit.tap(
			'ReplaceTextInBundlePlugin',
			(compilation: Compilation) => {
				this.options.forEach(
					this.processOption.bind(this, compilation)
				);
			}
		);
	}

	private processOption(compilation: Compilation, option: Option): void {
		if (
			option.bundle === undefined ||
			option.from === undefined ||
			option.to === undefined
		) {
			throw new Error('ReplaceTextInBundlePlugin: Invalid object key');
		}

		const {bundle, from, to} = option;
		const bundleSource = getBundleSource(compilation, bundle);
		const escapedFrom = escapeSpecialCharacters(from);
		const modifiedBundleSource = replaceText(bundleSource, escapedFrom, to);
		updateBundleSource(compilation, bundle, modifiedBundleSource);
	}
}

export default ReplaceTextInBundlePlugin;
