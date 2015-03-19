# bedrock-views

A [bedrock][] module that provides server-rendered HTML views and that can
be easily coupled with [AngularJS][] via [bedrock-angular][]. It also
provides tools for compiling [Less][] and optimizing JavaScript, CSS, and
[AngularJS][] templates.

**bedrock-views** uses the [Swig][] templating engine to provide its
server-rendered views and [bedrock-requirejs][] to serve any client-side
modules and to optimize any client-side JavaScript. **bedrock-views**'s
JavaScript optimization has built-in support for [ng-annotate][].

## Quick Examples

```
npm install bedrock-views
```

Start an express server with **bedrock-requirejs** support and an [AngularJS][]
frontend:

```
bower install bedrock-angular
```

```js
var bedrock = require('bedrock');

require('bedrock-express');
require('bedrock-requirejs');
require('bedrock-server');
require('bedrock-views');

bedrock.start();
```

<!--
TODO: command line usage of compile-less
TODO: command line usage of optimize
-->

## Configuration

**bedrock-views** uses [bedrock][]'s configuration to expose its own
options and to expose [less][], [clean-css][], and [html-minifier][] options.

More documentation about their usage can be found in
[config.js](https://github.com/digitalbazaar/bedrock-views/blob/master/lib/config.js).

## How It Works

<!-- TODO -->

[bedrock]: https://github.com/digitalbazaar/bedrock
[bedrock-angular]: https://github.com/digitalbazaar/bedrock-angular
[bedrock-express]: https://github.com/digitalbazaar/bedrock-express
[bedrock-requirejs]: https://github.com/digitalbazaar/bedrock-requirejs
[bedrock-views]: https://github.com/digitalbazaar/bedrock-views
[bower]: http://bower.io/
[clean-css]: https://github.com/jakubpawlowicz/clean-css
[html-minifier]: https://github.com/kangax/html-minifier
[less]: https://github.com/less/less.js/
[ng-annotate]: https://github.com/olov/ng-annotate
[AngularJS]: https://github.com/angular/angular.js
[Less]: http://lesscss.org/
[RequireJS]: http://requirejs.org/
[Swig]: http://paularmstrong.github.io/swig/
