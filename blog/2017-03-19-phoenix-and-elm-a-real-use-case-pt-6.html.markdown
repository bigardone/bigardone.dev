---
title: Phoenix and Elm, a real use case (pt. 6)
date: 2017-03-19 23:30 PDT
tags: elixir, phoenix, elm
excerpt: Phoenix and Elm communication through WebSockets
published: true
---

<div class="index">
  <p>This post belongs to the <strong>Phoenix and Elm, a real use case</strong> series.</p>
  <ol>
    <li><a href="/blog/2017/02/02/phoenix-and-elm-a-real-use-case-pt-1/">Introduction to creating a SPA with Phoenix and Elm</a></li>
    <li><a href="/blog/2017/02/08/phoenix-and-elm-a-real-use-case-pt-2/">Rendering the initial contact list</a></li>
    <li><a href="/blog/2017/02/14/phoenix-and-elm-a-real-use-case-pt-3/">Adding full text search and pagination navigation to the contact list</a></li>
    <li><a href="/blog/2017/02/23/phoenix-and-elm-a-real-use-case-pt-4/">Better state with union types, search resetting and keyed nodes.</a></li>
    <li><a href="/blog/2017/03/07/phoenix-and-elm-a-real-use-case-pt-5/">Implementing Elm routing</a></li>
    <li><a href="/blog/2017/03/19/phoenix-and-elm-a-real-use-case-pt-6/">Poenix and Elm communication through WebSockets</a></li>
  </ol>

  <a href="https://phoenix-and-elm.herokuapp.com/" target="_blank"><i class="fa fa-cloud"></i> Live demo</a> |
  <a href="https://github.com/bigardone/phoenix-and-elm" target="_blank"><i class="fa fa-github"></i> Source code</a>
</div>

## Phoenix and Elm WebSockets support
In the [last part](/blog/2017/03/07/phoenix-and-elm-a-real-use-case-pt-5/), we refactored our application to add **Elm** routing and added the show contact route.
These changes include adding a new API endpoint in the `ContactController` module to return a given contact's JSON representation.
However, since I started using **Phoenix**, I have found myself using fewer controllers, and more
**WebSockets** and **Phoenix's** channels. The main reasons for doing this are:

- They are much faster than Http requests.
- Once the connection is established, and the authentication is accomplished, you do not need to authenticate future requests and rely on cookies for it.
- Its **PubSub** system opens a new world of possibilities.

That being said, today we are going to replace the current **API** controller we have with a new
**Phoenix** **channel** and learn how to add support for this new channel in **Elm**. Let's do this!

### Phoenix changes

First of all, let's get rid of what we are not going to need anymore. This includes deleting the `ContactContoller` file, located in `web/controllers/contact_controller.ex`
and the `ContactView` in `web/views/contact_view.ex`. We also need to update the `router` file to remove the **API** pipeline:

```elixir
# web/router.ex

defmodule PhoenixAndElm.Router do
  use PhoenixAndElm.Web, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_flash
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  scope "/", PhoenixAndElm do
    pipe_through :browser # Use the default browser stack

    get "/*path", PageController, :index
  end
end
```

Once we have removed the unnecessary stuff, let's create the channel which is going to replace the old `ContactController`.
First, we need to declare it in the `UserSocket` module:

```elixir
# web/channels/user_socket.ex

defmodule PhoenixAndElm.UserSocket do
  use Phoenix.Socket

  ## Channels
  channel "contacts", PhoenixAndElm.ContactsChannel

  # ...
end
```

Next step is to create the `ContactsChannel` module in the same folder:

```elixir
# web/channels/contacts_channel.ex

defmodule PhoenixAndElm.ContactsChannel do
  use Phoenix.Channel
  alias PhoenixAndElm.{Contact, Repo}
  import Ecto.Query, only: [order_by: 2]

  require Logger

  def join("contacts", _, socket), do: {:ok, socket}

  def handle_in("contacts:fetch", params, socket) do
    Logger.info "Handling contacts..."

    search = Map.get(params, "search") || ""

    page = Contact
    |> Contact.search(search)
    |> order_by(:first_name)
    |> Repo.paginate(params)

    {:reply, {:ok, page}, socket}
  end

  def handle_in("contact:" <> contact_id, _, socket) do
    Logger.info "Handling contact..."

    contact = Contact
    |> Repo.get(contact_id)

    case contact do
      nil ->
        {:reply, {:error, %{error: "Contact no found"}}, socket}
      _ ->
        {:reply, {:ok, contact}, socket}
    end
  end
end
```

The `ContactsChannel` handles two events:

- `contacts:fetch` wich handles contact search and pagination like the old index action of the `ContactController`.
- `contacts:id` which returns a given contact's data, just like the old show action.

Depending on the environment the application is running, the socket **URL** will probably change.
The front-end application needs to know the **URL** to create the connection, so we need it to pass it somehow.
The easiest way of doing so is by creating a helper method in a **Phoenix** view and call it to assign it to javascript
globally. Let's add the helper method in the `LayoutView` module:

```elixir
# web/views/layout_view.ex

defmodule PhoenixAndElm.LayoutView do
  use PhoenixAndElm.Web, :view

  def socket_url, do: System.get_env("WEBSOCKECT_URL") || "ws://localhost:4000/socket/websocket"
end
```

The `socket_url` function returns the value in the `WEBSOCKECT_URL` system variable, or the default one if not set. Now we can update
the main template file to call this function and set value in javascript:

```elixir
# web/templates/layout/app.html.eex

<!DOCTYPE html>
<html lang="en">
  # ...

  <body>
    # ...

    <script>window.socketUrl = '<%= PhoenixAndElm.LayoutView.socket_url %>';</script>
    <script src="<%= static_path(@conn, "/js/app.js") %>"></script>
  </body>
</html>
```

Once the `socketUrl` value is set, we can use it in the `app.js` file:

```javascript
// web/static/js/app.js

import Elm from './main';

const elmDiv = document.querySelector('#elm_target');

if (elmDiv) {
  const socketUrl = window.socketUrl;

  Elm.Main.embed(elmDiv, { socketUrl });
}
```

Cool, but how does **Elm** handle this values?

### Program with flags

Conveniently, **Elm** has the concept of flags which are values that can be received from **JavaScript** while
creating the application. To use flags, we need to do some refactoring in the application, so let's start by editing the `Main` module:

```elm
-- web/elm/Main.elm

module Main exposing (..)

-- ...

init : Flags -> Navigation.Location -> ( Model, Cmd Msg )
init flags location =
    let
        currentRoute =
            parse location

        model =
            initialModel flags currentRoute
    in
        urlUpdate model


main : Program Flags Model Msg
main =
    Navigation.programWithFlags UrlChange
        { init = init
        , view = view
        , update = update
        , subscriptions = always <| Sub.none
        }
```
The `main` function now has a Flags type in its definition, that is passed to the init function and from
there to the `initialModel`. Let's move on to the `Model` module to implement this type:

 ```elm
 -- web/elm/Model.elm

 module Model exposing (..)

 -- ...

type alias Flags =
    { socketUrl : String }


type alias Model =
    { -- ---
    , flags : Flags
    }


initialModel : Flags -> Route -> Model
initialModel flags route =
    { -- ...
    , flags = flags
    }
 ```

The `Flags` type is a record containing a `socketUrl` key. As we want to initialize this value with the flags
received from javascript, we pass it to the `initialModel` function. If we now refresh the browser and take a closer
look at the debugger history, we can see how the flags key is already set:

<img src="/images/blog/phoenix_and_elm/flags.jpg" alt="Flags" style="background: #fff;" />

Now we are ready to start implementing the socket communication between the **Elm** program and the **Phoenix** backend.

### The elm-phoenix package

There are many different ways to add **WebSockets** support in **Elm**, but my favorite one so far is using the [elm-phoenix](https://github.com/saschatimme/elm-phoenix)
package.
This package is an effect manager, so at the moment is not in the elm package repository. Therefore, its installation can
be tricky depending on your **Phoenix** configuration, so easiest way I have found is by [downloading](https://github.com/saschatimme/elm-phoenix/archive/master.zip) it and
adding the source files into a vendor folder. Before doing this, let's move all of our **Elm** module files into a
new `web/elm/src` folder. After doing it, it should look like this:

```
web/elm
├── elm-package.json
├── elm-stuff
└── src
    ├── Commands.elm
    ├── Common
    │   └── View.elm
    ├── Contact
    │   └── View.elm
    ├── ContactList
    │   └── View.elm
    ├── Decoders.elm
    ├── Main.elm
    ├── Messages.elm
    ├── Model.elm
    ├── Routing.elm
    ├── Update.elm
    └── View.elm
```

Next, create a new `web/elm/vendor` folder and copy there the `elm-phoenix` source files:

```
web/elm
├── elm-package.json
├── elm-stuff
├── src
└── vendor
    ├── Phoenix
    │   ├── Channel.elm
    │   ├── Internal
    │   │   ├── Channel.elm
    │   │   ├── Helpers.elm
    │   │   ├── Message.elm
    │   │   └── Socket.elm
    │   ├── Push.elm
    │   └── Socket.elm
    └── Phoenix.elm
```

Now we have to make the **Elm** compiler aware of these changes, so let's update the `elm-package.json` file:

```json
// web/elm/elm-package.json

{
    "version": "1.0.0",
    "summary": "helpful summary of your project, less than 80 characters",
    "repository": "https://github.com/user/project.git",
    "license": "BSD3",
    "source-directories": [
        "./src",
        "./vendor"
    ],
    // ...
}
```

We also need to change **Brunch's** configuration; otherwise, the build is not going to succeed:

```javascript
// brunch-config.js

exports.config = {
  // ...

  // Configure your plugins
  plugins: {
    // ...

    elmBrunch: {
      elmFolder: 'web/elm',
      mainModules: ['src/Main.elm'],
      outputFolder: '../static/js',
      makeParameters: ['--debug'],
    },

    //...
  }
}
```

Finally, `elm-phoenix` depends on the [elm-lang/websocket](http://package.elm-lang.org/packages/elm-lang/websocket/latest) package, so let's install it:

```
$ cd web/elm && elm-package install elm-lang/websocket -y
```

After doing this and restarting the **Phoenix** server, everything should be working as before. In case it does not, here is the [commit](https://github.com/bigardone/phoenix-and-elm/commit/03bc44cf6c4465e650b1412c4571012200664606)
with all these changes.

### The Subscriptions module
In order to listen to external input, such as mouse events or location changes, **Elm** uses subscriptions. In our case, as we are using `elm-phoenix`, we want
to handle **WebSockets** events and make the application respond to them. Let's create a new `Subscriptions` module:

```elm
-- web/elm/src/Subscriptions.elm

module Subscriptions exposing (..)

import Messages exposing (Msg(..))
import Model exposing (Model)
import Phoenix
import Phoenix.Channel as Channel exposing (Channel)
import Phoenix.Socket as Socket exposing (Socket)


subscriptions : Model -> Sub Msg
subscriptions model =
    Phoenix.connect (socket model.flags.socketUrl) [ contacts ]


socket : String -> Socket Msg
socket socketUrl =
    Socket.init socketUrl


contacts : Channel Msg
contacts =
    Channel.init "contacts"
        |> Channel.withDebug
```

The `subscriptions` function prepares the socket and the channel we want to join, using the program's
flags to set the `socketUrl`. In our case, we only have a single channel, so we do not need to add extra
configuration to check which channel or channels it has to join, but if you feel curious about how
to join multiple channels, there is an excellent [demo example](https://github.com/saschatimme/elm-phoenix/blob/master/example/web/elm/src/Chat.elm#L233) in the official repo. In our case, we
are good to continue, so let's update the `Main` module, so the main program uses the new `subscriptions` function:

```elm
-- web/elm/src/Main.elm

module Main exposing (..)

import Subscriptions exposing (subscriptions)

-- ...

main : Program Flags Model Msg
main =
    Navigation.programWithFlags UrlChange
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        }
```

If we refresh the browser and check our browser's console, we can see two log messages, one when the program tries to join the `ContactsChannel` and
another one when the join result is successful:

<img src="/images/blog/phoenix_and_elm/socket-connect.jpg" alt="Socket connection" style="background: #fff;" />

### Commands refactoring

Now that we have the connection to the **WebSocket** ready, we need to refactor the `Commands` module to replace the old **Http** requests with `WebSocket` ones:

```elm
-- web/elm/src/Commands.elm

module Commands exposing (..)

import Phoenix exposing (..)
import Phoenix.Push as Push
-- ...

fetch : String -> Int -> String -> Cmd Msg
fetch socketUrl page search =
    let
        payload =
            JE.object
                [ ( "page", JE.int page )
                , ( "search", JE.string search )
                ]

        push =
            Push.init "contacts" "contacts:fetch"
                |> Push.withPayload payload
                |> Push.onOk FetchSuccess
                |> Push.onError FetchError
    in
        Phoenix.push socketUrl push


fetchContact : String -> Int -> Cmd Msg
fetchContact socketUrl id =
    let
        push =
            Push.init "contacts" ("contact:" ++ toString id)
                |> Push.onOk FetchContactSuccess
                |> Push.onError FetchContactError
    in
        Phoenix.push socketUrl push
```
The `fetch` function now receives one more parameter with the `socketUrl` value that it is going to need to send
the request. It first creates a **JSON** payload with the page and search, just like the old **Http** one. Next, it creates
a `push`, from the `elm-phoenix` package, in which passes the **Phoenix's** channel name and the event, in this case `contacts:fetch`.
It attaches the previously created payload using `withPayload` and sets the messages for both the `onOk` and `onError` callbacks,
triggered depending on the result. Finally, it sends the push to the `socketUrl`.

On the other hand, `fetchContact` is more simple. It creates a `push` to the same channel, but for the `contact:*` where `*` is the id of the contact we want to fetch. It only sets the
messages for the `onOk` and `onError` callbacks, and finally sends the push through the `socketUrl`.

### Messages and the Update module
At this point, the compiler must be some errors related to the new messages we have added in the `Commands` module, but we have not declared it yet. So let's edit
the `Messages` module to fix this:

```elm
-- web/elm/src/Messages.elm

module Messages exposing (..)

import Json.Encode as JE
import Navigation
import Routing exposing (Route)


type Msg
    -- Remove this -> = FetchResult (Result Http.Error ContactList)
    = FetchSuccess JE.Value          -- Add this
    | FetchError JE.Value            -- Add this
    | Paginate Int
    | HandleSearchInput String
    | HandleFormSubmit
    | ResetSearch
    | UrlChange Navigation.Location
    | NavigateTo Route
    -- Remove this -> | FetchContactResult (Result Http.Error Contact)
    | FetchContactSuccess JE.Value   -- Add this
    | FetchContactError JE.Value     -- Add this
```

The previous `FetchResult` was receiving a `Result`, but now both success and error callbacks, which receive a **JSON** value,
which need to be decoded by the `update` function, and we also need to update the commands calls to pass the `socketUrl` parameter,
so let's edit the `Update` module:

```elm
-- web/elm/src/Update.elm

module Update exposing (..)

-- ...

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        FetchSuccess raw ->
            case JD.decodeValue contactListDecoder raw of
                Ok payload ->
                    { model | contactList = Success payload } ! []

                Err err ->
                    { model | contactList = Failure "Error while decoding contact list" } ! []

        FetchError raw ->
            { model | contactList = Failure "Error while fetching contact list" } ! []

        Paginate pageNumber ->
            model ! [ fetch model.flags.socketUrl pageNumber model.search ]

        -- ...

        HandleFormSubmit ->
            { model | contactList = Requesting } ! [ fetch model.flags.socketUrl 1 model.search ]

        ResetSearch ->
            { model | search = "" } ! [ fetch model.flags.socketUrl 1 "" ]

        -- ...

        FetchContactSuccess raw ->
            case JD.decodeValue contactDecoder raw of
                Ok payload ->
                    { model | contact = Success payload } ! []

                Err err ->
                    { model | contact = Failure "Error while decoding contact" } ! []

        FetchContactError raw ->
            { model | contact = Failure "Contact not found" } ! []

```

Both `FetchSuccess` and `FetchContactSuccess` branches decode the `raw` response received from the channel and, depending on the result,
set the corresponding key value in the new model. On the other hand, `FetchError` and `FetchContactError` set a friendly error message.
We are missing one thing, though; the `urlUpdate` function needs some minor editing as well:

```elm
-- web/elm/src/Update.elm

module Update exposing (..)

-- ...

urlUpdate : Model -> ( Model, Cmd Msg )
urlUpdate model =
    case model.route of
        HomeIndexRoute ->
            case model.contactList of
                NotRequested ->
                    model ! [ fetch model.flags.socketUrl 1 "" ]

                _ ->
                    model ! []

        ShowContactRoute id ->
            { model | contact = Requesting } ! [ fetchContact model.flags.socketUrl id ]

        _ ->
            model ! []

```

That is pretty much it. If we now refresh the browser and navigate through the application, everything should just work as before.
Yay! If you are missing anything, please check out the branch I have prepared with all the changes for this part.
I hope you have enjoyed the series and thanks for all the support.

Happy coding!

<div class="btn-wrapper">
  <a href="https://phoenix-and-elm.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/phoenix-and-elm" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>
