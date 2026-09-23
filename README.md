# replace-text-in-bundle-plugin

A webpack 5 plugin that replaces text in emitted assets during the build. It runs inside
`processAssets` before content hashing, so `[contenthash]` filenames stay correct and
source maps stay aligned.

## Installation

```shell
npm i --save-dev replace-text-in-bundle-plugin
```

`webpack` 5 is a peer dependency. Node 14 or newer is required.

## Usage

```js
// CommonJS
const ReplaceTextInBundlePlugin = require('replace-text-in-bundle-plugin');

// ESM / TypeScript
import ReplaceTextInBundlePlugin from 'replace-text-in-bundle-plugin';

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

- Runs at `PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE`, before minification output is hashed. Content hashes are computed from the replaced text.
- Rewrites assets with `ReplaceSource`, so existing source maps remain valid.
- Buffer-backed assets are treated as UTF-8 text.
- If an option's `bundle` matches no asset, a **compilation error** is reported. The build continues (watch mode is not killed) but `stats.hasErrors()` is true.
- If `from` is not found in a matched asset, a **compilation warning** is reported.
- Invalid options throw from the constructor, so misconfiguration fails when the webpack config is loaded.

## Migrating from 1.x

- `require('replace-text-in-bundle-plugin')` now returns the class directly. Remove any `.default`.
- `from` must be a non-empty string or RegExp. An empty string previously corrupted the asset.
- A missing bundle or an invalid option no longer throws inside the build; it becomes a compilation error.
- `webpack` moved from `dependencies` to `peerDependencies`.
- `$` sequences in a string `to` are now inserted literally.

## License

[MIT](./LICENSE)

## Contributing

Bug reports and pull requests are welcome at
[github.com/mohit-raj-purohit/ReplaceTextInBundlePlugin](https://github.com/mohit-raj-purohit/ReplaceTextInBundlePlugin/issues).
