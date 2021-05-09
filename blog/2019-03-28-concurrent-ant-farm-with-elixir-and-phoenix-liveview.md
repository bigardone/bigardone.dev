---
title: Concurrent ant farm with Elixir and Phoenix LiveView
date: 2019-03-28
tags: elixir, phoenix, liveview
excerpt: Building a concurrent ant farm with Elixir and Phoenix LiveView.
---

A couple of years ago, I worked on an **Elixir** personal project which consisted of a virtual ant farm, where every ant was a GenServer process, simulating a basic AI behavior. What initially was going to be something straightforward; it ended up being much bigger and not working as planned, and eventually forgotten. When Chris Maccord announced [Phoenix LiveView], I thought to myself that I wouldn't use it for now, because I enjoy too much writing front-end in **Elm**. However, I also love **Elixir** and **Phoenix**, so I couldn't resist giving it a try, and giving the ant farm another go, this time using **Elixir** only, and trying to invest the less time possible. So I rolled up my sleeves, and surprisingly, four or five hours later I had the ant farm working, and this is how I did it:

### Disclaimer

Before continuing, take this small experiment with a grain of salt. I don't know anything about AI behaviors, nor SVG animations, so there is plenty of room for improvement. However, this is what worked fine after the first try, and I didn't want to expend more than an evening on it. This being said, let's get cracking!

### Setting up the project with LiveView

Creating the project and adding **LiveView** was pretty straight forward. There are already several tutorials over the Internet about how to add **LiveView** to a **Phoenix** application, so I jumped into [this great post] from [Elixir School Blog]and followed the instructions, which are very clear and easy to implement. Some minutes later, I had the project up and running.

### Bringing ants to life

After having all the necessary project boilerplate, I started by defining what an ant is, and creating a simple module to define the data structure to represent its state:

```elixir
# lib/ant_farm/ant/state.ex

defmodule AntFarm.Ant.State do
  alias __MODULE__

  @type position :: {integer, integer}
  @type velocity :: {integer, integer}
  @type state :: :walking | :resting | :panicking

  @type t :: %State{
          id: String.t(),
          position: position,
          velocity: velocity,
          focus: non_neg_integer,
          state: state,
          speed: float
        }

  defstruct [:id, :position, :velocity, :focus, :state, :speed]

  def new(id) do
    state = random_state()

    %State{
      id: id,
      position: random_position(),
      velocity: random_velocity(),
      focus: random_focus(state),
      state: state,
      speed: @speed
    }
  end
end
```

It has the following properties:

- `id` to identify uniquely every ant.
- `position` which represents its current `{X, Y}` coordinates.
- `velocity` which represents its movement direction, being `{1 | 0 | -1, 1 | 0 | -1}`.
- `focus` which determines when it gets bored with its current behavior.
- `state` which represents its current behavior, and can be one of `:walking`, `:resting` or `:panicking`.
- `speed` which represents its current speed.

I also added a `new/1` helper function which returns a state struct with random values.

Having this state defined, I moved on to creating the ant process definition:

```elixir
# lib/ant_farm/ant.ex

defmodule AntFarm.Ant do
  use GenServer

  alias __MODULE__.{State, Behaviour}
  @timeout 60

  @doc false
  def start_link(opts) do
    id = Keyword.fetch!(opts, :id)

    GenServer.start_link(__MODULE__, id, name: name(id))
  end

  def get_state(pid), do: GenServer.call(pid, :get_state)

  @impl true
  def init(id) do
    schedule()
    {:ok, State.new(id)}
  end

  @impl true
  def handle_call(:get_state, _from, state) do
    {:reply, state, state}
  end

  @impl true
  def handle_info(:perform_actions, state) do
    state = Behaviour.process(state)
    schedule()

    {:noreply, state}
  end

  defp name(id), do: String.to_atom("ant::" <> id)

  defp schedule do
    Process.send_after(self(), :perform_actions, @timeout)
  end
end
```
This is a basic `GenServer` implementation that starts a new named process, which state is a `AntFarm.Ant.State` struct. To emulate some random behavior, every 60 milliseconds it processes its state with the `AntFarm.Ant.Behaviour.process/1` function, which returns the new state to set.


```elixir
# lib/ant_farm/ant/behaviour.ex

defmodule AntFarm.Ant.Behaviour do
  alias AntFarm.Ant.State

  @max_width Application.get_env(:ant_farm, :colony)[:width]
  @max_height Application.get_env(:ant_farm, :colony)[:height]

  def process(%State{state: :resting, focus: 0} = state) do
    State.start_walking(state)
  end

  def process(%State{state: :resting} = state) do
    State.keep_resting(state)
  end

  def process(%State{state: :walking, focus: 0} = state) do
    State.start_resting(state)
  end

  def process(%State{state: :walking, speed: speed, position: {x, y}} = state) do
    {vx, vy} = velocity = calculate_velocity(state)
    position = {x + vx * speed, y + vy * speed}

    state
    |> State.keep_walking()
    |> State.set_velocity(velocity)
    |> State.set_position(position)
  end

  # ...
  # ...
  # ...
end
```

The `process/1` function receives an ant state, and returns a new one depending on its current properties and applying some of the following logic:

- If the current `state` is `:resting` and `focus` is 0, it forces the ant to start walking.
- On the other hand, if `state` is `:resting` but it is still focusing on resting, then the ant keeps resting (which subtracts 1 to the current `focus` value).
- If the current `state` is `:walking` and `focus` is 0, the ant gets tired and starts resting.
- But if `state` is `:walking` and it is still focusing on it, then it keeps walking calculating its new velocity (in case it hits the ant farm boundaries) and position.

This is just an example of how to implement some basic logic to emulate behavior depending on a current state. To see all the details check out the [AntFarm.Ant.Behaviour](https://github.com/bigardone/phoenix-liveview-ant-farm/blob/master/lib/ant_farm/ant/behaviour.ex) source code.

At this point I had defined an ant's structure and behavior, so the next thing I needed was a way to spawn new ants on demand, and **Elixir**'s [DynamicSupervisor] was the right tool for it:

```elixir
# lib/ant_farm/ant/supervisor.ex

defmodule AntFarm.Ant.Supervisor do
  use DynamicSupervisor

  alias AntFarm.Ant

  def start_link(arg) do
    DynamicSupervisor.start_link(__MODULE__, arg, name: __MODULE__)
  end

  def start_child do
    spec = {Ant, id: generate_id()}
    DynamicSupervisor.start_child(__MODULE__, spec)
  end

  def populate(count \\ 1) do
    for _ <- 1..count, do: start_child()
  end

  def ants do
    __MODULE__
    |> DynamicSupervisor.which_children()
    |> Task.async_stream(&get_ant_state/1)
    |> Enum.map(fn {:ok, state} -> state end)
  end

  @impl true
  def init(_arg) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  # ...
  # ...
end
```

The `start_child` function makes the supervisor spawn a new `Ant` process with a random `id`. I also added an `ants` function which returns all its children state. Last but not least, the `populate/1` function spawns a given number of ant processes, which is going to become handy to spawn some ants once the application starts. For this purpose, I also created a small populator module:

```elixir
# lib/ant_farm/ant/supervisor/populator.ex

defmodule AntFarm.Ant.Supervisor.Populator do
  alias AntFarm.Ant.Supervisor, as: AntSupervisor

  @population Application.get_env(:ant_farm, :colony)[:population]

  def child_spec(opts) do
    %{
      id: __MODULE__,
      start: {__MODULE__, :start_link, [opts]},
      type: :worker,
      restart: :permanent,
      shutdown: 500
    }
  end

  def start_link(_opts \\ []) do
    AntSupervisor.populate(@population)
    :ignore
  end
end
```

To spawn the ants once the application starts, and moreover, once the `AntFarm.Ant.Supervisor` has started, we only need to add it to the main supervision tree like so:

```elixir
# lib/ant_farm/application.ex

defmodule AntFarm.Application do
  use Application

  def start(_type, _args) do
    children = [
      AntFarm.Ant.Supervisor,
      AntFarm.Ant.Supervisor.Populator,
      AntFarmWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: AntFarm.Supervisor]
    Supervisor.start_link(children, opts)
  end

  def config_change(changed, _new, removed) do
    AntFarmWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
```

This is how the application looked like the first time I started it, spawning only ten ant processes:

<img class="center" src="/images/blog/liveview-ant-farm/tree.jpg"/>

### Rendering the ant farm

Now that I had a bunch of ants doing their ant things, it was time for some **LiveView** fun, and displaying them in the browser. The first step was to render the basic template from the main controller:

```elixir
# lib/ant_farm_web/templates/page/index.html.eex

<div class="container">
  <header class="main-header">
    <h1>Phoenix LiveView Ant Farm</h1>
  </header>
  <%= live_render(@conn, AntFarmWeb.AntFarmLiveView, session: nil) %>
  <p>
    Crafted with ♥ by <a target="_blank" href="https://github.com/bigardone">bigardone</a> |
    Check out the <a target="_blank" href="https://github.com/bigardone/phoenix-liveview-ant-farm">source code</a>
  </p>
</div>
```
Here comes the tricky part. Calling `live_render/3` renders the **LiveView**, which is the content that is going to be changing periodically to animate the ants. Let's take a look at the `AntFarmWeb.AntFarmLiveView` module:

```elixir
# lib/ant_farm_web/live/ant_farm_live_view.ex

defmodule AntFarmWeb.AntFarmLiveView do
  use Phoenix.LiveView

  alias AntFarm.Ant.Supervisor, as: Colony

  @timeout 60

  @impl true
  def mount(_session, socket) do
    if connected?(socket), do: schedule()
    ants = Colony.ants()
    {:ok, assign(socket, ants: ants)}
  end

  @impl true
  def render(assigns) do
    AntFarmWeb.PageView.render("ant_farm.html", assigns)
  end

  def handle_info(:tick, socket) do
    schedule()
    ants = Colony.ants()
    {:noreply, assign(socket, ants: ants)}
  end

  defp schedule do
    Process.send_after(self(), :tick, @timeout)
  end
end
```

When rendering the template for the first time, the `mount/2` function gets called, assigning the existing ants to the connection, rendering the first static HTML and making the JS client connect to the socket. Only then, it creates the stateful view, invoking `mount/2` again with the signed session, and calling the private `schedule/0` function, which sends the tick message to the **LiveView** process every sixty milliseconds, retrieving the new ant states and assigning it to the socket forcing a new render of the `ant_farm.html` template.

The only thing left was creating the `ant_farm.html` template:

```elixir
# lib/ant_farm_web/templates/page/ant_farm.html.leex

<div class="main-content">
  <h2>Rendering <%= length(@ants) %> concurrent ants</h2>
  <svg viewbox="0 0 1024 600">
    <rect width="1024" height="600" fill="#00b349"/>
    <%= for %{position: {x, y}} <- @ants do %>
      <rect width="2" height="2" fill="#000000" x="<%= x %>" y="<%= y %>"/>
    <% end %>
  </svg>
</div>
```

This is what I saw when I went to the browser:

<img class="center" src="/images/blog/liveview-ant-farm/ants.gif"/>

My ants were finally alive, yay!

### Do not tap on glass

After having all the ants walking around the screen, I wanted to add some interactivity with them, and the most reasonable to me was clicking on the farm box. **LiveView** comes with some event handling support out of the box, so I went back to the documentation and implemented the `phx-click` binding in the `ant_farm.html` template:

```elixir
# lib/ant_farm_web/templates/page/ant_farm.html.leex

# ...
# ...

  <svg class="panic<%= @panic %>" phx-click="tap" viewbox="0 0 1024 600">
    # ...
    # ...
  </svg>

# ...
```

Adding the `phx-click="tap"` attribute, makes the **LiveView** JS client send a `tap` message through the socket every time a user clicks on the `svg` element. Therefore, the `AntFarmWeb.AntFarmLiveView` needs to handle it:

```elixir
# lib/ant_farm_web/live/ant_farm_live_view.ex

defmodule AntFarmWeb.AntFarmLiveView do
  use Phoenix.LiveView

  # ...

  @impl true
  def mount(_session, socket) do
    if connected?(socket), do: schedule()
    ants = Colony.ants()
    {:ok, assign(socket, panic: false, ants: ants)}
  end

  # ...

  @impl true
  def handle_event("tap", _value, socket) do
    Colony.panic()
    Process.send_after(self(), :chill, 1000)
    {:noreply, assign(socket, panic: true)}
  end

  def handle_info(:chill, socket) do
    {:noreply, assign(socket, panic: false)}
  end

  # ...
end
```

The tap event handler calls `Colony.panick/0` which makes all ants go crazy, sets its assign `panic` value to `true` and after a second sends a `:chill` message, which sets the `panic` assign value back to `false`. This is a trick I did, to toggle a particular class to the SVG DOM element, which adds a vibration animation. Let's take a look at the `Colony.panic/0` function:

```elixir
# lib/ant_farm/ant/supervisor.ex

defmodule AntFarm.Ant.Supervisor do
  use DynamicSupervisor

  # ...

  def panic do
    __MODULE__
    |> DynamicSupervisor.which_children()
    |> Enum.each(&do_panic/1)
  end

  defp do_panic({_, pid, _, _}), do: Ant.panic(pid)
end
```

It takes all of its children PIDs and calls `Ant.panic/1` with each of them:

```elixir
# lib/ant_farm/ant.ex

defmodule AntFarm.Ant do
  use GenServer

  # ...

  def panic(pid), do: GenServer.cast(pid, :panic)

  # ...

  @impl true
  def handle_cast(:panic, %State{state: :panicking} = state) do
    {:noreply, state}
  end

  def handle_cast(:panic, state) do
    {:noreply, State.start_panicking(state)}
  end
end
```

The `panic/1` function sends a `:panic` message to the given PID, which takes the current `state` and makes the ant go crazy for a random number of ticks, only if it's not already panicking though. The result is quite nice as you can see in [the demo](https://phoenix-liveview-ant-farm.herokuapp.com) :)

And, this is pretty much it. In a single evening, I managed to code the project and deploy it into Heroku. I was amazed about how easy was adding **LiveView** to the project, how well it worked and the overall result. I'm definitely keeping an eye on **LiveView** updates and how it evolves to use it in future projects. Don't forget to check out the demo and the final repository in the links below.

Happy coding!

<div class="btn-wrapper">
  <a href="https://phoenix-liveview-ant-farm.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/phoenix-liveview-ant-farm" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>


[Phoenix LiveView]: https://github.com/phoenixframework/phoenix_live_view
[this great post]: https://elixirschool.com/blog/phoenix-live-view/
[Elixir School Blog]: https://elixirschool.com/blog
[DynamicSupervisor]: https://hexdocs.pm/elixir/DynamicSupervisor.html

