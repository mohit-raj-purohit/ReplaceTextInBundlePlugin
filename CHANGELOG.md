# Changelog

## 2.0.0

### Breaking
- `require()` returns the plugin class directly (previously only `.default`).
- Replacement runs in `processAssets` (stage `OPTIMIZE_INLINE`) instead of the deprecated `emit` hook.
- Empty `from` and malformed options are rejected in the constructor.
- A missing asset is reported as a compilation error instead of throwing and aborting the process.
- `webpack` is now a peer dependency (`^5.0.0`). Node `>=14`.
- `$` sequences in a string `to` are inserted literally.

### Added
- `bundle` accepts a `RegExp` or predicate, enabling hashed filenames.
- `from` accepts a `RegExp`; `to` accepts a replacer function.
- Source maps are preserved via `ReplaceSource`; content hashes reflect the replaced output.
- Buffer-backed assets are supported.
- Warning when `from` is not found in a matched asset.
- TypeScript declarations, unit and integration tests, CI workflow.

### Removed
- Rollup/UMD build. The package is plain CommonJS built with `tsc`.
- Automatic version bump in `prepublishOnly`.
