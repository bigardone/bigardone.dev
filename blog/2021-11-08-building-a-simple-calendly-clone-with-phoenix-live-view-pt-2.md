---
title: "Building a simple Calendly clone with Phoenix LiveView (pt. 2)"
excerpt: "Generating the initial project and domain models."
date: "2021-11-08"
tags: elixir, phoenix, liveview
image: "https://bigardone.dev/images/blog/2021-11-08-building-a-simple-calendly-clone-with-phoenix-live-view-pt-2/post-meta.png"
---

<div class="index">
  <p>This post belongs to the <strong>Building a simple Calendly clone with Phoenix LiveView</strong> series.</p>
  <ol>
    <li><a href="/blog/2021/11/06/building-a-simple-calendly-clone-with-phoenix-live-view-pt-1">Introduction.</a></li>
    <li><a href="/blog/2021/11/08/building-a-simple-calendly-clone-with-phoenix-live-view-pt-2">Generating the initial project and domain models.</a></li>
    <li><a href="/blog/2021/11/11/building-a-simple-calendly-clone-with-phoenix-live-view-pt-3">The event type selection page.</a></li>
    <li><a href="/blog/2021/11/22/building-a-simple-calendly-clone-with-phoenix-live-view-pt-4">Rendering the monthly calendar.</a></li>
    <li><a href="/blog/2021/12/01/building-a-simple-calendly-clone-with-phoenix-live-view-pt-5">Booking time slots for an event type.</a></li>
    <li><a href="/blog/2021/12/20/building-a-simple-calendly-clone-with-phoenix-live-view-pt-6">Managing event types, part one.</a></li>
    <li><a href="/blog/2022/01/11/building-a-simple-calendly-clone-with-phoenix-live-view-pt-7">Managing event types, part two.</a></li>
    <li><a href="/blog/2022/01/31/building-a-simple-calendly-clone-with-phoenix-live-view-pt-8">Managing event types, part three.</a></li>
    <li>Coming soon...</li>
  </ol>
  <a href="https://github.com/bigardone/calendlex" target="_blank"><i class="fa fa-github"></i> Source code</a><br>
  <a href="https://calendlex.herokuapp.com/" target="_blank"><i class="fa fa-cloud"></i> Live demo</a>
</div>

In this part, we will generate our new project from scratch, using **Phoenix v1.6**. The most significant change of this version is the [removal of webpack and npm dependencies], relying on [esbuild] to build assets. Nevertheless, we will use [Tailwind CSS] for styling the HTML, so we will have to make some minor tweaks to the project's default configuration to support it. Finally, we will generate the migration files and schemas for the domain models. Let's get cracking!

## Generating the project
First of all, let's ensure that we have the latest version of the Phoenix project generator:

```plaintext
❯ mix archive.install hex phx_new
Resolving Hex dependencies...
Dependency resolution completed:
New:
  phx_new 1.6.2
* Getting phx_new (Hex package)
All dependencies are up to date
Compiling 11 files (.ex)
Generated phx_new app
Generated archive "phx_new-1.6.2.ez" with MIX_ENV=prod
Found existing entry: /Users/ricardogarciavega/.asdf/installs/elixir/1.12.3/.mix/archives/phx_new-1.6.2
Are you sure you want to replace it with "phx_new-1.6.2.ez"? [Yn]
* creating /Users/ricardogarciavega/.asdf/installs/elixir/1.12.3/.mix/archives/phx_new-1.6.2
```

With the latest version installed, we can run the following command to generate the new project:

```plaintext
mix phx.new calendlex --no-gettext --no-dashboard --no-mailer
```

We are removing **gettext**, the **live dashboard**, and the **mailer** since we will not use them in this series. After the generator finishes scaffolding all the project files and installing all the initial dependencies, let's make the necessary changes to support Tailwind CSS.

## Adding Tailwind CSS support
I've been using **Tailwind CSS** for quite some time, and I couldn't be happier with it.  However, since **Phoenix** has removed **npn** and **webpack**, adding extra front-end dependencies, such as **Tailwind CSS**, needs some additional changes in the project. After doing a quick search over the Internet, I found this [great post] from [Sergio Tapia] that explains how to achieve this task in seven simple steps. Here's the TL;DR version:

### 1. Install Tailwind CSS

```plaintext
❯ cd assets
❯ npm init -y
❯ npm install tailwindcss postcss postcss-import autoprefixer --save-dev
```

### 2. Configure PostCSS

```javascript
/* ./assets/postcss.config.js */

module.exports = {
  plugins: [
    require('postcss-import')(),
    require('tailwindcss')('./tailwind.config.js'),
    require('autoprefixer'),
  ],
};
```

### 3. Configure Tailwind CSS

```javascript
/* ./assets/tailwind.config.js */

module.exports = {
  mode: 'jit',
  purge: [
    './js/**/*.js',
    './css/**/*.css',
    '../lib/*_web/**/*.*ex',
  ],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {},
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
```

### 4. Include Tailwind CSS in our styles

```css
/* ./assets/css/app.css */

@import "tailwindcss/base";
@import "tailwindcss/components";
@import "tailwindcss/utilities";
```

### 5. Add a watcher for the development environment

```elixir
# ./config/dev.exs

import Config

# ...

config :calendlex, CalendlexWeb.Endpoint,
  # ...
  watchers: [
    esbuild: {Esbuild, :install_and_run, [:default, ~w(--sourcemap=inline --watch)]},
    npx: [
      "tailwindcss",
      "--input=css/app.css",
      "--output=../priv/static/assets/app.css",
      "--postcss",
      "--watch",
      cd: Path.expand("../assets", __DIR__)
    ]
  ]

# ...
```

### 6. Add a deploy script in the package file

```javascript
// assets/package.json

{
  ...,
  "scripts": {
    "deploy": "NODE_ENV=production postcss css/app.css -o ../priv/static/assets/app.css"
  },
  ...,
}
```

### 7. Modify the assets deploy alias in the mix file

```elixir
# ./mix.exs

defmodule Calendlex.MixProject do
  use Mix.Project

  # ...

  defp aliases do
    [
      # ...
      "assets.deploy": [
        "cmd --cd assets npm run deploy",
        "esbuild default --minify",
        "phx.digest"
      ]
    ]
  end
end
```

And that's pretty much it. If we start the Phoenix server and visit http://localhost:4000/ we should see the default Phoenix home page rendering.

```plaintext
❯ iex -S mix phx.server
Erlang/OTP 24 [erts-12.0.1] [source] [64-bit] [smp:12:12] [ds:12:12:10] [async-threads:1] [jit]

[info] Running CalendlexWeb.Endpoint with cowboy 2.9.0 at 127.0.0.1:4000 (http)
[info] Access CalendlexWeb.Endpoint at http://localhost:4000
Interactive Elixir (1.12.3) - press Ctrl+C to exit (type h() ENTER for help)
iex(1)> [watch] build finished, watching for changes...

warn - You have enabled the JIT engine which is currently in preview.
warn - Preview features are not covered by semver, may introduce breaking changes, and can change at any time.

Rebuilding...
Done in 145ms.
```

To confirm that Tailwind is working fine, let's change the color of the body node in the root template:

```html
<% # lib/calendlex_web/templates/layout/root.html.heex %>

<!DOCTYPE html>
<html lang="en">
  ...
  <body class="text-red-500">
    ...
    <%= @inner_content %>
  </body>
</html>
```

After applying the change, we should see the following in our browser:

<a href="/images/blog/2021-11-08-building-a-simple-calendly-clone-with-phoenix-live-view-pt-2/red-body.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-11-08-building-a-simple-calendly-clone-with-phoenix-live-view-pt-2/red-body.png"/>
</a>

## Replacing the default controller with a live view

This project will be a full **LiveView** application, meaning that it will not have regular Phoenix controllers as such, and it will use **LiveView** to handle all its routes and navigation between them. Therefore, we can remove the default controller that Phoenix generates and all the related files. Let's go ahead and run the following command from the terminal:

```plaintext
rm lib/calendlex_web/views/page_view.ex test/calendlex_web/views/page_view_test.exs lib/calendlex_web/controllers/page_controller.ex test/calendlex_web/controllers/page_controller_test.exs lib/calendlex_web/templates/page/index.html.heex
```

Now let's create a new live view module and its corresponding rendering template:

```elixir
# ./lib/calendlex_web/live/page_live.ex

defmodule CalendlexWeb.PageLive do
  use CalendlexWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
    {:ok, socket}
  end
end
```

```elixir
# ./lib/calendlex_web/live/page_live.html.heex

Hello from Calendlex!
```

We also have to modify the router file to map the root path to the module we just created:

```elixir
# ./lib/calendlex_web/router.ex

defmodule CalendlexWeb.Router do
  use CalendlexWeb, :router

  # ...

  scope "/", CalendlexWeb do
    pipe_through :browser

    live "/", PageLive
  end
end
```

Last but not least, let's modify the root template again, removing all the auto-generated Phoenix HTML, rendering only the `@inner_content` assign inside the body tag:

```elixir
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <%= csrf_meta_tag() %>
    <%= live_title_tag assigns[:page_title] || "Calendlex", suffix: " · Calendlex" %>
    <link phx-track-static rel="stylesheet" href={Routes.static_path(@conn, "/assets/app.css")}/>
    <script defer phx-track-static type="text/javascript" src={Routes.static_path(@conn, "/assets/app.js")}></script>
  </head>
  <body>
    <%= @inner_content %>
  </body>
</html>
```

Jumping back to the browser, we only should see a white page rendering the `Hello from Calendlex!` text. Yay!


## Defining our domain models

With our initial project configured and ready to start coding, let's move forward and define our domain models. In this tutorial, we are going to focus primarily on two different concerns:

1. Scheduling invitee events of a given event type.
2. Managing scheduled events and event types.

Therefore, we can quickly identify two different entities:

### 1. EventType

It defines the type of a scheduled event, including the event's **name**, a short **description**, the path **slug** that we will use to create friendly URLs, the **duration** of the event in minutes, and a **color** to identify an event visually. Let's run the corresponding mix task to generate Ecto's migration file and schema:

```paintext
❯ mix phx.gen.schema EventType event_types
* creating lib/calendlex/event_type.ex
* creating priv/repo/migrations/20211109085811_create_event_types.exs

Remember to update your repository by running migrations:

    $ mix ecto.migrate
```

Let's jump into the generated migration file to add all the necessary fields that we need:

```elixir
# priv/repo/migrations/20211004061942_create_event_types.exs

defmodule Calendlex.Repo.Migrations.CreateEventTypes do
  use Ecto.Migration

  def change do
    create table(:event_types, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :description, :text
      add :slug, :string, null: false
      add :duration, :integer, null: false
      add :color, :string, null: false

      timestamps()
    end

    create(unique_index(:event_types, [:slug]))
  end
end
```

Since we eventually want to access the schedule event page using a friendly URL generated with an event type's slug, we are adding a unique index to the `slug` column. We also need to update the generated schema file to map the fields:

```elixir
# ./lib/calendlex/event_type.ex

defmodule Calendlex.EventType do
  use Ecto.Schema
  import Ecto.Changeset

  alias __MODULE__

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "event_types" do
    field :description, :string
    field :duration, :integer
    field :name, :string
    field :slug, :string
    field :color, :string

    timestamps()
  end

  @fields ~w(name description slug duration color)a
  @required_fields ~w(name slug duration color)a

  def changeset(event_type \\ %EventType{}, attrs) do
    event_type
    |> cast(attrs, @fields)
    |> validate_required(@required_fields)
    |> unique_constraint(:slug, name: "event_types_slug_index")
  end
end
```

Note how we add the `unique_constraint` check in the changeset to prevent runtime errors and convert them into validation errors while inserting/updating event types with existing slugs.

### 2. Event

It represents a scheduled event type by an invitee. It consists of a previously defined **event type**, the invitee's **name**, **email**, **time zone**, when the event **starts** and **ends**, and any additional **comments** provided by the invitee while scheduling the event. Let's generate both the migration and schema files like we did before:

```plaintext
❯ mix phx.gen.schema Event events
* creating lib/calendlex/event.ex
* creating priv/repo/migrations/20211109091909_create_events.exs

Remember to update your repository by running migrations:

    $ mix ecto.migrate
```

Let's edit the migration file to add the necessary columns:

```elixir
# ./priv/repo/migrations/20211005043236_create_events.exs

defmodule Calendlex.Repo.Migrations.CreateEvents do
  use Ecto.Migration

  def change do
    create table(:events, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :start_at, :utc_datetime, null: false
      add :end_at, :utc_datetime, null: false
      add :name, :string, null: false
      add :email, :string, null: false
      add :time_zone, :string, null: false
      add :comments, :text

      add :event_type_id, references(:event_types, on_delete: :nothing, type: :binary_id),
        null: false

      timestamps()
    end

    create index(:events, [:event_type_id])
  end
end
```

And again, we need to edit the generated schema module to add all the fields:

```elixir
# ./lib/calendlex/event.ex

defmodule Calendlex.Event do
  use Ecto.Schema
  import Ecto.Changeset

  alias __MODULE__
  alias Calendlex.EventType

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "events" do
    field :comments, :string
    field :email, :string
    field :end_at, :utc_datetime
    field :name, :string
    field :start_at, :utc_datetime
    field :time_zone, :string

    belongs_to(:event_type, EventType)

    timestamps()
  end

  @fields ~w(event_type_id start_at end_at name email comments time_zone)a
  @required_fields ~w(start_at end_at name email time_zone)a

  @doc false
  def changeset(event \\ %Event{}, attrs) do
    event
    |> cast(attrs, @fields)
    |> validate_required(@required_fields)
  end
end
```

Now we can run the migration task to create the tables in the database:

```plaintext
❯ mix ecto.migrate

10:27:32.009 [info]  == Running 20211109085811 Calendlex.Repo.Migrations.CreateEventTypes.change/0 forward

10:27:32.012 [info]  create table event_types

10:27:32.019 [info]  create index event_types_slug_index

10:27:32.023 [info]  == Migrated 20211109085811 in 0.0s

10:27:32.057 [info]  == Running 20211109091909 Calendlex.Repo.Migrations.CreateEvents.change/0 forward

10:27:32.057 [info]  create table events

10:27:32.064 [info]  create index events_event_type_id_index

10:27:32.065 [info]  == Migrated 20211109091909 in 0.0s
```

### Seeding the database

We can do one last thing before starting to code: insert some initial data in the database. Let's edit the seeds file and create three different event types:

```elixir
# ./priv/repo/seeds.exs

alias Calendlex.{EventType, Repo}

Repo.delete_all(EventType)

event_types = [
  %{
    name: "15 minute meeting",
    description: "Short meeting call.",
    slug: "15-minute-meeting",
    duration: 15,
    color: "blue"
  },
  %{
    name: "30 minute meeting",
    description: "Extended meeting call.",
    slug: "30-minute-meeting",
    duration: 30,
    color: "pink"
  },
  %{
    name: "Pair programming session",
    description: "One hour of pure pair programming fun!",
    slug: "pair-programming-session",
    duration: 60,
    color: "purple"
  }
]

for event_type <- event_types do
  event_type
  |> EventType.changeset()
  |> Repo.insert!()
end
```

Let's run the proper mix task to create the data:

```plaintext
❯ mix run priv/repo/seeds.exs
[debug] QUERY OK source="event_types" db=2.4ms queue=0.5ms idle=16.7ms
DELETE FROM "event_types" AS e0 []
[debug] QUERY OK db=2.3ms queue=0.9ms idle=75.1ms
INSERT INTO "event_types" ("color","description","duration","name","slug","inserted_at","updated_at","id") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ["blue", "Short meeting call.", 15, "15 minute meeting", "15-minute-meeting", ~N[2021-11-09 09:50:35], ~N[2021-11-09 09:50:35], <<189, 68, 59, 71, 130, 177, 79, 169, 145, 17, 62, 233, 57, 10, 95, 6>>]
[debug] QUERY OK db=1.1ms queue=0.9ms idle=81.4ms
INSERT INTO "event_types" ("color","description","duration","name","slug","inserted_at","updated_at","id") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ["pink", "Extended meeting call.", 30, "30 minute meeting", "30-minute-meeting", ~N[2021-11-09 09:50:35], ~N[2021-11-09 09:50:35], <<146, 45, 139, 50, 20, 126, 68, 211, 147, 21, 28, 64, 65, 236, 162, 119>>]
[debug] QUERY OK db=0.7ms queue=0.4ms idle=83.8ms
INSERT INTO "event_types" ("color","description","duration","name","slug","inserted_at","updated_at","id") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ["purple", "One hour of pure pair programming fun!", 60, "Pair programming session", "pair-programming-session", ~N[2021-11-09 09:50:35], ~N[2021-11-09 09:50:35], <<192, 218, 73, 37, 143, 124, 73, 97, 162, 109, 198, 169, 219, 186, 112, 251>>]
```

And that's it for this part. Our initial project is ready to let the fun part begin. In the next part, we will start implementing the public side of our application, in which the visitor will have to select an event type and a suitable date and time slot to schedule a meeting. In the meantime, you can check the end result [here](https://calendlex.herokuapp.com/), or have a look at the [source code](https://github.com/bigardone/calendlex).

Happy coding!

<div class="btn-wrapper">
  <a href="https://calendlex.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/calendlex" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>

[removal of webpack and npm dependencies]: https://www.phoenixframework.org/blog/phoenix-1.6-released
[esbuild]: https://esbuild.github.io/
[Tailwind CSS]: https://tailwindcss.com/
[great post]: https://sergiotapia.com/phoenix-160-liveview-esbuild-tailwind-jit-alpinejs-a-brief-tutorial
[Sergio Tapia]: https://github.com/sergiotapia
