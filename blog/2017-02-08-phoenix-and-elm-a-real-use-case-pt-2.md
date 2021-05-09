---
title: Phoenix and Elm, a real use case (pt. 2)
date: 2017-02-08 21:29 PST
tags: elixir, phoenix, elm, ecto, postgresql
excerpt: Rendering the initial contact list
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

## Initial contact list
In the [previous part](/blog/2017/02/02/phoenix-and-elm-a-real-use-case-pt-1/) we setup the project and created the very basic **Elm** main module.
Today we are going to render the first page of contacts, so let's get started with the backend part. I say page because we want to paginate the list of contacts instead of displaying all of them to the user.
For this, we first need to install an **Elixir** dependency to help us with the pagination functionality.
The library I usually use for this purpose is [scrivener_ecto](https://github.com/drewolson/scrivener_ecto), so let's add it to the `mix.exs` file:

```ruby
# mix.exs

defmodule PhoenixAndElm.Mixfile do
  use Mix.Project

  # ...

  def application do
    [mod: {PhoenixAndElm, []},
      applications: [
       # ...
       :scrivener_ecto
      ]
    ]
  end

  defp deps
    [
      # ...
      {:scrivener_ecto, "~> 1.0"}
    ]
end
```
After running the necessary `mix deps.get`, we have to add some basic configuration to the `repo.ex` file:

```ruby
# lib/phoenix_and_elm/repo.ex

defmodule PhoenixAndElm.Repo do
  use Ecto.Repo, otp_app: :phoenix_and_elm

  use Scrivener, page_size: 9
end
```

Let's continue by adding, to the `router.ex` file, the new route we are going to use for fetching contacts:

```ruby
# web/router.ex

defmodule PhoenixAndElm.Router do
  use PhoenixAndElm.Web, :router

  # ...

  pipeline :api do
    plug :accepts, ["json"]
  end

  # Other scopes may use custom stacks.
  scope "/api", PhoenixAndElm do
    pipe_through :api

    resources "/contacts", ContactController, only: [:index]
  end

  # ...
end
```

Next, let's create the `ContactController` module that is going to return the that list:

```ruby
# web/controllers/contact_controller.ex

defmodule PhoenixAndElm.ContactController do
  use PhoenixAndElm.Web, :controller

  alias PhoenixAndElm.Contact

  def index(conn, params) do
    page = Contact
      |> order_by(:first_name)
      |> Repo.paginate(params)

    render conn, page: page
  end
end
```

Note that we are using a new `paginate` function that you might not have seen before in **Ecto**. This is added by `scrivener`
and uses the `page` and `page_size` keys in the params map to return the requested page from the database.
To return the JSON structure we need in the **Elm** front-end, let's edit the `ContactView` module:


```ruby
# web/views/contact_view.ex

defmodule PhoenixAndElm.ContactView do
  use PhoenixAndElm.Web, :view

  def render("index.json", %{page: page}), do: page
end
```

The final result is a `Scrivener.Page` struct encoded to **JSON**, where the entries key is a list of the
`Contact` model struct. We do not need to encode all the keys of our contacts, so let's update our model module to
exclude the keys we do not need:

```ruby
# web/models/contact.ex

defmodule PhoenixAndElm.Contact do
  use PhoenixAndElm.Web, :model

  @derive {Poison.Encoder, except: [:__meta__, :inserted_at, :updated_at]}

  # ...
end
```

So far, so good. I do not think we are missing anything important in regards to the backend, so we are
ready to move on to the front-end part and talk a little about how elm works as a framework.

### The Elm Architecture

As I mentioned in the last post, one of my favorite things about **Elm** is that is not only a language but also
a framework for building web apps. It is based on a pattern, called [The Elm Architecture](https://guide.elm-lang.org/architecture/) and has inspired other
popular frameworks such as **Redux**. It has three main parts which are the **Model** or state of the application,
the **Update** which modifies the model, and finally the **View** which renders the state as Html. Does it sound familiar? I'm pretty sure it does :)
Having this in mind, let's create the first of the **Elm** modules we need.

### The Model

I like to organize my **Elm** applications into multiple folders, usually based on the different routes or
screens it is going to have. In each of this folders, I like to have as well different files for each
of the distinct parts of **The Elm Architecture** involved. The final result looks like this:

```
.
├── Contact
│   └── View.elm
├── ContactList
│   └── View.elm
├── Main.elm
├── Model.elm
├── Types.elm
├── Update.elm
└── View.elm
```

This way I have all the modules organized, and I know exactly where is everything. Moreover, I find it easier
to scale when the application starts to grow and to refactor if needed. This said, let's start by defining the
initial structure of the application's state, a.k.a the `Model`:

```elm
-- web/elm/Model.elm

module Model exposing (..)


type alias Model =
    { contactList : ContactList
    , error : Maybe String
    }


type alias ContactList =
    { entries : List Contact
    , page_number : Int
    , total_entries : Int
    , total_pages : Int
    }


type alias Contact =
    { id : Int
    , first_name : String
    , last_name : String
    , gender : Int
    , birth_date : String
    , location : String
    , phone_number : String
    , email : String
    , headline : String
    , picture : String
    }
```

The initial state of the application consists of:

- `contactList` which is a `ContactList` record representing the `Page` struct from **scrivener** we saw earlier. Its entries key is a list of `Contact` records that map the `Contact` model we created in the last part.
- `error` which is set in case there is any error while requesting the contact list to the backend.

If you are not familiar with **Elm's** `Maybe`, it is the way to handle non-existing values as **Elm** does not have the concept of `null`. In the end, it is just a union type that can have two different values, `Nothing` or `Just value`.

We need some default values to populate the application's state once it starts, so let's add a couple of helper functions to the module:

```elm
-- web/elm/Model.elm

module Model exposing (..)

-- ...


 initialContactList : ContactList
 initialContactList =
    { entries = []
    , page_number = 1
    , total_entries = 0
    , total_pages = 0
    }


initialModel : Model
initialModel =
    { contactList = initialContactList
    , error = Nothing
    }
```

### The Messages

Next thing we want to define are the messages that are triggered and to which our application reacts, so le'ts create the `Messages` module:

```elm
-- web/elm/Messages.elm

module Messages exposing (..)

import Http
import Model exposing (ContactList)


type Msg
    = FetchResult (Result Http.Error ContactList)

```

For now, we only need the `FetchResult` message, which has the [Result](http://package.elm-lang.org/packages/elm-lang/core/5.1.1/Result)
of the Http request for fetching the first page of contacts.

### The Update

Messages get triggered in the application, but it still needs to treat these messages to update
the state depending on them. Here is where the update function comes into play, getting called
every time our program receives a new message:

```elm
-- web/elm/Update.elm

module Update exposing (..)

import Messages exposing (..)
import Model exposing (..)


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        FetchResult (Ok response) ->
            { model | contactList = response } ! []

        FetchResult (Err error) ->
            { model | error = Just "Something went wrong..." } ! []
```

The update function receives the `msg` triggered along with the current model, evaluates the message type and
returns a new updated version of the model along with a command if needed. If you have used **Redux** before,
you can see the similarities with its reducers concept. In our case, if the message is of type `FetchResult` (Ok response)
it means that the `Result` of the `Http` request has success and it returns a new version of the model with the received
contact list. On the other hand, if it receives an error, a new version with the error updated is returned.
Don't worry about how to trigger this message; we will get to that point in a bit.

### The View

Now that we have defined the model and how to update it, it is time to define how to render
it in the browser. For this, we need to implement the `View` module:

```elm
-- web/elm/View.elm

module View exposing (..)

import ContactList.View exposing (indexView)
import Html exposing (..)
import Html.Attributes exposing (..)
import Messages exposing (..)
import Model exposing (..)


view : Model -> Html Msg
view model =
    section
        []
        [ headerView
        , div []
            [ indexView model ]
        ]


headerView : Html Msg
headerView =
    header
        [ class "main-header" ]
        [ h1
            []
            [ text "Phoenix and Elm: A real use case" ]
        ]
```

To prevent having a huge view file, let's create two additional view modules to render the list and each of the contacts:


```elm
-- web/elm/ContactList/View.elm

module ContactList.View exposing (indexView)

import Contact.View exposing (contactView)
import Html exposing (..)
import Html.Attributes exposing (..)
import Messages exposing (..)
import Model exposing (..)


indexView : Model -> Html Msg
indexView model =
    div
        [ id "home_index" ]
        [ div
            []
            [ contactsList model ]
        ]


contactsList : Model -> Html Msg
contactsList model =
    if model.contactList.total_entries > 0 then
        model.contactList.entries
            |> List.map contactView
            |> div [ class "cards-wrapper" ]
    else
        let
            classes =
                classList
                    [ ( "warning", True ) ]
        in
            div
                [ classes ]
                [ span
                    [ class "fa-stack" ]
                    [ i [ class "fa fa-meh-o fa-stack-2x" ] [] ]
                , h4
                    []
                    [ text "No contacts found..." ]
                ]

```

In case the are entries (total_entries > 0), it calls the `contactView` function on each entry returning a
list of Html representing the contacts cards. Otherwise, it renders a warning message.
Let's take a closer look at the contactView function:


```elm
-- web/elm/Contact/View.elm

module Contact.View exposing (..)

import Html exposing (..)
import Html.Attributes exposing (..)
import Messages exposing (..)
import Model exposing (..)


contactView : Contact -> Html Msg
contactView model =
    let
        classes =
            classList
                [ ( "card", True )
                , ( "male", model.gender == 0 )
                , ( "female", model.gender == 1 )
                ]

        fullName =
            model.first_name ++ " " ++ model.last_name
    in
        div
            [ classes ]
            [ div
                [ class "inner" ]
                [ header
                    []
                    [ div
                        [ class "avatar-wrapper" ]
                        [ img
                            [ class "avatar"
                            , src model.picture
                            ]
                            []
                        ]
                    , div
                        [ class "info-wrapper" ]
                        [ h4
                            []
                            [ text fullName ]
                        , ul
                            [ class "meta" ]
                            [ li
                                []
                                [ i
                                    [ class "fa fa-map-marker" ]
                                    []
                                , text model.location
                                ]
                            , li
                                []
                                [ i
                                    [ class "fa fa-birthday-cake" ]
                                    []
                                , text model.birth_date
                                ]
                            ]
                        ]
                    ]
                , div
                    [ class "card-body" ]
                    [ div
                        [ class "headline" ]
                        [ p [] [ text model.headline ] ]
                    , ul
                        [ class "contact-info" ]
                        [ li
                            []
                            [ i
                                [ class "fa fa-phone" ]
                                []
                            , text model.phone_number
                            ]
                        , li
                            []
                            [ i
                                [ class "fa fa-envelope" ]
                                []
                            , text model.email
                            ]
                        ]
                    ]
                ]
            ]


```

### The Main

Having all the previous modules ready leads us to the final step which wires up everything together.
We need to update the basic `Main` module we created in the last post, and make it return a `Program`:


```elm
-- web/elm/Main.elm

module Main exposing (..)

import Commands exposing (fetch)
import Html
import Messages exposing (Msg(..))
import Model exposing (..)
import Update exposing (..)
import View exposing (view)


init : ( Model, Cmd Msg )
init =
    initialModel ! [ fetch ]


main : Program Never Model Msg
main =
    Html.program
        { init = init
        , view = view
        , update = update
        , subscriptions = always <| Sub.none
        }

```

In addition to the view and update functions we have already implemented, `Html.program` receives the `init`
function that populates the model with the initial state and calls an initial command... but, what are commands?
In **Elm**, if we want to do stuff like making Http requests or handling messages from web sockets or any other thing
that has side effects, we need to use commands. In our case, as the model is initially populated empty, the first
thing we have to do is to request the first page to the backend. Let's create a **Commands** module and see how to achieve it:

```elm
-- web/elm/Commands.elm

module Commands exposing (..)

import Decoders exposing (contactListDecoder)
import Http
import Messages exposing (Msg(..))


fetch : Cmd Msg
fetch =
    let
        apiUrl =
            "/api/contacts"

        request =
            Http.get apiUrl contactListDecoder
    in
        Http.send FetchResult request

```

[Http](http://package.elm-lang.org/packages/elm-lang/http/latest) is an **Elm** library to make Http requests that we need to install using `elm package install elm-lang/http -y`.
The fetch function calls `Http.send` passing the `Msg` to trigger when the request is made, updating the model with
the result with the update function we have implemented previously. As the Http request is going to return JSON
from the backend, we need to transform it into something that our application understands, in this case, a `ContactList`
record. Therefore, we pass the `contactListDecoder` to the request to decode the result. Let's add the `Decoders` module and implement the function:

```elm
-- web/elm/Decoders.elm

module Decoders exposing (..)

import Json.Decode as JD exposing (..)
import Json.Decode.Extra exposing ((|:))
import Model exposing (..)


contactListDecoder : JD.Decoder ContactList
contactListDecoder =
    succeed
        ContactList
        |: (field "entries" (list contactDecoder))
        |: (field "page_number" int)
        |: (field "total_entries" int)
        |: (field "total_pages" int)


contactDecoder : JD.Decoder Contact
contactDecoder =
    succeed
        Contact
        |: (field "id" int)
        |: (field "first_name" string)
        |: (field "last_name" string)
        |: (field "gender" int)
        |: (field "birth_date" string)
        |: (field "location" string)
        |: (field "phone_number" string)
        |: (field "email" string)
        |: (field "headline" string)
        |: (field "picture" string)
```

As you can see, decoders map fields in the `Model`, one by one. The `|:` is not in the **Elm** core packages, and we need to install
an additional package to use it, runing `elm package install elm-community/json-extra -y`.

### The final result

Last but not least, let's add some styling. For this particular project I have chosen to write the stylesheets using [stylus](http://stylus-lang.com/),
so we have to install the [stylus-brunch](https://github.com/brunch/stylus-brunch) and [nib](https://github.com/tj/nib) packages and add them to the `brunch-config.js` file:

```bash
$ npm install --save-dev stylus-brunch nib
```

```javascript
// brunch-config.js

exports.config = {
  // ...

  plugins: {
    // ...

    stylus: {
      plugins: ['nib']
    }
  }

  // ...
}
```

I do not want to spend any more time talking about the styles and make you lose the focus, so just copy them from [here](https://github.com/bigardone/phoenix-and-elm/tree/master/web/static/css/modules).

With all these changes
and after populating the database using a [simple seeds file](https://github.com/bigardone/phoenix-and-elm/blob/tutorial/part-2/priv/repo/seeds.exs),
we can start the **Phoenix** server, visit [http://localhost:4000](http://localhost:4000) and see something similar to this:


<img src="/images/blog/phoenix_and_elm/part-2.jpg" alt="Final result" style="background: #fff;" />

Wow! This part is getting longer than I expected, so let's leave it here for now. In the next part, we are going to implement the pagination and search functionalities, which involve adding full-text search support for the contacts table. In the meantime, take a look the [branch](https://github.com/bigardone/phoenix-and-elm/blob/tutorial/part-2/priv/repo/seeds.exs)
I have prepared with everything we have done so far.

Happy coding!


<div class="btn-wrapper">
  <a href="https://phoenix-and-elm.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/phoenix-and-elm" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>
