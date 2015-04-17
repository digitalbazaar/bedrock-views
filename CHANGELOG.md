# bedrock-views ChangeLog

## [Unreleased]

### Fixed
- Fix sending 503 status.

## [1.0.0] - 2015-04-08

### Added
- Add global option `--minify <mode>` where `mode` can be:
  - `default` or not set: Use value from config system.
  - `true`: Force `bedrock.config.views.vars.minify` to `true`.
  - `false`: Force `bedrock.config.views.vars.minify` to `false`.

### Removed
- Remove `jquery-migrate` support.

### Deprecated
- `bedrock.config.brand.*`.

### Changed
- Move `bedrock.config.brand.*` to `bedrock.config.views.brand.*`.

### Fixes
- Bug fixes.

## [0.1.1] - 2015-02-26

### Changed
- Bug fixes.

## 0.1.0 (up to early 2015)

- See git history for changes.

[Unreleased]: https://github.com/digitalbazaar/bedrock-views/compare/1.0.0...HEAD
[1.0.0]: https://github.com/digitalbazaar/bedrock-views/compare/0.1.1...1.0.0
[0.1.1]: https://github.com/digitalbazaar/bedrock-views/compare/0.1.0...0.1.1
