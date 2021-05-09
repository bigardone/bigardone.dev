---
title: Trello tribute with Phoenix and React (pt.2)
date: 2016-01-11
tags: elixir, phoenix, react, webpack, redux
excerpt:
  Phoenix Framework project setup for creating a Trello clone.
canonical: https://blog.diacode.com/trello-clone-with-phoenix-and-react-pt-2
---
<div class="index">
  <p>This post belongs to the <strong>Trello tribute with Phoenix Framework and React</strong> series.</p>
  <ol>
    <li><a href="/blog/2016/01/04/trello-tribute-with-phoenix-and-react-pt-1">Intro and selected stack</a></li>
    <li><a href="/blog/2016/01/11/trello-tribute-with-phoenix-and-react-pt-2">Phoenix Framework project setup</a></li>
    <li><a href="/blog/2016/01/12/trello-tribute-with-phoenix-and-react-pt-3">The User model and JWT auth</a></li>
    <li><a href="/blog/2016/01/14/trello-tribute-with-phoenix-and-react-pt-4/">Front-end for sign up with React and Redux</a></li>
    <li><a href="/blog/2016/01/18/trello-tribute-with-phoenix-and-react-pt-5/">Database seeding and sign in controller</a></li>
    <li><a href="/blog/2016/01/20/trello-tribute-with-phoenix-and-react-pt-6/">Front-end authentication with React and Redux</a></li>
    <li><a href="/blog/2016/01/25/trello-tribute-with-phoenix-and-react-pt-7/">Sockets and channels</a></li>
    <li><a href="/blog/2016/01/28/trello-tribute-with-phoenix-and-react-pt-8/">Listing and creating boards</a></li>
    <li><a href="/blog/2016/02/04/trello-tribute-with-phoenix-and-react-pt-9/">Adding new board members</a></li>
    <li><a href="/blog/2016/02/15/trello-tribute-with-phoenix-and-react-pt-10/">Tracking connected board members</a></li>
    <li><a href="/blog/2016/02/24/trello-tribute-with-phoenix-and-react-pt-11/">Adding lists and cards</a></li>
    <li><a href="/blog/2016/03/04/trello-tribute-with-phoenix-and-react-pt-12/">Deploying our application on Heroku</a></li>
  </ol>

  <a href="https://phoenix-trello.herokuapp.com/"><i class="fa fa-cloud"></i> Live demo</a> |
  <a href="https://github.com/bigardone/phoenix-trello"><i class="fa fa-github"></i> Source code</a>
</div>

## Project setup
So now that we have selected our [current stack](/blog/2016/01/04/trello-tribute-with-phoenix-and-react-pt-1)
let's start by creating the new **Phoenix** project. Before doing so we need to
have both **[Elixir](http://elixir-lang.org/)** and **[Phoenix](http://www.phoenixframework.org/)** already installed in our system so check out
both official sites for [installation instructions](http://www.phoenixframework.org/docs/installation).

### Static assets through Webpack

Compared to Ruby on Rails, **Phoenix** doesn't have its own asset pipeline, instead it uses **[Brunch](http://brunch.io/)** as
the assets build tool which to me feels more modern and flexible. The cool thing
is that you don't even need to use **Brunch** if you don't want to, you can also
use **[Webpack](https://webpack.github.io)**. As I haven't tried **Brunch** before so we're going to use
**Webpack** instead.

Phoenix has **node.js** as an [optional dependency](http://www.phoenixframework.org/docs/installation#section-node-js-5-0-0-), as it's required by Brunch, however Webpack also requires node.js, so make sure you have node.js installed as well.


Let's create the new Phoenix project without Brunch:

```bash
$ mix phoenix.new --no-brunch phoenix_trello
  ...
  ...
  ...
$ cd phoenix_trello
```

Alright, now we have our new project created with no assets building tool. Let's
create a new ```package.json``` file and install **Webpack** as a dev dependency:

```bash
$ npm init
  ... (You can just hit enter when prompted for setting default values.)
  ...
  ...
$ npm i webpack --save-dev
```

Now our ```package.json``` should look something similar to this:

```json
{
  "name": "phoenix_trello",
  "devDependencies": {
    "webpack": "^1.12.9"
  },
  "dependencies": {
    ...
    "phoenix": "file:deps/phoenix",
    "phoenix_html": "file:deps/phoenix_html",
    ...
  },
}
```

We are going to need a bunch of dependencies in the project so instead of listing
them all please take a look to the
<a href="https://github.com/bigardone/phoenix-trello/blob/master/package.json">source file</a>
in the project's repository to copy and paste them into the `package.json` file.
Now we have to run the following command to install all the packages:

```bash
$ npm install
```

We also need to add a ```webpack.config.js``` configuration file to tell **Webpack**
how to build the assets:

```javascript
'use strict';

var path = require('path');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var webpack = require('webpack');

function join(dest) { return path.resolve(__dirname, dest); }

function web(dest) { return join('web/static/' + dest); }

var config = module.exports = {
  entry: {
    application: [
      web('css/application.sass'),
      web('js/application.js'),
    ],
  },

  output: {
    path: join('priv/static'),
    filename: 'js/application.js',
  },

  resolve: {
    extensions: ['', '.js', '.sass'],
    modulesDirectories: ['node_modules'],
  },

  module: {
    noParse: /vendor\/phoenix/,
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel',
        query: {
          cacheDirectory: true,
          plugins: ['transform-decorators-legacy'],
          presets: ['react', 'es2015', 'stage-2', 'stage-0'],
        },
      },
      {
        test: /\.sass$/,
        loader: ExtractTextPlugin.extract('style', 'css!sass?indentedSyntax&includePaths[]=' + __dirname +  '/node_modules'),
      },
    ],
  },

  plugins: [
    new ExtractTextPlugin('css/application.css'),
  ],
};

if (process.env.NODE_ENV === 'production') {
  config.plugins.push(
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin({ minimize: true })
  );
}

```

Here we specify we want two different [webpack entries](https://webpack.github.io/docs/multiple-entry-points.html), one for the JavaScript
and the other one for stylesheets, both placed inside the ```web/static``` folder.
Our output files are going to be created in the ```private/static``` folder.
As we are going to use some **ES6/7** and **JSX** features we will use **Babel**
with some presets designed for this.

The final step is to tell **Phoenix** to start **Webpack** every time we start our
development server, so it watches our changes while we are developing and generates
the resulting asset files that the main view layout is going to reference. To do so we have
to add a watcher in the ```config/dev.exs``` file:

```elixir
# config/dev.exs

config :phoenix_trello, PhoenixTrello.Endpoint,
  http: [port: 4000],
  debug_errors: true,
  code_reloader: true,
  cache_static_lookup: false,
  check_origin: false,
  watchers: [
    node: ["node_modules/webpack/bin/webpack.js", "--watch", "--color", cd: Path.expand("../", __DIR__)]
  ]

...
```

If we now start our development server we can see that **Webpack** is also running and
watching:

```bash
$ mix phoenix.server
[info] Running PhoenixTrello.Endpoint with Cowboy using http on port 4000
Hash: 93bc1d4743159d9afc35
Version: webpack 1.12.10
Time: 6488ms
              Asset     Size  Chunks             Chunk Names
  js/application.js  1.28 MB       0  [emitted]  application
css/application.css  49.3 kB       0  [emitted]  application
   [0] multi application 40 bytes {0} [built]
    + 397 hidden modules
Child extract-text-webpack-plugin:
        + 2 hidden modules
```

### Front-end basic structure
Now that we have everything ready to start coding, let's begin by creating our
front-end app structure which is going the need the following **npm** packages
among others:

  - **bourbon** and **bourbon-neat**, my all time favorite Sass mixin library.
  - **history** to manage history with JavaScript.
  - **react** and **react-dom**.
  - **redux** and **react-redux** for handling the state.
  - **react-router** as routing library.
  - **redux-simple-router** to keep route changes in the state.

I'm not going to waste any time on talking about stylesheets as I'm still modifying
them at this moment but what I'd like to mention is that for creating a suitable
file structure to organize my **Sass** files I usually follow <a href="http://css-burrito.com/">css-burrito</a>,
which in my personal opinion is very useful.

We need to configure our **Redux** store so let's create the following file:

```javascript
//web/static/js/store/index.js

import { createStore, applyMiddleware } from 'redux';
import { routerMiddleware }             from 'react-router-redux';
import createLogger                     from 'redux-logger';
import thunkMiddleware                  from 'redux-thunk';
import reducers                         from '../reducers';

const loggerMiddleware = createLogger({
  level: 'info',
  collapsed: true,
});

export default function configureStore(browserHistory) {
  const reduxRouterMiddleware = routerMiddleware(browserHistory)
  const createStoreWithMiddleware = applyMiddleware(reduxRouterMiddleware, thunkMiddleware, loggerMiddleware)(createStore);

  return createStoreWithMiddleware(reducers);
}
```

Basically we are configuring the **Store** with three middlewares:

  - **routerMiddleware** to dispatch router actions to the store.
  - **redux-thunk** to dispatch async actions.
  - **redux-logger** to log any action and state changes through the browser's console.

We also need to pass all the combined state reducers, so let's create a basic
version of that file:

```javascript
//web/static/js/reducers/index.js

import { combineReducers }  from 'redux';
import { routerReducer }    from 'react-router-redux';
import session              from './session';

export default combineReducers({
  routing: routeReducer,
  session: session,
});
```

As starting point we are only going to need two reducers, the ```routeReducer```
which will automatically set routing changes into the state and a ```session``` reducer
which looks like this:

```javascript
//web/static/js/reducers/session.js

const initialState = {
  currentUser: null,
  socket: null,
  error: null,
};

export default function reducer(state = initialState, action = {}) {
  return state;
}
```

Its initial state will consists of the ```currentUser``` object which we will
set after authenticating visitors, the ```sockect``` that we will use for connecting to
channels and an ```error``` to keep track of any issue while authenticating
the user.

Having all this prepared now we can go to our main ```application.js``` file and
render de ```Root``` component:

```javascript
//web/static/js/application.js

import React                    from 'react';
import ReactDOM                 from 'react-dom';
import { browserHistory }       from 'react-router';
import { syncHistoryWithStore } from 'react-router-redux';
import configureStore           from './store';
import Root                     from './containers/root';

const store = configureStore(browserHistory);
const history = syncHistoryWithStore(browserHistory, store);

const target = document.getElementById('main_container');
const node = <Root routerHistory={history} store={store} />;

ReactDOM.render(node, target);
```

We create the  history, configure the store we finally render the ```Root``` component
in the main application layout which will be a **Redux** ```Provider``` wrapper for the ```routes```:

```javascript
//web/static/js/containers/root.js

import React, { PropTypes }         from 'react';
import { Provider }                 from 'react-redux';
import { Router, RoutingContext }   from 'react-router';
import invariant                    from 'invariant';
import configRoutes                 from '../routes';

const propTypes = {
  routerHistory: PropTypes.object.isRequired,
  store: PropTypes.object.isRequired
};

const Root = ({ routerHistory, store }) => {
  invariant(
    routerHistory,
    '<Root /> needs either a routingContext or routerHistory to render.'
  );

  return (
    <Provider store={store}>
      <Router history={routerHistory}>
        {configRoutes(store)}
      </Router>
    </Provider>
  );
};

Root.propTypes = propTypes;
export default Root;
```

Now let's define our, very basic, routes file:

```javascript
//web/static/js/routes/index.js

import { IndexRoute, Route }  from 'react-router';
import React                  from 'react';
import MainLayout             from '../layouts/main';
import RegistrationsNew       from '../views/registrations/new';

export default (
  <Route component={MainLayout}>
    <Route path="/" component={RegistrationsNew} />
  </Route>
);
```

Our application is going to be wrapped inside the ```MainLayout``` component and
the root path will render the registrations view. The final version of this file
is a bit more complex due to the authentication
mechanism we'll be implementing, but we'll talk about it on the next post.

Finally we need to add the html container where we'll render the ```Root``` component
in the main **Phoenix** application layout:

```html
<!-- web/templates/layout/app.html.eex -->

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="">
    <meta name="author" content="ricardo@codeloveandboards.com">

    <title>Phoenix Trello</title>
    <link rel="stylesheet" href="<%= static_path(@conn, "/css/application.css") %>">
  </head>

  <body>
    <main id="main_container" role="main"></main>
    <script src="<%= static_path(@conn, "/js/application.js") %>"></script>
  </body>
</html>
```

Note both the link and the script tags referencing the static
assets generated by **Webpack**.

As we are going manage our routing on the front-end, we need to tell **Phoenix**
to handle any http request through the ```index``` action of the ```PageController```
which will just render the main layout and our ```Root``` component:

```elixir
# master/web/router.ex

defmodule PhoenixTrello.Router do
  use PhoenixTrello.Web, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_flash
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  scope "/", PhoenixTrello do
    pipe_through :browser # Use the default browser stack

    get "/*path", PageController, :index
  end
end
```

That's it for now. On the next post we'll be covering how to create our first database migration, the ```User```
model and all the functionality for creating new user accounts. In the meanwhile you can
check out the live demo and the final result source code:

<div class="btn-wrapper">
  <a href="https://phoenix-trello.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/phoenix-trello" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>

Happy coding!
