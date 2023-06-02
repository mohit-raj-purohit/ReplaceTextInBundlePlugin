export function replaceText(source: string, from: string, to: string): string {
	return source.replace(new RegExp(from, 'g'), to);
}

export function escapeSpecialCharacters(input: string): string {
	return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const utils = {
	replaceText,
    escapeSpecialCharacters
};

export default utils;