import webpack, {Configuration, Stats} from 'webpack';
import {createFsFromVolume, Volume} from 'memfs';
import path from 'path';

export interface BuildResult {
	stats: Stats;
	files: string[];
	read: (name: string) => string;
}

export function build(config: Configuration): Promise<BuildResult> {
	const fs = createFsFromVolume(new Volume());
	const outDir = '/out';
	const compiler = webpack({
		mode: 'none',
		context: path.resolve(__dirname, '../fixtures'),
		entry: './entry.js',
		...config,
		output: {path: outDir, filename: 'main.js', ...(config.output ?? {})},
	});
	compiler.outputFileSystem = fs as any;
	return new Promise((resolve, reject) => {
		compiler.run((err, stats) => {
			if (err || !stats) return reject(err ?? new Error('no stats'));
			compiler.close(() => {
				const files = fs.readdirSync(outDir) as string[];
				resolve({
					stats,
					files,
					read: (n) => fs.readFileSync(path.join(outDir, n), 'utf8') as string,
				});
			});
		});
	});
}
