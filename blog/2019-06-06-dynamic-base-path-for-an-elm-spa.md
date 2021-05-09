---
title: "Dynamic base path for an Elm SPA"
date: 2019-06-06
pubished: true
tags: elm
excerpt: Elm SPA navigation with a dynamic base path.
---

While building an Elm SPA dashboard, I faced the following problem. In the local development environment, the URL to access it is `http://localhost:1234`, which is Parcel's default URL, and the Elm SPA gets mounted in `/`, so Elm navigation handles as expected any internal routes like `/projects` or `/tasks`. The problem came while deploying it into production because the base URL didn't match the root path. In other words, it looked something like <https://nifty-minsky-538aab.netlify.com/private/admin/> where `/private/admin/` was the base path for the application, and this path could change depending on the environment, which made Elm navigation tricky, especially while parsing URLs to get the current route. I wanted to avoid using URL fragments, so this is how I solved it.

### The \<base> HTML element

First of all, I needed a way to prepend the dynamic base URL to any of the internal Elm routes. After some research I found the handy [\<base>] HTML element, which specifies the base URL to use for all relative URLs contained within a document. This means that if you set `<base href="http://localhost:1234/private/admin/">`, any relative link I would add like `<a href="projects">Projects</a>`, automatically points to `http://localhost:1234/private/admin/projects`, and that was exactly what I was looking for.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <base href="{{ BASE_URL }}">
  </head>
  <body>
    <main></main>
    <script src="./js/index.js"></script>
  </body>
</html>
```

Setting the `href` value for the current environment is easy using environment variables, depending on the technology stack you are using.

### Passing the base path to the Elm application

Now that I had a way to set the base URL to all the internal links of the application, I needed a way to make Elm aware of this base path, which was pretty straightforward using flags and the [baseURI] property:

```js
import { Elm } from '../src/Main.elm';

const basePath = new URL(document.baseURI).pathname;

Elm.Main.init({
  node: document.querySelector('main'),
  flags: { basePath },
});
```

`baseURI` basically returns the document's location, unless you set `<base>` in which case it always returns the value set. I only needed the path, therefore taking it from `URL(document.baseURI).pathname` and passing it to the `Elm.Main.init` function as a flag.

### Elm routing and the base path

I always like defining the application routes as soon as possible, which helps me understand how to structure it. Moreover, in this particular case, routing was the source of the issue and the solution ifself, so let's have a look at the `Route` module I implemented:

```elm
-- src/Route.elm

module Route exposing
    ( Route(..)
    , fromUrl
    , toString
    )

import Url exposing (Url)
import Url.Parser as Parser exposing (Parser)


type Route
    = Home
    | Projects
    | Tasks
    | NotFound


parser : Parser (Route -> b) b
parser =
    Parser.oneOf
        [ Parser.map Home Parser.top
        , Parser.map Projects (Parser.s "projects")
        , Parser.map Tasks (Parser.s "tasks")
        ]

-- ...
```

This is pretty much the standard way of defining routes and their parser in Elm, and there wasn't any particular change I had to implement to make it work. However, both `fromUrl` and `toString` functions needed to be slightly different than usual:

```elm
-- src/Route.elm

-- ...


fromUrl : String -> Url -> Route
fromUrl basePath url =
    { url | path = String.replace basePath "" url.path }
        |> Parser.parse parser
        |> Maybe.withDefault NotFound


toString : Route -> String
toString route =
    case route of
        Home ->
            ""

        Projects ->
            "projects"

        Tasks ->
            "tasks"

        NotFound ->
            "not-found"
```

`fromUrl` takes a `basePath` and a `Url` parameter and returns a `Route`. The first parameter is the flag passed to the Elm application on its initialization, and to get the corresponding `Route`, we only need to remove `basePath` from its path and parse it as usually. Bear in mind, that this only works with URLs built using the `<base>` element set in the document header. Last but not least, the `toString` function offers a convenient way of building a relative path for a given `Route`.

### Gluing it all together

Having the parsing of URLs solved, building the rest of the application was quite simple. Let's take a look at some of the implementation details:

```elm
-- src/Main.elm

module Main exposing (main)


import Browser exposing (Document)
import Browser.Navigation as Navigation
import Html as Html exposing (Html)
import Route exposing (Route)
import Url exposing (Url)

-- MODEL


type alias Flags =
    { basePath : String }


type alias Model =
    { flags : Flags
    , navigation : Navigation
    }


type alias Navigation =
    { key : Navigation.Key
    , route : Route
    }


init : Flags -> Url -> Navigation.Key -> ( Model, Cmd Msg )
init ({ basePath } as flags) url key =
    ( { flags = flags
      , navigation =
            { key = key
            , route = Route.fromUrl basePath url
            }
      }
    , Cmd.none
    )

-- ...

-- MAIN


main : Program Flags Model Msg
main =
    Browser.application
        { init = init
        , update = update
        , view = view
        , subscriptions = subscriptions
        , onUrlRequest = UrlRequested
        , onUrlChange = UrlChange
        }
```

I usually store the flags passed to the application in the model using a custom type named `Flags`, which in this particular example only contains `basePath`. I also like to store a `Navigation` custom element which contains a `Navigation.Key`, necessary for navigating, and the current route. The `init` function is using the previously defined `Route.fromUrl` function to set the current route from the browser's URL and the `basePath` flag. However, it also needs to set it every time the URL changes:

```elm
-- src/Main.elm

-- ...

-- UPDATE


type Msg
    = UrlRequested Browser.UrlRequest
    | UrlChange Url


update : Msg -> Model -> ( Model, Cmd Msg )
update msg ({ flags, navigation } as model) =
    case msg of
        UrlRequested urlRequest ->
-- ...

        UrlChange url ->
            ( { model
                | navigation =
                    { navigation
                        | route = Route.fromUrl flags.basePath url
                    }
              }
            , Cmd.none
            )
```

And this is how I created the navigation links using the `Route.toString` function:

```elm
Html.div
    []
    [ Html.a
        [ Html.href <| Route.toString Route.Home ]
        [ Html.text "Home" ]
    , Html.a
        [ Html.href <| Route.toString Route.Projects ]
        [ Html.text "Projects" ]
    , Html.a
        [ Html.href <| Route.toString Route.Tasks ]
        [ Html.text "Tasks" ]
    ]
```

And that's it; everything worked like a charm. Being honest, I tried different approaches before getting to this solution, including custom `Url` parsers, which is something difficult to understand for me. Have you faced the same issue? If so, I hope this solution helps you on the next occasion, and if you have solved differently, please share it :)

Happy coding!

<div class="btn-wrapper">
  <a href="https://nifty-minsky-538aab.netlify.com/private/admin/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/elm-dynamic-base-path" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>


[\<base>]: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base
[baseURI]: https://developer.mozilla.org/en-US/docs/Web/API/Node/baseURI




