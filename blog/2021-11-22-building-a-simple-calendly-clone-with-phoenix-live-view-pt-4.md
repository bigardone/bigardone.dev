---
title: "Building a simple Calendly clone with Phoenix LiveView (pt. 4)"
excerpt: "Rendering the monthly calendar."
date: "2021-11-22"
tags: elixir, phoenix, liveview
image: "https://bigardone.dev/images/blog/2021-11-22-building-a-simple-calendly-clone-with-phoenix-live-view-pt-4/post-meta.png"
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

In the [last part] of the series, we implemented the initial page of the application, which lists all the available event types, letting the visitor select one and transition to the next page that we left empty. To do so, we took advantage of LiveView's features like **live sessions** and **function components**. In this part, we will start by implementing all the logic surrounding the empty `CalendlexWeb.EventTypeLive` live view. We will render a monthly calendar, letting the visitor navigate through the months, and selecting a date. Let's get cracking!

## Displaying the initial event type page
Let's start by modifying the `CalendlexWeb.EventTypeLive` module to load the corresponding event type on its mount callback:

```elixir
# ./lib/calendlex_web/live/event_type_live.ex

defmodule CalendlexWeb.EventTypeLive do
  use CalendlexWeb, :live_view

  alias CalendlexWeb.Components.EventType

  def mount(%{"event_type_slug" => slug}, _session, socket) do
    case Calendlex.get_event_type_by_slug(slug) do
      {:ok, event_type} ->
        socket =
          socket
          |> assign(event_type: event_type)
          |> assign(page_title: event_type.name)

        {:ok, socket}

      {:error, :not_found} ->
        {:ok, socket, layout: {CalendlexWeb.LayoutView, "not_found.html"}}
    end
  end
end
```

Taking the event type slug from the parameters received, it calls the `Calendlex.get_event_type_by_slug/1` function. If the event type exists, it assigns it to the socket and sets the corresponding page title. On the contrary, it renders a regular error page. Let's first take care of the happy path and implement the `Calendlex.get_event_type_by_slug/1` function:

```elixir
# ./lib/calendlex.ex

defmodule Calendlex
  # ...

  defdelegate get_event_type_by_slug(slug),
    to: Calendlex.EventType.Repo,
    as: :get_by_slug
end
```

It delegates its call to the `Calendlex.EventType.Repo.get_by_slug/1` function. Let's add it:

```elixir
# ./lib/calendlex/event_type/repo.ex

defmodule Calendlex.EventType.Repo do
  alias Calendlex.{EventType, Repo}

  # ...

  def get_by_slug(slug) do
    case Repo.get_by(EventType, slug: slug) do
      nil ->
        {:error, :not_found}

      event_type ->
        {:ok, event_type}
    end
  end
end
```

If we start the Phoenix server and visit http://localhost:4000/15-minute-meeting, we should see the empty page correctly. Now let's take care of the error path, and create the `not_found` layout template:

```elixir
# ./lib/calendlex_web/templates/layout/not_found.html.heex

<main role="main" class="py-32 mx-auto">
  <div class="w-2/5 mx-auto">
    <div class="px-6 py-12 mb-2 text-center bg-white border border-gray-200 shadow-md rounded-md gap-x-2">
      <header class="mb-8 text-lg font-bold text-gray-900">
        <h2><%= @owner.name %></h2>
        <p>This Calendlex URL is not valid.</p>
      </header>
      <p>If you are the owner of this account, you can log in to find out more.</p>
    </div>
  </div>
</main>
```

If we visit an invalid URL like http://localhost:4000/invalid-event-type, we should see the following:

<a href="/images/blog/2021-11-22-building-a-simple-calendly-clone-with-phoenix-live-view-pt-4/not-found.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-11-22-building-a-simple-calendly-clone-with-phoenix-live-view-pt-4/not-found.png"/>
</a>

Great! Let's edit the `CalendlexWeb.EventTypeLive` template file and add some initial content:

```elixir
# ./lib/calendlex_web/live/event_type_live.html.heex

<div class="w-3/5 mx-auto">
  <div class="flex flex-auto p-6 mb-2 bg-white border border-gray-200 shadow-md rounded-md gap-x-2">
    <div class="flex-1">
      <div class="mb-4">
        <%= live_redirect to: Routes.live_path(@socket, CalendlexWeb.PageLive) do %>
          <div class="flex items-center justify-center inline-block text-xl text-blue-500 border rounded-full w-9 h-9">
            <i class="fas fa-arrow-left"></i>
          </div>
        <% end %>
      </div>
      <h4 class="text-gray-500">Bigardone</h4>
      <h1 class="my-3 text-xl text-black"><%= @event_type.name %></h1>
      <div class="flex flex-row items-center mb-2 text-gray-500 gap-2">
        <div class="text-gray-300">
          <i class="far fa-clock"></i>
        </div>
        <%= @event_type.duration %> min
      </div>
    </div>
    <div class="px-8 border-l border-gray-100">
      <header class="mb-8">
          <h3 class="text-lg font-semibold text-gray-900">Select a date & time</h3>
      </header>
    </div>
  </div>
</div>
```

Once the browser refreshes the page, we should see the following:

<a href="/images/blog/2021-11-22-building-a-simple-calendly-clone-with-phoenix-live-view-pt-4/initial-page.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-11-22-building-a-simple-calendly-clone-with-phoenix-live-view-pt-4/initial-page.png"/>
</a>

## Rendering the monthly calendar
With the initial layout ready, let's work on the monthly calendar. Since we will work with dates and times and formatting them, let's use [Timex], which is the usual library I use for these cases. To install it, we need to add it to the dependencies in the mix file and run the corresponding `mix deps.get` command:

```elixir
# ./mix.exs

defmodule Calendlex.MixProject do
  use Mix.Project

  # ...

  defp deps do
    [
      # ...
      {:timex, "~> 3.7"}
    ]
  end

  # ...
end
```

Before continuing further, we have to consider the visitor's time zone to handle any date and time. Therefore, we need a way to assign it to the socket. Fortunately for us, this is very straightforward, thanks to JavaScript. Let's edit the main `app.js` file:

```javascript
// ./assets/js/app.js

// ...

const liveSocket = new LiveSocket('/live', Socket, {
  params: {
    _csrf_token: csrfToken,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
});

// ...
```

We add a new `timezone` parameter to the live socket connection with the `timeZone` value from [Intl.DateTimeFormat.prototype.resolvedOptions()], which returns a new object with properties reflecting the current user's browser's locale and date and time. Remember the live public session we created in the previous part? Let's edit it to take into account the `timezone` parameter:

```elixir
# ./lib/calendlex_web/live/init_assigns.ex

defmodule CalendlexWeb.Live.InitAssigns do
  import Phoenix.LiveView

  def on_mount(:default, _params, _session, socket) do
    owner = Application.get_env(:calendlex, :owner)
    time_zone = get_connect_params(socket)["timezone"] || owner.time_zone

    socket =
      socket
      |> assign(:owner, owner)
      |> assign(:time_zone, time_zone)

    {:cont, socket}
  end
end
```

We use [get_connect_params/1] to take the value from the socket's connection parameters and assign it to the socket. If `timezone` does not exist, we set the owner's time zone as the default value. Let's jump back to the `CalendlexWeb.EventTypeLive` module and add the corresponding assigns that we need to build the calendar:

```elixir
# ./lib/calendlex_web/live/event_type_live.ex

defmodule CalendlexWeb.EventTypeLive do
  alias Calendlex.{EventType, Repo}

  alias Timex.Duration

  def mount(%{"event_type_slug" => slug}, _session, socket) do
    case Calendlex.get_event_type_by_slug(slug) do
      {:ok, event_type} ->
        socket =
          socket
          # ...
          |> assign_dates()

        {:ok, socket}

      # ...
    end
  end

  defp assign_dates(socket) do
    current = Timex.today(socket.assigns.time_zone)
    beginning_of_month = Timex.beginning_of_month(current)
    end_of_month = Timex.end_of_month(current)

    previous_month =
      beginning_of_month
      |> Timex.add(Duration.from_days(-1))
      |> date_to_month()

    next_month =
      end_of_month
      |> Timex.add(Duration.from_days(1))
      |> date_to_month()

    socket
    |> assign(current: current)
    |> assign(beginning_of_month: beginning_of_month)
    |> assign(end_of_month: end_of_month)
    |> assign(previous_month: previous_month)
    |> assign(next_month: next_month)
  end

  defp date_to_month(date_time) do
    Timex.format!(date_time, "{YYYY}-{0M}")
  end
end
```

In the `mount/3` function's happy path, we call a new `assign_dates` function that takes the `socket`. This function calculates the current date, the beginning, and the end of the current month and assigns them to the socket. It also assigns the next and previous months with the `"{YYYY}-{0M}"` format that we will use to navigate through the different months. Let's get back to the view's template and build up the calendar:

```elixir
# ./lib/calendlex_web/live/event_type_live.html.heex

<div class="w-3/5 mx-auto">
  <div class="flex flex-auto p-6 mb-2 bg-white border border-gray-200 shadow-md rounded-md gap-x-2">
    <div class="flex-1">
        # ...

        <%= @event_type.duration %> min
      </div>
    </div>
    <div class="px-8 border-l border-gray-100">
      <header class="mb-8">
          <h3 class="text-lg font-semibold text-gray-900">Select a date & time</h3>
      </header>
      <EventType.calendar
              id="calendar"
              current_path={Routes.live_path(@socket, CalendlexWeb.EventTypeLive, @event_type.slug)}
              previous_month={@previous_month}
              next_month={@next_month}
              current={@current}
              end_of_month={@end_of_month}
              beginning_of_month={@beginning_of_month}
              time_zone={@time_zone} />
    </div>
  </div>
</div>
```

We will use a new function component in the already existing `CalendlexWeb.Components.EventType` module to render the calendar. Let's alias this module in the view and implement the new function:


```elixir
# ./lib/calendlex/event_type/repo.ex

defmodule Calendlex.EventType.Repo do
  # ...

  alias CalendlexWeb.Components.EventType

  #...
end
```

```elixir
# ./lib/calendlex_web/live/components/event_type.ex

defmodule CalendlexWeb.Components.EventType do
  use Phoenix.Component

  # ...

  def calendar(
        %{
          current_path: current_path,
          previous_month: previous_month,
          next_month: next_month
        } = assigns
      ) do
    previous_month_path = build_path(current_path, %{month: previous_month})
    next_month_path = build_path(current_path, %{month: next_month})

    assigns =
      assigns
      |> assign(previous_month_path: previous_month_path)
      |> assign(next_month_path: next_month_path)

    ~H"""
    <div>
      <div class="flex items-center mb-8">
        <div class="flex-1">
          <%= Timex.format!(@current, "{Mshort} {YYYY}") %>
        </div>
        <div class="flex justify-end flex-1 text-right">
          <%= live_patch to: @previous_month_path do %>
            <button class="flex items-center justify-center w-10 h-10 text-blue-700 align-middle rounded-full hover:bg-blue-200">
              <i class="fas fa-chevron-left"></i>
            </button>
          <% end %>
          <%= live_patch to: @next_month_path do %>
            <button class="flex items-center justify-center w-10 h-10 text-blue-700 align-middle rounded-full hover:bg-blue-200">
              <i class="fas fa-chevron-right"></i>
            </button>
          <% end %>
        </div>
      </div>
      <div class="mb-6 text-center uppercase calendar grid grid-cols-7 gap-y-2 gap-x-2">
        <div class="text-xs">Mon</div>
        <div class="text-xs">Tue</div>
        <div class="text-xs">Wed</div>
        <div class="text-xs">Thu</div>
        <div class="text-xs">Fri</div>
        <div class="text-xs">Sat</div>
        <div class="text-xs">Sun</div>
      </div>
      <div class="flex items-center gap-x-1">
        <i class="fas fa-globe-americas"></i>
        <%= @time_zone %>
      </div>
    </div>
    """
  end

  defp build_path(current_path, params) do
    current_path
    |> URI.parse()
    |> Map.put(:query, URI.encode_query(params))
    |> URI.to_string()
  end
end
```

`calendar` takes the assigned `previous_month` and `nex_month` values to generate the month navigation paths, consisting of `current_path` with a query string parameter named `month` with the corresponding value. Why are we doing this? To render a different month in the calendar, we have to update the `current`, `beginning_of_month`, and `end_of_month` assigns. There are two ways of achieving this:

1. Add a click event on each month's navigation buttons and the corresponding `handle_event/3` callback function in the live view.
2. Use [live_patch/2] against the same URL, add any query string parameter we need, and implement the corresponding [handle_params/3] callback function in the live view module.

In this particular case, the second option has two winning advantages over the first one. Firstly, `handle_params/3` is called right after `mount/3` and before the initial render so we can reuse its logic for the initial mount. Secondly, and most important, it also updates the browser's URL, so if the user refreshes the page, all the parameters that we use to build the view's state will not get lost. Let's jump back to the browser and check that we see the following:

<a href="/images/blog/2021-11-22-building-a-simple-calendly-clone-with-phoenix-live-view-pt-4/initial-calendar.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-11-22-building-a-simple-calendly-clone-with-phoenix-live-view-pt-4/initial-calendar.png"/>
</a>

Looking good so far. However, if we click on either of the `<` or `>` buttons to display a different month, we can see the following error in the terminal:

```plaintext
[error] GenServer #PID<0.617.0> terminating
** (UndefinedFunctionError) function CalendlexWeb.EventTypeLive.handle_params/3 is undefined or private
    (calendlex 0.1.0) CalendlexWeb.EventTypeLive.handle_params(%{"event_type_slug" => "15-minute-meeting", "month" => "2021-12"}, "http://localhost:4000/15-minute-meeting?month=2021-12", #Phoenix.LiveView.Socket<assigns: %{__changed__: %{}, beginning_of_month: ~D[2021-11-01], current: ~D[2021-11-26], end_of_month: ~D[2021-11-30], event_type: %Calendlex.EventType{__meta__: #Ecto.Schema.Metadata<:loaded, "event_types">, color: "blue", description: "Short meeting call.", duration: 15, id: "51bd2b10-783f-42f5-bc89-57e4253d0127", inserted_at: ~N[2021-11-23 07:17:59], name: "15 minute meeting", slug: "15-minute-meeting", updated_at: ~N[2021-11-23 07:17:59]}, flash: %{}, live_action: nil, next_month: "2021-12", owner: %{name: "Bigardone", time_zone: "Europe/Madrid"}, page_title: "15 minute meeting", previous_month: "2021-10", time_slots: [], time_zone: "Europe/Madrid"}, endpoint: CalendlexWeb.Endpoint, id: "phx-FrsEfVWph4A5eQCE", parent_pid: nil, root_pid: #PID<0.617.0>, router: CalendlexWeb.Router, transport_pid: #PID<0.611.0>, view: CalendlexWeb.EventTypeLive, ...>)
    (phoenix_live_view 0.17.5) lib/phoenix_live_view/utils.ex:369: anonymous fn/5 in Phoenix.LiveView.Utils.call_handle_params!/5
    (telemetry 1.0.0) /Users/ricardogarciavega/projects/elixir/calendlex/deps/telemetry/src/telemetry.erl:293: :telemetry.span/3
    (phoenix_live_view 0.17.5) lib/phoenix_live_view/channel.ex:117: Phoenix.LiveView.Channel.handle_info/2
    (stdlib 3.15) gen_server.erl:695: :gen_server.try_dispatch/4
    (stdlib 3.15) gen_server.erl:771: :gen_server.handle_msg/6
    (stdlib 3.15) proc_lib.erl:226: :proc_lib.init_p_do_apply/3
```

To fix the error, we must implement the `handle_params/3` callback in the `CalendlexWeb.EventTypeLive` module:

```elixir
# ./lib/calendlex_web/live/event_type_live.ex

defmodule CalendlexWeb.EventTypeLive do
  use CalendlexWeb, :live_view

  alias CalendlexWeb.Components.EventType

  def mount(%{"event_type_slug" => slug}, _session, socket) do
    case Calendlex.get_event_type_by_slug(slug) do
      {:ok, event_type} ->
        socket =
          socket
          |> assign(event_type: event_type)
          |> assign(page_title: event_type.name)
          # we remove this line
          # |> assign_dates()

        {:ok, socket}

      {:error, :not_found} ->
        {:ok, socket, layout: {CalendlexWeb.LayoutView, "not_found.html"}}
    end
  end

  def handle_params(params, _uri, socket) do
    # we call `assign_dates` passing `params` as well
    socket = assign_dates(socket, params)

    {:noreply, socket}
  end

  # this function now accepts an additional parameter `params`
  defp assign_dates(socket, params) do
    current = current_from_params(socket, params)

    # ...
  end

  defp current_from_params(socket, %{"month" => month}) do
    case Timex.parse("#{month}-01", "{YYYY}-{0M}-{D}") do
      {:ok, current} ->
        NaiveDateTime.to_date(current)

      _ ->
        Timex.today(socket.assigns.time_zone)
    end
  end

  defp current_from_params(socket, _) do
    Timex.today(socket.assigns.time_zone)
  end

  # ...
end
```

We have made four changes to the current module's logic:

1. First of all, since `handle_params/3` gets called right after `mount/3`, we don't need to call `assign_dates/2` from `mount`, so we can remove the call.
2. We have implemented the `handle_params/3` callback function, which calls `assign_dates/2` passing the socket and the parameters received in the request.
3. We have added a new parameter, `params`, to the `assign_dates` function that we use to calculate the value of `current`.
4. Last but not least, we have added a new `current_from_params/2` function which takes the socket and the parameters and builds `current`.

If we go back to the browser and click again on the previous and next month buttons, we should see how the URL in the browser updates, rendering the corresponding month. Moreover, if we now refresh the browser, it doesn't lose track of the month we were displaying. Yay!

<a href="/images/blog/2021-11-22-building-a-simple-calendly-clone-with-phoenix-live-view-pt-4/browser.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-11-22-building-a-simple-calendly-clone-with-phoenix-live-view-pt-4/browser.png"/>
</a>

Our calendar is almost ready. The only thing left is rendering the month's days. Let's jump back to the `CalendlexWeb.Components.EventType.calendar/1` function component and implement the corresponding logic:

```elixir
# ./lib/calendlex_web/live/components/event_type.ex

defmodule CalendlexWeb.Components.EventType do
  use Phoenix.Component

  # We will implement this module in a minute...
  import CalendlexWeb.LiveViewHelpers

  alias __MODULE__

  # ...

  def calendar(
        %{
          current_path: current_path,
          previous_month: previous_month,
          next_month: next_month
        } = assigns
      ) do
    # ...

    ~H"""
    <div>
      # ...

      <div class="mb-6 text-center uppercase calendar grid grid-cols-7 gap-y-2 gap-x-2">
        <div class="text-xs">Mon</div>
        <div class="text-xs">Tue</div>
        <div class="text-xs">Wed</div>
        <div class="text-xs">Thu</div>
        <div class="text-xs">Fri</div>
        <div class="text-xs">Sat</div>
        <div class="text-xs">Sun</div>
        <%= for i <- 0..@end_of_month.day - 1 do %>
          <EventType.day
            index={i}
            current_path={@current_path}
            date={Timex.shift(@beginning_of_month, days: i)}
            time_zone={@time_zone} />
        <% end %>
      </div>
      # ...
    </div>
    """
  end

  # ...

  def day(%{index: index, current_path: current_path, date: date, time_zone time_zone} = assigns) do
    date_path = build_path(current_path, %{date: date})
    disabled = Timex.compare(date, Timex.today(time_zone)) == -1
    weekday = Timex.weekday(date, :monday)

    class =
      class_list([
        {"grid-column-#{weekday}", index == 0},
        {"content-center w-10 h-10 rounded-full justify-center items-center flex", true},
        {"bg-blue-50 text-blue-600 font-bold hover:bg-blue-200", not disabled},
        {"text-gray-200 cursor-default pointer-events-none", disabled}
      ])

    assigns =
      assigns
      |> assign(disabled: disabled)
      |> assign(:text, Timex.format!(date, "{D}"))
      |> assign(:date_path, date_path)
      |> assign(:class, class)

    ~H"""
    <%= live_patch to: @date_path, class: @class, disabled: @disabled do %>
      <%= @text %>
    <% end %>
    """
  end
end
```

To display the days, we loop through the number of days in the current month, invoking a new function component called `day/1` assigning it the following values:

- `index`: the current index in the loop.
- `current_path`: the current LiveView's path.
- `date`: the current date in the loop.
- `time_zone`: the visitor's time zone.

The component consists of a link pointing to the current path, adding a new query string parameter called `date`. If the date is before today, we disable the link to prevent scheduling events in the past. Since we want to style the link depending on different factors, we will use a new helper module to generate the `class` attribute's value. Let's go ahead and create the helper module:

```elixir
# ./lib/calendlex_web/live/live_view_helpers.ex

defmodule CalendlexWeb.LiveViewHelpers do
  def class_list(items) do
    items
    |> Enum.reject(&(elem(&1, 1) == false))
    |> Enum.map(&elem(&1, 0))
    |> Enum.join(" ")
  end
end
```

`class_list/1` takes a list of two-element tuples, where the first element is a string containing some class names, and the second is a boolean value representing whether it should apply the classes or not. It goes through all the items in the list, rejecting the falsy ones and concatenating the remaining ones. For our `day` component, we want to add certain styles only when it is the first day of the month, others when it is disabled or not, and we have some common styles as well. `"grid-column-#{weekday}"` is a custom class that we use to position the first day of the month using [CSS Grid Layout], so let's add it to the main CSS file:


```css
/* ./assets/css/app.css */

/* ... */

.grid-column-1 {
  grid-column: 1;
}

.grid-column-2 {
  grid-column: 2;
}

.grid-column-3 {
  grid-column: 3;
}

.grid-column-4 {
  grid-column: 4;
}

.grid-column-5 {
  grid-column: 5;
}

.grid-column-6 {
  grid-column: 6;
}

.grid-column-7 {
  grid-column: 7;
}
```

Jumping back to the browser, we should see our calendar in all its glory:

<a href="/images/blog/2021-11-22-building-a-simple-calendly-clone-with-phoenix-live-view-pt-4/calendar.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-11-22-building-a-simple-calendly-clone-with-phoenix-live-view-pt-4/calendar.png"/>
</a>

We should see how the calendar updates, rendering the new month's days if we navigate through the months. There's only one thing left to do: handle the new `date` parameter on the live patch invoked when we click on a date:

```elixir
# ./lib/calendlex_web/live/event_type_live.ex

defmodule CalendlexWeb.EventTypeLive do
  use CalendlexWeb, :live_view

  # ...

  defp current_from_params(socket, %{"date" => date}) do
    case Timex.parse(date, "{YYYY}-{0M}-{D}") do
      {:ok, current} ->
        NaiveDateTime.to_date(current)

      _ ->
        Timex.today(socket.assigns.time_zone)
    end
  end

  # ...
end
```

Since we previously left everything ready when we implemented the `month` parameter, we only have to add a new version of the `current_from_params` function for the `date` parameter and set it as the current date. If we now click on a date, we should see how the browser's URL updates adding the `date` parameter, and if we refresh the browser's page, the calendar should render on the date we selected:

<a href="/images/blog/2021-11-22-building-a-simple-calendly-clone-with-phoenix-live-view-pt-4/browser-2.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-11-22-building-a-simple-calendly-clone-with-phoenix-live-view-pt-4/browser-2.png"/>
</a>

That's it for this part. In the next part, we will use the event type and date selected by the user to render all the available time slots in the day. We will also implement the schedule event live view, creating a new event once the visitor submits its form. In the meantime, you can check the end result in the [live demo](https://calendlex.herokuapp.com/), or have a look at the [source code](https://github.com/bigardone/calendlex).

Happy coding!


<div class="btn-wrapper">
  <a href="https://calendlex.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/calendlex" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>



[last part]: /blog/2021/11/11/building-a-simple-calendly-clone-with-phoenix-live-view-pt-3
[Timex]: https://hexdocs.pm/timex/getting-started.html
[Intl.DateTimeFormat.prototype.resolvedOptions()]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/resolvedOptions
[CSS Grid Layout]: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout
[get_connect_params/1]: https://hexdocs.pm/phoenix_live_view/Phoenix.LiveView.html#get_connect_params/1
[live_patch/2]: https://hexdocs.pm/phoenix_live_view/Phoenix.LiveView.Helpers.html#live_patch/2
[handle_params/3]: https://hexdocs.pm/phoenix_live_view/Phoenix.LiveView.html#c:handle_params/3
