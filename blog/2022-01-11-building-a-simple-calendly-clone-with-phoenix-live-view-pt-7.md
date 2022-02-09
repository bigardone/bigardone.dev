---
title: "Building a simple Calendly clone with Phoenix LiveView (pt. 7)"
excerpt: "Managing event types, part two."
date: "2022-01-11"
tags: elixir, phoenix, liveview
image: "https://bigardone.dev/images/blog/2022-01-11-building-a-simple-calendly-clone-with-phoenix-live-view-pt-7/post-meta.png"
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

In the [last part] of the series, we started building the private admin side of our application, consisting of a new live session and layout. We also implemented the initial page for managing event types, listing all the existing ones in the database, using a new live component. Finally, we implemented our first JavaScript client hook to copy an event's public URL into the user's clipboard. In this part, we will focus on creating and editing event types. Let's get cracking!


## Creating new event types

To let the user create new event types, we will add a new screen with a form to enter the new event's name, description, duration in seconds, and color. Let's add its corresponding live route to the routes file:

```elixir
# ./lib/calendlex_web/router.ex

defmodule CalendlexWeb.Router do
  use CalendlexWeb, :router

  # ...

  live_session :private, on_mount: {CalendlexWeb.Live.InitAssigns, :private} do
    scope "/admin", CalendlexWeb.Admin do
      # ...

      live "/event_types/new", NewEventTypeLive
    end
  end
end
```

Let's continue by adding the initial live module and template:

```elixir
# ./lib/calendlex_web/live/admin/new_event_type_live.ex

defmodule CalendlexWeb.Admin.NewEventTypeLive do
  use CalendlexWeb, :admin_live_view

  alias Calendlex.EventType

  def mount(_params, _session, socket) do
    event_type = %EventType{}

    socket =
      socket
      |> assign(section: "event_types")
      |> assign(page_title: "New event type")
      |> assign(event_type: event_type)
      |> assign(changeset: EventType.changeset(event_type, %{}))

    {:ok, socket}
  end
end
```

```elixir
# ./lib/calendlex_web/live/admin/new_event_type_live.html.heex

<h1>New event type</h1>
```

The mount callback function assigns to the socket the layout section name, the page title, an empty event type, and its corresponding changeset that we will use to build the form's live component. Let's open the root event types template and add the related link to the button we implemented in the last part:

```diff
# ./lib/calendlex_web/live/admin/event_types_live.html.heex

<div class="flex mt-4 align-middle gap-x-6">
  <div class="flex-1"></div>
  <div class="flex-1 text-right">
--  <div class="inline-block px-4 py-1 text-blue-500 border border-blue-500 rounded-full cursor-pointer hover:bg-blue-100" do %>
++  <%= live_redirect to: Routes.live_path(@socket, CalendlexWeb.Admin.NewEventTypeLive), class: "inline-block border border-blue-500 rounded-full px-4 py-1 text-blue-500 hover:bg-blue-100 cursor-pointer" do %>
      <i class="fas fa-plus"></i> New event type
--  </div>
++  <% end %>
  </div>
</div>
```

If we head to http://localhost:4000/admin in the browser and click on the button, we should see the following:

<a href="/images/blog/2022-01-11-building-a-simple-calendly-clone-with-phoenix-live-view-pt-7/initial.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2022-01-11-building-a-simple-calendly-clone-with-phoenix-live-view-pt-7/initial.png"/>
</a>

Let's edit the new template's content to include the form that we need to implement:

```elixir
# ./lib/calendlex_web/live/admin/new_event_type_live.html.heex

<div class="w-4/5 p-6 mx-auto mb-2 bg-white border border-gray-200 shadow-md rounded-md">
  <.live_component
     id="new_event_type_form"
     module={CalendlexWeb.Admin.Components.EventTypeForm}
     event_type={@event_type}
     changeset={@changeset}
     />
</div>
```

The content of this view consists of a div containing the form's live component. Let's add the corresponding component module:

```elixir
# ./lib/calendlex_web/live/admin/components/event_type_form.ex

defmodule CalendlexWeb.Admin.Components.EventTypeForm do
  use CalendlexWeb, :live_component

  alias Calendlex.EventType
  alias Phoenix.LiveComponent

  def update(
        %{
          event_type: %EventType{color: current_color, slug: slug} = event_type,
          changeset: changeset
        },
        socket
      ) do
    socket =
      socket
      |> assign(changeset: changeset)
      |> assign(event_type: event_type)
      |> assign(current_color: current_color)
      |> assign(public_url: build_public_url(socket, slug))

    {:ok, socket}
  end

  defp build_public_url(socket, nil) do
    build_public_url(socket, "")
  end

  defp build_public_url(socket, slug) do
    Routes.live_url(socket, CalendlexWeb.EventTypeLive, slug)
  end
end
```

The `update/2` callback receives an event type and a changeset, assigning them to the socket along with `current_color` and `public_url` that we will use in a second. To build the public URL, it uses the event type's slug, along with the `Routes.live_url/3` function. Let's add its template now:

```elixir
# ./lib/calendlex_web/live/admin/components/event_type_form.html.heex

<div>
  <.form let={f} for={@changeset} phx-target={@myself} phx-change="change" phx-submit="submit">
  <header class="flex items-center px-6 pb-6 mb-6 -mx-6 text-right border-b border-gray-300 gap-x-4">
    <h3 class="text-gray-900">What event is this?</h3>
  </header>
  <div class="w-3/5 mb-6">
    <%= label f, :name, class: "block mb-2 text-sm" %>
    <%= text_input f, :name, class: "w-full p-2 border rounded-md", autofocus: "", required: "" %>
    <div class="mt-2 text-sm text-blue-500">
      <span class="text-gray-500">Public url:</span>
      <%= @public_url %>
    </div>
    <%= error_tag f, :name %>
  </div>
  <div class="w-3/5 mb-6">
    <%= label f, :description, class: "block mb-2 text-sm" %>
    <%= textarea f, :description, class: "w-full p-2 border h-36 rounded-md" %>
    <%= error_tag f, :description %>
  </div>
  <div class="w-3/5 mb-6">
    <%= label f, :duration, class: "block mb-2 text-sm" %>
    <div class="flex items-center gap-x-2">
      <%= text_input f, :duration, class: "w-20 p-2 border rounded-md", required: "", type: "number", min: 1 %>
      minutes
    </div>
    <%= error_tag f, :duration %>
  </div>
  <div class="w-3/5 mb-6">
    <%= label f, :color, class: "block mb-2 text-sm" %>
    <div class="flex gap-x-2">
      <%= for color <- ~w(gray red yellow green blue indigo pink purple) do %>
        <label class="relative cursor-pointer" phx-target={@myself} phx-click="set_color" phx-value-color={color}>
          <div class={"inline-block w-8 h-8 #{color}-bg rounded-full"}></div>
          <%= radio_button f, :color, color, class: "hidden" %>
          <%= if @current_color == color do %>
            <span class="absolute z-10 inline-block w-4 h-4 text-white top-1 left-1/2 -translate-x-1/2">
              <i class="fas fa-check"></i>
            </span>
          <% end %>
        </label>
      <% end %>
    </div>
    <%= error_tag f, :color %>
  </div>
  <footer class="flex items-center justify-end px-6 pt-6 -mx-6 text-right border-t border-gray-300 gap-x-4">
    <%= live_redirect to: Routes.live_path(@socket, CalendlexWeb.Admin.EventTypesLive) do %>Cancel<% end %>
    <button class="px-4 py-2 text-white bg-blue-600 rounded-full" type="submit" phx-disable-with="Saving...">Save</button>
  </footer>
  </.form>
</div>

```

The template consists of a Phoenix form for the component's `changeset` assigned in the `update/2` callback we just implemented. We are adding a `phx-target={@myself}` attribute, which makes the `submit` and `change` events target the component instance rather than the parent live view. Therefore, we can group all the form's internal logic in a single place instead of duplicating it in the creating and editing event types views. The rest of the form's implementation is pretty straightforward, except for two things:

- We will display the public URL of the event type while the user types its name.
- The color selector consists of hidden radio buttons with a visible color circle and a check icon for the selected value.

If we jump back to the browser, we should see the following:

<a href="/images/blog/2022-01-11-building-a-simple-calendly-clone-with-phoenix-live-view-pt-7/form.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2022-01-11-building-a-simple-calendly-clone-with-phoenix-live-view-pt-7/form.png"/>
</a>

### Auto-generating the event type's slug

To generate the event type's URL slug, we will auto-generate it taking advantage of Ecto's changesets instead of relying on the user to type a proper one. The idea is to build a valid URL path value from the event type's name, and for this, we can use [Slugify]. Let's add it to the project's dependencies and install it:

```elixir
# ./mix.exs

defmodule Calendlex.MixProject do
  use Mix.Project

  # ...

  defp deps do
    [
      # ...
      {:slugify, "~> 1.3"}
    ]
  end

  # ...
end
```

Let's edit the `EventType` schema module to include the slug in its changeset:

```elixir
# ./lib/calendlex/event_type.ex

defmodule Calendlex.EventType do
  use Ecto.Schema
  import Ecto.Changeset

  # ...

  def changeset(event_type \\ %EventType{}, attrs) do
    event_type
    |> cast(attrs, @fields)
    |> build_slug() # We are adding this
    |> validate_required(@required_fields)
    |> unique_constraint(:slug, name: "event_types_slug_index")
  end

  defp build_slug(%{changes: %{name: name}} = changeset) do
    put_change(changeset, :slug, Slug.slugify(name))
  end

  defp build_slug(changeset), do: changeset
end
```

After casting the attributes, we add a `build_slug/1` private function to the `changeset/2` pipeline. This function checks whether `name` has changed, generating the slug with its new value and adding it to the changeset. Let's jump to IEX and try it out:

```plaintext
Interactive Elixir (1.13.1) - press Ctrl+C to exit (type h() ENTER for help)
iex(1)> attrs = %{name: "My event type", description: "Fake event type", duration: 30, color: "blue"}
%{
  color: "blue",
  description: "Fake event type",
  duration: 30,
  name: "My event type"
}
iex(2)> Calendlex.EventType.changeset(attrs)
#Ecto.Changeset<
  action: nil,
  changes: %{
    color: "blue",
    description: "Fake event type",
    duration: 30,
    name: "My event type",
    slug: "my-event-type"
  },
  errors: [],
  data: #Calendlex.EventType<>,
  valid?: true
>
iex(3)>
```

We can see that the changeset has a `slug` key in its `changes` map, with a value of `my-event-type`, generated from `name`. Cool! Now we can go back to the component's module and implement the `change` event handler:

```elixir
# ./lib/calendlex_web/live/admin/components/event_type_form.ex

defmodule CalendlexWeb.Admin.Components.EventTypeForm do
  use CalendlexWeb, :live_component

  alias Ecto.Changeset
  # ...

  def handle_event(
        "change",
        %{"event_type" => params},
        %{assigns: %{event_type: event_type}} = socket
      ) do
    changeset = EventType.changeset(event_type, params)
    public_url = build_public_url(socket, get_slug(changeset))

    {:noreply, assign(socket, changeset: changeset, public_url: public_url)}
  end

  # ...

  defp get_slug(%Changeset{changes: %{slug: slug}}), do: slug
  defp get_slug(%Changeset{data: %{slug: slug}}), do: slug
end
```

The handler takes the form values in `event_type` and the assigned event type to generate a new changeset. From this changeset, it takes the slug value and generates the corresponding `public_url`, assigning both to the socket. Let's head back to the browser and start typing the name's value:

<a href="/images/blog/2022-01-11-building-a-simple-calendly-clone-with-phoenix-live-view-pt-7/typing.gif">
  <img class="shadow-lg rounded-md" src="/images/blog/2022-01-11-building-a-simple-calendly-clone-with-phoenix-live-view-pt-7/typing.gif"/>
</a>

While we type, we can see that the public URL auto-updates, yay!

### Setting the current color

Let's take a closer look at the color selector:

```elixir
# ./lib/calendlex_web/live/admin/components/event_type_form.html.heex

# ...

    <div class="flex gap-x-2">
      <%= for color <- ~w(gray red yellow green blue indigo pink purple) do %>
        <label class="relative cursor-pointer" phx-target={@myself} phx-click="set_color" phx-value-color={color}>
          <div class={"inline-block w-8 h-8 #{color}-bg rounded-full"}></div>
          <%= radio_button f, :color, color, class: "hidden" %>
          <%= if @current_color == color do %>
            <span class="absolute z-10 inline-block w-4 h-4 text-white top-1 left-1/2 -translate-x-1/2">
              <i class="fas fa-check"></i>
            </span>
          <% end %>
        </label>
      <% end %>
    </div>

# ...
```

The selector consists of radio buttons corresponding to a color in the list, hidden using CSS. The labels have a `phx-click` event that triggers a `set_color` event with the corresponding color. If any color matches `current_color` assigned in the socket, we add a check icon to mark it. Let's implement the event handler in the view's module:


```elixir
# ./lib/calendlex_web/live/admin/components/event_type_form.ex

defmodule CalendlexWeb.Admin.Components.EventTypeForm do
  use CalendlexWeb, :live_component

  # ...

  def handle_event("set_color", %{"color" => color}, %{assigns: %{changeset: changeset}} = socket) do
    changeset = Ecto.Changeset.put_change(changeset, :color, color)

    {:noreply, assign(socket, changeset: changeset, current_color: color)}
  end

  # ...
end
```

The callback function takes `color` from the incoming parameters, adds it to the changeset, and assigns it to the socket as `current_color`. If we now head back to the browser and select a color, we should see the check icon correctly.

<a href="/images/blog/2022-01-11-building-a-simple-calendly-clone-with-phoenix-live-view-pt-7/color.gif">
  <img class="shadow-lg rounded-md" src="/images/blog/2022-01-11-building-a-simple-calendly-clone-with-phoenix-live-view-pt-7/color.gif"/>
</a>

### Inserting the event type into the database

With the form's logic fully implemented, we can insert the new event type into the database We've implemented all the form's internal logic in the live component module. However, inserting and updating an event type will have different implementations. Therefore, it makes sense delegating the proper persisting logic the parent to the live view module that renders the form. Since the form has the `target={@myself}` attribute, any event is handled by the component's module, and to send the event back to the `CalendlexWeb.Admin.NewEventTypeLive` module, we have to do the following:

```elixir
# ./lib/calendlex_web/live/admin/components/event_type_form.ex

defmodule CalendlexWeb.Admin.Components.EventTypeForm do
  use CalendlexWeb, :live_component

  # ...

  def handle_event("submit", %{"event_type" => params}, socket) do
    send(self(), {:submit, params})

    {:noreply, socket}
  end

  # ...
end
```

The parent LiveView and the form component run in the same process. Therefore, sending a message from the component to the parent view is as simple as using `Kernel.send/2`, using `self()` to get the corresponding PID. Let's add the necessary event handler to the `CalendlexWeb.Admin.NewEventTypeLive` module:

```elixir
# ./lib/calendlex_web/live/admin/new_event_type_live.ex

defmodule CalendlexWeb.Admin.NewEventTypeLive do
  use CalendlexWeb, :admin_live_view

  # ...

  def handle_info({:submit, params}, socket) do
    params
    |> Calendlex.insert_event_type()
    |> case do
      {:ok, event_type} ->
        socket = put_flash(socket, :info, "Saved")

        {:noreply,
         push_redirect(socket,
           to: Routes.live_path(socket, CalendlexWeb.Admin.EditEventTypeLive, event_type.id)
         )}

      {:error, changeset} ->
        {:noreply, assign(socket, changeset: changeset)}
    end
  end
end
```

Taking `params` from the message, it calls `Calendlex.insert_event_type()`, that we will implement in a minute, it redirects to the editing page of the created event type. On any error, it assigns the changeset to the socket. Let's add the proxy function to the `Calendlex` module and its implementation in the corresponding module:

```elixir
# ./lib/calendlex.ex

defmodule Calendlex do
  # ...

  defdelegate insert_event_type(params), to: Calendlex.EventType.Repo, as: :insert
end
```

```elixir
# ./lib/calendlex/event_type/repo.ex

defmodule Calendlex.EventType.Repo do
  # ...

  def insert(params) do
    params
    |> EventType.changeset()
    |> Repo.insert()
  end
end
```

To fix the last error, we must add the edit event type route and implement its corresponding LiveView module and template. The good news is that it will be pretty similar to the new live view we just implemented, and we have already taken care of the form's logic that we will reuse. Let's do this!

## Editing event types

Let's start by adding the new route to the router file:

```elixir
# ./lib/calendlex_web/router.ex

defmodule CalendlexWeb.Router do
  use CalendlexWeb, :router

  # ...


  live_session :private, on_mount: {CalendlexWeb.Live.InitAssigns, :private} do
    scope "/admin", CalendlexWeb.Admin do
      # ...

      live_session :private, on_mount: {CalendlexWeb.Live.InitAssigns, :private} do
    scope "/admin", CalendlexWeb.Admin do
    end
  end

  # ...
end
```

To continue, let's implement the live view module:


```elixir
# ./lib/calendlex_web/live/admin/edit_event_type_live.ex

defmodule CalendlexWeb.Admin.EditEventTypeLive do
  use CalendlexWeb, :admin_live_view

  alias Calendlex.EventType

  def mount(%{"id" => id}, _session, socket) do
    case Calendlex.get_event_type_by_id(id) do
      {:ok, %EventType{name: name} = event_type} ->
        socket =
          socket
          |> assign(section: "event_types")
          |> assign(page_title: name)
          |> assign(event_type: event_type)
          |> assign(changeset: EventType.changeset(event_type, %{}))

        {:ok, socket}

      _ ->
        {:ok, socket, layout: {CalendlexWeb.LayoutView, "not_found.html"}}
    end
  end

  def handle_info({:submit, params}, %{assigns: %{event_type: event_type}} = socket) do
    event_type
    |> Calendlex.update_event_type(params)
    |> case do
      {:ok, event_type} ->
        socket =
          socket
          |> put_flash(:info, "Saved")
          |> assign(event_type: event_type)
          |> assign(changeset: EventType.changeset(event_type, %{}))

        {:noreply, socket}

      {:error, changeset} ->
        {:noreply, assign(socket, changeset: changeset)}
    end
  end
end
```

The `EditEventTypeLive` module is very similar to `NewEventTypeLive`, except that:

1. In the `mount` callback function, instead of using an empty `EventType`, it takes an `id` from the parameters, gets the event type from the database, building the changeset from it. If the event type is not found, it renders the `not_found` page.
2. While handling the `:submit` message from the form component, it calls `Calendlex.update_event_type/1`, which we need to implement, reassigning the changed event type and changeset to the socket on success.

Let's implement the necessary functions to find and update an existing event type:

```elixir
# ./lib/calendlex.ex

defmodule Calendlex do
  # ...

  defdelegate get_event_type_by_id(id), to: Calendlex.EventType.Repo, as: :get

  defdelegate update_event_type(params), to: Calendlex.EventType.Repo, as: :update
end
```

```elixir
# ./lib/calendlex/event_type/repo.ex

defmodule Calendlex.EventType.Repo do
  # ...

  def get(id) do
    case Repo.get(EventType, id) do
      nil ->
        {:error, :not_found}

      event_type ->
        {:ok, event_type}
    end
  end

  def update(event_type, params) do
    event_type
    |> EventType.changeset(params)
    |> Repo.update()
  end
end
```

The only thing left is adding the edit event type template:


```elixir
# ./lib/calendlex_web/live/admin/edit_event_type_live.html.heex

<div class="w-4/5 mx-auto mb-6 text-right">
  <%= link to: Routes.live_path(@socket, CalendlexWeb.EventTypeLive, @event_type.slug), target: "_blank", class: "text-blue-500" do %>
    <i class="fas fa-external-link-alt"></i> view live page
  <% end %>
</div>
<div class="w-4/5 p-6 mx-auto mb-2 bg-white border border-gray-200 shadow-md rounded-md">
  <.live_component
     id="edit_event_type_form"
     module={CalendlexWeb.Admin.Components.EventTypeForm}
     event_type={@event_type}
     changeset={@changeset}
     />
</div>
```

Let's head to http://localhost:4000/admin/event_types/new in the browser and create a new event type to see what happens:

<a href="/images/blog/2022-01-11-building-a-simple-calendly-clone-with-phoenix-live-view-pt-7/insert.gif">
  <img class="shadow-lg rounded-md" src="/images/blog/2022-01-11-building-a-simple-calendly-clone-with-phoenix-live-view-pt-7/insert.gif"/>
</a>

When we submit the form, it creates the new event type, and we get redirected to the edit live view, where apart from the form, there is a link to the event type's public URL. To finish this part, let's make it possible to edit an event type from the main list:

```diff
# ./lib/calendlex_web/live/admin/components/event_type.html.heex

<div class={"relative flex flex-col p-4 mb-2 border-gray-900 text-gray-400 bg-white cursor-pointer rounded-md shadow-sm hover:shadow-md border-t-4 #{@event_type.color}-border"}>
++<%= live_redirect to: Routes.live_path(@socket, CalendlexWeb.Admin.EditEventTypeLive, @event_type.id) do %>
    <header class="mb-4">
      <h3 class="mb-1 text-xl text-gray-800"><%= @event_type.name %></h3>
      <div class="mb-2 text-sm"><%= @event_type.duration %> mins</div>
      <div><%= @event_type.description %></div>
    </header>
    <div class="flex-1">
      <%= live_redirect to: Routes.live_path(@socket, CalendlexWeb.EventTypeLive, @event_type.slug), class: "text-blue-500 hover:underline" do %>View booking page<% end %>
    </div>
++<% end %>
  <footer class="flex items-center h-16 px-4 mt-4 -m-4 text-sm border-t border-gray-200">
    <button
        id={"clipboard_#{@event_type.id}"}
        class="text-blue-500"
        data-content={Routes.live_url(@socket, CalendlexWeb.EventTypeLive, @event_type.slug)}
        phx-hook="Clipboard">
      <i class="far fa-clone"></i> Copy link
    </button>
  </footer>
</div>
```

And that's it for this part. In the following part, we will finish the event type's management section by adding the last touches, including showing a flash message to the user when an event type gets saved. We will also add a dropdown to the card component to let the user clone and delete the corresponding event type. In the meantime, you don't forget to check the final result in the [live demo](https://calendlex.herokuapp.com/), or have a look at the [source code](https://github.com/bigardone/calendlex).

Happy coding!

<div class="btn-wrapper">
  <a href="https://calendlex.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/calendlex" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>

[last part]: /blog/2021/12/20/building-a-simple-calendly-clone-with-phoenix-live-view-pt-6
[Slugify]: https://github.com/jayjun/slugify
