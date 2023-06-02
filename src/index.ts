import { Compiler, Compilation, sources } from 'webpack';

interface Option {
    bundle: string;
    from: string;
    to: string;
}

class ReplaceTextInBundlePlugin {
    private options: Option[];

    constructor(options: Option[]) {
        this.options = options;
    }

    apply(compiler: Compiler): void {
        if (!Array.isArray(this.options)) {
            throw new Error("ReplaceTextInBundlePlugin: Expected an array in options");
        }

        compiler.hooks.emit.tap('ReplaceTextInBundlePlugin', (compilation: Compilation) => {
            this.options.forEach((option) => {
                if (option.bundle === undefined || option.from === undefined || option.to === undefined) {
                    throw new Error("ReplaceTextInBundlePlugin: Invalid object key");
                }
                const bundleSource = compilation.assets[option.bundle].source();
                const modifiedBundleSource = bundleSource.replace(
                    new RegExp(option.from, 'g'),
                    option.to
                );
                compilation.assets[option.bundle] = new sources.RawSource(modifiedBundleSource);
            });
        });
    }
}

export default ReplaceTextInBundlePlugin;
