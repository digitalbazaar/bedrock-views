# bedrock-views ChangeLog

## 9.0.1 - 2022-04-xx

### Fixed
- Fix `package.json` resolution code.

## 9.0.0 - 2022-04-05

### Changed
- **BREAKING**: Rename package to `@bedrock/views`.
- **BREAKING**: Convert to module (ESM).
- **BREAKING**: Remove default export.
- **BREAKING**: Require node 14.x.

## 8.1.0 - 2022-03-30

### Changed
- Update peer deps:
  - `bedrock@4.5`
  - `bedrock-express@6.4.1`.
- Update internals to use esm style and use `esm.js` to
  transpile to CommonJS.

### Removed
- Remove unused peer dep `bedrock-server`.

## 8.0.1 - 2022-03-22

### Fixed
- Use `bedrock.main`, if available, to determine root module filename.

## 8.0.0 - 2022-03-16

### Changed
- Now serves the generated html from `bedrock-webpack`.
- **BREAKING**: Update peer deps:
  - `bedrock@4.4.3`
  - `bedrock-express@6.3`
  - `bedrock-server@3.1`
  - `bedrock-web@1.3.1`.

### Removed
- **BREAKING**: Remove `config.views.main.file.path`. Location of main html file
  is handled by webpack.
- **BREAKING**: Remove `config.views.main.render`. All html processing is
  handled by webpack.
- **BREAKING**: Remove `config.views.error`. This property was unused.
- **BREAKING**: Remove `config.views.bundle.paths.output.main`. The bundle path
  is handled by webpack.

## 7.1.0 - 2020-01-13

### Fixed
- Set csrf cookie defaults to secure settings.

### Removed
- Support for AngularJS csrf cookie name (use `_csrf`).

## 7.0.2 - 2019-11-14

### Fixed
- Don't pass in null paths to `require.resolve()`. Fix for Node.js v12.

## 7.0.1 - 2019-11-08

### Changed
- Update max bedrock dependency.

## 7.0.0 - 2019-11-08

### Notes
- **BREAKING**: This is a major release. **Upgrading is required.** Read the
  changes below and likely those in `bedrock-webpack`.
- Upgrade process:
  - Upgrade or add `package.json` dependencies:
    - `"bedrock-fontawesome": "^1.0.0"`
    - `"bedrock-quasar": "^4.0.0"`
    - `"bedrock-vue": "^1.3.0"`
    - `"bedrock-webpack": "^3.0.0"`
    - ... others  as needed ...
  - Remove `compile-less` scripts from `package.json` or elsewhere. No longer
    used.
  - Remove `bedrock.browserDependencies` from `package.json`. No longer used.
  - If `fontawesome` rules are in `bedrock.manifest` in `package.json`, add a
    dependency on `bedrock-fontawesome`.
  - Remove `bedrock.manifest` from `package.json`. No longer used.
  - (optional) Add `webpackChunkName` notation to dynamic imports for
    debugging.
  - If webpack has trouble with `crypto`, check if its usage can be easily
    avoided. If not, one technique is to add `bedrock-webpack` config that
    aliases `crypto` to a file that just throws an error. Some libraries use a
    try/catch on `require('crypto')` to choose Node.js or browser paths. Try to
    move away from this if possible.
  - If a top level file exists, like `components/app.js`, add as needed:
    - `import './app.less';` (or `.css` or other supported formats)
    - `import 'bedrock-fontawesome';`
  - If using a LESS file, may need to remove var usage. The
    `bedrock-fontawesome` package will load common files for that package. May
    need to update to `@import (css) url('...');` syntax.
  - Remove `"less"` property from `package.json`.
  - Update `"browser"` property in `package.json` so it is
    `"./components/index.js"` rather than just `"index.js"`.
  - Depending on other packages used, you *may* need to add top-level
    dependencies on `core-js` and `regenerator-runtime` that match and track
    those used in `bedrock-webpack`. This is due to how `npm` may lay out
    directories.
  - Remove `bedrock.views.vars` config, `bedrock.views.brand` config, and any
    uses of `window.data`. Move needed data to frontend config as needed.
  - Change `views.system` config usage to `views.bundle`.
  - Views render template changed from swig to lodash by default. Another
    default engine can be selected with the `views.engine` config value.
  - Change calls to `optimize` command to `bundle`.
  - Change production config `minify` option to
    `bedrock.config.views.bundle.mode = 'production'` or use `--bundle-mode
    production` CLI option.
  - Remove `bedrock.config.views.routes` usage. Either handle on the frontend
    or add custom express routes directly.
  - Update `bedrock.config.views.main`. It's now an object with `file` or
    `render` options (see config).
  - Add custom express error handler for server errors. Note that this is
    mainly for internal server errors and usually the default HTML and JS will
    allow the frontend to handle API errors. A custom handler would likely use
    `res.sendFile` or `res.render` to return custom HTML.
  - The `serviceUnavailable`/503 feature was removed. Apps must implement this
    themselves or use an appropriate package to do so.

### Changed
- Use "watch" support by default for development.
  - Replaces SystemJS usage.
  - Uses webpack "development" mode for built files.
- **BREAKING**: Update Node.js requirement to v10.12.0. Use `fs.mkdir`
  `recursive` option instead of `make-dir` package.
- **BREAKING**: Various config properties are changed or renamed.
  - Add `views.bundle`.
  - Add `views.bundle.paths.input.root` (old importAll).
  - Add `views.bundle.paths.output.local`.
  - Add `views.bundle.paths.output.public`.
  - Add `views.bundle.paths.output.main`.
  - Add `views.bundle.paths.output.optimize.main`.
- Default generated output files to `js`/`css` dirs for dev/prod modes.
- Default generated output routes to '/static/{css,js}'.
- **BREAKING**: Modules must use appropriate `package.json` fields to specify
  their main file for Webpack. In particular, use the `browser` field as
  needed.
- Use relative path to load root file to avoid issues when package name is not
  the same as the directory name.
- **BREAKING**: Templates in `views/*.html` are now just simple placeholders.
  Override as needed.
- **BREAKING**: Switch from swig to lodash templates by default.
- **BREAKING**: `optimize` command changed to `bundle`. New `--bundle-mode`
  option added for `development` and `production` modes. Default for this mode
  is `bedrock.config.views.bundle.mode` config value.

### Added
- eslint support.
- Initial "watch" support.
  - Used to rebuild optimized output as source files change.
  - Explicitly enabled with: `--watch true`.
- `bedrock.config.views.main` config:
  - `file` and `options` for `res.sendFile` use.
  - `render` and `vars` for `res.render` use.

### Removed
- **BREAKING**: AngularJS support.
- **BREAKING**: SystemJS support.
- **BREAKING**: `compile-less` command. Handled by webpack.
- **BREAKING**: User agent checking and unsupported warning. Use frontend
  feature detection, polyfills, and warnings as needed.
- **BREAKING**: `views.system` config (use `views.bundle`).
- **BREAKING**: `views.routes` config. Use frontend code or custom routes.
- Support for `bedrock.browserDependencies` in `package.json`.
- Support for `bedrock.manifest` in `package.json`.
- **BREAKING**: `views/error*.html` removed in favor of handling with frontend
  code from a common main HTML file. A special meta http-equiv "status" field
  is used to indicate any initial HTTP status codes.
- **BREAKING**: Various configuration removed. Simplifies template system and
  encourages frontend config: . Simplifies templates and encourage configuring
  via the frontend.
  - `bedrock.views.vars` config.
  - `bedrock.views.brand` config.
  - `bedrock.brand` config.
  - `window.data` frontend var.
  - `getDefaultViewVars` function.
  - `bedrock-views.vars.get` event
- **BREAKING**: Removed `serviceUnavailable` config and feature. Add your own
  custom route and page if you need this.
- **BREAKING**: Server error custom HTML. This is difficult to do in a generic
  way. Express default will be used by default. Apps can add an express error
  handler to provide fallback HTML output if needed.
  - **NOTE**: The default express handler outputs an HTML error stack trace by
    default. Apps should be run with `NODE_ENV="production"` to avoid this.
    Also note that in production mode the error is instead output via
    `console.error`. A custom handler can be used to change this behavior.

## 6.5.1 - 2019-10-03

### Fixed
- Fix bug that preventing overriding default views behavior.

## 6.5.0 - 2019-03-05

### Added
- Add workaround for packages that load `crypto` and use it
  like `window.crypto`.
- Add package config path for loading `@scoped` packages.
- Upgrade systemjs babel to use babel-standalone instead of
  old prebuilt systemjs babel plugin.

## 6.4.0 - 2019-02-19

### Added
- Upgrade vue-template-complier to 2.6.x.

## 6.3.0 - 2019-02-12

### Added
- Enable loading of frontend peer dependencies in Vue SFCs
  in dev mode.

## 6.2.1 - 2019-02-07

### Fixed
- Fix path resolution for CSS preprocessors.

## 6.2.0 - 2019-02-07

### Added
- Support scss, sass, less, and stylus for css preprocessing for vue.

## 6.1.0 - 2019-02-06

### Added
- Support loading json files.

## 6.0.0 - 2018-08-06

### Added
- Support bundle chunking/dynamic imports.
- Add pkgs to the optimize.run event.
- Add Vue SFC compiler.

### Fixed
- Ensure that the externals option for webpack is being built "deep".
- Include peerDependencies when browserDependencies "all".
- Do not use angular-templates when there aren't any.
- Improve circular dependency detection.

### Removed
- **BREAKING**: Remove bower support.
- **BREAKING**: Remove old default config vars for font-awesome and bootstrap.

## 5.4.1 - 2018-05-02

### Changed
- Use bedrock-web (renamed from bedrock-frontend).

## 5.4.0 - 2018-03-22

### Changed
- Use bedrock-frontend instead of bedrock-angular to start
  frontend.

## 5.3.0 - 2017-08-24

### Added
- Add app load spinner.

## 5.2.3 - 2017-08-24

### Fixed
- Remove unnecessary `ng-cloak` on body. Enables sites
  to show content before app is bootstrapped. If custom
  content should not be shown then `ng-cloak` can be
  added to the content -- therefore this approach is
  more flexible. Should have no effect on applications
  that do not add their own custom pre-bootstrap content.

## 5.2.2 - 2017-08-17

### Changed
- Add debug logger for contents of the `importAll` file.

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
