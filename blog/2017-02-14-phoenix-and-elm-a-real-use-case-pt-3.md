---
title: Phoenix and Elm, a real use case (pt. 3)
date: 2017-02-14 22:26 PST
tags: elixir, phoenix, elm, ecto, postgresql
excerpt: Adding full text search and pagination navigation to the contact list
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

## Full text search and pagination navigation

In the [previous](/blog/2017/02/08/phoenix-and-elm-a-real-use-case-pt-2/) part, we managed to render the first page of the contact list. Recalling what we have done so far,
we are using `scrivener` to paginate the list, and it does it using the `page` and `page_size` request params.
Today we are going to cover how to render the pagination buttons, send a page request when the user click on any
of them, and adding a search box so the user can search contacts by any of their fields, which involves creating
a full text search index in the `contacts` table using `Ecto`. Let's do this!

### The Pagination buttons

Before continuing, let's change the `brunch-config.js` file and add the debugging option to the `elmBrunch` plugin:

```javascript
exports.config = {
  // ...

  plugins: {
    // ...

    elmBrunch: {
      // ...

      makeParameters: ['--debug'],
    },
  }

  // ...
}
```

This is a very convenient option while we are developing **Elm** since it adds a div at the bottom right corner of the page
where you can see the current state of the application and navigate through all the different updates. Check it out:

<img src="/images/blog/phoenix_and_elm/elm-debug.jpg" alt="Elm history" style="background: #fff;" />

Taking a closer look at the current model state after the application renders, we can see that we already
have everything we need for rendering the pagination links:

```elm
{ contactList =
    { entries = List(9)
    , page_number = 1
    , total_entries = 100
    , total_pages = 12
    }
, error = Nothing
}
```

Let's add the pagination list to the `ContactList.View` module:


```elm
-- web/elm/ContactList/View.elm

module ContactList.View exposing (indexView)

-- ...


indexView : Model -> Html Msg
indexView model =
    div
        [ id "home_index" ]
        [ paginationList model.contactList.total_pages model.contactList.page_number
        , div
            []
            [ contactsList model ]
        , paginationList model.contactList.total_pages model.contactList.page_number
        ]

-- ...


paginationList : Int -> Int -> Html Msg
paginationList totalPages pageNumber =
    List.range 1 totalPages
        |> List.map (paginationLink pageNumber)
        |> ul [ class "pagination" ]


paginationLink : Int -> Int -> Html Msg
paginationLink currentPage page =
    let
        classes =
            classList [ ( "active", currentPage == page ) ]
    in
        li
            []
            [ a
                [ classes ]
                []
            ]

```


After saving the file and refreshing the browser, the page should look like this:


<img src="/images/blog/phoenix_and_elm/pagination.jpg" alt="Pagination links" style="background: #fff;" />

Now that the links are displayed, we have to make them clickable and fetch the corresponding page once clicked.
For that, we have to create a new message and the handle in the update function.
Let's start by adding the new message to the `Messages` module:

```elm
-- web/elm/Messages.elm

module Messages exposing (..)

import Http
import Model exposing (ContactList)


type Msg
    = FetchResult (Result Http.Error ContactList)
    | Paginate Int
```

Adding the `Paginate Int` type makes the compiler complain, as the update module does not handle it. Let's fix that:

```elm
-- web/elm/Update.elm

module Update exposing (..)

import Commands exposing (fetch)
import Messages exposing (..)
import Model exposing (..)


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        -- ...

        Paginate pageNumber ->
            model ! [ fetch pageNumber ]
```

It is using the same `fetch` function from the `Commands` module which the init function calls once the application loads
for the very first time. Next, we need to pass the requested page as a new parameter, so let's update it:

```elm
-- web/elm/Commands.elm


module Commands exposing (..)

import Decoders exposing (contactListDecoder)
import Http
import Messages exposing (Msg(..))


fetch : Int -> Cmd Msg
fetch page =
    let
        apiUrl =
            "/api/contacts?page=" ++ (toString page)

        request =
            Http.get apiUrl contactListDecoder
    in
        Http.send FetchResult request
```

If we check the compiler output at this point, we can see that there is still once thing more to change:

```bash
-- TYPE MISMATCH ------------------------------------------------------ Main.elm

The right side of (!) is causing a type mismatch.

13|     initialModel ! [ fetch ]
                       ^^^^^^^^^
(!) is expecting the right side to be a:

    List (Cmd Msg)

But the right side is:

    List (Int -> Cmd Msg)

Hint: It looks like a function needs 1 more argument.
```

Fixing the error is very straightforward, so let's update the `init` function in the `Main` module to solve it:

```elm
-- web/elm/Main.elm

module Main exposing (..)


init : ( Model, Cmd Msg )
init =
    initialModel ! [ fetch 1 ]
```

Finally, we have to add the `onClick` handler to the page link, which will trigger the `Paginate` message
once the user clicks on any of the pagination buttons:


```elm
-- web/elm/ContactList/View.elm

module ContactList.View exposing (indexView)
import Html.Events exposing (..)

-- ...


paginationLink : Int -> Int -> Html Msg
paginationLink currentPage page =
    let
        classes =
            classList [ ( "active", currentPage == page ) ]
    in
        li
            []
            [ a
                [ classes
                , onClick <| Paginate page
                ]
                []
            ]

```

If we refresh the browser and click on any of the links, it renders a whole new list of contacts corresponding to the requested page number. Yay!

### Full text search

Now that users can navigate through the different pages let's make it easier for them to filter contacts
by adding a search box. We want to filter by any of the user's table fields, so let's start by creating a
migration to add an index to a PostgreSQL ts_vector with all the fields:

```bash
$ mix ecto.gen.migration create_gin_index_for_contacts
```

`Ecto` does not support anything related to this kind of indexes, so we have to update the migration manually:

```ruby
# priv/repo/migrations/20160817151844_create_gin_index_for_contacts.exs

defmodule PhoenixAndElm.Repo.Migrations.CreateGinIndexForContacts do
  use Ecto.Migration

  def change do
    execute """
      CREATE INDEX contacts_full_text_index
      ON contacts
      USING gin (
        to_tsvector(
          'english',
          first_name || ' ' ||
          last_name || ' ' ||
          location || ' ' ||
          headline || ' ' ||
          email || ' ' ||
          phone_number
        )
      );
    """
  end
end
```

And run it:

```bash
$ mix exto.migrate
```

Next step is adding a helper function to the `Contact` model module, which builds the query
that compares a `ts_query`, with the received string, to the `ts_vector` we have just created:

```elixit
# web/models/contact.ex

defmodule PhoenixAndElm.Contact do
  # ...

  def search(query, ""), do: query
  def search(query, search_query) do
    search_query = ts_query_format(search_query)

    query
    |> where(
      fragment(
      """
      (to_tsvector(
        'english',
        coalesce(first_name, '') || ' ' ||
        coalesce(last_name, '') || ' ' ||
        coalesce(location, '') || ' ' ||
        coalesce(headline, '') || ' ' ||
        coalesce(email, '') || ' ' ||
        coalesce(phone_number, '')
      ) @@ to_tsquery('english', ?))
      """,
      ^search_query
      )
    )
  end

  defp ts_query_format(search_query) do
    search_query
    |> String.trim
    |> String.split(" ")
    |> Enum.map(&("#{&1}:*"))
    |> Enum.join(" & ")
  end
end
```

If you have not used **PostgreSql**'s full text search before, I recommend you to check the [official docs](https://www.postgresql.org/docs/current/static/textsearch.html).
It is quite an extensive topic, so let's leave it here and continue with our application.

To use the new search function we have just created, we need to edit the `ContactController` module:

```ruby
# web/controllers/contact_controller.ex

defmodule PhoenixAndElm.ContactController do
  use PhoenixAndElm.Web, :controller

  alias PhoenixAndElm.Contact

  def index(conn, params) do
    search = Map.get(params, "search", "")

    page = Contact
      |> Contact.search(search)
      |> order_by(:first_name)
      |> Repo.paginate(params)

    render conn, page: page
  end
end
```

We are getting the search key from the params (or an empty string if it does not exist) and calling the `Contact.search`
function passing it as the param. As the search function returns a query, we can concatenate more queries to it,
like `order_by`, before getting the result page.

### The search input

Once the backend is ready to receive a `search` param and run a full text search against the contacts table,
let's jump back to the frontend and add the search string to the `Model` module:

```elm
-- web/elm/Model.elm


module Model exposing (..)


type alias Model =
    { contactList : ContactList
    , error : Maybe String
    , search : String
    }

-- ...


initialModel : Model
initialModel =
    { contactList = initialContatcList
    , error = Nothing
    , search = ""
    }
```

We can continue by adding the search input to the `ContactList.View` module:

```elm
-- web/elm/ContactList/View.elm

module ContactList.View exposing (indexView)

-- ...

indexView : Model -> Html Msg
indexView model =
    div
        [ id "home_index" ]
        [ searchSection model
        , paginationList model.contactList.total_pages model.contactList.page_number
        , div
            []
            [ contactsList model ]
        , paginationList model.contactList.total_pages model.contactList.page_number
        ]


searchSection : Model -> Html Msg
searchSection model =
    let
        totalEntries =
            model.contactList.total_entries

        contactWord =
            if totalEntries == 1 then
                "contact"
            else
                "contacts"

        headerText =
            if totalEntries == 0 then
                ""
            else
                (toString totalEntries) ++ " " ++ contactWord ++ " found"
    in
        div
            [ class "filter-wrapper" ]
            [ div
                [ class "overview-wrapper" ]
                [ h3
                    []
                    [ text headerText ]
                ]
            , div
                [ class "form-wrapper" ]
                [ Html.form
                    [ ]
                    [ input
                        [ type_ "search"
                        , placeholder "Search contacts..."
                        , value model.search
                        ]
                        []
                    ]
                ]
            ]

```

Using the `total_entries` from the model, we generate the header text to display the number of occurrences
found (or an empty text if there are no matches) and we also add a Html form with the search input.
After saving the file and refreshing the browser, we should see the following:

<img src="/images/blog/phoenix_and_elm/search.jpg" alt="Search" style="background: #fff;" />

So far, so good. We have set the value of the model.search as the value of the new search input. Therefore,
we need to update the model every time the user types on it. To achieve this, let's first
add the corresponding event handler to the input:

```Elm
-- web/elm/ContactList/View.elm

module ContactList.View exposing (indexView)

-- ...


searchSection : Model -> Html Msg
searchSection model =
    let
        -- ...
    in
        -- ...

            [ input
                [ type_ "search"
                , placeholder "Search contacts..."
                , value model.search
                , onInput HandleSearchInput
                ]
                []
            ]

        -- ...
```

This change is going to break the compilation, so we have to add the `HandleSearchInput` message to the `Messages` module:

```elm
-- web/elm/Messages.elm

module Messages exposing (..)

-- ...

type Msg
    = FetchResult (Result Http.Error ContactList)
    | Paginate Int
    | HandleSearchInput String
```

We can not forget about the corresponding handle in the `Update` module. Otherwise, the compiler is going to complain again:

```elm
-- web/elm/Update.elm

module Update exposing (..)

-- ...

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        -- ...

        HandleSearchInput value ->
            { model | search = value } ! []

```

After these changes compile with success, refresh your browser, go to the search input and type some text
keeping an eye on the Elm's history debugger, checking how the model gets updated on each keystroke:


<img src="/images/blog/phoenix_and_elm/oninput.jpg" alt="On input" style="background: #fff;" />

There is only one thing left to do to make the search input completely functional, which is sending the
model's `search` value along with the `page` number while fetching the contacts. Let's add another event handler,
this time to the form so we can trigger the search when the user submits the form by pressing the intro key:


```elm
-- web/elm/ContactList/View.elm

module ContactList.View exposing (indexView)

-- ...


searchSection : Model -> Html Msg
searchSection model =
    let
        -- ...
    in
        -- ...
        , div
            [ class "form-wrapper" ]
            [ Html.form
                [ onSubmit HandleFormSubmit ]

                -- ...
```

We need again to update the `Messages` module and add the `HandleFormSubmit` type:

```elm
-- web/elm/Messages.elm

module Messages exposing (..)

-- ...

type Msg
    = FetchResult (Result Http.Error ContactList)
    | Paginate Int
    | HandleSearchInput String
    | HandleFormSubmit

```

Handling this message in the `Update` module implies doing some minor refactoring to some of the
code we already have. The reason is that we now need to send both the page and the search while
fetching, so let's start by editing the Update module:

```elm
-- web/elm/Update.elm

module Update exposing (..)

-- ...

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        -- ...

        Paginate pageNumber ->
            model ! [ fetch pageNumber model.search ]

        -- ...

        HandleFormSubmit ->
            model ! [ fetch 1 model.search ]


```

In the `Paginate` case, we want to fetch the corresponding page for the current search value to paginate
the current matching results. On the other hand, in the `HandleFormSubmit`, we always want to reset the pagination
and request the first page when the user is doing a new search. The next modification we have to make
is adding the search as a param of the fetch function, so let's edit the `Commands` module:

```elm
-- web/elm/Commands.elm

module Commands exposing (..)

-- ...

fetch : Int -> String -> Cmd Msg
fetch page search =
    let
        apiUrl =
            "/api/contacts?page=" ++ (toString page) ++ "&search=" ++ search

        request =
            Http.get apiUrl contactListDecoder
    in
        Http.send FetchResult request


```

The compiler still complains about one more thing, which is the call to fetch in the init function in the `Main` module, so let's fix that as well:

```elm
-- web/elm/Main.elm

module Main exposing (..)

-- ...

init : ( Model, Cmd Msg )
init =
    initialModel ! [ fetch 1 "" ]

-- ...
```

And that is it! After refreshing the browser, type anything in the search input, press intro, and you shall see the filtered list of contacts:

<img src="/images/blog/phoenix_and_elm/search-results.jpg" alt="Search results" style="background: #fff;" />

Although we have implemented the functionality we planned at the beginning of the episode, we still can do it a bit better.
Have you noticed that when you refresh the browser, the first thing that renders is the No contacts found... message?
Well, that does not look very nice, so we have to fix it among some other minor things we are going polish in the next
part of the series. In the meantime [here is the branch](https://github.com/bigardone/phoenix-and-elm/tree/tutorial/part-3) with all the changes that we have just done.

Happy coding!

<div class="btn-wrapper">
  <a href="https://phoenix-and-elm.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/phoenix-and-elm" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>
