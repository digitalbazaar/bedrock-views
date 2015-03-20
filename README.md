# bedrock-views

A [bedrock][] module that combines a number of popular frontend technologies
to provide a modern, flexible, and extensible Web-based user interface. It
is coupled with the [bower][] module, [bedrock-angular][], which provides
client-side resources.

**bedrock-views** has the following properties/features:
* Server-rendered views via the [Swig][] templating engine
* Client-side [AngularJS][] application via [bedrock-angular][]
* Client-side modules and JavaScript optimization via [bedrock-requirejs][]
* HTML and CSS framework via [bootstrap][] v3
* [Less][] compilation support via [less][]
* CSS optimization via [clean-css][]
* HTML optimization via [html-minifier][]
* [AngularJS][] template optimization and [ng-annotate][] support

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
TODO: use 'bedrock-views.vars.get' event
-->

## Setup

1. bower install bedrock-angular

## Configuration

**bedrock-views** uses [bedrock][]'s configuration to expose its own
options and to expose [less][], [clean-css][], and [html-minifier][] options.

<!--
TODO: description of `bedrock.config.views.vars`
TODO: description of how to override angular templates
-->

More documentation about their usage can be found in
[config.js](https://github.com/digitalbazaar/bedrock-views/blob/master/lib/config.js).

## How It Works

<!--
TODO: general
TODO: description of `bedrock-views.vars.get` event
TODO: description of `bedrock-views.add` event (possibly rename as well)
-->

[bedrock]: https://github.com/digitalbazaar/bedrock
[bedrock-angular]: https://github.com/digitalbazaar/bedrock-angular
[bedrock-express]: https://github.com/digitalbazaar/bedrock-express
[bedrock-requirejs]: https://github.com/digitalbazaar/bedrock-requirejs
[bedrock-views]: https://github.com/digitalbazaar/bedrock-views
[bootstrap]: http://getbootstrap.com/
[bower]: http://bower.io/
[clean-css]: https://github.com/jakubpawlowicz/clean-css
[html-minifier]: https://github.com/kangax/html-minifier
[less]: https://github.com/less/less.js/
[ng-annotate]: https://github.com/olov/ng-annotate
[AngularJS]: https://github.com/angular/angular.js
[Less]: http://lesscss.org/
[RequireJS]: http://requirejs.org/
[Swig]: http://paularmstrong.github.io/swig/
