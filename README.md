# bedrock-views

A [bedrock][] module that combines a number of popular frontend technologies
to provide a modern, flexible, and extensible Web-based user interface. It
is coupled with [webpack][], and [bedrock-vue][], which provides
client-side resources.

**bedrock-views** has the following properties/features:
* Server-rendered views via a [consolidate.js][] templating engine
* Client-side [Vue][] application via [bedrock-vue][]
* Client-side modules and JavaScript optimization using [bedrock-webpack][]
* HTML and CSS framework via [bootstrap][] v3
* [Less][] compilation support via [less][]
* CSS optimization via [clean-css][]

## Requirements

- npm v6+

## Quick Examples

```
npm install @bedrock/views
```

Start an express server with an [Vue][] frontend:

```
npm install @bedrock/vue
```

```js
import * as bedrock from '@bedrock/core';

import '@bedrock/express';
import '@bedrock/server';
import '@bedrock/views';

bedrock.start();
```

<!--
TODO: command line usage of compile-less
TODO: command line usage of optimize
-->

## Setup

1. npm install @bedrock/vue

## Configuration

**bedrock-views** uses [bedrock][]'s configuration to expose its own
options and to expose [less][], [clean-css][], and [html-minifier][] options.

<!--
TODO: description of `bedrock.config.views.vars`
TODO: description of how to override vue templates
-->

More documentation about their usage can be found in [config.js](./lib/config.js).

<!--
TODO: description of 'bedrock-views.cli.compile-less.configure' event
TODO: description of 'bedrock-views.cli.optimize.configure' event
TODO: description of 'bedrock-views.optimize.run' event
-->

## License

[Apache License, Version 2.0](LICENSE) Copyright 2011-2024 Digital Bazaar, Inc.

Other Bedrock libraries are available under a non-commercial license for uses
such as self-study, research, personal projects, or for evaluation purposes.
See the
[Bedrock Non-Commercial License v1.0](https://github.com/digitalbazaar/bedrock/blob/main/LICENSES/LicenseRef-Bedrock-NC-1.0.txt)
for details.

Commercial licensing and support are available by contacting
[Digital Bazaar](https://digitalbazaar.com/) <support@digitalbazaar.com>.

[bedrock]: https://github.com/digitalbazaar/bedrock
[bedrock-express]: https://github.com/digitalbazaar/bedrock-express
[bedrock-views]: https://github.com/digitalbazaar/bedrock-views
[bedrock-vue]: https://github.com/digitalbazaar/bedrock-vue
[bedrock-webpack]: https://github.com/digitalbazaar/bedrock-webpack
[bootstrap]: http://getbootstrap.com/
[clean-css]: https://github.com/jakubpawlowicz/clean-css
[consolidate.js]: https://github.com/tj/consolidate.js
[less]: https://github.com/less/less.js/
[webpack]: https://webpack.js.org/
[Less]: http://lesscss.org/
[Vue]: https://vuejs.org/
