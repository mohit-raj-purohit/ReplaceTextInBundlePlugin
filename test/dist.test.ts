import {describe, it, expect, beforeAll} from 'vitest';
import {execSync} from 'child_process';
import {createRequire} from 'module';
import {existsSync} from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const require = createRequire(__filename);

describe('built package (dist/)', () => {
	beforeAll(() => {
		execSync('npm run build', {cwd: root, stdio: 'pipe'});
	}, 60000);

	it('require() returns the class directly and also exposes .default', () => {
		const P = require(path.join(root, 'dist/index.js'));
		expect(typeof P).toBe('function');
		expect(P.default).toBe(P);
		expect(() => new P([{bundle: 'a.js', from: 'x', to: 'y'}])).not.toThrow();
	});

	it('ships type declarations', () => {
		expect(existsSync(path.join(root, 'dist/index.d.ts'))).toBe(true);
	});
});
