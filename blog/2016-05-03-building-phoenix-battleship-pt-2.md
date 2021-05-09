---
title: Building Phoenix Battleship (pt. 2)
date: 2016-05-03 09:55 PDT
tags: elixir, phoenix, otp
excerpt:
  The lobby channel and game supervision
published: true
---
<div class="index">
  <p>This post belongs to the <strong>Building Phoenix Battleship</strong> series.</p>
  <ol>
    <li><a href="/blog/2016/04/29/building-phoenix-battleship-pt-1">Designing the game mechanics</a></li>
    <li><a href="/blog/2016/05/03/building-phoenix-battleship-pt-2/">The lobby channel and game supervision</a></li>
    <li><a href="/blog/2016/05/21/building-phoenix-battleship-pt-3/">The game setup</a></li>
    <li><a href="/blog/2016/07/28/building-phoenix-battleship-pt-4/">Placing ships on the board's grid</a></li>
    <li><a href="/blog/2016/08/08/building-phoenix-battleship-pt-5/">Let the battle begin!</a></li>
    <li>Coming soon...</li>
  </ol>
</div>

## The lobby channel and game supervision
On the previous part of this series, we did a quick tour through the main components
which form part of our new game. Recalling the diagram, two of these elements are the **LobbyChannel**, which
is the interface between the player's browser and the existing games, and
the **Battleship.Game.Supervisor**, responsible for creating new games and
listing existing games.

<img class="center" src="/images/blog/building_phoenix_battleship/diagram-2.jpg"/>

### The LobbyChannel

Before continuing any further, there's an element not displayed in the diagram which is
relevant and worth to mention. This element is the main controller of the application, the `Battleship.PageController`.
Its importance comes from the fact that in its index action is where the **random player id** is generated.

```elixir
# web/controllers/page_controller.ex

defmodule Battleship.PageController do
  use Battleship.Web, :controller

  def index(conn, _params) do
    render conn, "index.html", id: Battleship.generate_player_id
  end
end
```

We are going to use this `id` to connect the player to the socket, and to identify
him in the games he plays. Here is how its implementation looks like:

```elixir
# lib/battleship.ex

defmodule Battleship do
  use Application

  @id_length Application.get_env(:battleship, :id_length)
  # ...
  # ...

  def generate_player_id do
    @id_length
    |> :crypto.strong_rand_bytes
    |> Base.url_encode64()
    |> binary_part(0, @id_length)
  end

  # ...
end
```

Having explained this, let's get down to business. Every time a new player visits the game, whether he goes into
the lobby or directly to a single battle, he is going to join the **LobbyChannel** automatically.
Before continuing we need to make some changes to the project. **Phoenix** by default
creates a default **UserSocket** module, which I have renamed it to **PlayerSocket**,
so let's modify the `endpoint.ex` file to reflect this:

```elixir
# lib/battleship/endpoint.ex

defmodule Battleship.Endpoint do
  use Phoenix.Endpoint, otp_app: :battleship

  socket "/socket", Battleship.PlayerSocket

  # ...
end
```

Now let's update the `player_socket.ex` file in order to add the new **LobbyChannel** module:

```elixir
# web/channels/player_socket.ex

defmodule Battleship.PlayerSocket do
  use Phoenix.Socket

  alias Battleship.Player

  ## Channels
  channel "lobby", Battleship.LobbyChannel

  ## Transports
  transport :websocket, Phoenix.Transports.WebSocket

  def connect(%{"id" => player_id}, socket) do
    {:ok, assign(socket, :player_id, player_id)}
  end

  def connect(_, _socket), do: :error

  def id(socket), do: "players_socket:#{socket.assigns.player_id}"
end
```

The **LobbyChannel** responsibilities include creating new games, returning the list of the current
games that are taking place at that particular moment and broadcasting what's going
on in any of these games. Let's take a closer look at its functionality:

```elixir
# web/channels/lobby_channel.ex

defmodule Battleship.LobbyChannel do
  use Battleship.Web, :channel
  alias Battleship.Game.Supervisor, as: GameSupervisor

  def join("lobby", _msg, socket) do
    {:ok, socket}
  end

  def handle_in("current_games", _params, socket) do
    {:reply, {:ok, %{games: GameSupervisor.current_games}}, socket}
  end

  def handle_in("new_game", _params, socket) do
    game_id = Battleship.generate_game_id
    GameSupervisor.create_game(game_id)

    {:reply, {:ok, %{game_id: game_id}}, socket}
  end

  def broadcast_current_games do
    Battleship.Endpoint.broadcast("lobby", "update_games", %{games: GameSupervisor.current_games})
  end
end
```

  - The channel receives the `current_games` event every time a new player visits the main
  page of the game. Using the `Battleship.Game.Supervisor` if fetches the games that are taking place and returns them through the socket, so the list of games in the **Redux** store is populated and displayed to the player.
  - When a player clicks on the *Start new battle* button, the `new_game` event is pushed to the channel. After generating a new random `game_id` it uses the `Battleship.Game.Supervisor` again to start a new `Battleship.Game` process, returning the previously generated `game_id`. This id is used in the front-end to redirect the player to the game view.
  - On the other hand, `broadcast_current_games` is a function that does the same as the handle `current_games` callback excepting for that it broadcast the list of games through all the channel, to every connected player. We are going to talk more about it when we get to the part of the series related to events.

As with the player id generation, the `game_id` generation also worths mentioning.
My original implementation was the same as with the player id, but thanks to [Julius Beckmann][7845ba97] (aka h4cc),
we now have a really nice mechanism for generating cool pirate game ids. You can check all the details in his [pull request][e17637dd].


### The Game.Supervisor
After describing the **LobbyChannel** responsibilities, we have seen that it is
tightly coupled to the **Battleship.Game.Supervisor** module. When a battle starts,
we want to keep a record of the data related to it.  For instance, we want to track
which player started the battle (the attacker), who joined as the defender player, the chat messages between
both players, the game turns, whether the game is over or not and who is the winner.
We are going to store this data in separate game processes, one for each game taking place,
supervised by the **Battleship.Game.Supervisor**.  This supervisor is not only going to spawn
new **Battleship.Game** processes, but it is also responsible for retrieving the information of any
current battle inside its supervision tree. Let's take a closer look at its code:

```elixir
# lib/battleship/game/supervisor.ex

defmodule Battleship.Game.Supervisor do
  use Supervisor
  alias Battleship.{Game}

  def start_link, do: Supervisor.start_link(__MODULE__, :ok, name: __MODULE__)

  def init(:ok) do
    children = [
      worker(Game, [], restart: :temporary)
    ]

    supervise(children, strategy: :simple_one_for_one)
  end

  def create_game(id), do: Supervisor.start_child(__MODULE__, [id])

  def current_games do
    __MODULE__
    |> Supervisor.which_children
    |> Enum.map(&game_data/1)
  end

  defp game_data({_id, pid, _type, _modules}) do
    pid
    |> GenServer.call(:get_data)
    |> Map.take([:id, :attacker, :defender, :turns, :over, :winner])
  end
end
```

There are some details worth to mention about its implementation:

  - It supervises `Battleship.Game` processes, with a `:simple_one_for_one` strategy, which means that it can only have one child type, therefore it can only supervise this kind of processes, which can be added dynamically.
  - The `:temporary` value for the child `restart` policy means that any terminated game process is not going to be restarted again. This behavior plays an important role regarding the game mechanics, and we will talk more about it in the following part of the series.
  - The `create_game/1` function receives a game id (previously generated in the `LobbyChannel`) and starts a new `Battleship.Game` generic server process.
  - The `current_games/0` function uses the [with_children/1][f4057548] from the `Supervisor` behavior module, which returns a list of information about its children processes. Among this information, we can find the game process `pid`, which uses it in the private `game_data` function to retrieve its internal state and return only the data we want to show to the players in the lobby.


We also need to add it to the application's supervision tree, so it crates a new **Battleship.Game.Supervisor**
process once the application starts:

```elixir
# lib/battleship.ex

defmodule Battleship do
  use Application

  # ...

  def start(_type, _args) do
    import Supervisor.Spec, warn: false

    # ...

    children = [
      # ...
      supervisor(Battleship.Game.Supervisor, []),
    ]
  end

  # ...
end
```

Let's leave it here. In the next part of the series, we are going to talk about the **GameChannel**
and the **Game** module, and how their processes are dependent on each other thanks
to Elixir's processes monitoring. Meanwhile, feel free to take a look
to the final (but still in progress, though) source code or challenge a
friend to a [battleship game][16b56e99].

<div class="btn-wrapper">
  <a href="https://phoenix-battleship.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/phoenix-battleship" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>

Happy coding!


  [f4057548]: http://elixir-lang.org/docs/stable/elixir/Supervisor.html#which_children/1 "Supervisor"
  [7845ba97]: https://github.com/h4cc "h4cc"
  [e17637dd]: https://github.com/bigardone/phoenix-battleship/pull/7/files "Added Battleship.Pirate.generate_id"
  [16b56e99]: https://phoenix-battleship.herokuapp.com/ "Phoenix Battleship"
