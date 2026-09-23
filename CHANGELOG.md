# Changelog

## 2.0.0

### Breaking
- `require()` returns the plugin class directly (previously only `.default`).
- Replacement runs in `processAssets` (just before `DEV_TOOLING`, after minification) instead of the deprecated `emit` hook.
- Empty `from` and malformed options are rejected in the constructor.
- A missing asset is reported as a compilation error instead of throwing and aborting the process.
- `webpack` is now a peer dependency (`^5.0.0`). Node `>=18`.
- An empty options array is rejected in the constructor.
- `$` sequences in a string `to` are inserted literally.

### Added
- `bundle` accepts a `RegExp` or predicate, enabling hashed filenames.
- `from` accepts a `RegExp`; `to` accepts a replacer function.
- Source maps are preserved via `ReplaceSource`; content hashes reflect the replaced output.
- Buffer-backed assets are supported.
- One warning per option when `from` is not found in any matched asset.
- Assets emitted by later plugins in `processAssets` (e.g. html-webpack-plugin) are processed via `additionalAssets`.
- Errors thrown by user `bundle` predicates or replacers become compilation errors; replacer results are coerced with `String()`.
- TypeScript declarations, unit and integration tests, CI workflow.

### Removed
- Rollup/UMD build. The package is plain CommonJS built with `tsc`.
- Automatic version bump in `prepublishOnly`.
