---
title: Page specific JavaScript in Phoenix framework (pt.2)
date: 2016-04-26 09:31 UTC
canonical: https://blog.diacode.com/page-specific-javascript-in-phoenix-framework-pt-2
excerpt:
  Page specific JavaScript in Phoenix projects with webpack
tags:
  - elixir
  - phoenix
  - javascript
  - webpack
---

<div class="index">
  <p>This post belongs to the <strong>Page specific JavaScript in Phoenix framework</strong> series.</p>
  <ol>
    <li><a href="/blog/2016/04/22/page-specific-javascript-in-phoenix-framework-pt-1/">Brunch and ES6 approach</a></li>
    <li><a href="/blog/2016/04/26/page-specific-javascript-in-phoenix-framework-pt-2/">Webpack approach</a></li>
  </ol>
</div>

## Simple approach using webpack

In the [previous part][86c1d53b] we designed a mechanism for organizing and
requiring page specific **JavaScript** in a new **Phoenix** project using
its defaul asset manager and build tool, [Brunch][6ee6be5c]. Another great thing
about **Phoenix** is that it gives you plenty of freedom to use any other alternative
like, for instance, [webpack][d29827dc]. One of the cool things about **webpack**
is its [dynamic requires][b80e02a9] and we can take it as an advantage for building
a more flexible and straightforward mechanism, removing the manual import of
every js view module we did last time:

```javascript
// web/static/js/views/loader.js

import MainView    from './main';
import PageNewView from './page/new';
import PageEditView from './page/edit';
import UserShoView from './user/show';

// Let's get rid of this!
const views = {
  PageNewView,
  PageEditView,
  UserShoView,
};

// ...
```

So let's get started!

### Switching to webpack

Before continuing we have to make some minor changes to the project in order to
switch from **brunch** to **webpack**. This changes can be found in this [commit][cd849838], but
we are going to go through them right now. To begin with we need to remove the `brunch-config.js`
file in the `./node_modules` folder. We also need to update the `package.json` file so we replace all the necessary packages needed:

```json
{
  "repository": {},
  "dependencies": {
    "phoenix": "file:deps/phoenix",
    "phoenix_html": "file:deps/phoenix_html"
  },
  "devDependencies": {
    "babel-core": "^6.7.7",
    "babel-loader": "^6.2.4",
    "babel-preset-es2015": "^6.6.0",
    "copy-webpack-plugin": "^2.1.3",
    "css-loader": "^0.23.1",
    "extract-text-webpack-plugin": "^1.0.1",
    "style-loader": "^0.13.1",
    "webpack": "^1.13.0"
  }
}
```

Don't forget to run `npm install` after. Now we need to add a basic **webpack** configuration file:

```javascript
// webpack.config.js

var ExtractTextPlugin = require('extract-text-webpack-plugin');
var CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: [
    './web/static/js/app.js',
    './web/static/css/app.css',
  ],
  output: {
    path: './priv/static',
    filename: 'js/app.js',
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel',
        query: {
          presets: ['es2015'],
        },
      },
      {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract('style', 'css'),
      },
    ],
  },
  plugins: [
    new ExtractTextPlugin('css/app.css'),
    new CopyWebpackPlugin([{ from: './web/static/assets' }]),
  ],
};
```

The final step is to change the development configuration file to use **webpack** in the
`watchers` section, removing **brunch**:

```elixir
# config/dev.exs

use Mix.Config

config :phoenix_template, PhoenixTemplate.Endpoint,
  http: [port: 4000],
  debug_errors: true,
  code_reloader: true,
  check_origin: false,
  watchers: [node: ["node_modules/webpack/bin/webpack.js", "--watch", "--color"]]

# ..
# ..
```

Now we are ready for some **JavaScript** fun!

### Dynamic view/tempate specific JavaScript

The main goal is to dynamically load a **JavaScript** view module depending on the
current view and template the application is displaying to the user. In other words, if
it's displaying the `new` template for the `PageView` view module, it will need to
load a file located in `web/static/js/views/page/new.js`. Therefore, let's refactor
the `PageView` module so instead of generating a name generates a path string:

```ruby
# web/views/layout_view.ex

defmodule PhoenixTemplate.LayoutView do
  use PhoenixTemplate.Web, :view

  @doc """
  Generates path for the JavaScript view we want to use
  in this combination of view/template.
  """
  def js_view_path(conn, view_template) do
    [view_name(conn), template_name(view_template)]
    |> Enum.join("/")
  end

  # Takes the resource name of the view module and removes the
  # the ending *_view* string.
  defp view_name(conn) do
    conn
    |> view_module
    |> Phoenix.Naming.resource_name
    |> String.replace("_view", "")
  end

  # Removes the extion from the template and reutrns
  # just the name.
  defp template_name(template) when is_binary(template) do
    template
    |> String.split(".")
    |> Enum.at(0)
  end
end
```

We also need to update the `app.html.eex` layout so it references the new function:

```elixir
<!-- web/templates/layout/app.html.eex -->

...
...

<body data-js-view-path="<%= js_view_path(@conn, @view_template) %>">

...
```

After refreshing the browser and inspecting the source code it should look something like this:

```html
<body data-js-view-path="page/index">
```

Nex step is to modify the `loader.js` module, so it dynamically loads the generated
**js view path**:

```javascript
// web/static/js/views/loader.js

import MainView from './main';

export default function loadView(viewPath) {
  let view;

  try {
    const ViewClass = require('./' + viewPath);
    view = new ViewClass();
  } catch (e) {
    view = new MainView();
  }

  return view;
}
```

Notice how we don't need to import every specific view module no more. Using
webpack's `require` against the `viewPath` parameter will return the module if it
exists, otherwhise it will throw an error which will be caught to return a
new default `MainView`. We also need to slightly change the specific view modules
we have so we use **webpack**'s `module.exports` api:

```javascript
import MainView from '../main';

module.exports = class View extends MainView {
  mount() {
    super.mount();
    console.log('PageNewView mounted');
  }

  unmount() {
    super.unmount();
    console.log('PageNewView unmounted');
  }
};
```

And last but not least, the main `app.js` file also needs to be updated:

```javascript
// web/static/js/app.js

import loadView from './views/loader';

function handleDOMContentLoaded() {
  const viewName = document.getElementsByTagName('body')[0].dataset.jsViewPath;

  const view = loadView(viewName);
  view.mount();

  window.currentView = view;
}

function handleDocumentUnload() {
  window.currentView.unmount();
}

window.addEventListener('DOMContentLoaded', handleDOMContentLoaded, false);
window.addEventListener('unload', handleDocumentUnload, false);
```

And once we visit again [http://localhost:4000/](http://localhost:4000/) in our browser
we can check again in the console how everything is working just like before:

<img src="/images/blog/page-specific-javascript-phoenix/template-4.jpg">


### Conclusion

Thanks to **Phoenix**'s modern and flexible way of managing and building static
assets we can have a well organized front-end code. Whether we choose **Brunch**, **Webpack** or
any other available option we migh like, there's no excuse for returning back to
the dark days ruled by the **Asset Pipeline** and the spaghetti code. **Long live Phoenix**!

Check out the source code:
<div class="btn-wrapper">
  <a href="https://github.com/diacode/phoenix-template/tree/webpack" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>

Happy coding!

  [86c1d53b]: /blog/2016/04/22/page-specific-javascript-in-phoenix-framework-pt-1 "Part 1"
  [6ee6be5c]: http://brunch.io/ "Brunch.io"
  [d29827dc]: https://webpack.github.io/ "webpack"
  [b80e02a9]: https://webpack.github.io/docs/context.html#dynamic-requires "Dynamic requires"
  [cd849838]: https://github.com/diacode/phoenix-template/commit/ecec13cca08859e704563d83d96fa18500e7a2e4 "Commit"
