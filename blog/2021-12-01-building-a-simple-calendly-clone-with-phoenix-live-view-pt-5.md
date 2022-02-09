---
title: "Building a simple Calendly clone with Phoenix LiveView (pt. 5)"
excerpt: "Booking time slots for an event type."
date: "2021-12-01"
tags: elixir, phoenix, liveview
image: "https://bigardone.dev/images/blog/2021-12-01-building-a-simple-calendly-clone-with-phoenix-live-view-pt-5/post-meta.png"
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

In the [last part] of the series, we implemented the monthly calendar, making it possible to navigate through months taking advantage of LiveView's live patch. We also added the ability to select a date, updating the current one assigned in the live view. In this part, we will use the date chosen by the user to calculate all the available time slots in the day and render them back, letting the user select one. Finally, we will implement a new live view to render the form for booking the time slot chosen, eventually creating a newly scheduled event once submitted. Let's get cracking!

## Generating the available time slots
To generate the available time slots on a given date, let's edit the `EventTypeLive` module:

```elixir
# ./lib/calendlex_web/live/event_type_live.ex

defmodule CalendlexWeb.EventTypeLive do
  use CalendlexWeb, :live_view

  # ...

  def mount(%{"event_type_slug" => slug}, _session, socket) do
    case Calendlex.get_event_type_by_slug(slug) do
      {:ok, event_type} ->
        # ...

        {:ok, socket, temporary_assigns: [time_slots: []]}

      {:error, :not_found} ->
        {:ok, socket, layout: {CalendlexWeb.LayoutView, "not_found.html"}}
    end
  end

  # ...

  def handle_params(params, _uri, socket) do
    socket =
      socket
      |> assign_dates(params)
      |> assign_time_slots(params) # added this

    {:noreply, socket}
  end

  # ...

  defp assign_time_slots(socket, %{"date" => _}) do
    date = socket.assigns.current
    time_zone = socket.assigns.owner.time_zone
    event_duration = socket.assigns.event_type.duration

    time_slots = Calendlex.build_time_slots(date, time_zone, event_duration)

    socket
    |> assign(time_slots: time_slots)
    |> assign(selected_date: date)
  end

  defp assign_time_slots(socket, _), do: socket
end
```

First, we assign temporary `time_slots` as an empty list. Next, we add a new private function called `assign_time_slots/2` that takes the `socket` and `params`. Using `date`, `time_zone`, and `event.duration` from the socket assigns, it calls a new `Calendlex.build_time_slots/3` function to build the time slots, and finally assigns them along the `current_date` to the socket. Let's add `build_time_slots/3` to the `Calendlex` module:

```elixir
# ./lib/calendlex.ex

defmodule Calendlex do
  # ...

  defdelegate build_time_slots(date, time_zone, duration), to: Calendlex.TimeSlots, as: :build
end
```

Following the same pattern we've been using so far, it delegates the call to a new `Calendlex.TimeSlots.build/3` function. Let's implement this module:


```elixir
# ./lib/calendlex/time_slots.ex

defmodule Calendlex.TimeSlots do
  @spec build(Date.t(), String.t(), non_neg_integer) :: [DateTime.t()]
  def build(date, time_zone, duration) do
    from =
      date
      |> Timex.to_datetime(time_zone)
      |> Timex.set(hour: day_start())

    to = Timex.set(from, hour: day_end())

    from
    |> Stream.iterate(&DateTime.add(&1, duration * 60, :second))
    |> Stream.take_while(&(DateTime.diff(to, &1) > 0))
    |> Enum.to_list()
  end

  defp day_start, do: Application.get_env(:calendlex, :owner)[:day_start]

  defp day_end, do: Application.get_env(:calendlex, :owner)[:day_end]
end
```

This  function does the following:

1. It calculates the owner's start-of-the-day time using the date, the visitor's time zone, and the owner's configuration, binding it to the `from` variable.
2. Using the owner's configuration, it calculates the end-of-the-day time, binding it to `to`.
3. Iterating over a stream of values starting from `from` in steps of `duration` in minutes, it takes items until `to` is reached.
4. Finally, it returns the stream converted into a list.

We haven't added the corresponding owner's configuration values yet, so let's go ahead and do it now:

```elixir
# ./config/config.exs

config :calendlex,
  # ...
  owner: %{
    name: "Bigardone",
    time_zone: "Europe/Madrid",
    day_start: 9,
    day_end: 19
  }

  # ...
```

If we restart Phoenix's server, everything should compile again. Now we can render the time slots, so let's edit the `CalendlexWeb.EventTypeLive` template file:


```elixir
# ./lib/calendlex_web/live/event_type_live.html.heex

<div class="w-3/5 mx-auto">
  <div class="flex flex-auto p-6 mb-2 bg-white border border-gray-200 shadow-md rounded-md gap-x-2">

  # ...

    <%= if @time_slots !== [] do %>
      <div class="pl-8 overflow-y-auto border-l border-gray-100 w-80 h-96">
        <header class="mb-8">
          <h3 class="text-lg font-semibold text-gray-900">
            <%= Timex.format!(@selected_date, "{WDfull}, {Mshort} {D}") %>
          </h3>
        </header>
        <div class="flex-1 overflow-y-auto">
          <%= for time_slot <- @time_slots do %>
            <EventType.time_slot
              id={"time_slot_#{time_slot}"}
              socket={@socket}
              time_slot={time_slot}
              time_zone={@time_zone}
              event_type={@event_type} />
          <% end %>
        </div>
      </div>
    <% end %>
  </div>
</div>
```

We render the corresponding HTML section block if the assigned `time_slots` is not an empty list. For each time slot, we are going to use another function component so let's implement it:

```elixir
# ./lib/calendlex_web/live/components/event_type.ex

defmodule CalendlexWeb.Components.EventType do
  use Phoenix.Component

  # ...
  alias CalendlexWeb.Router.Helpers, as: Routes

  # ...

  def time_slot(
        %{
          socket: socket,
          event_type: event_type,
          time_slot: time_slot,
          time_zone: time_zone
        } = assigns
      ) do
    text =
      time_slot
      |> DateTime.shift_zone!(time_zone)
      |> Timex.format!("{h24}:{m}")

    slot_string = DateTime.to_iso8601(time_slot)

    schedule_path =
      socket
      |> Routes.live_path(CalendlexWeb.ScheduleEventLive, event_type.slug, slot_string)
      |> URI.decode()

    assigns =
      assigns
      |> assign(text: text)
      |> assign(schedule_path: schedule_path)

    ~H"""
    <%= live_redirect to: @schedule_path, class: "text-center block w-full p-4 mb-2 font-bold text-blue-600 border border-blue-300 rounded-md hover:border-blue-600" do %>
      <%= @text %>
    <% end %>
    """
  end
end
```

Taking `time_slot`, we build `text` and `slot_string`. We will use the first as the time slot's button text and the second to build the path to the booking form page. This new live view does not exist yet, thus the compilation error that you can see in your terminal/browser:

```plaintext
[error] #PID<0.636.0> running CalendlexWeb.Endpoint (connection #PID<0.635.0>, stream id 1) terminated
Server: localhost:4000 (http)
Request: GET /15-minute-meeting?date=2021-12-20
** (exit) an exception was raised:
    ** (ArgumentError) no action CalendlexWeb.ScheduleEventLive for CalendlexWeb.Router.Helpers.live_path/4. The following actions/clauses are supported:

    live_path(conn_or_endpoint, CalendlexWeb.EventTypeLive, event_type_slug, params \\ [])
    live_path(conn_or_endpoint, CalendlexWeb.PageLive, params \\ [])
        (phoenix 1.6.2) lib/phoenix/router/helpers.ex:387: Phoenix.Router.Helpers.invalid_route_error/3
        (calendlex 0.1.0) lib/calendlex_web/live/components/event_type.ex:123: CalendlexWeb.Components.EventType.time_slot/1
        (phoenix_live_view 0.17.5) lib/phoenix_live_view/helpers.ex:578: Phoenix.LiveView.Helpers.component/2
        (calendlex 0.1.0) lib/calendlex_web/live/event_type_live.html.heex:43: anonymous fn/4 in CalendlexWeb.EventTypeLive.render/1
        (elixir 1.12.3) lib/enum.ex:2385: Enum."-reduce/3-lists^foldl/2-0-"/3
        ...
```

To fix the error, let's add the corresponding route, empty LiveView module, and template:

```elixir
# ./lib/calendlex_web/router.ex

defmodule CalendlexWeb.Router do
  use CalendlexWeb, :router

  # ...

  live_session :public, on_mount: CalendlexWeb.Live.InitAssigns do
    scope "/", CalendlexWeb do
      pipe_through :browser

      # ...

      live "/:event_type_slug/:time_slot", ScheduleEventLive
  end
end
```

```elixir
# ./lib/calendlex_web/live/schedule_event_live.ex

defmodule CalendlexWeb.ScheduleEventLive do
  use CalendlexWeb, :live_view

  def mount(_params, _session, socket) do
    {:ok, socket}
  end
end
```

```elixir
# ./lib/calendlex_web/live/schedule_event_live.html.heex

ScheduleEventLive
```

After making these changes, everything should compile again, and we should see something similar to the following in the browser:

<a href="/images/blog/2021-12-01-building-a-simple-calendly-clone-with-phoenix-live-view-pt-5/slots.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-12-01-building-a-simple-calendly-clone-with-phoenix-live-view-pt-5/slots.png"/>
</a>

## Booking a new time slot

If we click on any of the available time slots, it takes us to the new live view we just created, in which we have to render the booking form. Let's go ahead and refactor the initial implementation:

```elixir
# ./lib/calendlex_web/live/schedule_event_live.ex

defmodule CalendlexWeb.ScheduleEventLive do
  use CalendlexWeb, :live_view

  alias Calendlex.Event

  def mount(%{"event_type_slug" => slug, "time_slot" => time_slot}, _session, socket) do
    with {:ok, event_type} <- Calendlex.get_event_type_by_slug(slug),
         {:ok, start_at, _} <- DateTime.from_iso8601(time_slot) do
      end_at = Timex.add(start_at, Timex.Duration.from_minutes(event_type.duration))
      changeset = Event.changeset(%Event{}, %{})

      socket =
        socket
        |> assign(changeset: changeset)
        |> assign(end_at: end_at)
        |> assign(event_type: event_type)
        |> assign(start_at: start_at)

      {:ok, socket}
    else
      _ ->
        {:ok, socket, layout: {CalendlexWeb.LayoutView, "not_found.html"}}
    end
  end
end
```

Like we did in the previous view, we check if both the event type slug and time slot are correct or render the error page. In the happy path, we create a new `Event` changeset and assign it to the socket along with `event_type`, `start_at`, and `end_at`. We are going to use this changeset to render the booking form, so let's go ahead and edit the template:


```elixir
<div class="w-3/5 mx-auto">
  <div class="flex flex-auto p-6 mb-2 bg-white border border-gray-200 shadow-lg rounded-md gap-x-2">
    <div class="flex-1">
      <div class="mb-4">
        <%= live_redirect to: Routes.live_path(@socket, CalendlexWeb.EventTypeLive, @event_type.slug) do %>
          <div>
            <div class="flex items-center justify-center inline-block text-xl text-blue-500 border rounded-full w-9 h-9">
              <i class="fas fa-arrow-left"></i>
            </div>
          </div>
        <% end %>
      </div>
      <h4 class="text-gray-500">Bigardone</h4>
      <h1 class="my-3 text-xl text-black"><%= @event_type.name %></h1>
      <div class="flex flex-row items-center mb-2 font-bold text-gray-500 gap-2">
        <i class="far fa-clock"></i>
        <%= @event_type.duration %> min
      </div>
      <div class="flex flex-row items-center mb-2 font-bold text-green-500 gap-2">
        <i class="far fa-calendar-alt"></i>
        <%= CalendlexWeb.LiveViewHelpers.schedule_string(@start_at, @end_at, @time_zone) %>
      </div>
      <div class="flex flex-row items-center font-bold text-gray-500 gap-2">
        <i class="fas fa-globe-americas"></i>
        <%= @time_zone %>
      </div>
    </div>
    <div class="w-3/5 px-8 border-l border-gray-100">
      <header class="mb-8">
          <h3 class="text-lg font-semibold text-gray-900">Enter details</h3>
      </header>
      <.form let={f} for={@changeset} phx-submit="submit">
        <div class="w-4/5 mb-6">
          <%= label f, :name, class: "block mb-2 text-sm" %>
          <%= text_input f, :name, class: "w-full p-2 border rounded-md", autofocus: "", required: "" %>
          <%= error_tag f, :name %>
        </div>
        <div class="w-4/5 mb-6">
          <%= label f, :email, class: "block mb-2 text-sm" %>
          <%= text_input f, :email, class: "w-full p-2 border rounded-md", type: "email", required: "" %>
          <%= error_tag f, :email %>
        </div>
        <div class="w-4/5 mb-6">
          <%= label f, :comments, class: "block mb-2 text-sm" %>
          <%= textarea f, :comments, class: "w-full p-2 border h-36 rounded-md" %>
        </div>
        <div class="w-4/5 mb-6">
          <button class="px-4 py-2 text-white bg-blue-600 rounded-full" type="submit" phx-disable-with="Scheduling event...">Schedule event</button>
        </div>
      </.form>
    </div>
  </div>
</div>
```

The template consists of two sections. In the left section, we display the info related to the event type, in which we are formatting the date and time using a `schedule_string.schedule_string/3` that we have to add to the `CalendlexWeb.LiveViewHelpers` module:

```elixir
# ./lib/calendlex_web/live/live_view_helpers.ex

defmodule CalendlexWeb.LiveViewHelpers do
  # ...

  def schedule_string(start_at, end_at, time_zone) do
    slot_start_str =
      start_at
      |> DateTime.shift_zone!(time_zone)
      |> Timex.format!("{h24}:{m}")

    slot_end_str =
      end_at
      |> DateTime.shift_zone!(time_zone)
      |> Timex.format!("{h24}:{m}")

    date_str =
      start_at
      |> DateTime.shift_zone!(time_zone)
      |> Timex.format!("{WDfull}, {Mfull} {D}, {YYYY}")

    "#{slot_start_str} - #{slot_end_str}, #{date_str}"
  end
end
```

In the right section of the page, we render the form for the previously assigned changeset. If we jump back to the browser, we should see the new page rendering correctly:

<a href="/images/blog/2021-12-01-building-a-simple-calendly-clone-with-phoenix-live-view-pt-5/form.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-12-01-building-a-simple-calendly-clone-with-phoenix-live-view-pt-5/form.png"/>
</a>

Taking a closer look at the `form` tag, we can observe two peculiarities:

1. We are using another function component, `.form`, from Phoenix.
2. We have added a `phx-submit` attribute.

The [phx-submit] attribute is one of LiveView's form bindings and makes it possible to handle form submissions from our live views. To handle it, we have to implement the proper callback function:

```elixir
# ./lib/calendlex_web/live/schedule_event_live.ex

defmodule CalendlexWeb.ScheduleEventLive do
  use CalendlexWeb, :live_view

  alias Calendlex.Event

  # ...

  def handle_event(
        "submit",
        %{"event" => event},
        %{
          assigns: %{
            end_at: end_at,
            event_type: event_type,
            start_at: start_at,
            time_zone: time_zone
          }
        } = socket
      ) do
    event
    |> Map.put("end_at", end_at)
    |> Map.put("event_type_id", event_type.id)
    |> Map.put("start_at", start_at)
    |> Map.put("time_zone", time_zone)
    |> Calendlex.insert_event()
    |> case do
      {:ok, event} ->
        {:noreply,
         push_redirect(socket,
           to: Routes.live_path(socket, CalendlexWeb.EventsLive, event_type.slug, event.id)
         )}

      {:error, changeset} ->
        {:noreply, assign(socket, changeset: changeset)}
    end
  end
end
```

Taking both the form parameters and the socket assigns, we create a map that we pass to ` Calendlex.insert_event/1` to create the new event. If the event creation is successful, we redirect to the result page. Otherwise, we assign the errored changeset to the socket. Let's take care of the `Calendlex` functions that we are going to need:

```elixir
# ./lib/calendlex.ex

defmodule Calendlex do
  # ...

  defdelegate insert_event(params), to: Calendlex.Event.Repo, as: :insert

  defdelegate get_event_by_id(id), to: Calendlex.Event.Repo, as: :get
end
```

```elixir
# ./lib/calendlex/event/repo.ex

defmodule Calendlex.Event.Repo do
  alias Calendlex.{Event, Repo}

  def insert(params) do
    %Event{}
    |> Event.changeset(params)
    |> Repo.insert()
  end

  def get(id) do
    Event
    |> Repo.get(id)
    |> Repo.preload(:event_type)
    |> case do
      nil ->
        {:error, :not_found}

      event ->
        {:ok, event}
    end
  end
end
```

Now we need to add the final result page, so let's edit the routes module and map it:

```elixir
# ./lib/calendlex_web/router.ex

defmodule CalendlexWeb.Router do
  use CalendlexWeb, :router

  # ...

  live_session :public, on_mount: CalendlexWeb.Live.InitAssigns do
    scope "/", CalendlexWeb do
      pipe_through :browser

      # ...

      live "/events/:event_type_slug/:event_id", EventsLive
    end
  end
end
```

```elixir
# ./lib/calendlex_web/live/events_live.ex

defmodule CalendlexWeb.EventsLive do
  use CalendlexWeb, :live_view

  def mount(%{"event_type_slug" => slug, "event_id" => id}, _session, socket) do
    with {:ok, event_type} <- Calendlex.get_event_type_by_slug(slug),
         {:ok, event} <- Calendlex.get_event_by_id(id) do
      socket =
        socket
        |> assign(event_type: event_type)
        |> assign(event: event)

      {:ok, socket}
    else
      {:error, :not_found} ->
        {:ok, socket, layout: {CalendlexWeb.LayoutView, "not_found.html"}}
    end
  end
end
```

This live view is pretty straightforward. It tries to find the event type and the created event by the incoming params, assigning them to the socket to render the following template:

```elixir
# ./lib/calendlex_web/live/events_live.html.heex

<div class="w-2/5 mx-auto">
  <div class="flex flex-auto p-12 mb-2 bg-white border border-gray-200 shadow-md rounded-md gap-x-2">
    <div class="flex-1 text-center">
      <header class="mb-8">
        <h1 class="mb-4 text-xl font-bold text-gray-500 text-gray-800">Confirmed</h1>
        <p>You are scheduled with <%= @owner.name %>.</p>
      </header>
      <h2 class="my-3 text-xl font-bold text-gray-800"><%= @event_type.name %></h2>
      <div class="flex flex-row items-center justify-center font-bold text-green-500 gap-2">
        <i class="far fa-calendar-alt"></i>
        <%= CalendlexWeb.LiveViewHelpers.schedule_string(@event.start_at, @event.end_at, @time_zone) %>
      </div>
    </div>
  </div>
</div>
```

If we jump back to the browser, fill in the form, and submit it, we should see the following:

<a href="/images/blog/2021-12-01-building-a-simple-calendly-clone-with-phoenix-live-view-pt-5/result.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-12-01-building-a-simple-calendly-clone-with-phoenix-live-view-pt-5/result.png"/>
</a>

Yay! We have finally booked our first event. However, we still have one more thing to do: consider the booked events while calculating the available time slots. Let's edit the time slot module and refactor its logic:

```elixir
# ./lib/calendlex/time_slots.ex

defmodule Calendlex.TimeSlots do
  alias Calendlex.Event.Repo, as: EventRepo

  @spec build(Date.t(), String.t(), non_neg_integer) :: [DateTime.t()]
  def build(date, time_zone, duration) do
    from =
      date
      |> Timex.to_datetime(time_zone)
      |> Timex.set(hour: day_start())

    to = Timex.set(from, hour: day_end())

    # Get the booked events for the given date
    date_events = EventRepo.get_by_start_date(date)

    from
    |> Stream.iterate(&DateTime.add(&1, duration * 60, :second))
    |> Stream.take_while(&(DateTime.diff(to, &1) > 0))
    # Reject time slots overlapping booked events
    |> Stream.reject(&reject_overlaps(&1, date_events, duration))
    |> Enum.to_list()
  end

  # ...

  defp reject_overlaps(time_slot, date_events, duration) do
    next_time_slot = DateTime.add(time_slot, duration * 60, :second)

    Enum.any?(date_events, fn event ->
      if DateTime.compare(event.start_at, time_slot) == :lt do
        DateTime.compare(event.end_at, time_slot) == :gt
      else
        DateTime.compare(event.start_at, next_time_slot) == :lt
      end
    end)
  end
end
```

We get from the database all the events starting in the given date and remove the time slots overlapping them. Let's implement the `get_by_start_date/1` in the event repo module:

```elixir
# ./lib/calendlex/event/repo.ex

defmodule Calendlex.Event.Repo do
  import Ecto.Query

  alias Calendlex.{Event, Repo}

  # ...

  def get_by_start_date(date) do
    Event
    |> where([e], fragment("?::date", e.start_at) == ^date)
    |> order_by(:start_at)
    |> Repo.all()
  end
end
```

If we go back to the exact date we just booked the event for, we should see that time slot (09:30) missing in the list:

<a href="/images/blog/2021-12-01-building-a-simple-calendly-clone-with-phoenix-live-view-pt-5/rejected-slot.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-12-01-building-a-simple-calendly-clone-with-phoenix-live-view-pt-5/rejected-slot.png"/>
</a>

And that's all for the public side of our application. In the next part, we will start implementing the private admin site. We will use a new live session, protected with Basic HTTP authentication, and implement the event types section, in which we will list all the existing event types, and make use of LiveView's JS commands to create a cool dropdown menu. In the meantime, you can check the final result in the [live demo](https://calendlex.herokuapp.com/), or have a look at the [source code](https://github.com/bigardone/calendlex).

Happy coding!

<div class="btn-wrapper">
  <a href="https://calendlex.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/calendlex" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>

[last part]: /blog/2021/11/22/building-a-simple-calendly-clone-with-phoenix-live-view-pt-4
[phx-submit]: https://hexdocs.pm/phoenix_live_view/form-bindings.html#form-events
