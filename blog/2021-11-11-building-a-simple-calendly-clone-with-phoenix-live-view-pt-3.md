---
title: "Building a simple Calendly clone with Phoenix LiveView (pt. 3)"
excerpt: "The event type selection page."
date: "2021-11-11"
tags: elix
image: "https://bigardone.dev/images/blog/2021-11-11-building-a-simple-calendly-clone-with-phoenix-live-view-pt-3/post-meta.png"
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

In the [last part] of the series, we generated a new **Phoenix** project and made the necessary changes to support **Tailwind CSS**. We also defined our domain models, consisting of **event types** and **events**, generating their migration files and Ecto schemas. Finally, we populated the database with three event types using the seeds file. In this part we will start building the public part of our application, in which a visitor will select one of them, a date, and a starting time, to schedule an event with us. More precisely, we will focus on the event type selection page, taking advantage of two new **LiveView** features:

- **Live sessions**.
- **Function components**.

Let's get cracking!

## But before, let's recall how LiveView works

If you are already familiar with LiveView and how it works, you can skip this part and jump to the next section. Otherwise, hold your horses and read this section before continuing, since understanding how LiveView works internally will help you a lot while coding. Any LiveView begins as a regular HTTP request with a standard HTML response. When the initial HTML response renders in the browser, LiveView's JS client opens a Phoenix socket connection between the page and the application.  This socket connection is nothing more than a process that stores a state and receives messages to update this state. Every time its internal state (a.k.a assigns) changes, LiveView re-rerenders the relevant parts of its HTML, pushing back the changes through the socket to the browser, where the JS client efficiently applies the changes to the DOM. The most remarkable thing about this is that LiveView guarantees a first HTML response render, whether JavaScript is enabled or not, which is very convenient for indexing, SEO, etc.

## The public live session

[Live session] is one of the new features added by LiveView. It defines a group of live routes that can handle navigation between them through the socket without any additional HTTP request to the server. It can share the same root layout and list of hooks to attach to the `mount` lifecycle of the LiveView. Very handy when you need to assign the same data to the socket over and over within a group of live views. In our case, as the owners of the calendar, we want to display our name to the visitor. Let's add it to our application configuration:

```elixir
# ./config/config.exs

import Config

config :calendlex,
  # ...
  owner: %{
    name: "Bigardone"
  }

# ...
```

Now let's create the `:public` live session in the router file:

```elixir
# ./lib/calendlex_web/router.ex

defmodule CalendlexWeb.Router do
  use CalendlexWeb, :router

  # ...

  live_session :public, on_mount: CalendlexWeb.Live.InitAssigns do
    scope "/", CalendlexWeb do
      pipe_through :browser

      live "/", PageLive
    end
  end
end
```

To assign the `:owner` configuration to the socket of all the live views within the `:public` live session, we will use the new module specified in the `:on_mount` option. Let's create it:

```elixir
# ./lib/calendlex_web/live/init_assigns.ex

defmodule CalendlexWeb.Live.InitAssigns do
  import Phoenix.LiveView

  def on_mount(:default, _params, _session, socket) do
    owner = Application.get_env(:calendlex, :owner)
    socket = assign(socket, :owner, owner)

    {:cont, socket}
  end
end
```

Live session hooks must implement the `on_mount` callback, which receives the identifier of the hook (to use pattern matching in case we want to define multiple versions), the public parameters, the session, and the socket. We get the owner's data from the application's configuration, assign it to the socket, and return `{:cont, socket}` to continue with LiveView's flow. With the owner's data available on every live view within the public session, we can move on and implement our first live view.

## The event type selection page
This page will get rendered in the application's root path, and it will list all the available event types, letting the user select one, which will trigger a redirection to the next page.

<a href="/images/blog/2021-11-11-building-a-simple-calendly-clone-with-phoenix-live-view-pt-3/final-result.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-11-11-building-a-simple-calendly-clone-with-phoenix-live-view-pt-3/final-result.png"/>
</a>

Let's start by editing the `PageLive` module we created in the previous part:

```elixir
# ./lib/calendlex_web/live/page_live.ex

defmodule CalendlexWeb.PageLive do
  use CalendlexWeb, :live_view

  # We will implement this module in a minute...
  alias CalendlexWeb.Components.EventType

  def mount(_params, _session, socket) do
    event_types = Calendlex.available_event_types()

    {:ok, assign(socket, event_types: event_types), temporary_assigns: [event_types: []]}
  end
end
```

When a LiveView gets rendered, the `mount/3` callback is invoked, and it accepts the private `session` and some public `params`. In this callback, we can fetch the necessary data we want to render. Therefore, we are getting all the available event types from the database and assigning them to the socket to render them in the template. We are also returning the `temporary_assigns` option, which sets the `event_types` assign to an empty list after rendering the template, preventing possible memory issues when having big lists of items. `Calendlex.available_event_types/0` does not exist yet, so let's go ahead and implement it:


```elixir
# ./lib/calendlex.ex

defmodule Calendlex do
  defdelegate available_event_types, to: Calendlex.EventType.Repo, as: :available
end
```

We will use the `Calendlex` module as the public interface between the `CalendlexWeb.*` and `Calendlex.*` namespaces. This way, the presentation layer, or `CalenlexWeb.*`, does not have to know any implementation details or internals of the business logic, or `Calendlex.*`. The module exposes an `available_event_types/0` function which delegates to the proper internal module in charge of doing any CRUD action related to event types, the `Calendlex.EventType.Repo`. Let's go ahead and create this module:

```elixir
# ./lib/calendlex/event_type/repo.ex

defmodule Calendlex.EventType.Repo do
  alias Calendlex.{EventType, Repo}
  import Ecto.Query, only: [order_by: 3]

  def available do
    EventType
    |> order_by([e], e.name)
    |> Repo.all()
  end
end
```

The available function is pretty straightforward. It gets all the event types from the database ordered by `name`. We have two different alternatives to render them in the `PageLive` live view. One is by implementing the `render/1` callback function in the same LiveView module, and the other is creating a new template file, like we did in the previous part. I usually prefer the second option, so let's go ahead and modify the template file:

```html
# ./lib/calendlex_web/live/page_live.html.heex

<section class="w-1/2 mx-auto">
  <div class="p-6 mb-2 bg-white border border-gray-200 shadow-md rounded-md">
    <header class="w-2/5 mx-auto mb-12 text-center">
      <h1 class="mb-5 text-xl font-semibold text-gray-500"><%= @owner.name %></h1>
      <p class="text-gray-500">Welcome to my scheduling page. Please follow the instructions to add an event to my calendar.</p>
    </header>
    <div class="mt-4 grid grid-cols-2 gap-x-6">
      <%= for event_type <- @event_types do %>
        <EventType.selector event_type={event_type} path={Routes.live_path(@socket, CalendlexWeb.EventTypeLive, event_type.slug)} />
      <% end %>
    </div>
  </div>
</section>
```

We refer to the owner's name value, `<%= @owner.name %>`, previously assigned in the `CalendlexWeb.Live.InitAssigns.on_mount/4` hook. To render the available event types, we go through the list of `element_types` assigned to the socket, and we invoke one of the new features added to LiveView, function components. Thanks to the new `HEEx` HTML engine introduced by LiveView 0.16, we can now invoke these components using regular HTML tags, which is very convenient and reminds me of React.

## The EventType selector function component

[Function components], or stateless components, are regular functions that must receive an `assigns` parameter and return a `~H` sigil with the HTML to render. They can't handle any messages, or hold any internal state whatsoever. Let's create the component's module:

```elixir
# ./lib/calendlex_web/live/components/event_type.ex

defmodule CalendlexWeb.Components.EventType do
  use Phoenix.Component

  def selector(assigns) do
    ~H"""
    <%= live_redirect to: @path do %>
      <div class="flex items-center p-6 pb-20 text-gray-400 bg-white border-t border-gray-300 cursor-pointer hover:bg-gray-200 gap-x-4">
        <div {[class: "inline-block w-8 h-8 #{@event_type.color}-bg rounded-full border-2 border-white"]}></div>
        <h3 class="font-bold text-gray-900"><%= @event_type.name %></h3>
        <div class="ml-auto text-xl"><i class="fas fa-caret-right"></i></div>
      </div>
    <% end %>
    """
  end
end
```

Since we are calling `EventType.event_type`, from the `PageLive` template, setting the `event_type` and `path` attributes, these values are automatically assigned and available in the `~H` sigil.
If we check the terminal, we should see the following error, caused by the `path` value which corresponds to an unexisting live path value:

```plaintext
[error] #PID<0.564.0> running CalendlexWeb.Endpoint (connection #PID<0.555.0>, stream id 4) terminated
Server: localhost:4000 (http)
Request: GET /
** (exit) an exception was raised:
    ** (ArgumentError) no action CalendlexWeb.EventTypeLive for CalendlexWeb.Router.Helpers.live_path/3. The following actions/clauses are supported:

    live_path(conn_or_endpoint, CalendlexWeb.PageLive, params \\ [])
```

To fix the error, let's add the corresponding live path to the router:

```elixir
# ./lib/calendlex_web/router.ex

defmodule CalendlexWeb.Router do
  use CalendlexWeb, :router

  # ...

  live_session :public, on_mount: CalendlexWeb.Live.InitAssigns do
    scope "/", CalendlexWeb do
      # ...

      live "/:event_type_slug", EventTypeLive
    end
  end
```

And finally, let's add the corresponding empty LiveView module and template:

```elixir
# ./lib/calendlex_web/live/event_type_live.ex

defmodule CalendlexWeb.EventTypeLive do
  use CalendlexWeb, :live_view

  def mount(%{"event_type_slug" => _slug} = params, _session, socket) do
    {:ok, socket}
  end
end
```

```html
<!-- ./lib/calendlex_web/live/event_type_live.html.heex -->

<h1>EventTypeLive</h1>
```

Jumping back to the browser, we should see the following:

<a href="/images/blog/2021-11-11-building-a-simple-calendly-clone-with-phoenix-live-view-pt-3/unstyled.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-11-11-building-a-simple-calendly-clone-with-phoenix-live-view-pt-3/unstyled.png"/>
</a>

To give the finishing touches to the layout and styling, copy the contents of the [main CSS file] and paste it into your local version, and replace the content of the **root** and **live** layouts with the following:

```html
<!-- ./lib/calendlex_web/templates/layout/root.html.heex -->

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <%= csrf_meta_tag() %>
    <%= live_title_tag assigns[:page_title] || assigns[:owner][:name], suffix: " · Calendlex" %>
    <link phx-track-static rel="stylesheet" href={Routes.static_path(@conn, "/assets/app.css")}/>
    <script defer phx-track-static type="text/javascript" src={Routes.static_path(@conn, "/assets/app.js")}></script>
    <script src="https://kit.fontawesome.com/9539f8cd16.js" crossorigin="anonymous"></script>
  </head>
  <body class="antialiased text-gray-600 bg-gray-100">
    <div class="flex flex-col h-screen">
      <%= @inner_content %>
    </div>
  </body>
</html>
```

```html
<!-- ./lib/calendlex_web/templates/layout/live.html.heex -->

<main role="main" class="flex-1 pt-20">
  <p class="alert alert-info" role="alert"
    phx-click="lv:clear-flash"
    phx-value-key="info"><%= live_flash(@flash, :info) %></p>

  <p class="alert alert-danger" role="alert"
    phx-click="lv:clear-flash"
    phx-value-key="error"><%= live_flash(@flash, :error) %></p>

  <%= @inner_content %>
</main>
```

After the browser refreshes the page, everything should look much nicer.

<a href="/images/blog/2021-11-11-building-a-simple-calendly-clone-with-phoenix-live-view-pt-3/final-result.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-11-11-building-a-simple-calendly-clone-with-phoenix-live-view-pt-3/final-result.png"/>
</a>

And that's it for today. In the following part, we will take care of the **EventType** live view, rendering the monthly calendar, in which the visitor will be able to select a date and a free time slot to schedule an event with us. We will take advantage of more LiveView's features, such as **live components** and **patching** the current navigation. In the meantime, you can check the end result in the [live demo](https://calendlex.herokuapp.com/), or have a look at the [source code](https://github.com/bigardone/calendlex).

Happy coding!

<div class="btn-wrapper">
  <a href="https://calendlex.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/calendlex" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>


[last part]: /blog/2021/11/08/building-a-simple-calendly-clone-with-phoenix-live-view-pt-2
[Live session]: https://hexdocs.pm/phoenix_live_view/Phoenix.LiveView.Router.html#live_session/3
[Function components]: https://hexdocs.pm/phoenix_live_view/Phoenix.Component.html
[main CSS file]: https://github.com/bigardone/calendlex/blob/master/assets/css/app.css
