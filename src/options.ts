import type {Replacer} from './replace';

export type AssetMatcher = string | RegExp | ((name: string) => boolean);

export interface Option {
	/** Asset (output file) to modify: exact name, RegExp, or predicate. */
	bundle: AssetMatcher;
	/** Text to find. Strings match literally; RegExp matches as a pattern. */
	from: string | RegExp;
	/** Replacement text or replacer function. */
	to: string | Replacer;
}

const PREFIX = 'ReplaceTextInBundlePlugin';

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null;
}

export function normalizeOptions(input: unknown): Option[] {
	if (!isRecord(input)) {
		throw new Error(`${PREFIX}: options must be an object or array of objects`);
	}
	const list: unknown[] = Array.isArray(input) ? input : [input];
	if (list.length === 0) {
		throw new Error(`${PREFIX}: options must contain at least one replacement`);
	}
	return list.map((opt, i) => {
		if (!isRecord(opt)) {
			throw new Error(`${PREFIX}: options[${i}] must be an object`);
		}
		const {bundle, from, to} = opt;
		const bundleOk =
			(typeof bundle === 'string' && bundle.length > 0) ||
			bundle instanceof RegExp ||
			typeof bundle === 'function';
		if (!bundleOk) {
			throw new Error(`${PREFIX}: options[${i}].bundle must be a non-empty string, RegExp or function`);
		}
		const fromOk = (typeof from === 'string' && from.length > 0) || from instanceof RegExp;
		if (!fromOk) {
			throw new Error(`${PREFIX}: options[${i}].from must be a non-empty string or RegExp`);
		}
		if (typeof to !== 'string' && typeof to !== 'function') {
			throw new Error(`${PREFIX}: options[${i}].to must be a string or function`);
		}
		return {bundle, from, to} as Option;
	});
}

export function assetMatches(matcher: AssetMatcher, name: string): boolean {
	if (typeof matcher === 'string') return matcher === name;
	if (matcher instanceof RegExp) return matcher.test(name);
	return matcher(name);
}
