# bedrock-views

A [bedrock][] module that combines a number of popular frontend technologies
to provide a modern, flexible, and extensible Web-based user interface. It
is coupled with [webpack][], and [bedrock-vue][], which provides
client-side resources.

**bedrock-views** has the following properties/features:
* Server-rendered views via the [Swig][] templating engine
* Client-side [Vue][] application via [bedrock-vue][]
* Client-side modules and JavaScript optimization using [bedrock-webpack][]
* HTML and CSS framework via [bootstrap][] v3
* [Less][] compilation support via [less][]
* CSS optimization via [clean-css][]

## Requirements

- npm v3+

## Quick Examples

```
npm install bedrock-views
```

Start an express server with an [Vue][] frontend:

```
npm install bedrock-vue
```

```js
var bedrock = require('bedrock');

require('bedrock-express');
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

1. npm install bedrock-vue

## Configuration

**bedrock-views** uses [bedrock][]'s configuration to expose its own
options and to expose [less][], [clean-css][], and [html-minifier][] options.

<!--
TODO: description of `bedrock.config.views.vars`
TODO: description of how to override vue templates
-->

More documentation about their usage can be found in [config.js](./lib/config.js).

## How It Works

<!--
TODO: general
TODO: description of `bedrock-views.vars.get` event
TODO: description of `bedrock-views.add` event (possibly rename as well)
-->

<!--
TODO: description of 'bedrock-views.cli.compile-less.configure' event
TODO: description of 'bedrock-views.cli.optimize.configure' event
TODO: description of 'bedrock-views.optimize.run' event
-->

[bedrock]: https://github.com/digitalbazaar/bedrock
[bedrock-express]: https://github.com/digitalbazaar/bedrock-express
[bedrock-views]: https://github.com/digitalbazaar/bedrock-views
[bedrock-vue]: https://github.com/digitalbazaar/bedrock-vue
[bedrock-webpack]: https://github.com/digitalbazaar/bedrock-webpack
[bootstrap]: http://getbootstrap.com/
[clean-css]: https://github.com/jakubpawlowicz/clean-css
[less]: https://github.com/less/less.js/
[webpack]: https://webpack.js.org/
[Less]: http://lesscss.org/
[Swig]: http://paularmstrong.github.io/swig/
[Vue]: https://vuejs.org/
