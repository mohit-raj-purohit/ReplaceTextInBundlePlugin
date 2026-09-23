import {describe, it, expect} from 'vitest';
import {findReplacements} from '../src/replace';

describe('findReplacements', () => {
  it('matches a literal string with regex metacharacters', () => {
    expect(findReplacements('a="${x}";', '"${x}"', 'y')).toEqual([{start: 2, end: 8, text: 'y'}]);
  });
  it('finds every occurrence', () => {
    expect(findReplacements('ab ab', 'ab', 'c')).toEqual([{start: 0, end: 2, text: 'c'}, {start: 3, end: 5, text: 'c'}]);
  });
  it('inserts $ patterns literally for string from', () => {
    expect(findReplacements('x', 'x', 'cost: $& $$ $1')).toEqual([{start: 0, end: 1, text: 'cost: $& $$ $1'}]);
  });
  it('supports RegExp from with capture groups via function to', () => {
    expect(findReplacements('v1 v22', /v(\d+)/g, (_m, d) => `n${d}`)).toEqual([{start: 0, end: 2, text: 'n1'}, {start: 3, end: 6, text: 'n22'}]);
  });
  it('supports RegExp from with string to and expands $1, $&, $$', () => {
    expect(findReplacements('v1', /v(\d+)/, '$1!$&$$')).toEqual([{start: 0, end: 2, text: '1!v1$'}]);
  });
  it('adds the global flag to a non-global RegExp', () => {
    expect(findReplacements('aa', /a/, 'b')).toHaveLength(2);
  });
  it('returns empty array when nothing matches', () => {
    expect(findReplacements('abc', 'z', 'y')).toEqual([]);
  });
  it('calls function to with substring for string from', () => {
    expect(findReplacements('abc', 'b', (m) => m.toUpperCase())).toEqual([{start: 1, end: 2, text: 'B'}]);
  });
  it('does not loop forever on a zero-width RegExp match', () => {
    expect(findReplacements('ab', /x*/, 'y')).toEqual([]);
  });
});
