---
title: Phoenix and Elm, a real use case (pt. 4)
date: 2017-02-23 23:13 PST
tags: elixir, phoenix, elm
excerpt: Better state with union types, search resetting and keyed nodes.
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


## Better states with union types and search resetting
In the [previous part](/blog/2017/02/14/phoenix-and-elm-a-real-use-case-pt-3/),
we finally implemented both the pagination navigation and the full text search.
We also mentioned that we still have room for some improvements, especially when rendering the list
of contacts for the first time, as it is rendering the *No contacts found* warning message before
requesting and displaying the first page. This behavior is incorrect because when a user does
a contact search, it has to render that message in just in case no matches are found. The problem is that with
the current model that we have, our **Elm** program does not know how to differentiate whether the contact list
is empty due to the first rendering or because of a search with no matches. Therefore, we have to help
it somehow to know what is going on and render the necessary stuff only when needed.


###  Better states with union types
To prevent displaying the message once the program renders for the first time we can check whether
the search is empty or not. If it is empty, it means that the user has not done any search and we
can avoid displaying the message. However, this does not seem like the proper way of doing it, and
if we start adding this small hacks all over the place, our application is going to be less easy
to mantain and scale once it starts to grow. Thankfully, Elm offers us something that fits perfectly
for this case, union types, and after reading this [post](http://blog.jenkster.com/2016/06/how-elm-slays-a-ui-antipattern.html)
from [Kris Jenkins](http://blog.jenkster.com/), the solution seems pretty simple as well as brilliant.
Let's update the `Model` to reflect what we need:

```elm
-- web/elm/Model.elm

module Model exposing (..)


type RemoteData e a
    = NotRequested
    | Requesting
    | Failure e
    | Success a


type alias Model =
    { contactList : RemoteData String ContactList
    , search : String
    }

-- ...


initialModel : Model
initialModel =
    { contactList = NotRequested
    , search = ""
    }
```

We have created a new type called `RemoteData e a` which can have the following values:

- `NotRequested` which means that the contact list is not being fetched yet so we can distinguish between an initial load and a proper search request from the user.
- `Requesting`, which means that there is a page fetch going on.
- `Failure a`, which means that the request ends up in an error.
- `Success a`, which indicates that everything went fine and includes the current page of results.

In the main `Model`, now instead of `contactList` being a `ContactList`, let's change it for a `RemoteData` type, and initialize it with `NotRequested`.

```elm
-- web/elm/Update.elm

module Update exposing (..)

-- ...

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        FetchResult (Ok response) ->
            { model | contactList = Success response } ! []

        FetchResult (Err error) ->
            { model | contactList = Failure "Something went wrong..." } ! []

        -- ...

        HandleFormSubmit ->
            { model | contactList = Requesting } ! [ fetch 1 model.search ]

        -- ...
```

Cool! Now the `update` function is returning a model more aligned with what we need, where we set the `Success`
and `Error` responses depending on the result from the **Http** request and `Requesting` when a new search is
submitted. Let's edit the `ContactList.View` module to fix the remaining errors and adapt it to the new model:

```elm
-- web/elm/ContactList/View.elm

module ContactList.View exposing (indexView)

-- ...

indexView : Model -> Html Msg
indexView model =
    div
        [ id "home_index" ]
        (viewContent model)


viewContent : Model -> List (Html Msg)
viewContent model =
    case model.contactList of
        NotRequested ->
            [ text "" ]

        Requesting ->
            [ searchSection model
            , warningMessage
                "fa fa-spin fa-cog fa-2x fa-fw"
                "Searching for contacts"
                (text "")
            ]

        Failure error ->
            [ warningMessage
                "fa fa-meh-o fa-stack-2x"
                error
                (text "")
            ]

        Success page ->
            [ searchSection model
            , paginationList page
            , div
                []
                [ contactsList model page ]
            , paginationList page
            ]

-- ...

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

Instead of rendering everything in the `indexView` function, we have created a new `viewContent` function
which has the logic for returning the needed **Html** depending on the model's `contactList`. Therefore,
if its value is `NotRequested` (the application just rendered for the first time), it does not render any
**Html** at all, preventing displaying the unnecessary warning message when no contacts are found.
On the other hand, `Requesting` renders a loading message, `Failure error` renders the error message,
and finally, `Success page` renders what we already implemented in the last post. For simplicity's sake,
I have omitted some of the minor changes, but you can check the final version of the file [here](https://github.com/bigardone/phoenix-and-elm/blob/tutorial/part-4/web/elm/ContactList/View.elm).
After refreshing the browser, we can check that the initial warning message is gone and if we do a search,
the loading message gets displayed before receiving any response from the back-end:



<img src="/images/blog/phoenix_and_elm/searching.gif" alt="Searching" style="background: #fff;" />

### Resetting the search
The load and search of contacts look much better, but there is still something missing.
If the user wants to reset the search to display the first page of results again, the only way possible
of doing it is emptying the search input and pressing intro. This is not very user-friendly, so let's add a couple of handy reset buttons:

```elm
-- web/elm/ContactList/View.elm

module ContactList.View exposing (indexView)

-- ...

searchSection : Model -> Html Msg
searchSection model =
    div
        [ class "filter-wrapper" ]
        [ -- ...
        , div
            [ class "form-wrapper" ]
            [ Html.form
                [ onSubmit HandleFormSubmit ]
                [ resetButton model "reset"
                -- ...
                ]
            ]
        ]

-- ...


contactsList : Model -> ContactList -> Html Msg
contactsList model page =
    if page.total_entries > 0 then
        page.entries
            |> List.map contactView
            |> div [ class "cards-wrapper" ]
    else
        warningMessage
            "fa fa-meh-o fa-stack-2x"
            "No contacts found..."
            (resetButton model "btn")


-- ...


resetButton : Model -> String -> Html Msg
resetButton model className =
    let
        hide =
            (String.length model.search) < 1

        classes =
            classList
                [ ( className, True )
                , ( "hidden", hide )
                ]
    in
        a
            [ classes
            , onClick ResetSearch
            ]
            [ text "Reset search" ]
```

We appending the first one floating over the search input, so it is easy for the user to click it,
and the second one in the warning message displayed when no matches are found. In the `resetButton`,
it is worth mentioning that we are adding a `hidden` class to the button when the search string is not empty,
so it is not displayed until the user types anything. The `onClick` event handler sends a `ResetSearch`
message that we need to add to the `Messages` module:

```elm
-- web/elm/Messages.elm

module Messages exposing (..)

-- ...

type Msg
    = FetchResult (Result Http.Error ContactList)
    -- ...
    | ResetSearch

```

Finally, we have to implement the `ResetSearch` case in the update function:

```elm
-- web/elm/Update.elm

module Update exposing (..)

-- ...


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        -- ...

        ResetSearch ->
            { model | search = "" } ! [ fetch 1 "" ]

```

Its implementation is very simple; it resets the model's search value and requests another fetch, rendering the first page of contacts:

<img src="/images/blog/phoenix_and_elm/search-reset.gif" alt="Reset search" style="background: #fff;" />


### Extra bonus, Html keyed nodes
During the search and pagination, **Elm** renders the different contact cards using its internal
diffing algorithm, which in some particular cases, where node children are added, updated,
removed or whatever, can cause unwanted rendering issues. If you are familiar with **React**,
then you should probably know that for preventing these problems, children elements in a
list must have the `key` attribute, which identifies them among their siblings. **Elm** has a
similar mechanism, in the [Html.Keyed](http://package.elm-lang.org/packages/elm-lang/html/2.0.0/Html-Keyed) package,
so let's take a closer look at it and refactor the contact list, helping **Elm** with the rendering:

```elm
-- web/elm/ContactList/View.elm

module ContactList.View exposing (indexView)


import Contact.View exposing (contactView)
-- ...
import Html.Keyed exposing (..)

-- ...


contactsList : Model -> ContactList -> Html Msg
contactsList model page =
    if page.total_entries > 0 then
        page.entries
            |> List.map contactView
            |> Html.Keyed.node "div" [ class "cards-wrapper" ]
    else
        -- ...
```

The implementation is very simple as we only need to wrap the list of `contactViews` in a `Html.Keyed.node "div"`.
Checking the compiler messages we can see a new error, thrown because any keyed parent is expecting a
list of `(String, Html msg)` tuples instead of a list of `Html msg`. The fist `String` element in the tuple is the unique
identifier of the child, so let's edit the `contactView` function to solve it:

```elm
-- web/elm/Contact/View.elm

module Contact.View exposing (..)

-- ...

contactView : Contact -> ( String, Html Msg )
contactView model =
    let
        classes =
            classList
                [ ( "card", True )
                , ( "male", model.gender == 0 )
                , ( "female", model.gender == 1 )
                ]

            -- ...
    in
        ( toString model.id
        , div
            [ classes ]
            -- ...
        )
```

And with this small change, the compilation error is gone, and the application renders more efficiently.
This is all in regards to the search and pagination of contacts, in the next part we will start implementing
**Elm routing**, so a user can navigate to the contact's details page once clicking on its card and back to the list again.
In the meantime, check out [the branch](https://github.com/bigardone/phoenix-and-elm/tree/tutorial/part-4)
I have prepared with everything we have done in this part.

Happy coding!

<div class="btn-wrapper">
  <a href="https://phoenix-and-elm.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/phoenix-and-elm" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>
