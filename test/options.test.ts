import {describe, it, expect} from 'vitest';
import {normalizeOptions, assetMatches} from '../src/options';

describe('normalizeOptions', () => {
  it('accepts an array', () => {
    expect(normalizeOptions([{bundle: 'a.js', from: 'x', to: 'y'}])).toHaveLength(1);
  });
  it('wraps a single object', () => {
    expect(normalizeOptions({bundle: 'a.js', from: 'x', to: 'y'})).toHaveLength(1);
  });
  it('rejects non-object input', () => {
    expect(() => normalizeOptions('nope')).toThrow(/ReplaceTextInBundlePlugin: options must be an object or array/);
  });
  it('rejects an empty array', () => {
    expect(() => normalizeOptions([])).toThrow(/at least one replacement/);
  });
  it('rejects empty from', () => {
    expect(() => normalizeOptions([{bundle: 'a.js', from: '', to: 'y'}])).toThrow(/options\[0\]\.from must be a non-empty string or RegExp/);
  });
  it('rejects missing to', () => {
    expect(() => normalizeOptions([{bundle: 'a.js', from: 'x'}])).toThrow(/options\[0\]\.to must be a string or function/);
  });
  it('rejects invalid bundle', () => {
    expect(() => normalizeOptions([{bundle: 42, from: 'x', to: 'y'}])).toThrow(/options\[0\]\.bundle must be a non-empty string, RegExp or function/);
  });
  it('accepts RegExp and function forms', () => {
    expect(() => normalizeOptions([{bundle: /\.js$/, from: /a/, to: () => 'b'}])).not.toThrow();
  });
});

describe('assetMatches', () => {
  it('string is exact', () => {
    expect(assetMatches('a.js', 'a.js')).toBe(true);
    expect(assetMatches('a.js', 'ba.js')).toBe(false);
  });
  it('RegExp tests the name', () => expect(assetMatches(/\.css$/, 'x.css')).toBe(true));
  it('function is called with the name', () => expect(assetMatches((n) => n.startsWith('main'), 'main.abc.js')).toBe(true));
});
