---
title: 'Rails and Flux with Marty.js II: Initial setup'
date: 2015-06-06
tags: rails, reactjs, flux, webpack
---

It's been more than two months since I wrote the first post about this [Rails and Flux Marty.js](/blog/2015/03/21/rails-and-flux-with-marty-js/) series, and many things have changed since then. I have started using <a href="http://webpack.github.io/" target="_blank">webpack</a> as the module bundler for my front-end JavaScript. This is because each day I code more and more front-end functionality and I find it a better approach than **Sprockets** when you need to manage dependencies and split your code in shareable modules across different views. Regarding **Marty.js** it's **v0.10** version has been released some days ago with significant changes so I've been refactoring the example application to implement them. 

I wasn't going to write this post at first, but as there are many differences involved in the process of creating the example application, I finally think it's worth it. So let's get started!

## Rails Sprockets + webpack
For this initial version, of the example application, we are going to make **webpack** and **Sprockets** play nicely together as this post series is not intended to be a tutorial about replacing one for the other. There are really good tutorials about it out there like <a href="http://clarkdave.net/2015/01/how-to-use-webpack-with-rails/" target="_blank">this</a> and <a href="https://www.reinteractive.net/posts/213-rails-with-webpack-why-and-how" target="_blank">this</a>. One of the reasons of why I like this approach of using both together is that there are some useful gems like <a href="https://github.com/railsware/js-routes" target="_blank">JsRoutes</a> (your Rails named routes in a JavaScript helper) and <a href="https://github.com/fnando/i18n-js" target="_blank">I18n.js</a> (your Rails translations accessible from your JavaScript) which I personally use quite a lot and I haven't tried a different way of using them without **Sprockets** (it's in my to-do list though).

### Necessary modules
Apart from the required loaders **webppack** is going to use to process our source code, we also need the following modules to code the application:

```json
// package.json

...

"dependencies": {
  # React library
  "react": "~0.13.1",
  # Marty library
  "marty": "~0.10.0",
  # Conditional classNames
  "classnames": "1.2.0",
  # Date and time handling
  "moment": "^2.10.3"
},

...
```

So let's install them

```
$ npm install --save
```

### Configuring webpack
The goal is to have all the front-end source of the application in the ```./app/frontend``` folder and we want **webpack** to process it and bundle it into the ```./app/assets/javascript``` folder so we can require it in our ```applications.js``` with **Sprockets** as we usually do in **Rails**. Having this in mind let's take a look to the ```webpack.config.js``` file:

```javascript
var path = require("path");
var webpack = require('webpack');

module.exports = {
  context: __dirname,
  entry: {
    // The initial source file
    main:  "./app/frontend/application.cjsx",
  },
  output: {
    // The result JavaScript file we are going to require
    // using Sprockets
    path: path.join(__dirname, 'app', 'assets', 'javascripts'),
    filename: "application_bundle.js",
    publicPath: "/js/",
    devtoolModuleFilenameTemplate: '[resourcePath]',
    devtoolFallbackModuleFilenameTemplate: '[resourcePath]?[hash]'
  },
  resolve: {
    extensions: ["", ".jsx", ".cjsx", ".coffee", ".js"]
  },
  module: {
    loaders: [
      // Webpack loaders for processing .coffee and .cjsx files
      { test: /\.cjsx$/, loaders: ["coffee", "cjsx"]},
      { test: /\.coffee$/,   loader: "coffee-loader"}
    ]
  },
  plugins: [
    // Global modules so we don't have to require them manually
    // on each file they are needed
    new webpack.ProvidePlugin({
      // We need to require react/addons so we can use addons
      'React': 'react/addons',
      'Marty': 'marty'
    })
  ]
}
```

Now we need to require the bundled file in the ```application.js.coffee``` manifest:

```coffee
# app/assets/javascripts/application.js.coffee

#= require jquery
#= require jquery_ujs
#= require turbolinks
#= require js-routes

#= require application_bundle
``` 

### Running webpack and Rails server together
So we have **webpack** configured and ready to process our front-end code but we still have to make it aware of the changes so they can be processed and refreshed into our application automatically. To do so we are going to use the <a href="https://github.com/ddollar/foreman" target="_blank">Foreman gem</a>:

```ruby
# Gemfile

...
group :development do
  gem 'foreman'
end
...
```

```
$ bundle install
```

And let's create a ```Procfile``` file so we can start the Rails server and **webpack** simultaneously:

```
# Procfile.dev
web: bundle exec spring rails server
webpack: webpack --watch --colors
```

And to start working we just have to run:

```
$ foreman start -f Procfile.dev
```

Now that everything is configured and tied up correctly, we can start with the fun part. I'm going to leave this post right here because it's starting to get longer than I expected. I'm also going to start writing the next one so I can have it ready for next week,  where we'll start creating the main **Marty** application and we'll see the main **Flux** elements involved.

Happy coding!

<img src="/images/blog/rails_and_flux/final_result.jpg" alt="Rails and Flux" style="background: #fff;" />
<div class="btn-wrapper">
  <a href="http://rails-and-flux.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/rails_and_flux" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>

