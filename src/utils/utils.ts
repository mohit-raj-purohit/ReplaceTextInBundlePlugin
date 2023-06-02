export function replaceText(source: string, from: string, to: string): string {
	return source.replace(new RegExp(from, 'g'), to);
}

const utils = {
	replaceText,
};

export default utils;