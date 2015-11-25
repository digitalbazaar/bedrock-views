# bedrock-views ChangeLog

## [Unreleased]

## [1.5.1] - 2015-11-25

### Fixed
- Made docs link in footer configurable.

## [1.5.0] - 2015-10-29

### Added
- Use `bedrock-angular-navbar`.

## [1.4.2] - 2015-10-23

### Fixed
- Fix inverted productionMode condition.

## [1.4.1] - 2015-10-23

### Fixed
- Fix footer bugs.

## [1.4.0] - 2015-10-17

### Added
- Make default footer and copyright configurable via `bedrock.config`.

## [1.3.1] - 2015-10-15

### Added
- Link to Material Design icons by Google.

## [1.3.0] - 2015-10-14

### Added
- A configurable context map for client-side json-ld.
- Use `bedrock-angular` 1.4.0.

## [1.2.0] - 2015-09-17

### Changes
- Make default root landing page use angular routing.
- Use `bedrock-angular` 1.3.0.

## [1.1.2] - 2015-09-11

### Changes
- Use `bedrock-angular` 1.2.1.

## [1.1.1] - 2015-09-04

### Changes
- Explicitly list and update `bedrock-express` dependency. Use `bedrock-express`
  error handler middleware.

## [1.1.0] - 2015-08-24

### Changes
- Display 404 errors via angular. This change allows angular routes to be
  added without requiring any express route(s) for completeness. Previously,
  when adding an angular route, if an express route was not also added and the
  user reloaded a page that was managed by angular's router, the page would
  display a confusing 404. Now, when the client has requested HTML, the page
  will only display a 404 if there is both no express route *and* no angular
  route for that URL.

## [1.0.4] - 2015-05-07

### Changes
- Remove custom forge paths.

## [1.0.3] - 2015-05-25

### Changes
- Remove override of err.details.httpStatusCode.
- Rework unhandled exceptions. Add 404 and 503 support.

## [1.0.1] - 2015-05-07

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

[Unreleased]: https://github.com/digitalbazaar/bedrock-views/compare/1.5.1...HEAD
[1.5.1]: https://github.com/digitalbazaar/bedrock-views/compare/1.5.0...1.5.1
[1.5.0]: https://github.com/digitalbazaar/bedrock-views/compare/1.4.2...1.5.0
[1.4.2]: https://github.com/digitalbazaar/bedrock-views/compare/1.4.1...1.4.2
[1.4.1]: https://github.com/digitalbazaar/bedrock-views/compare/1.4.0...1.4.1
[1.4.0]: https://github.com/digitalbazaar/bedrock-views/compare/1.3.1...1.4.0
[1.3.1]: https://github.com/digitalbazaar/bedrock-views/compare/1.3.0...1.3.1
[1.3.0]: https://github.com/digitalbazaar/bedrock-views/compare/1.2.0...1.3.0
[1.2.0]: https://github.com/digitalbazaar/bedrock-views/compare/1.1.1...1.2.0
[1.1.1]: https://github.com/digitalbazaar/bedrock-views/compare/1.1.0...1.1.1
[1.1.0]: https://github.com/digitalbazaar/bedrock-views/compare/1.0.4...1.1.0
[1.0.4]: https://github.com/digitalbazaar/bedrock-views/compare/1.0.3...1.0.4
[1.0.3]: https://github.com/digitalbazaar/bedrock-views/compare/1.0.1...1.0.3
[1.0.1]: https://github.com/digitalbazaar/bedrock-views/compare/1.0.0...1.0.1
[1.0.0]: https://github.com/digitalbazaar/bedrock-views/compare/0.1.1...1.0.0
[0.1.1]: https://github.com/digitalbazaar/bedrock-views/compare/0.1.0...0.1.1
