# replace-text-in-bundle-plugin

A webpack 5 plugin that replaces text in emitted assets during the build. It runs inside
`processAssets` after minification and before source maps are extracted and content hashes
are finalised, so `.map` files stay aligned and `[contenthash]` filenames reflect the replaced
output.

## Installation

```shell
npm i --save-dev replace-text-in-bundle-plugin
```

`webpack` 5 is a peer dependency. Node 18 or newer is required.

## Usage

```js
// CommonJS
const ReplaceTextInBundlePlugin = require('replace-text-in-bundle-plugin');

// ESM / TypeScript (needs `esModuleInterop` or `allowSyntheticDefaultImports` in tsconfig)
import ReplaceTextInBundlePlugin from 'replace-text-in-bundle-plugin';
// TypeScript without esModuleInterop
import ReplaceTextInBundlePlugin = require('replace-text-in-bundle-plugin');

module.exports = {
  plugins: [
    new ReplaceTextInBundlePlugin([
      {
        bundle: 'main.bundle.js',
        from: '"${temp_base_url}"',
        to: 'window.site_base_url + "/some/path/to/"',
      },
      {
        bundle: /\.css$/,
        from: '${temp_base_url}',
        to: '',
      },
    ]),
  ],
};
```

The constructor accepts a single option object or an array of them. Each option is applied in
order to every asset it matches.

### Options

| Key      | Type                                                  | Description |
|----------|-------------------------------------------------------|-------------|
| `bundle` | `string \| RegExp \| (name: string) => boolean`        | Which emitted asset(s) to modify. A string must match the output filename exactly. Use a RegExp or predicate for hashed names such as `main.[contenthash].js`. |
| `from`   | `string \| RegExp`                                     | Text to find. A string is matched literally (regex metacharacters are safe). A RegExp is matched as a pattern; the `g` flag is added if missing. |
| `to`     | `string \| (substring, ...groups, offset, source) => string` | Replacement. When `from` is a string, `to` is inserted literally (`$&`, `$1`, `$$` are **not** special). When `from` is a RegExp, `to` supports the same `$` patterns as `String.prototype.replace`. A function receives the same arguments as a `String.prototype.replace` callback. |

### Hashed filenames

```js
new ReplaceTextInBundlePlugin({
  bundle: /^main\.[a-f0-9]+\.js$/,
  from: '__API_BASE__',
  to: 'https://api.example.com',
});
```

### Pattern replacement

```js
new ReplaceTextInBundlePlugin({
  bundle: (name) => name.endsWith('.js'),
  from: /__VERSION_(\w+)__/g,
  to: (_match, channel) => versions[channel],
});
```

## Behaviour

- Runs just before `PROCESS_ASSETS_STAGE_DEV_TOOLING`. That is **after Terser**, so `from` must match the minified output (Terser may fold `"a" + "b"` into `"ab"` or change quote style), and before `.map` files are extracted.
- Rewrites assets with `ReplaceSource`, so external and inline source maps remain aligned.
- `[contenthash]` reflects the replaced content when `optimization.realContentHash` is enabled. That is webpack's default in `production` mode only; enable it explicitly in other modes if you rely on it.
- Assets emitted later in `processAssets` by other plugins (for example `index.html` from html-webpack-plugin) are also processed, regardless of plugin order.
- Buffer-backed assets are treated as UTF-8 text.
- If an option's `bundle` matches no asset, a **compilation error** is reported after all assets are processed. The build continues (watch mode is not killed) but `stats.hasErrors()` is true.
- If `from` is not found in any asset an option matched, one **compilation warning** is reported for that option.
- A replacer function's return value is coerced with `String()`, like `String.prototype.replace`. If a `bundle` predicate or replacer throws, the error is reported as a compilation error with the option index and asset name.
- Invalid options throw from the constructor, so misconfiguration fails when the webpack config is loaded.

## Migrating from 1.x

- `require('replace-text-in-bundle-plugin')` now returns the class directly. Remove any `.default`.
- `from` must be a non-empty string or RegExp. An empty string previously corrupted the asset.
- A missing bundle or an invalid option no longer throws inside the build; it becomes a compilation error.
- `webpack` moved from `dependencies` to `peerDependencies`. Node 18 or newer is required.
- An empty options array is rejected.
- `$` sequences in a string `to` are now inserted literally.

## License

[MIT](./LICENSE)

## Contributing

Bug reports and pull requests are welcome at
[github.com/mohit-raj-purohit/ReplaceTextInBundlePlugin](https://github.com/mohit-raj-purohit/ReplaceTextInBundlePlugin/issues).
