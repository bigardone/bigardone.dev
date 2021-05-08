---
title: Elixir and Phoenix basic passwordless and databaseless authentication (pt. 3)
date: 2018-08-31
tags: elixir, phoenix, elm
excerpt: Setting up webpack as our asset bundler and the Elm single-page application.
---

<div class="index">
  <p>This post belongs to the <strong>Elixir and Phoenix basic passwordless and databaseless authentication</strong> series.</p>
  <ol>
    <li><a href="/blog/2018/06/09/elixir-and-phoenix-basic-passwordless-and-databaseless-authentication-pt-1">Project setup and the initial functionality for storing and verifying authentication tokens</a></li>
    <li><a href="/blog/2018/06/20/elixir-and-phoenix-basic-passwordless-and-databaseless-authentication-pt-2">Sending authentication link emails and the user socket connection</a></li>
    <li><a href="/blog/2018/09/01/elixir-and-phoenix-basic-passwordless-and-databaseless-authentication-pt-3">Setting up webpack as our asset bundler and the Elm single-page application</a></li>
  </ol>

  <a href="https://github.com/bigardone/passwordless-auth" target="_blank"><i class="fa fa-github"></i> Source code</a>
</div>

In the [previous part] of the series, we covered all the back-end logic regarding sending authentication emails and using the generated tokens to authenticate the connection of a **Phoenix** socket. In this part, we are going to focus on the front-end, building the **Elm** single page application skeleton, and using the websockect authentication to hide some parts of it to unauthenticated users. Let's get cracking!

## Front-end setup
I've been using **Elixir** and **Phoenix** in the back-end, and **Elm** in the front-end, for almost three years already, and I'm delighted with the result. I tend to use Phoenix's default asset bundler, [Brunch], but I've been having some issues lately with it, especially while using its **Elm** and **SASS** plugins. Therefore, for this particular experiment, I wanted to test out other alternatives, replacing Brunch with [webpack] and **SASS** with [Tailwind CSS], which I'm starting to like a lot and seems like the first strong candidate to replace **SASS** in my front-end stack. Recalling the [first part] of the series, we created the project using the --no-brunch flag, which doesn't install Brunch so that we can add **webpack** directly. For that, I followed [this great article] from [@_GazD], taking the parts that I needed and making some small changes to add **Elm** support.

### Adding webpack to the project

This being said, let's start by adding a `package.json` file to the `passwordless_auth_web` application:

```json
// apps/passwordless_auth_web/assets/package.json

{
  "repository": {},
  "license": "MIT",
  "scripts": {
    "deploy": "webpack --mode production",
    "watch": "webpack --mode development --watch"
  },
  "dependencies": {
    "phoenix": "file:../../../deps/phoenix",
    "phoenix_html": "file:../../../deps/phoenix_html"
  },
  "devDependencies": {
    "autoprefixer": "^8.6.0",
    "babel-core": "^6.26.0",
    "babel-loader": "^7.1.3",
    "babel-preset-env": "^1.6.1",
    "copy-webpack-plugin": "^4.5.0",
    "css-loader": "^0.28.10",
    "elm": "^0.18.0",
    "elm-webpack-loader": "^4.5.0",
    "mini-css-extract-plugin": "^0.4.0",
    "optimize-css-assets-webpack-plugin": "^4.0.0",
    "postcss-loader": "^2.1.5",
    "style-loader": "^0.21.0",
    "tailwindcss": "^0.5.3",
    "uglifyjs-webpack-plugin": "^1.2.4",
    "webpack": "^4.10.0",
    "webpack-cli": "^3.0.0"
  }
}
```

These are all the necessary dependencies that we need to add support for **webpack*,* **Elm** and **Tailwind CSS**, although bear in mind that package versions might be outdated since I wrote this part. We can continue by adding the necessary configuration files:

```bash
$ curl https://raw.githubusercontent.com/phoenixframework/phoenix/master/installer/templates/phx_assets/webpack/webpack.config.js > apps/passwordless_auth_web/assets/webpack.config.js
$ curl https://raw.githubusercontent.com/phoenixframework/phoenix/master/installer/templates/phx_assets/webpack/babelrc > apps/passwordless_auth_web/assets/.babelrc
```

Let's continue by installing all the necessary dependencies:

```bash
$ cd apps/passwordless_auth_web/assets && npm install
```

We want **Phoenix** to update the changes we make while developing, so let's add the convenient watcher for this:

```elixir
# apps/passwordless_auth_web/config/dev.exs

use Mix.Config

config :passwordless_auth_web, PasswordlessAuthWeb.Endpoint,
  http: [port: 4000],
  debug_errors: true,
  code_reloader: true,
  check_origin: false,
  watchers: [
    node: [
      "node_modules/webpack/bin/webpack.js",
      "--mode",
      "development",
      "--watch-stdin",
      cd: Path.expand("../assets", __DIR__)
    ]
  ]

# ...
```

### Configuring Tailwind CSS

To generate Tailwind's configuration file, we have to do the following:

```bash
$ cd apps/passwordless_auth_web/assets && ./node_modules/.bin/tailwind init
```

Next, we have to make **webpack** process **CSS** and **Tailwind** using **postcss**:

```javascript
// apps/passwordless_auth_web/assets/webpack.config.js

const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, options) => ({
  optimization: {
    minimizer: [
      new UglifyJsPlugin({ cache: true, parallel: true, sourceMap: false }),
      new OptimizeCSSAssetsPlugin({}),
    ],
  },
  entry: './js/app.js',
  output: {
    filename: 'app.js',
    path: path.resolve(__dirname, '../priv/static/js'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader'],
      }
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: '../css/app.css' }),
    new CopyWebpackPlugin([{ from: 'static/', to: '../' }]),
  ],
});
```

```javascript
// apps/passwordless_auth_web/assets/postcss.config.js

module.exports = {
  plugins: [
    require('tailwindcss')('./tailwind.js'),
    require('autoprefixer')
  ]
}
```

Finally, we need to import the main **CSS** file in the main javascript file and add all the necessary **Tailwind** hooks:

```javascript
// apps/passwordless_auth_web/assets/js/app.js

import css from "../css/app.css";
```

```css
/* apps/passwordless_auth_web/assets/css/app.css */

@tailwind preflight;
@tailwind components;
@tailwind utilities;
```

### Adding Elm support

To make **Elm** work with **webpack**, we need to edit its configuration file:

```javascript
// apps/passwordless_auth_web/assets/webpack.config.js

// ...

module.exports = (env, options) => ({
  // ...

  module: {
    rules: [
      // ...
      {
        test: /\.elm$/,
        exclude: ['/elm-stuff/', '/node_modules'],
        loader: 'elm-webpack-loader',
        options: {
          debug: true,
          warn: true,
          cwd: path.resolve(__dirname, 'elm'),
        },
      },
    ],
    noParse: [/.elm$/],
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: '../css/app.css' }),
    new CopyWebpackPlugin([{ from: 'static/', to: '../' }]),
  ],
});
```

To install all the necessary **Elm** packages let's add the following file:

```json
// apps/passwordless_auth_web/assets/elm/elm-package.json

{
    "version": "1.0.0",
    "summary": "helpful summary of your project, less than 80 characters",
    "repository": "https://github.com/user/project.git",
    "license": "BSD3",
    "source-directories": [
        "./src",
        "./vendor"
    ],
    "exposed-modules": [],
    "dependencies": {
        "NoRedInk/elm-decode-pipeline": "3.0.0 <= v < 4.0.0",
        "elm-lang/core": "5.1.1 <= v < 6.0.0",
        "elm-lang/html": "2.0.0 <= v < 3.0.0",
        "elm-lang/http": "1.0.0 <= v < 2.0.0",
        "elm-lang/navigation": "2.1.0 <= v < 3.0.0",
        "elm-lang/websocket": "1.0.2 <= v < 2.0.0",
        "evancz/url-parser": "2.0.1 <= v < 3.0.0"
    },
    "elm-version": "0.18.0 <= v < 0.19.0"
}
```

And run the following command:

```bash
$ cd apps/passwordless_auth_web/assets/elm && elm package install
```

Now we can add a very basic **Elm** application to check that everything is working as expected:

```elm
-- apps/passwordless_auth_web/assets/elm/src/Main.elm

module Main exposing (..)

import Html exposing (Html)


type alias Model =
    {}


init : ( Model, Cmd Msg )
init =
    {} ! []


type Msg
    = Noop


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        Noop ->
            model ! []


view : Model -> Html Msg
view model =
    Html.text "Hello from Elm!"


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none


main : Program Never Model Msg
main =
    Html.program
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        }
```

We probably still have the default layout template from **Phoenix**, so let's replace its content with the following:

```html
<!-- apps/passwordless_auth_web/lib/passwordless_auth_web/templates/layout/app.html.eex  -->

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="">
    <meta name="author" content="">
    <link rel="stylesheet" href="<%= static_path(@conn, "/css/app.css") %>">
    <title>Passwordless Auth</title>
  </head>

  <body>
    <%= render @view_module, @view_template, assigns %>
    <script src="<%= static_path(@conn, "/js/app.js") %>"></script>
  </body>
</html>
```

We also need to add the container in which we are going to render the **Elm** application:

```html
<!-- apps/passwordless_auth_web/lib/passwordless_auth_web/templates/page/index.html.eex -->

<div id="elm-main" class="flex items-center justify-center h-screen">
</div>
```

And finally, create the **Elm** application and render it in its container:

```javascript
// apps/passwordless_auth_web/assets/js/app.js

import css from '../css/app.css';
import Elm from '../elm/src/Main.elm';

const elmDiv = document.getElementById('elm-main');

if (elmDiv) {
  const app = Elm.Main.embed(elmDiv);
}
```

Now we are ready to start Phoenix's server, visit [http://localhost:4000](http://localhost:4000) and watch our basic **Elm** application render correctly, yay!

![Basic application](https://monosnap.com/image/hOk7G1IDEdtHhSdEBwTu5ZK3rhLvHz)

There is one thing left to do though. We are going to use the [elm-phoenix](https://github.com/saschatimme/elm-phoenix) library to handle **Phoenix** sockets communication, therefore we need to download the content of [this folder](https://github.com/bigardone/passwordless-auth/tree/master/apps/passwordless_auth_web/assets/elm/vendor) and place it in the `apps/passwordless_auth_web/assets/elm/vendor` folder.

## Building the Elm application

Now that our basic **Elm** application is working let's make some changes to the **Phoenix** controller and template in charge of rendering it.

```elixir
# apps/passwordless_auth_web/lib/passwordless_auth_web/controllers/page_controller.ex

defmodule PasswordlessAuthWeb.PageController do
  use PasswordlessAuthWeb, :controller

  def index(conn, params) do
    conn
    |> assign(:token, Map.get(params, "token", ""))
    |> render("index.html")
  end
end
```

The first change consists of assigning the received `token` value from the authentication link to the connection so that we can pass it to the **Elm** application as a flag. We also need to pass the socket URL, so let's create a helper function for that:

```elixir
# apps/passwordless_auth_web/lib/passwordless_auth_web/views/page_view.ex

defmodule PasswordlessAuthWeb.PageView do
  use PasswordlessAuthWeb, :view

  def socket_url do
    PasswordlessAuthWeb.Endpoint.url()
    |> String.replace("http", "ws")
    |> Kernel.<>("/socket/websocket")
  end
end
```

Now we can set these two values in the template:

```elixir
# apps/passwordless_auth_web/lib/passwordless_auth_web/templates/page/index.html.eex

<div id="elm-main" class="flex items-center justify-center h-screen">
</div>

<script>
  window.token = '<%= @token %>';
  window.socketUrl = '<%= socket_url() %>';
</script>
```

And finally pass them as flags in the Elm application:

```js
// apps/passwordless_auth_web/assets/js/app.js

import Elm from '../elm/src/Main.elm';
import css from '../css/app.css';

const elmDiv = document.getElementById('elm-main');

let token = window.token;
const socketUrl = window.socketUrl;

if (token === '' || token == null) token = window.localStorage.getItem('token');

if (elmDiv) {
  const app = Elm.Main.embed(elmDiv, { token, socketUrl });

  app.ports.saveToken.subscribe((token) => {
    window.localStorage.setItem('token', token);
  });
}
```

We have also added a port for saving the token into `localStorage`, that we are going to use later on.

Before continuing any further, let's take a moment to think about what we are building, using the following mock image:

![Routes](https://monosnap.com/image/Isrs18qTVpNMYfWcXNuq9RbvG7Z4nS.png)

To test out our passwordless authentication experiment, we only need a couple of screens and routes:

1. `/` which is only accessible by authenticated users, and can potentially have any private data we want to display.
2. `/sign-in` which is public, renders the form to request the magic link, and is where we are redirecting any user that tries to navigate to `/` without being properly authenticated.

Having this in mind, we can start by implementing the routing module, so we can add these two routes:

```elm
-- apps/passwordless_auth_web/assets/elm/src/Route.elm


module Route
    exposing
        ( Route(..)
        , fromLocation
        , newUrl
        )

import Navigation exposing (Location)
import UrlParser as Url exposing ((</>), Parser, oneOf, s, string, parsePath)


-- ROUTING --


type Route
    = SignInRoute
    | LobbyRoute


matchers : Parser (Route -> a) a
matchers =
    oneOf
        [ Url.map LobbyRoute <| s ""
        , Url.map SignInRoute <| s "sign-in"
        ]



-- INTERNAL --


routeToString : Route -> String
routeToString page =
    let
        pieces =
            case page of
                LobbyRoute ->
                    []

                SignInRoute ->
                    [ "sign-in" ]
    in
        "/" ++ String.join "/" pieces



-- PUBLIC HELPERS --


newUrl : Route -> Cmd msg
newUrl =
    routeToString >> Navigation.newUrl


fromLocation : Location -> Maybe Route
fromLocation location =
    parsePath matchers location
```

Now that we have defined the routes that we need, let's move on to the main elm module and start coding the application. In many of my **Elm** projects and tutorials, I've been organizing all the **Elm** code in folders, creating one for each route. Inside of these folders, I tended to add four different files, one for each of the Model, Messages, Update and View modules of that route. This approach used to work fine for small projects, but it didn't scale that well for bigger ones. Then I read [Richard Feldman's] article [Tour of an Open-Source Elm SPA], and I have started to organize my new **Elm** projects following his recommendations, feeling more comfortable now when they start to grow.

### The Page modules

Although this is a very small project, we will stick to Richard's approach, therefore let's get started by defining the page modules that define the logic for each screen for the application, and which we will use from the main module depending on which is the current page set in the application.

#### Page.SignIn

The first page we are implementing is the sign-in page. The goal is to define everything we need as it was a standalone **Elm** program, except that it does not have a view function, and the entry point can be either an init function to load any necessary data from the backend or its initial model:

```elm
-- apps/passwordless_auth_web/assets/elm/src/Page/SignIn.elm

module Page.SignIn
    exposing
        ( Model
        , SignInForm(..)
        , Msg(..)
        , update
        , initialModel
        )

import Http
import Json.Encode as Encode
import Json.Decode as Decode
import Request.Token exposing (requestToken)


-- MODEL --


type SignInForm
    = Editing String
    | Sending String
    | Success String
    | Error String


type alias Model =
    { form : SignInForm }


initialModel : Model
initialModel =
    { form = Editing "" }



-- UPDATE --


type Msg
    = HandleEmailInput String
    | HandleFormSubmit
    | FormSubmitResponse (Result Http.Error String)


update : Msg -> Model -> ( Model, Cmd Msg )
update msg ({ form } as model) =
    case ( msg, form ) of
        ( HandleEmailInput value, Editing _ ) ->
            { model | form = Editing value } ! []

        ( HandleFormSubmit, Editing email ) ->
            { model | form = Sending email } ! [ requestToken FormSubmitResponse email ]

        ( FormSubmitResponse payload, Sending _ ) ->
            case payload of
                Ok message ->
                    { model | form = Success message } ! []

                _ ->
                    { model | form = Error "We couldn't sent you your magic link due to an error, please try again later." } ! []

        _ ->
            model ! []


requestToken : (Result Http.Error String -> msg) -> String -> Cmd msg
requestToken msg email =
    let
        body =
            Encode.object [ ( "email", Encode.string email ) ]

        request =
            Http.request
                { method = "POST"
                , headers = []
                , url = "/api/auth"
                , body = Http.jsonBody body
                , expect = Http.expectJson requestTokenDecoder
                , timeout = Nothing
                , withCredentials = False
                }
    in
        Http.send msg request


requestTokenDecoder : Decode.Decoder String
requestTokenDecoder =
    Decode.at [ "message" ] Decode.string
```

The `Model` for this page consists of a record with a `form` custom type that represents the different states that we need in the sign-in form:

- `Editing String` when the user is typing so we can store the value typed.
- `Sending String` when the user submits the form so we can, for instance, render a spinner in the submit button.
- `Success String` which means a successful form submission, and the `String` received from the server.
- `Error String` if anything goes wrong, and we want to show an error message.

The `update` function is very simple too, handling the following messages:

- `HandleEmailInput String` when the form email input changes its value, storing it in the model.
- `HandleFormSubmit` sends the `requestToken` HTTP request.
- `FormSubmitResponse (Result Http.Error String)` which handles the response from the previous HTTP request.

#### Page.Lobby

The other page we need to implement is the one we want to display only to authenticated users:

```elm
-- apps/passwordless_auth_web/assets/elm/src/Page/Lobby.elm

module Page.Lobby exposing ( Model , Msg(..) , init , update)

import Json.Decode as Decode exposing (Value)
import Phoenix
import Phoenix.Push as Push exposing (Push)


-- MODEL --


type alias Model =
    { emails : List String }


initialModel : Model
initialModel =
    { emails = [] }



-- UPDATE --


type Msg
    = HandleInitSuccess Decode.Value


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        HandleInitSuccess payload ->
            case Decode.decodeValue usersDecoder payload of
                Ok emails ->
                    { model | emails = emails } ! []

                Err _ ->
                    model ! []


usersDecoder : Decode.Decoder (List String)
usersDecoder =
    Decode.at [ "data" ] <| Decode.list Decode.string



-- INIT --


init : String -> ( Model, Cmd Msg )
init socketUrl =
    ( initialModel
    , Push.init "admin:lobby" "data"
        |> Push.onOk HandleInitSuccess
        |> Phoenix.push socketUrl
    )
```

For simplicity's sake, the `Model` consists of a list of strings representing the list of emails able to authenticate into the application. The `init` function, called every time an authenticated user visits the `/` route, receives the `socketUrl` and pushes a `data` message to the `admin:lobby` channel through the socket (already connected, we'll get there in a minute). If the message result is successful, it receives the list of emails, handled by the `HandleInitSuccess` message, decodes the list and sets it as the new `Model`.

### The Views modules

Having the main Page modules done, let's focus now on the view modules for them.
Taking a look at the `Lobby` page, we can see that there is a navigation bar on top, with the signout link. This navigation bar will appear in all the future private screen that we might implement, so we need to share it somehow.

#### Views.Page

Let's add a basic module that wraps each particular view content in a container along with the navigation bar:

```elm
-- apps/passwordless_auth_web/assets/elm/src/Views/Page.elm

module Views.Page
    exposing
        ( frameView
        , headerView
        , Msg(..)
        )

import Data.Session exposing (Session(..))
import Html exposing (Html)
import Html.Attributes as Html
import Html.Events as Html


type Msg
    = SignOut


frameView : Session -> Html msg -> Html msg -> Html msg
frameView session header content =
    case session of
        Anonymous ->
            Html.text ""

        Authenticated _ ->
            Html.div
                [ Html.class "main-section flex-1 flex-col flex h-screen" ]
                [ header
                , Html.div
                    [ Html.class "main-content bg-grey-lightest flex-1 flex items-center justify-center" ]
                    [ content ]
                ]


headerView : Html Msg
headerView =
    Html.header
        [ Html.class "main-header" ]
        [ Html.nav
            [ Html.class "flex justify-between" ]
            [ Html.span
                [ Html.class "flex-1 p-4 text-white text-left" ]
                [ Html.text "Admin panel" ]
            , Html.a
                [ Html.class "p-4"
                , Html.onClick SignOut
                ]
                [ Html.text "Sign out" ]
            ]
        ]
```

It exposes two functions:

- `frameView` which defines the structure of all private screens.
- `headerView` which renders the top navigation bar, with the sign-out link.

`frameView` takes a `Session`, so we can render the contents only when the user is authenticated, and both the `header` and the `content` for the particular page it is rendering.

#### Views.SignIn

Let's add the view module for the `SignIn` page.

```elm
-- apps/passwordless_auth_web/assets/elm/src/Views/SignIn.elm

module Views.SignIn exposing (view)

import Html exposing (Html, form)
import Html.Attributes as Html
import Html.Events as Html
import Page.SignIn exposing (Model, SignInForm(..), Msg(..))


view : Model -> Html Msg
view { form } =
    let
        content =
            case form of
                Editing email ->
                    formView email

                Sending email ->
                    formView email

                Success text ->
                    successMessageView text

                Error text ->
                    errorMessageView text
    in
        Html.section
            [ Html.class "bg-purple-darker p-8 flex flex-1 items-center justify-center h-screen" ]
            [ content ]


formView : String -> Html Msg
formView email =
    Html.div
        []
        [ Html.img
            [ Html.src "/images/icons8-mailbox-128.png"
            , Html.class "mb-4 slide-in-blurred-top"
            ]
            []
        , Html.h3
            []
            [ Html.text "Password long? Hard to type?" ]
        , Html.p
            []
            [ Html.text "Get a magic link sent to your email that'll sign you instantly!" ]
        , form
            [ Html.class "w-full max-w-md"
            , Html.onSubmit HandleFormSubmit
            ]
            [ Html.input
                [ Html.class "appearance-none block w-full bg-grey-lighter text-grey-darker rounded py-3 px-4 mb-3"
                , Html.placeholder "foo@email.com"
                , Html.type_ "email"
                , Html.onInput HandleEmailInput
                , Html.value email
                ]
                []
            , Html.button
                [ Html.class "bg-blue hover:bg-blue-dark text-white py-3 px-4 mb-3 rounded w-full" ]
                [ Html.text "Send Magic Link" ]
            ]
        ]


successMessageView : String -> Html Msg
successMessageView message =
    Html.div
        []
        [ Html.img
            [ Html.src "/images/icons8-postal-128.png"
            , Html.class "mb-4 jello-horizontal"
            ]
            []
        , Html.h3
            []
            [ Html.text "Check your email" ]
        , Html.p
            []
            [ Html.text message ]
        ]


errorMessageView : String -> Html Msg
errorMessageView message =
    Html.div
        []
        [ Html.h3
            []
            [ Html.text "Whoops!" ]
        , Html.p
            []
            [ Html.text message ]
        ]
```

The `view` function returns the content to render, depending on the value of the custom type we created previously for the model's form.

#### View.Lobby

The next view we are going to implement is the view for the `Lobby` page, so let's go ahead and add it:

```elm
-- apps/passwordless_auth_web/assets/elm/src/Views/Lobby.elm

module Views.Lobby exposing (view)

import Html exposing (Html, form)
import Html.Keyed
import Html.Attributes as Html
import Data.Session exposing (User)
import Page.Lobby exposing (Model, Msg(..))


view : User -> Model -> Html Msg
view { email } model =
    Html.div
        []
        [ Html.img
            [ Html.src "/images/icons8-confetti-128.png"
            , Html.class "mb-4 jello-horizontal"
            ]
            []
        , Html.h3
            []
            [ Html.text <| "Welcome " ++ email ++ "!" ]
        , Html.p
            []
            [ Html.text "You signed in successfully." ]
        , Html.p
            []
            [ Html.text "List of authorized users:" ]
        , model
            |> List.map emailView
            |> Html.Keyed.ul [ Html.class "inline-block m-0 p-0" ]
        ]


emailView : String -> ( String, Html Msg )
emailView email =
    ( email
    , Html.li
        []
        [ Html.text email ]
    )
```

Its `view` function receives the current `User` and its model, which consists of a list of emails, and renders them in the screen.

#### View.NotFound

Finally, let's add the view to render unexisting pages, in case the user visits a wrong route:

```elm
-- apps/passwordless_auth_web/assets/elm/src/Views/NotFound.elm

module Views.NotFound exposing (view)

import Html exposing (Html, form)


view : Html msg
view =
    Html.div
        []
        [ Html.h1
            []
            [ Html.text "404" ]
        , Html.p
            []
            [ Html.text "Page not found" ]
        ]
```

### The Main module

With our page specific logic and views, we can start editing the `Main` module. As this module is quite big, let's split it into different chunks of code.

#### The model section

```elm
module Main exposing (main)

import Data.Session exposing (Session(..))
import Html exposing (Html, form, map)
import Json.Decode as Decode exposing (Value)
import Navigation exposing (Location)
import Page.Lobby
import Page.SignIn
import Phoenix
import Phoenix.Channel as Channel exposing (Channel)
import Phoenix.Push as Push exposing (Push)
import Phoenix.Socket as Socket exposing (AbnormalClose, Socket)
import Ports
import Route exposing (Route(..))
import Views.Lobby
import Views.Page
import Views.SignIn



-- MODEL --


type ConnectionStatus
    = Connecting
    | Connected ChannelState
    | Disconnected


type ChannelState
    = Joining
    | Joined
    | Left


type Page
    = BlankPage
    | NotFoundPage
    | SignInPage Page.SignIn.Model
    | LobbyPage Page.Lobby.Model


type alias Flags =
    { token : Maybe String
    , socketUrl : String
    }


type alias Model =
    { page : Page
    , session : Session
    , connectionStatus : ConnectionStatus
    , flags : Flags
    }
-- ...
```

The main `Model` consists of:

- `page` which is a custom type representing the current `Page` state.
- `session` which holds information about the authenticated user.
- `connectionStatus` which is another custom type representing the status of the socket connection and the channel state.
- `flags` which stores the configuration data passed from the outside while initializing the application.


#### The update section

```elm
-- UPDATE --


type Msg
    = SetRoute (Maybe Route)
    | ConnectionStatusChanged ConnectionStatus
    | HandleAdminChannelJoin Decode.Value
    | ViewsPageMsg Views.Page.Msg
    | HandleSignOutSuccess Decode.Value
    | PageSignInMsg Page.SignIn.Msg
    | PageLobbyMsg Page.Lobby.Msg


update : Msg -> Model -> ( Model, Cmd Msg )
update msg ({ flags, page } as model) =
    let
        { socketUrl } =
            flags

        toPage toModel toMsg subUpdate subMsg subModel =
            let
                ( newModel, newCmd ) =
                    subUpdate subMsg subModel
            in
            ( { model | page = toModel newModel }, Cmd.map toMsg newCmd )
    in
    case ( msg, page ) of
        ( SetRoute route, _ ) ->
            setRoute route model

        ( ConnectionStatusChanged connectionStatus, _ ) ->
            let
                cmds =
                    case connectionStatus of
                        Disconnected ->
                            [ Route.newUrl SignInRoute
                            , Ports.saveToken Nothing
                            ]

                        _ ->
                            []
            in
            { model | connectionStatus = connectionStatus } ! cmds

        ( HandleAdminChannelJoin payload, _ ) ->
            case Decode.decodeValue Data.Session.decoder payload of
                Ok user ->
                    { model
                        | session =
                            Authenticated user
                        , connectionStatus = Connected Joined
                    }
                        ! [ Ports.saveToken model.flags.token ]

                Err error ->
                    let
                        _ =
                            Debug.log "Error" error
                    in
                    model ! []

        ( HandleSignOutSuccess _, _ ) ->
            { model
                | connectionStatus = Disconnected
                , session = Anonymous
            }
                ! [ Route.newUrl SignInRoute, Ports.saveToken Nothing ]

        ( ViewsPageMsg subMsg, _ ) ->
            case subMsg of
                Views.Page.SignOut ->
                    model
                        ! [ Push.init "admin:lobby" "sign_out"
                                |> Push.onOk HandleSignOutSuccess
                                |> Phoenix.push socketUrl
                          ]

        ( ViewsPageMsg subMsg, _ ) ->
            case subMsg of
                Views.Page.SignOut ->
                    model
                        ! [ Push.init "admin:lobby" "sign_out"
                                |> Push.onOk HandleSignOutSuccess
                                |> Phoenix.push socketUrl
                          ]

        ( PageSignInMsg subMsg, SignInPage subModel ) ->
            toPage SignInPage PageSignInMsg Page.SignIn.update subMsg subModel

        ( PageLobbyMsg subMsg, LobbyPage subModel ) ->
            toPage LobbyPage PageLobbyMsg Page.Lobby.update subMsg subModel

        ( _, _ ) ->
            model ! []


setRoute : Maybe Route -> Model -> ( Model, Cmd Msg )
setRoute maybeRoute ({ connectionStatus, session, flags } as model) =
    let
        transition init page toMsg =
            let
                ( subModel, subCmd ) =
                    init
            in
            { model | page = page subModel } ! [ Cmd.map toMsg subCmd ]
    in
    case maybeRoute of
        Nothing ->
            { model | page = NotFoundPage } ! [ Cmd.none ]

        Just SignInRoute ->
            { model | page = SignInPage Page.SignIn.initialModel } ! [ Cmd.none ]

        Just LobbyRoute ->
            case connectionStatus of
                Disconnected ->
                    model ! [ Route.newUrl SignInRoute ]

                _ ->
                    transition (Page.Lobby.init flags.socketUrl) LobbyPage PageLobbyMsg
```

The `update` function evaluates the current `msg` and `page`, and depending on the combination takes one of the following actions:

- `( SetRoute route, _ )` means a route change, so it calls the `setRoute` function to initialize the page state depending on the new route.
- `( ConnectionStatusChanged connectionStatus, _ )` handles changes in the socket connection, and calls a port to delete the stored authentication token from `localStorage` and redirects to the `SignInRoute` route, and sets the new connection status in the model.
- `( HandleAdminChannelJoin payload, _ )` handles the success of joining the admin channel, setting the user's data into the `session` key of the model, and changing the connection state to the proper one.
- `( HandleSignOutSuccess _, _ )` sets `connectionStatus` to disconnected, resets the session user to `Nothing`, calls the port to delete the token and redirect to the `SignInRoute` route.
- `( ViewsPageMsg subMsg, _ )` checks for `Views.Page.SignOut` messages, sent by clicking on the sign-out link of the header and sends a `sign_out` message to the admin channel through the socket.
- `( PageSignInMsg subMsg, SignInPage subModel )` and `( PageLobbyMsg subMsg, LobbyPage subModel )` update the current page state using their corresponding update function.

The `setRoute` function takes care of two different things:

1. It initializes the current route page model.
2. Redirects to the `SignInRoute` route if the user is not connected to the socket, which means that is not authenticated.


#### The view section

```elm
-- VIEW --


view : Model -> Html Msg
view { session, page } =
    let
        header =
            Html.map ViewsPageMsg Views.Page.headerView

        frame =
            Views.Page.frameView session header
    in
    case ( page, session ) of
        ( SignInPage subModel, _ ) ->
            map PageSignInMsg (Views.SignIn.view subModel)

        ( LobbyPage subModel, Authenticated user ) ->
            frame <| map PageLobbyMsg (Views.Lobby.view user subModel)

        ( NotFoundPage, Authenticated _ ) ->
            frame Views.NotFound.view

        _ ->
            frame <| Html.text "View not implemented yet"
```

The `view` function takes the current model, and depending on the current `page` and `session`, renders the necessary view wrapping it with the `frame` or not.

#### The subscriptions section

```elm
-- SUBSCRIPTIONS --


socket : Flags -> Socket Msg
socket { socketUrl, token } =
    Socket.init socketUrl
        |> Socket.withParams [ ( "token", Maybe.withDefault "" token ) ]
        |> Socket.onOpen (ConnectionStatusChanged (Connected Joining))
        |> Socket.onClose (\_ -> ConnectionStatusChanged Disconnected)
        |> Socket.withDebug


subscriptions : Model -> Sub Msg
subscriptions { connectionStatus, flags } =
    let
        { token } =
            flags

        adminChannel =
            Channel.init "admin:lobby"
                |> Channel.onJoin HandleAdminChannelJoin
                |> Channel.withDebug
    in
    case connectionStatus of
        Disconnected ->
            Sub.none

        _ ->
            Phoenix.connect (socket flags) [ adminChannel ]
```

Depending on the `connectionStatus` it tries to connect to the **Phoenix** `Socket`, changing the status to `Connected Joining` if the server-side authentication is successful. On the contrary, it sets it to `Disconnected` which redirects to the sign-in page as we have previously seen.


#### The main and init section

```elm
-- MAIN AND INIT --


init : Flags -> Location -> ( Model, Cmd Msg )
init flags location =
    let
        ( model, cmd ) =
            setRoute (Route.fromLocation location)
                { page = BlankPage
                , session = Anonymous
                , connectionStatus = Connecting
                , flags = flags
                }
    in
    model ! [ cmd ]


main : Program Flags Model Msg
main =
    Navigation.programWithFlags (Route.fromLocation >> SetRoute)
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        }
```

As `main` returns a `Navigation.programWithFlags` application, the `init` function takes the received `Flags` and a `Location`, calling `setRoute` to initialize the application's state depending on the current route.

### Additional stuff

We have almost covered everything excepting two missing modules:

#### The Ports module

```elm
-- apps/passwordless_auth_web/assets/elm/src/Ports.elm

port module Ports exposing (saveToken)


port saveToken : Maybe String -> Cmd msg
```

`saveToken` is a port, which sends the valid authentication token, or an empty one, to the main `app.js` script where it is stored using `localStorage`. The reason for this behaviour is that we want to reuse the valid token to reconnect if the user refreshes the browser, or delete it in case the user signs out.

#### The Data.Session module

As we are using `Session` all over the place, and to prevent circular dependencies, it makes sense having everything related to `Session` in its own module.

```elm
-- apps/passwordless_auth_web/assets/elm/src/Data/Session.elm

module Data.Session exposing
    ( Session(..)
    , User
    , decoder
    , encode
    )

import Json.Decode as Decode exposing (Decoder)
import Json.Decode.Pipeline exposing (decode, required)
import Json.Encode as Encode exposing (Value)


type alias User =
    { email : String }


type Session
    = Anonymous
    | Authenticated User



-- SERIALIZATION --


decoder : Decoder User
decoder =
    decode User
        |> required "email" Decode.string


encode : User -> Decode.Value
encode user =
    Encode.object
        [ ( "email", Encode.string user.email )
        ]
```

Once again we rely on a custom type to define `Session` which can be either `Anonymous` or `Authenticated User`.

### The Phoenix AdminChannel
If we start the application, we can see errors related to socket connection. This is because we haven't created the `AdminChannel` yet, so let's go ahead and add its definition to the `UserSocket` module:

```elixir
# apps/passwordless_auth_web/lib/passwordless_auth_web/channels/user_socket.ex

defmodule PasswordlessAuthWeb.UserSocket do
  # ...

  channel("admin:*", PasswordlessAuthWeb.AdminChannel)

  # ...
end
```

And finally, the channel module:

```elixir
# apps/passwordless_auth_web/lib/passwordless_auth_web/channels/admin_channel.ex

defmodule PasswordlessAuthWeb.AdminChannel do
  use PasswordlessAuthWeb, :channel

  require Logger

  alias PasswordlessAuth.Repo

  def join("admin:lobby", _payload, socket) do
    {:ok, socket.assigns.user, socket}
  end

  def handle_in("data", _, socket) do
    admin_emails = Application.get_env(:passwordless_auth, :repo)[:emails]

    {:reply, {:ok, %{data: admin_emails}}, socket}
  end

  def handle_in("sign_out", _, socket) do
    email = socket.assigns.user.email
    :ok = Repo.invalidate(email)

    {:reply, {:ok, %{success: true}}, socket}
  end
end
```

The logic for this module is very simple:

- `join` always returns success and the authenticated user data assigned to the connection.
- `handle_in("data", _, _)` returns the existing list of valid emails so that we can render it in the lobby view.
- `handle_in("sign_out", _, _)` takes the assigned email and invalidates its token in the repository, so cannot use it again.

So that's pretty much it. We finally have our basic **Elm** SPA admin panel, backed with a **Phoenix** passwordless and databaseless system. While I was writing this post, I have refactored many parts of the application so I probably might have missed including some of the changes. Therefore, don't forget to check out the source code for the missing pieces, and sorry for any inconvenience. **Elm 0.19.0** just came out, so I'm planning to write a new part about upgrading it, once it has proper support for Websockets.

Happy coding!

<div class="btn-wrapper">
  <a href="https://github.com/bigardone/passwordless-auth" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>


[previous part]: /blog/2018/06/20/elixir-and-phoenix-basic-passwordless-and-databaseless-authentication-pt-2
[Brunch]: https://brunch.io/
[webpack]: https://webpack.js.org/
[Tailwind CSS]: https://tailwindcss.com/
[first part]: /blog/2018/06/09/elixir-and-phoenix-basic-passwordless-and-databaseless-authentication-pt-1
[this great article]: http://www.schmitty.me/stack-setup-phoenix-elm-graphql-tailwindcss/
[@_GazD]: https://twitter.com/_GazD
[Richard Feldman's]: https://twitter.com/rtfeldman
[Tour of an Open-Source Elm SPA]: https://dev.to/rtfeldman/tour-of-an-open-source-elm-spa

