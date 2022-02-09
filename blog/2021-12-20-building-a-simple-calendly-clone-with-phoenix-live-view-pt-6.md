---
title: "Building a simple Calendly clone with Phoenix LiveView (pt. 6)"
excerpt: "Managing event types, part one."
date: "2021-12-20"
tags: elixir, phoenix, liveview
image: "https://bigardone.dev/images/blog/2021-12-20-building-a-simple-calendly-clone-with-phoenix-live-view-pt-6/post-meta.png"
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

In the [last part] of the series, we generated the available time slots for a given data and rendered them as clickable items in the calendar's live view. We also implemented the booking form, which schedules a new event for the selected event type, date, and time slot. In this part, we are going to start implementing the private side of our application, in which we will be able to manage the existing event types and create new ones. Let's get cracking!

## The private admin scope
Since this section of the application will expose sensitive data, we don't want to make it accessible to anyone not authorized. Therefore, we must use an authentication mechanism to protect all the admin routes. In this particular case, we will use basic HTTP authentication for the sake of simplicity. But how can we protect a bunch of live routes using this approach? Let's jump to the router file and find out:

```elixir
# ./lib/calendlex_web/router.ex

defmodule CalendlexWeb.Router do
  use CalendlexWeb, :router

  import Plug.BasicAuth

  # ...

  pipeline :auth do
    plug :basic_auth, Application.compile_env(:calendlex, :basic_auth)
  end

  live_session :private, on_mount: {CalendlexWeb.Live.InitAssigns, :private} do
    scope "/admin", CalendlexWeb.Admin do
      pipe_through :browser
      pipe_through :auth

      live "/", EventTypesLive
    end
  end

  # ...

end
```

We are importing Plug's [BasicAuth plug], which will cover all the HTTP authentication. Next, we create a new pipeline, `:auth`, which contains the `:basic_auth` plug and its configuration, which we take from the application. Finally, we create a new `:private` live session holding the `/admin` scope, which pipes through `:auth` and contains the private live routes. Our project is not compiling anymore, so let's fix the errors. First of all, let's add the corresponding authentication configuration:

```elixir
# ./config/config.exs

import Config

config :calendlex,
  # ...
  basic_auth: [username: "admin", password: "admin"]
```

The configuration is straightforward, setting `admin` as the username and password. Now let's implement the new `:private` live session in the `InitAssigns` module:

```elixir
# ./lib/calendlex_web/live/init_assigns.ex

defmodule CalendlexWeb.Live.InitAssigns do
  import Phoenix.LiveView

  # ...

  def on_mount(:private, _params, _session, socket) do
    owner = Application.get_env(:calendlex, :owner)

    {:cont, assign(socket, :owner, owner)}
  end
end
```

The `on_mount/4` function takes the owner from the configuration and assigns it to the socket, making it accessible within all the `/admin/*` routes. Now we are ready to implement the new admin `EventTypesLive` live view, let's go ahead and create the initial module and template:

```elixir
# ../lib/calendlex_web/live/admin/event_types_live.ex

defmodule CalendlexWeb.Admin.EventTypesLive do
  use CalendlexWeb, :live_view

  @impl LiveView
  def mount(_params, _session, socket) do
    {:ok, socket, temporary_assigns: [event_types: []]}
  end
end
```

```elixir
# ../lib/calendlex_web/live/admin/event_types_live.html.heex

<h1>Event types</h1>
```

Our project should compile again, and if we visit http://localhost:4000/admin in the browser, we should see the Basic HTTP authentication plug in action:

<a href="/images/blog/2021-12-20-building-a-simple-calendly-clone-with-phoenix-live-view-pt-6/auth.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-12-20-building-a-simple-calendly-clone-with-phoenix-live-view-pt-6/auth.png"/>
</a>

Entering `admin/admin` should let us see the initial template we just created a minute ago:

<a href="/images/blog/2021-12-20-building-a-simple-calendly-clone-with-phoenix-live-view-pt-6/empty-page.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-12-20-building-a-simple-calendly-clone-with-phoenix-live-view-pt-6/empty-page.png"/>
</a>

## The admin layout
Before continuing any further, let's stop for a second and think about what we will build in this and the following parts. We will be focusing on the private admin side of the application, which will have its navigation menu only visible for authenticated users. Since we are already using the current existing application layout, located in `lib/calendlex_web/templates/layout/app.html.heex`, for the public part, it makes sense to create a totally different new layout for all the new admin screens, right? Let's go ahead and add the corresponding template file:

```elixir
# ./lib/calendlex_web/templates/layout/admin.html.heex

<main role="main" class="flex flex-col flex-1">
  <div class="bg-white">
    <header class="container w-3/5 pt-12 mx-auto">
      <h1 class="mb-3 text-2xl font-medium text-gray-900">My Calendlex</h1>
      <nav class="flex gap-x-6">
        <%= live_redirect to: Routes.live_path(@socket, CalendlexWeb.Admin.EventTypesLive), class: admin_nav_link_classes(@section == "event_types") do %>
          Event types
        <% end %>
      </nav>
    </header>
  </div>
  <section class="container flex-1 w-3/5 py-12 mx-auto">
    <%= @inner_content %>
  </section>
</main>
```

The template consists of the main navigation menu shared by all the admin pages and the inner content corresponding to the current one. To style the active navigation item, we use the `admin_nav_link_classes/1` function that we have to add to the `CalendlexWeb.LayoutView` module:

```elixir
# ./lib/calendlex_web/views/layout_view.ex

defmodule CalendlexWeb.LayoutView do
  use CalendlexWeb, :view

  alias CalendlexWeb.LiveViewHelpers

  # ...

  def admin_nav_link_classes(is_current) do
    LiveViewHelpers.class_list([
      {"py-6 font-medium text-gray-400 border-b-2 border-white hover:border-gray-400 hover:text-gray-600",
       true},
      {"text-gray-600 border-blue-500 hover:text-gray-600 hover:border-blue-500", is_current}
    ])
  end
end
```

To apply the new admin layout to all the admin pages, let's add a new macro to the `CalendlexWeb` module:

```elixir
# ./lib/calendlex_web.ex

defmodule CalendlexWeb do
  # ...

  def admin_live_view do
    quote do
      use Phoenix.LiveView,
        layout: {CalendlexWeb.LayoutView, "admin.html"}

      import CalendlexWeb.LiveViewHelpers

      alias Phoenix.LiveView

      unquote(view_helpers())
    end
  end

  # ...
end
```

Now we can update the initial `CalendlexWeb.Admin.EventTypesLive` to make use of the new admin macro and assign to the socket all the necessary data that we need:

```elixir
# ./lib/calendlex_web/live/admin/event_types_live.ex

defmodule CalendlexWeb.Admin.EventTypesLive do
  # using the new macro with the admin layout
  use CalendlexWeb, :admin_live_view

  @impl LiveView
  def mount(_params, _session, socket) do
    {:ok, socket, temporary_assigns: [event_types: []]}
  end

  @impl LiveView
  def handle_params(_, _, socket) do
    socket =
      socket
      |> assign(section: "event_types")
      |> assign(page_title: "Event types")

    {:noreply, socket}
  end
end
```

If we now jump back to the browser, we should see the following:

<a href="/images/blog/2021-12-20-building-a-simple-calendly-clone-with-phoenix-live-view-pt-6/layout.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-12-20-building-a-simple-calendly-clone-with-phoenix-live-view-pt-6/layout.png"/>
</a>

Much better, moving on!

## Listing event types
With the admin layout ready, let's list all the available event types:

```elixir
# ./lib/calendlex_web/live/admin/event_types_live.ex

defmodule CalendlexWeb.Admin.EventTypesLive do
  # ...

  @impl LiveView
  def handle_params(_, _, socket) do
    event_types = Calendlex.available_event_types()

    socket =
      socket
      |> assign(section: "event_types")
      |> assign(page_title: "Event types")
      |> assign(event_types: event_types)
      |> assign(event_types_count: length(event_types))

    {:noreply, socket}
  end
end
```

Using the same `Calendlex.available_event_types()` function we created in a previous part of the series, we get all the available event types from the database and assign them to the socket. We also assign the length of the list in the `event_types_count` key. But why don't we use the `lenght/1` directly in the template instead of assigning it to the socket? There is a reason related to LiveView's temporary assigns, but we will get to it later once we implement deleting event types. Now let's edit the template to render the event types assigned to the socket:


```elixir
# ../lib/calendlex_web/live/admin/event_types_live.html.heex

<div class="flex mt-4 align-middle gap-x-6">
  <div class="flex-1"></div>
  <div class="flex-1 text-right">
    <div class="inline-block px-4 py-1 text-blue-500 border border-blue-500 rounded-full cursor-pointer hover:bg-blue-100" do %>
      <i class="fas fa-plus"></i> New event type
    </div>
  </div>
</div>
<%= if @event_types_count > 0 do %>
  <div class="mt-4 grid grid-cols-3 gap-6">
    <%= for event_type <- @event_types do %>
      <.live_component module={CalendlexWeb.Admin.Components.EventType} id={"event_type_" <> event_type.id} event_type={event_type} />
    <% end %>
  </div>
<% else %>
  <div class="mt-4">
    <h3 class="mb-2 text-xl">You don't have any event types yet.</h3>
    <p class="">You'll want to add an event type to allow people to schedule with you.</p>
  </div>
<% end %>
```

In the template, we display a fake button to add new event types that we will implement later in the series. Depending on the event types, we render them using a new live component or display an info message when no items are available.

### The event type live component

[Live components], also known as stateful components, are the other component type within LiveView. It is a way of grouping state, markup, and events, and they even have a different life-cycle. Since we will implement multiple actions on each event type, like deleting and cloning, it makes sense to have all this related functionality in the component rather than in the main live view. Let's go ahead and write the initial implementation of the component:

```elixir
# ./lib/calendlex_web/live/admin/components/event_type.ex

defmodule CalendlexWeb.Admin.Components.EventType do
  use CalendlexWeb, :live_component

  def mount(socket) do
    {:ok, socket}
  end
end
```

A live component's life-cycle looks like the following:

```
mount(socket) -> update(assigns, socket) -> render(assigns)
```

`mount/1` is called once when the component is added to the page. `update/2` is invoked immediately after `mount/1` and every update from the live view. `render/1` works the same as in a regular live view. If `update/2` does not exist, `mount/1` merges all the assigns automatically into the socket. In our case, since we are passing the event type in the `event_type` assign, we can use it in its render template:

```elixir
# ./lib/calendlex_web/live/admin/components/event_type.html.heex

<div class={"relative flex flex-col p-4 mb-2 border-gray-900 text-gray-400 bg-white cursor-pointer rounded-md shadow-sm hover:shadow-md border-t-4 #{@event_type.color}-border"}>
  <header class="mb-4">
    <h3 class="mb-1 text-xl text-gray-800"><%= @event_type.name %></h3>
    <div class="mb-2 text-sm"><%= @event_type.duration %> mins</div>
    <div><%= @event_type.description %></div>
  </header>
  <div class="flex-1">
    <%= live_redirect to: Routes.live_path(@socket, CalendlexWeb.EventTypeLive, @event_type.slug), class: "text-blue-500 hover:underline" do %>View booking page<% end %>
  </div>
  <footer class="flex items-center h-16 px-4 mt-4 -m-4 text-sm border-t border-gray-200">
    <button class="text-blue-500">
      <i class="far fa-clone"></i> Copy link
    </button>
  </footer>
</div>
```

The template's content is pretty straightforward, displaying the event type's name, duration, and description. We are also adding a link to the public scheduling page we implemented in the previous parts of the series. Finally, we are also adding a convenient copy link, which will copy the public link to the user's clipboard on click. Jumping back to the browser, we should see something like the following:

<a href="/images/blog/2021-12-20-building-a-simple-calendly-clone-with-phoenix-live-view-pt-6/event-types.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-12-20-building-a-simple-calendly-clone-with-phoenix-live-view-pt-6/event-types.png"/>
</a>

Looking great so far! However, how can we implement the clipboard functionality?

## LiveView's JavaScript client hooks
LiveView makes interoperability between its rendered HTML and external JavaScript very easy, thanks to [client hooks], which are nothing but a JS object with predefined life-cycle callbacks like `mounted`, `beforeUpdate`, `updated`, etc. You can attach a hook to any node by adding the `phx-hook` attribute. Let's see them in action by creating a hook to copy the event type's link to the clipboard:


```javascript
// ./assets/js/hooks.js

const Hooks = {};

Hooks.Clipboard = {
  mounted() {
    const originalInnerHTML = this.el.innerHTML;
    const { content } = this.el.dataset;

    this.el.addEventListener('click', () => {
      navigator.clipboard.writeText(content);

      this.el.innerHTML = '<i class="fas fa-check"></i> Copied';

      setTimeout(() => {
        this.el.innerHTML = originalInnerHTML;
      }, 2000);
    });
  },
};

export default Hooks;
```

We have created a `./assets/js/hooks.js` file, that exposes a `Hooks` object with the `Clipboard` hooks. `Clipboard` implements the `mounted` callback which stores in a variable the current inner HTML from the `this.el`, in our case it will correspond to the copy-link button (the node with the `phx-hook="Clipboard"` attribute). It also takes the content to copy from `el`'s dataset, adds a click event listener to the button that writes `content` to the browser's clipboard, and changes the inner HTML to a success message. Finally, it restores the button's inner HTML with its original content after two seconds. Now we need to add the exported hooks to the live socket connection:

```javascript
// ./assets/js/app.js

//...

import Hooks from './hooks';

//...

const liveSocket = new LiveSocket('/live', Socket, {
  hooks: Hooks,
  //...
});
```

To connect the hook to the button in the event type live component, let's edit its template and add both the `data-content` and `phx-hook` attributes:

```diff
# ./lib/calendlex_web/live/admin/components/event_type.html.heex

<div class={"relative flex flex-col p-4 mb-2 border-gray-900 text-gray-400 bg-white cursor-pointer rounded-md shadow-sm hover:shadow-md border-t-4 #{@event_type.color}-border"}>
  <header class="mb-4">
    <h3 class="mb-1 text-xl text-gray-800"><%= @event_type.name %></h3>
    <div class="mb-2 text-sm"><%= @event_type.duration %> mins</div>
    <div><%= @event_type.description %></div>
  </header>
  <div class="flex-1">
    <%= live_redirect to: Routes.live_path(@socket, CalendlexWeb.EventTypeLive, @event_type.slug), class: "text-blue-500 hover:underline" do %>View booking page<% end %>
  </div>
  <footer class="flex items-center h-16 px-4 mt-4 -m-4 text-sm border-t border-gray-200">
    <button
+       id={"clipboard_#{@event_type.id}"}
        class="text-blue-500"
+       data-content={Routes.live_url(@socket, CalendlexWeb.EventTypeLive, @event_type.slug)}
+       phx-hook="Clipboard">
      <i class="far fa-clone"></i> Copy link
    </button>
  </footer>
</div>
```

We are also adding the `id` attribute since hooks require a unique DOM ID to work correctly. Let's jump back to the browser and see what happens when we now click on the button:

<a href="/images/blog/2021-12-20-building-a-simple-calendly-clone-with-phoenix-live-view-pt-6/copy.gif">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-12-20-building-a-simple-calendly-clone-with-phoenix-live-view-pt-6/copy.gif"/>
</a>

It works like a charm, yay! In the next part, we will continue with event types management, implementing the corresponding live views to edit existing even types and create new ones, using more live components and hooks. In the meantime, you can check the final result in the [live demo](https://calendlex.herokuapp.com/), or have a look at the [source code](https://github.com/bigardone/calendlex).

Happy coding!

<div class="btn-wrapper">
  <a href="https://calendlex.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/calendlex" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>


[last part]: /blog/2021/12/01/building-a-simple-calendly-clone-with-phoenix-live-view-pt-5
[BasicAuth plug]: https://hexdocs.pm/plug/Plug.BasicAuth.html
[Live components]: https://hexdocs.pm/phoenix_live_view/Phoenix.LiveComponent.html#content
[client hooks]: https://hexdocs.pm/phoenix_live_view/js-interop.html#client-hooks-via-phx-hook
