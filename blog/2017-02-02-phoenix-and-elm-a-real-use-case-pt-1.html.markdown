---
title: Phoenix and Elm, a real use case (pt. 1)
date: 2017-02-02 22:31 PST
tags: elixir, phoenix, elm, ecto, postgresql
excerpt:
  Introduction to creating a SPA with Phoenix and Elm.
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

## Introduction

It has been a long time since my last post. Last September I joined [The Book of Everyone][24f7093e],
a very cool startup not only with an awesome product, but with a very passionate
and talented [team][459e406b] as well, and I have been very busy since then.
Apart from working for such a team, another of the main reasons for joining was that most of the
current stack is **Elixir** and **Phoenix**, so it was an excellent opportunity for solving real
problems using some of my favorite technologies. At that time, I also started to
play around with [Elm][elmlanglink], _the functional programming language for the web_, rewriting some of my pet projects
like [Phoenix Battleship][pheonixbattelshiplink].
As a **React**/**Redux** fan and recently converted functional programmer, I felt it was the right
path to take. Once I was comfortable enough with the syntax and architecture, I proposed building a proof of concept
in **Elm** as the new front-end for an internal tool that we use at **TBOE**
for creating landing pages. A few weeks later, the POC was ready, pushed to production,
and has been working without a single runtime error since then.

I am having so much fun coding in **Elm** that I can't resist writing a small series about creating a small
**SPA**, covering basic topics such as integrating **Elm** in a **Phoenix** project, routing in an **Elm**
program, making HTTP requests and sockets support. So let's get started!

### Why Elm?
The people who either know me well or have worked with me know that I am extremely passionate about any
new technology that I start learning and I like. However, in the case of Elm, it has been different.
I first heard about Elm almost a year ago, while learning Elixir and doing my first pet projects,
and I think it was reading some kind of article about Redux.
In fact, in thanks to that article, I discovered that Elm's architecture inspired Redux and that caught my attention immediately.
After an initial try, I decided that learning Elixir was enough task, and left Elm for later, but I
kept reading articles and tutorials about it. It was not until when version 0.17 came out, that I decided
to give it another try, and I have been coding Elm almost every day since then, just for the joy of it most of the time.
Joy is a word that truly represents to me the experience of coding in Elm because:

- It is functional and immutable; therefore I do not need to be switching between paradigms while coding back-end and front-end.
- Its type system in combination with its gentle compiler forces you to write good and error-free code.
- Talking about the compiler, it has the best error messages I have ever seen. They look more like a tutorial, nothing to do with the error messages we are all so used to. This also makes refactoring really easy and straightforward.
- It generates good JavaScript free of runtime errors. If it compiles, it works in the browser. True story.
- It has a decent package manager and repository, which is very strict in terms of publishing packages, and even detects breaking changes in new versions.
- It is both a language and a framework. If you have tried Redux before, then you will find the Elm Architecture easy to understand and familiar.
- It has some decent linting and formatting packages for almost any editor, that assist you writing clean and pretty code.
- Very performant and fast virtual DOM.
- Once you get it, you experiment a real productivity boost.

And I could probably keep adding more reasons to the list, but let's leave it there and start with the fun part.


### The Phoenix application
Before continuing, let's take a closer look at what we are going to build. If you have been following my blog,
I am sure you will find it familiar as it is the same concept I have been using since I started writing about
[Rails and React](/blog/2014/09/10/rails-and-react-ii-a-real-use-case).

<img src="/images/blog/phoenix_and_elm/app.jpg" alt="Final result" style="background: #fff;" />

<div class="btn-wrapper">
  <a href="https://phoenix-and-elm.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/phoenix-and-elm" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>

Starting from a new Phoenix application, let's create the only model we need:

```bash
$ mix phoenix.gen.model Contact contacts first_name last_name gender:integer birth_date:date location phone_number email headline:text picture
```

This creates the following migration file:

```ruby
# priv/repo/migrations/20160815170103_create_contact.exs

defmodule PhoenixAndElm.Repo.Migrations.CreateContact do
  use Ecto.Migration

  def change do
    create table(:contacts) do
      add :first_name, :string, null: false
      add :last_name, :string, null: false
      add :gender, :integer, default: 0
      add :birth_date, :date, null: false
      add :location, :string, null: false
      add :phone_number, :string
      add :email, :string, null: false
      add :headline, :text
      add :picture, :string

      timestamps()
    end
  end
end
```

The previous command also creates the basic model/schema with the bunch of fields:

```ruby
# web/models/contact.ex

defmodule PhoenixAndElm.Contact do
  use PhoenixAndElm.Web, :model

  schema "contacts" do
    field :first_name, :string
    field :last_name, :string
    field :gender, :integer
    field :birth_date, Ecto.Date
    field :location, :string
    field :phone_number, :string
    field :email, :string
    field :headline, :string
    field :picture, :string

    timestamps()
  end

  @doc """
  Builds a changeset based on the `struct` and `params`.
  """
  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [:first_name, :last_name, :gender, :birth_date, :location, :phone_number, :email, :headline, :picture])
    |> validate_required([:first_name, :last_name, :gender, :birth_date, :location, :phone_number, :email, :headline, :picture])
  end
end
```

This is all we need at the moment. Eventually, we will be adding full-text search support,
but we will see that later on. Don't forget to run the migration task before moving on to the next step:

```bash
$ mix ecto.migrate
```

### Installing Elm

In order to add Elm to the project, we first need to install the necessary npm packages:

```bash
$ npm install elm elm-brunch --save
```

We are going to be placing all the Elm stuff in the `web/elm` folder, so we have to update the `brunch-config.js` file, adding the
following changes:

```javascript
// brunch-config.js

exports.config = {
  // ...

  paths: {
    watched: [
      // ...
      'web/elm',
    ],

    // ...
  },

  plugins: {
    // ...

    elmBrunch: {
      elmFolder: 'web/elm',
      mainModules: ['Main.elm'],
      outputFolder: '../static/js',
    },

    // ...
  },

  // ...
};
```

We are telling brunch to watch the web/elm folder and configuring the elmBrunch plugin.
Now that this is set up correctly let's create the web/elm folder and install the first
one of the Elm packages that we will be using:

```bash
$ mkdir web/elm
$ cd web/elm
$ elm-package install elm-lang/html -y
```

Doing this not only installs Elm's core and HTML libraries but creates the basic elm-package.json file,
which is very similar to npm's package.json file, and the core configuration on any Elm application:

```json
{
  "version": "1.0.0",
  "summary": "helpful summary of your project, less than 80 characters",
  "repository": "https://github.com/user/project.git",
  "license": "BSD3",
  "source-directories": [
    "."
  ],
  "exposed-modules": [],
  "dependencies": {
    "elm-lang/core": "5.0.0 <= v < 6.0.0",
    "elm-lang/html": "2.0.0 <= v < 3.0.0",
  },
  "elm-version": "0.18.0 <= v < 0.19.0"
}
```

Now we can add a very basic `Main.elm` file with the `Main` module that simply returns a **Hello, World!** message:

```elm
--- web/elm/Main.elm

module Main exposing (..)

import Html exposing (Html, text)


main : Html a
main =
    text "Hello, World!"
```

Next, we need to update the main `app.js` file to import the javascript generated by Elm and render the result:

```javascript
// web/static/js/app.js

import Elm from './main';

const elmDiv = document.querySelector('#elm_target');

if (elmDiv) {
  Elm.Main.embed(elmDiv);
}
```

We want to embed it in a div with the `elm_target` id, so let's go ahead and add that div in the corresponding Phoenix template:

```html
<!-- web/templates/page/index.html.eex -->

<div id="elm_target"></div>
```

Now we are ready to start the Phoenix server and check out that everything is working fine. The output should be something
similar to this:

```bash
$ iex -S mix phoenix.server
Erlang/OTP 19 [erts-8.1] [source] [64-bit] [smp:4:4] [async-threads:10] [hipe] [kernel-poll:false]
info] Running PhoenixAndElm.Endpoint with Cowboy using http://localhost:4000
Interactive Elixir (1.4.0) - press Ctrl+C to exit (type h() ENTER for help)
iex(1)> Elm compile: Main.elm, in web/elm, to ../static/js/main.js
[BABEL] Note: The code generator has deoptimised the styling of "web/static/js/main.js" as it exceeds the max of "100KB".
10:27:47 - info: compiling
10:27:50 - info: compiled 89 files into 2 files, copied 2 in 15.2 sec
```

Visiting [http://localhost:4000][localhosturl] should render the **Hello, World!** message in the browser.

Enough for now. In the next part, we will dig a bit more in the Elm architecture, define our application's
state and start coding our first Elm modules. In the meantime, you can take a look to the repository with
the final result or see it in action in the live demo.

<div class="btn-wrapper">
  <a href="https://phoenix-and-elm.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/phoenix-and-elm" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>

Happy coding!



  [24f7093e]: https://thebookofeveryone.com "The Book of Everyone"
  [459e406b]: https://thebookofeveryone.com/uk/about "The TBOE team"
  [pheonixbattelshiplink]: https://github.com/bigardone/phoenix-elm-battleship "Phoenix and Elm Battleship"
  [elmlanglink]: http://elm-lang.org/ "Elm language"
  [elmhtmllink]: http://package.elm-lang.org/packages/elm-lang/html/latest/ "Elm HTML package"
  [localhosturl]: http://localhost:4000 "localhost"
