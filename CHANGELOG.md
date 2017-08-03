# bedrock-views ChangeLog

## 5.2.1 - 2017-08-03

### Fixed
- Disable `stage1`, `stage2`, and `stage3` transpilation by default
  to fix transpilation bugs when running in dev mode. As expected,
  requires modern browser.

## 5.2.0 - 2017-08-01

### Added
- Add ability to specify browser dependencies in manifest overrides.

## 5.1.1 - 2017-07-27

### Changed
- Use child logger.

## 5.1.0 - 2017-06-29

### Added
- `bedrock-views.cli.compile-less.configure` event.
- `bedrock-views.cli.optimize.configure` event.
- Timing output.
- `bedrock-views.optimize.run` event.
- Improve package browser, module, main field support.
- ES module main.

### Removed
- requirejs support.
- ng-annotate support (allow optimizer to do this).

### Changed
- Update to newer async API.
- Output ES module style templates file.
- Simplify SystemJS main.

## 5.0.2 - 2017-06-21

### Fixed
- Resequence application of package overrides.

## 5.0.1 - 2017-06-04

### Fixed
- Remove unused `app.config.data.noRoute`.

## 5.0.0 - 2017-06-02

### Added
- SystemJS module loader.

### Changed
- **BREAKING**: Remove prefixes from html element.
- Move supported user agent check to server side template from bedrock-angular.
- Remove no-javascript warning.
- Return 404 when requesting modules that are not found.
- Update supported browser versions (based on flexbox support).

## 4.5.0 - 2017-05-02

### Added
- Defer script loading in default layout until after HTML parsing completes.

## 4.4.2 - 2017-04-17

### Fixed
- Upgrade dependencies to address CSS optimization bug.

## 4.4.1 - 2017-03-02

### Changed
- Update dependencies.

## 4.4.0 - 2017-02-13

### Added
- Add AngularJS options for configuring body css.

## 4.3.1 - 2016-12-15

### Fixed
- Search for angular templates in bower packages that specify
  angular or bedrock-angular as dependency but do not specify
  the version. This is primarily for pseudo-bower packages.

## 4.3.0 - 2016-12-09

### Changed
- Update bedrock dependency.
- Use computed config for cache paths.

## 4.2.6 - 2016-11-15

### Changed
- Remove references to `custom.css` and `ie.css`.

## 4.2.5 - 2016-10-18

### Changed
- Add renderTimeout config.

## 4.2.4 - 2016-10-18

### Fixed
- Ensure `window.data` is loaded early.

## 4.2.3 - 2016-07-22

### Fixed
- Send 404 when status code already set and HTML not acceptable.

## 4.2.2 - 2016-07-14

### Fixed
- Default to sending HTML when `Accept: */*` header is sent.
- Remove unnecessary default vars lookup when not sending html.
- Do not send erroneous JSON/JSON-LD via fallback handler.

## 4.2.1 - 2016-06-21

### Added
- Add documentation on `config.views.less.compile.packages`.

### Changed
- Don't return 404 template on a 404 response.

## 4.2.0 - 2016-05-30

### Added
- Send CSRF token cookies with default route to allow frontend
  to post url-encoded or multipart-encoded forms if a route
  allows it.

## 4.1.3 - 2016-05-13

### Fixed
- Ensure only CSS files are affected by special import rules.

## 4.1.2 - 2016-05-13

### Fixed
- Fix bug where @import with bad path was used
  when not importing as less; instead use `(inline)`
  import to correct.

## 4.1.1 - 2016-05-10

### Changed
- Template optimization rules updated to recursively ignore HTML in
  `node_modules` and `bower_components` directories.

### Fixed
- Make directories if needed when compiling and optimizing.

## 4.1.0 - 2016-05-10

### Added
- Add option to set options on files. The only option
  currently supported is `importAsLess` which is a
  boolean that may be set to true or false. So when
  specifying files via `config.views.less.compile.packages`
  or `config.views.less.compile.files`, a file entry
  can be a string representing the name of the file
  (backwards compatible) or it can be an object with
  a `name` property for the file name and whatever
  options are available, e.g., `importAsLess: false`. By
  default, CSS files are imported as less and this
  behavior, on a per file basis, can now be disabled.

## 4.0.1 - 2016-04-15

## 4.0.0 - 2016-04-15

### Changed
- **BREAKING**: Remove main default template and simplify
  view files. Main routes have been removed and control
  of customizing the client-side application has been
  moved to the angular layer via bedrock-angular 2.1. A
  number of old view files have been removed and
  any customization using those files will need to be
  updated to use an angular customization method instead.

### Fixed
- Removed bedrock* packages from dependencies list to
  fix installation bugs. They are now only listed
  as peer dependencies.

## 3.0.0 - 2016-03-11

### Changed
- **BREAKING**: Remove built-in footer. To add a footer, bower install
  `bedrock-angular-footer` and add custom links/copyright for your project.
- **BREAKING**: Change RDFa prefix for bedrock to "br".
- Remove requirejs exclusion for bedrock-angular-identity.

## 2.0.1 - 2016-03-02

## 2.0.0 - 2016-03-02

### Changed
- Update deps for npm v3 compatibility.

## 1.5.2 - 2016-02-16

### Changed
- Switch underscore to lodash.
- Update dependencies.
- Log template minification errors as warnings.

## 1.5.1 - 2015-11-25

### Fixed
- Made docs link in footer configurable.

## 1.5.0 - 2015-10-29

### Added
- Use `bedrock-angular-navbar`.

## 1.4.2 - 2015-10-23

### Fixed
- Fix inverted productionMode condition.

## 1.4.1 - 2015-10-23

### Fixed
- Fix footer bugs.

## 1.4.0 - 2015-10-17

### Added
- Make default footer and copyright configurable via `bedrock.config`.

## 1.3.1 - 2015-10-15

### Added
- Link to Material Design icons by Google.

## 1.3.0 - 2015-10-14

### Added
- A configurable context map for client-side json-ld.
- Use `bedrock-angular` 1.4.0.

## 1.2.0 - 2015-09-17

### Changes
- Make default root landing page use angular routing.
- Use `bedrock-angular` 1.3.0.

## 1.1.2 - 2015-09-11

### Changes
- Use `bedrock-angular` 1.2.1.

## 1.1.1 - 2015-09-04

### Changes
- Explicitly list and update `bedrock-express` dependency. Use `bedrock-express`
  error handler middleware.

## 1.1.0 - 2015-08-24

### Changes
- Display 404 errors via angular. This change allows angular routes to be
  added without requiring any express route(s) for completeness. Previously,
  when adding an angular route, if an express route was not also added and the
  user reloaded a page that was managed by angular's router, the page would
  display a confusing 404. Now, when the client has requested HTML, the page
  will only display a 404 if there is both no express route *and* no angular
  route for that URL.

## 1.0.4 - 2015-05-07

### Changes
- Remove custom forge paths.

## 1.0.3 - 2015-05-25

### Changes
- Remove override of err.details.httpStatusCode.
- Rework unhandled exceptions. Add 404 and 503 support.

## 1.0.1 - 2015-05-07

### Fixed
- Fix sending 503 status.

## 1.0.0 - 2015-04-08

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

## 0.1.1 - 2015-02-26

### Changed
- Bug fixes.

## 0.1.0 (up to early 2015)

- See git history for changes.
