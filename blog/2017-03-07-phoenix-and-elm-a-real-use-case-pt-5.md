---
title: Phoenix and Elm, a real use case (pt. 5)
date: 2017-03-07 22:32 PST
tags: elixir, phoenix, elm
excerpt: Implementing Elm routing
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

## Implementing Elm routing
In the [previous part](/blog/2017/02/23/phoenix-and-elm-a-real-use-case-pt-4/), we did some enhancements to our contact list application. These changes include
union types in the model to represent more precisely what is the current state of the application,
resetting the search result and using keyed Html nodes for a more efficient rendering. Today we are
going to go a step further and implement the contact detail page, which a user can visit by clicking
on any of the contact cards. Let's do this!

### Phoenix changes
In regards to the backend, we need our **API** to have a new route like `/api/contacts/:id` which
returns the **JSON** representation of the contact corresponding to that id. Let's start by adding
the new show action to the `router.ex` file:

```ruby
# web/router.ex

defmodule PhoenixAndElm.Router do
  use PhoenixAndElm.Web, :router

  # ...

  scope "/api", PhoenixAndElm do
    pipe_through :api

    resources "/contacts", ContactController, only: [:index, :show]
  end

  # ...

  scope "/", PhoenixAndElm do
    pipe_through :browser # Use the default browser stack

    get "/*path", PageController, :index
  end
end
```

Take note that we are handling any route that doesn't belong to the **API** pipe with the `PageController`.
The reason for this is that we want to handle all the **URLs** from the frontend. Once this is ready,
let's update the `ContactController` module to add the action:

```ruby
# web/controllers/contact_controller.ex

defmodule PhoenixAndElm.ContactController do
  use PhoenixAndElm.Web, :controller

  # ...

  def show(conn, %{"id" => id}) do
    contact = Repo.get(Contact, id)

    render conn, contact: contact
  end
end
```

We also need to update the `ContactView` module to handle the corresponding response:


```ruby
# web/views/contact_view.ex

defmodule PhoenixAndElm.ContactView do
  use PhoenixAndElm.Web, :view

  # ...

  def render("show.json", %{contact: contact}), do: contact
end
```

With these changes our backend is ready, so if we visit http://localhost:4000/api/contacts/id where
id corresponds to an existing contact id, we should see the following **JSON** response in the browser:

```json
{
  picture: "http://api.randomuser.me/portraits/women/1.jpg",
  phone_number: "761/266-1174",
  location: "Denmark",
  last_name: "Heaney",
  id: 180,
  headline: "Est repellat omnis.",
  gender: 1,
  first_name: "Axel",
  email: "axel@green.org",
  birth_date: "1975-11-03"
}
```

### The Routing module
To implement routing in **Elm**, we are going to need two additional packages for handling browser location
changes and routes matching. These packages are [Elm Navigation](http://package.elm-lang.org/packages/elm-lang/navigation/2.1.0)
and [UrlParser](http://package.elm-lang.org/packages/evancz/url-parser/2.0.1), so let's install them:

```bash
elm package install elm-lang/navigation -y
elm package install evancz/url-parser -y
```

Next, we are going to define the `Routing` **Elm** module, with all the functionality in regards to parsing
the browser location and matching the routes of our application:

```elm
-- web/elm/Routing.elm

module Routing exposing (..)

import Navigation
import UrlParser exposing (..)


type Route
    = HomeIndexRoute
    | NotFoundRoute


matchers : Parser (Route -> a) a
matchers =
    oneOf
        [ map HomeIndexRoute <| s ""
        ]


parse : Navigation.Location -> Route
parse location =
    case UrlParser.parsePath matchers location of
        Just route ->
            route

        Nothing ->
            NotFoundRoute
```

We start by creating a new union type named `Route`, which contains all of the possible routes of our application:

- `HomeIndexRoute`, for the contact list.
- `NotFoundRoute`, for any other route.

Next we define the matchers function which matches the current browser's location with our previously described routes,
and for the time being, we only need to map `/` to `HomeIndexRoute`.

Finally, the `parse` function takes the location and returns the corresponding route using the `matchers`
function, returning `NotFoundRoute` when the location does not correspond to any of the matched routes.

### Handling Url changes
To handle these changes, we have to make some refactoring in our existing modules. The first of these changes
is in the Main module, where instead o using `Html.program` we have to wrap our initial application in a `Navigation.program`:

```elm
-- web/elm/Main.elm

module Main exposing (..)

import Messages exposing (Msg(..))
import Model exposing (..)
import Navigation
import Routing exposing (parse)
import Update exposing (..)
import View exposing (view)


init : Navigation.Location -> ( Model, Cmd Msg )
init location =
    let
        currentRoute =
            parse location

        model =
            initialModel currentRoute
    in
        urlUpdate model


main : Program Never Model Msg
main =
    Navigation.program UrlChange
        { init = init
        , view = view
        , update = update
        , subscriptions = always <| Sub.none
        }
```

`Navigation.program` takes a new `UrlChange` parameter which is a new message triggered every time the **URL** changes,
and the init function takes the current location, parses it to a known route and sets it in the model using the `initialModel` function,
returning the `urlUpdate` function response. These are many changes so let's start by updating the `Model` to add the current route:

```elm
-- web/elm/Model.elm

module Model exposing (..)

import Routing exposing (Route)

-- ...

type alias Model =
    { contactList : RemoteData String ContactList
    , search : String
    , route : Route
    }

-- ...

initialModel : Route -> Model
initialModel route =
    { contactList = NotRequested
    , search = ""
    , route = route
    }
```

Now let's move on to the `Messages` module to add the `UrlChange` message type:

```elm
-- web/elm/Messages.elm

module Messages exposing (..)

-- ...
import Navigation


type Msg
    = FetchResult (Result Http.Error ContactList)
    -- ...
    | UrlChange Navigation.Location
```

Finally, we need to implement the `UrlChange` case in the `Update` module:

```elm
-- web/elm/Update.elm

module Update exposing (..)

-- ...
import Routing exposing (Route(..), parse)


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        -- ...

        UrlChange location ->
            let
                currentRoute =
                    parse location
            in
                urlUpdate { model | route = currentRoute }


urlUpdate : Model -> ( Model, Cmd Msg )
urlUpdate model =
    case model.route of
        HomeIndexRoute ->
            model ! [ fetch 1 "" ]

        _ ->
            model ! []
```

In addition to setting the current route every time the location changes, we have added the
`urlUpdate` function as well. This function is critical, as it returns any route-specific command
we need to run. This means that everytime a user visits the `HomeIndexRoute` path, the application
will automatically fetch the first page of contacts (like we were doing before in the init
function of the `Main` module). The following chart illustrates, more or less, how the
`Navigation.Program` flow looks like:

<img src="/images/blog/phoenix_and_elm/navigation-flow.jpg" alt="Navigation flow" style="background: #fff;" />

1. The **browser** sends a **location change** event to the main `Navigation.Program`.
2. The `Navigation.Program` triggers the `UrlChange` message, handled by the `update` function of the `Update` module.
3. This calls the `parse` function of the `Routing` module, which returns the matched `Route`.
4. The `update` function returns the new update model and the specific commands for that route (if any).
5. The `Navigation.Program` uses the `view` function along with the received `model` to render the **Html**.

### Route specific views

Our routes are going to render different Html, so we still need to update the `View` module to implement this:

```elm
-- web/elm/View.elm

module View exposing (..)

import ContactList.View exposing (indexView)
-- ...

view : Model -> Html Msg
view model =
    section
        []
        [ headerView
        , div []
            [ page model ]
        ]

-- ...

page : Model -> Html Msg
page model =
    case model.route of
        HomeIndexRoute ->
            indexView model

        NotFoundRoute ->
            notFoundView

notFoundView : Html Msg
notFoundView =
    text "Route not found"

```

The `page` function patterns match against the current route of the model, calling the specific view function for that route. That `notFoundView` is very simple,
so let's create a nicer one and make it look like the other warning messages we already have in the contact list search. We are probably going to
need this function in other places, therefore instead of using it directly from the `ContactList.View`, let's move it to a different module called `Common.View`:

```elm
-- web/elm/Common/View.elm

module Common.View exposing (warningMessage)

import Html exposing (..)
import Html.Attributes exposing (class)
import Messages exposing (Msg(..))


warningMessage : String -> String -> Html Msg -> Html Msg
warningMessage iconClasses message content =
    div
        [ class "warning" ]
        [ span
            [ class "fa-stack" ]
            [ i [ class iconClasses ] [] ]
        , h4
            []
            [ text message ]
        , content
        ]
```

Don't forget to remove it from the `ContactList.View` and add the necessary import in it:

```elm
-- web/elm/ContactList/View.elm

module ContactList.View exposing (indexView)

import Common.View exposing (warningMessage)

-- ...
```

Now we can refactor the previously created `notFoundView` function in order to make it look how we want:

```elm
-- web/elm/View.elm

module View exposing (..)

import Common.View exposing (warningMessage)

-- ...

notFoundView : Html Msg
notFoundView =
    warningMessage
        "fa fa-meh-o fa-stack-2x"
        "Page not found"
        backToHomeLink

```

Cool! We do not only want to show the message but also give the user the chance to go back to
the index route and display the contact list, that is why we have also added that convenient
`backToHomeLink` function call as the last parameter of `warningMessage`. Let's add its implementation
in the `Common.View` module:

```elm
-- web/elm/Common/View.elm

module Common.View exposing (warningMessage, backToHomeLink)

-- ...


backToHomeLink : Html Msg
backToHomeLink =
    a
        [ onClick <| NavigateTo HomeIndexRoute ]
        [ text "← Back to contact list" ]
```

As you can see, it is just a basic link that triggers the `NavigateTo` message passing it the route to navigate to,
in this case, the `HomeIndexRoute`. Let's add its definition to the `Messages` module:

```elm
-- web/elm/Messages.elm

module Messages exposing (..)

import Routing exposing (Route)
-- ...

type Msg
    = FetchResult (Result Http.Error ContactList)
    -- ...
    | NavigateTo Route
```

Furthermore, we have to add it's implementation in the `Update` module:

```elm
-- web/elm/Upate.elm

module Update exposing (..)

import Navigation

-- ...

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        -- ...

        NavigateTo route ->
            model ! [ Navigation.newUrl <| toPath route ]

-- ...

```

In this case, it is returning the model and a command created by the `newUrl` function from the `Navigation`
module, which receives an **URL** string and adds it to the browser history, creating a location change and
triggering all the flow we have seen earlier again. However, how can we get a string **URL** having only a `Route`?
That is where toPath function comes into play. Let's create it in the `Routing` module:

```elm
-- web/elm/Routing.elm

module Routing exposing (..)

-- ...

toPath : Route -> String
toPath route =
    case route of
        HomeIndexRoute ->
            "/"

        NotFoundRoute ->
            "/not-found"
```

Using pattern matching against the received route, it returns an **URL**.As easy as pie! If we are not missing
anything and after the compiler ends compiling, this is what happens if we visit an
incorrect route like [http://localhost:4000/foo](http://localhost:4000/foo):

<img src="/images/blog/phoenix_and_elm/404.jpg" alt="404" style="background: #fff;" />

### Show contact route
Now that we have covered the `HomeIndexRoute` and `NotFoundRoute` routes, let's update the `Routing` module to add the changes we need
to add a new route, which shows a contact's detail page:

```elm
-- web/elm/Routing.elm

module Routing exposing (..)

-- ...

type Route
    = HomeIndexRoute
    -- ...
    | ShowContactRoute Int

toPath : Route -> String
toPath route =
    case route of
        -- ...

        ShowContactRoute id ->
            "/contacts/" ++ toString id

        -- ...

matchers : Parser (Route -> a) a
matchers =
    oneOf
        [ -- ...
        , map ShowContactRoute <| s "contacts" </> int
        ]

-- ...
```

So when the user visits a path like `/contacts/id`, we need to retrieve that contact's data from the **API**
endpoint we created at the beginning of this post, and store it somewhere in our program model.
Let's update the `Model` module:

```elm
-- web/elm/Model.elm

module Model exposing (..)

-- ...

type alias Model =
    { -- ...
    , contact : RemoteData String Contact
    }

-- ...

initialModel : Route -> Model
initialModel route =
    {
    , contact = NotRequested
    }
```

Following the same pattern we set up in the previous part for handling remote data, we have added a new
contact to the `Model` record, initialized with `NotRequested`. Now that we know how the flow works, next step
is creating the command which is returned along with the model once the new route is visited.
This command sends the Http request asking for the given user's data:

```elm
-- web/elm/Commands.elm

module Commands exposing (..)

import Decoders exposing (contactListDecoder, contactDecoder)

-- ...

fetchContact : Int -> Cmd Msg
  fetchContact id =
      let
          apiUrl =
              "/api/contacts/" ++ toString id

          request =
              Http.get apiUrl contactDecoder
      in
          Http.send FetchContactResult request
```

The response gets parsed with the `contactDecoder`, and the result handled with the `FetchContactResult` message,
which we need to add to the `Messages` module:

```elm
-- web/elm/Messages.elm

module Messages exposing (..)

import Model exposing (ContactList, Contact)
-- ...


type Msg
    -- ...
    | FetchContactResult (Result Http.Error Contact)
```

Next, we need to edit the `Update` module to implement these results:

```elm
-- web/elm/Update.elm

module Update exposing (..)

import Commands exposing (fetch, fetchContact)
-- ...

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        -- ...

        FetchContactResult (Ok response) ->
            { model | contact = Success response } ! []

        FetchContactResult (Err error) ->
            { model | contact = Failure "Contact not found" } ! []
```

If the result of the **Http** request and decoding is `Ok` then it sets the current contact in the model.
On the other hand, if it fails, it establishes a friendly message to show to the user. However, there's
something we are missing here. How is the `fetchContact` going to be triggered? Well, we have to do it
whenever a user visits the show contact route, and this gets done in two different ways:

1. By clicking on a contact's card in the contact list.
2. Visiting the Url directly from the browser.

In any of these cases we have to fetch the contact when the **Url** corresponds to the `ShowContactRoute`, so let's update once more the `Update` module
to implement this:


```elm
-- web/elm/Update.elm

module Update exposing (..)

import Commands exposing (fetch, fetchContact)

-- ...

urlUpdate : Model -> ( Model, Cmd Msg )
  urlUpdate model =
      case model.route of
          HomeIndexRoute ->
              model ! [ fetch 1 "" ]

          ShowContactRoute id ->
              { model | contact = Requesting } ! [ fetchContact id ]

          _ ->
              model ! []
```

Let's move on to the `Contact.View` and add the `onClick` handler to the card:

```elm
-- web/elm/Contact/View.elm

module Contact.View exposing (..)

-- ...

contactView : Contact -> ( String, Html Msg )
contactView model =
    let
        -- ...
    in
        ( toString model.id
        , div
            [ classes
            , onClick <| NavigateTo <| ShowContactRoute model.id
            ]

            -- ...
```

Remember that int the main `View` module we are using route-specific view functions, so let's add the handler for the
`ShowContactRoute` route:

```elm
-- web/elm/View.elm

module View exposing (..)

import Contact.View exposing (showContactView)

-- ...

page : Model -> Html Msg
page model =
    case model.route of
        -- ...

        ShowContactRoute id ->
            showContactView model

        -- ...

```

As you can see, we are using a `showContactView` function from the `Contact.View` module that we need to implement:


```elm
-- web/elm/Contact/View.elm

module Contact.View exposing (..)

-- ...

showContactView : Model -> Html Msg
  showContactView model =
      case model.contact of
          Success contact ->
              let
                  classes =
                      classList
                          [ ( "person-detail", True )
                          , ( "male", contact.gender == 0 )
                          , ( "female", contact.gender == 1 )
                          ]

                  ( _, content ) =
                      contactView contact
              in
                  div
                      [ id "contacts_show" ]
                      [ header []
                          [ h3
                              []
                              [ text "Person detail" ]
                          ]
                      , backToHomeLink
                      , div
                          [ classes ]
                          [ content ]
                      ]

          Requesting ->
              warningMessage
                  "fa fa-spin fa-cog fa-2x fa-fw"
                  "Fetching contact"
                  (text "")

          Failure error ->
              warningMessage
                  "fa fa-meh-o fa-stack-2x"
                  error
                  backToHomeLink

          NotRequested ->
              text ""
```

Following the same RemoteData pattern that in the `ContactList.View` main function, we handle all the
possible different values of the model's contact. The `Success` branch wraps the existing `contactView`
function in an **Html** div with its header and back-to-home link, to navigate back to the `HomeIndexRoute` route.
After the compilation ends, we can refresh our browser, click on any of the contact cards and see
how the list disappears to show only our selected contact:

<img src="/images/blog/phoenix_and_elm/show-contact.gif" alt="Show contact" style="background: #fff;" />

I's working like a charm. But if you paginate or make a search, click on a contact and then
return back to the contact list, you will notice that the current search and pagination is lost.
This is becacuse we are always fetching the first page in the `urlUpdate` function, so let's do a little refactor to solve this:

```elm
-- web/elm/Update.elm

module Update exposing (..)

-- ...

urlUpdate : Model -> ( Model, Cmd Msg )
  urlUpdate model =
      case model.route of
          HomeIndexRoute ->
              case model.contactList of
                  NotRequested ->
                      model ! [ fetch 1 "" ]

                  _ ->
                      model ! []

          -- ...
```

With this little change, we are only resetting the pagination and search only when the contact list has
not been requested previously. Let's get back to the browser and see what happens now:


<img src="/images/blog/phoenix_and_elm/show-contact-2.gif" alt="Show contact" style="background: #fff;" />

We have our **Elm** routes completely working, yay! This is all for now, but in the next part of the series,
we are going to add support for one of the features that makes Phoenix so awesome, **WebSockets**, removing
the **API** controller and replacing it with a **Phoenix** channel, seeing how to connect to it from **Elm** and send
messages through it. In the meantime, here's [the source code](https://github.com/bigardone/phoenix-and-elm/tree/tutorial/part-5) of what we have done so far.

Happy coding!


<div class="btn-wrapper">
  <a href="https://phoenix-and-elm.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/phoenix-and-elm" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>
