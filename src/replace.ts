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
	const flags = from.flags.includes('g') ? from.flags : from.flags + 'g';
	return new RegExp(from.source, flags);
}

/** Expand $$, $&, $`, $', $n and $<name> the way String.prototype.replace does. */
function expandTemplate(
	template: string,
	match: RegExpExecArray,
	source: string
): string {
	const groupCount = match.length - 1;
	return template.replace(
		/\$(\$|&|`|'|\d{1,2}|<([^>]*)>)/g,
		(whole: string, token: string, name?: string) => {
			if (token === '$') return '$';
			if (token === '&') return match[0];
			if (token === '`') return source.slice(0, match.index);
			if (token === "'") return source.slice(match.index + match[0].length);
			if (name !== undefined) {
				return match.groups && name in match.groups ? match.groups[name] ?? '' : whole;
			}
			const n = Number(token);
			if (n >= 1 && n <= groupCount) return match[n] ?? '';
			return whole;
		}
	);
}

export function findReplacements(
	source: string,
	from: string | RegExp,
	to: string | Replacer
): Replacement[] {
	const re = toGlobalRegExp(from);
	const literal = typeof from === 'string' && typeof to === 'string';
	const out: Replacement[] = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(source)) !== null) {
		if (m[0].length === 0) {
			re.lastIndex++;
			continue;
		}
		let text: string;
		if (typeof to === 'function') {
			text = to(m[0], ...m.slice(1), m.index, source, m.groups);
		} else if (literal) {
			text = to;
		} else {
			text = expandTemplate(to, m, source);
		}
		out.push({start: m.index, end: m.index + m[0].length, text});
	}
	return out;
}
