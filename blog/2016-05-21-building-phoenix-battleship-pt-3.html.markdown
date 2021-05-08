---
title: Building Phoenix Battleship (pt. 3)
date: 2016-05-21
tags: elixir, phoenix, otp
excerpt:
  Joining a game and creating player boards
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

## The game setup
In the [previous part][0ff361bf] of the series, we described both the **LobbyChannel** and the
**Battleship.Game.Supervisor** modules and their responsibilities within the application.
These responsibilities include creating new **Battleship.Game** processes, supervising them
and making their current state available for any visitor. After having this clear, now we
can move on to the following elements of the diagram:


<img class="center" src="/images/blog/building_phoenix_battleship/diagram-3.jpg"/>

Recalling the last post, the player joins the **LobbyChannel** when visiting the game's
lobby page. When he clicks the *Start new battle* button, a new message is pushed
through the socket to the channel and a new **Battleship.Game** supervised process is created
by the **Battleship.Game.Supervisor**, returning the game's id. Finally, the player
gets redirected to the battle screen, where the setup phase starts.

<img class="center" src="/images/blog/building_phoenix_battleship/game-setup.jpg"/>


### Joining a game
To add this new channel to the project, we need to update the `player_socket.exs`
file again in to add the channel's module and its topic:

```elixir
# web/channels/player_socket.ex

defmodule Battleship.PlayerSocket do
  @moduledoc """
  Player socket
  """
  use Phoenix.Socket

  alias Battleship.Player

  ## Channels
  channel "lobby", Battleship.LobbyChannel
  channel "game:*", Battleship.GameChannel

  # ...
  # ...
end
```

Now we have the `Battleship.GameChannel` listening to topics following the `game:*` pattern.
Let's add the module and write the `join` function:

```elixir
# web/channels/game_channel.ex

defmodule Battleship.GameChannel do
  use Phoenix.Channel
  alias Battleship.Game

  def join("game:" <> game_id, _message, socket) do
    player_id = socket.assigns.player_id

    case Game.join(game_id, player_id, socket.channel_pid) do
      {:ok, _pid} ->
        {:ok, assign(socket, :game_id, game_id)}
      {:error, reason} ->
        {:error, %{reason: reason}}
    end
  end

  # ...
end
```

When the player tries to join the channel, we use the `game_id` from the topic, his `player_id` and
the channel's `pid` to try joining the previously created game. If joining the game returns
a tuple containing `{:ok, _pid}` the join is successful, and the `game_id` gets assigned to
the socket. Otherwise, an error is returned through the socket to the player's browser.
Let's take a look to the `Battleship.Game` module and its core functionality:

```ruby
# lib/battleship/game.ex

defmodule Battleship.Game do
  use GenServer

  defstruct [
    id: nil,
    attacker: nil,
    defender: nil,
    turns: [],
    over: false,
    winner: nil
  ]

  # CLIENT

  def start_link(id) do
    GenServer.start_link(__MODULE__, id, name: ref(id))
  end

  # ...

  # SERVER

  def init(id) do
    {:ok, %__MODULE__{id: id}}
  end

  # ...

  defp ref(id), do: {:global, {:game, id}}

  defp try_call(id, message) do
    case GenServer.whereis(ref(id)) do
      nil ->
        {:error, "Game does not exist"}
      pid ->
        GenServer.call(pid, message)
    end
  end
end
```

When the `Battleship.Game.Supervisor` creates a new `Battleship.Game` process, the `init`
function is called after `start_link`, setting the defined `struct` as the initial state
of the process. This state contains the **id** of the game (previously generated from the `LobbyChannel`),
the **attacker's id**, the **defender's id**, a list of the shooting **turns** results, a flag to
set whether the game is **over** or not and the **winner's id**. Let's add the `join` function
called in the `GameChannel`:

```elixir
# lib/battleship/game.ex

defmodule Battleship.Game do
  use GenServer
  alias Battleship.Game.Board

  #...

  # CLIENT

  def join(id, player_id, pid), do: try_call(id, {:join, player_id, pid})

  # ...

  # SERVER

  def handle_call({:join, player_id, pid}, _from, game) do
    cond do
      game.attacker != nil and game.defender != nil ->
        {:reply, {:error, "No more players allowed"}, game}
      Enum.member?([game.attacker, game.defender], player_id) ->
        {:reply, {:ok, self}, game}
      true ->
        Process.flag(:trap_exit, true)
        Process.monitor(pid)

        {:ok, board_pid} = create_board(player_id)
        Process.monitor(board_pid)

        game = add_player(game, player_id)

        {:reply, {:ok, self}, game}
    end
  end

  defp create_board(player_id), do: Board.create(player_id)

  defp add_player(%__MODULE__{attacker: nil} = game, player_id), do: %{game | attacker: player_id}
  defp add_player(%__MODULE__{defender: nil} = game, player_id), do: %{game | defender: player_id}
end
```

A lot going on in the join process, so let's go step by step. When the `join` client
function is called from the `Battleship.GameChannel`, this tries to send a `:join` call message to the
game process identified by `{:global, {:game, id}` passing the `player_id` and the channel `pid`.
If the game process exists, it handles the `{:join, player_id, pid}` message which checks the
following conditions:

1. If both the `attacker` and the `defender` id's are set, it replies an error with the reason *"No more players allowed"*. This way we ensure that only two players can join a single game.
2. If the `player_id` equals the `attacker` or the `defender`, it returns the current state, meaning that the player already joined previously.
3. If none of the above, it first sets the process `trap_exit` to true and **monitors** the player's game channel `pid`. By doing this, the game process can capture **exit** and **termination** messages from other processes, in this case, the player's game channel process (we are going to talk about this in the next part). It continues creating a new `Battleship.Game.Board` process for the joined player and monitors it as well. Finally, it adds the `player_id` to its state struct (depending on which player is already set) and returns a `{:ok, self}` tuple.

### Creating a player's board
As we have seen, when a player joins a game successfully, a new game board is built
for this particular player. This is its very basic implementation:

```elixir
# lib/battleship/game/board.ex

defmodule Battleship.Game.Board do
  defstruct [
    player_id: nil,
    ships: [],
    grid: %{},
    ready: false,
    hit_points: 0
  ]
end
```

Its struct consists of the owner's `player_id`, a list of the placed `ships`, the
board `grid` where it is going store the ships positions and the opponent's shooting results,
a flag to mark whether the board is `ready` to begin the battle or not and the remaining
`hit_points`. We need to store two of these structs (one for each player) as part of the
game's state, but where shall we store it? As we already have the game's generic
server process state, it looks like the ideal place to store them, but instead of
doing so we are going to store them in two separate processes using Elixir's [Agent][d7a21b37]
abstraction around state. In other words, we are going to create two simple server
processes to store both boards state, using the `Agent` API to access and update them.
Let's start by defining the `create/1` function called from the board:

```ruby
# lib/battleship/game/board.ex

defmodule Battleship.Game.Board do
  alias Battleship.{Ship}

  @ships_sizes [5, 4, 3, 2, 2, 1, 1]

  defstruct [
    player_id: nil,
    ships: [],
    grid: %{},
    ready: false,
    hit_points: 0
  ]

  def create(player_id) do
    grid = build_grid
    ships = Enum.map(@ships_sizes, &(%Ship{size: &1}))

    Agent.start(fn -> %__MODULE__{player_id: player_id, grid: grid, ships: ships} end, name: ref(player_id))
  end

  def get_data(player_id) do
    Agent.get(ref(player_id), &(&1))
  end

  defp ref(player_id), do: {:global, {:board, player_id}}
end
```

The `create/1` function receives a player id. It builds the grid, creates the ships list and
starts a new `Agent` process setting as its initial state a `Board` struct with the
`player_id`, the generated `grid`, and the `ships` list. As we want to access
to this process's state by its `player_id` like in the `get_data/1` function, for instance,
we also set the name parameter globally with a `{:global, {:board, player_id}}` value.
Have you noticed the similarities with `GenServer` so far? Let's implement the
`build_grid` function:

```elixir
# lib/battleship/game/board.ex

defmodule Battleship.Game.Board do
  # ...
  @size 10
  @orientations [:horizontal, :vertical]
  @grid_value_water "·"
  @grid_value_ship "/"
  @grid_value_water_hit "O"
  @grid_value_ship_hit "*"

  # ...

  defp build_grid do
    0..@size - 1
    |> Enum.reduce([], &build_rows/2)
    |> List.flatten
    |> Enum.reduce(%{}, fn item, acc -> Map.put(acc, item, @grid_value_water) end)
  end

  defp build_rows(y, rows) do
    row = 0..@size - 1
      |> Enum.reduce(rows, fn x, col -> [Enum.join([y, x], "") | col] end)

    [row | rows]
  end
end
```

My first approach was to build a multidimensional list to represent the grid, but
due to Elixir's immutability, *updating* such list was very tricky, so I finally opted
for using a `Map`. Using the `@size` value as the maximum value of rows and columns
for the grid it generates a map that looks like this:

```elixir
%{
  "00" => "·", # A1
  "01" => "·", # B1
  "02" => "·", # C1
  "03" => "·", # D1
  "04" => "·", # E1
  # ..
  "99" => "·"  # J10
}
```

The keys represent a cell of the grid, and the values the content of the grid, which can be:

- `@grid_value_water` is the default value, which means water.
- `@grid_value_ship` represents a portion of a ship.
- `@grid_value_water_hit` represents that the opponent shot this cell hitting water.
- `@grid_value_ship_hit` same as the previous one but hitting one of the board's ships.

One of the direct benefits of using a map like this, instead of a multidimensional list,
is that *updating* it is as simple as doing the following:

```elixir
grid = %{grid | "01" => @grid_value_water_hit}

# or...

grid = Map.put(grid, "01", @grid_value_water_hit)

# or even...

grid = put_in(grid, ["01"], @grid_value_water_hit)
```

Easy as pie and pretty straightforward, isn't it?

### Returning the game state

Now that the player has joined the new game,
his board has been created, and the browser has received the success message,
it has to notify the other player by pushing a `game:joined` message
through the `GameChannel`. Let's implement this handle:

```elixir
# web/channels/game_channel.ex

defmodule Battleship.GameChannel do
  use Phoenix.Channel
  # ...

  def handle_in("game:joined", _message, socket) do
    player_id = socket.assigns.player_id
    board = Board.get_opponents_data(player_id)

    broadcast! socket, "game:player_joined", %{player_id: player_id, board: board}
    {:noreply, socket}
  end

  # ...
end
```

Taking the assigned `player_id` it calls `Board.get_opponents_data(player_id)` to get the
opponents board and broadcast it through the socket. By doing this, it stores
the opponent's board in the **Redux** store, in case the opponent joined before him.
But why is it using `Board.get_opponents_data/1` instead of `Board.get_data/1`?

```ruby
# lib/battleship/game/board.ex

defmodule Battleship.Game.Board do
  # ...

  def get_opponents_data(player_id) do
    board = Agent.get(ref(player_id), &(&1))

    new_grid = board
    |> Map.get(:grid)
    |> Enum.reduce(%{}, fn({coords, value}, acc) -> Map.put(acc, coords, opponent_grid_value(value)) end)

    %{board | ships: nil, grid: new_grid}
  end

  defp opponent_grid_value(@grid_value_ship), do: @grid_value_water
  defp opponent_grid_value(value), do: value

  # ...

end
```

As it sends the opponent's board to both players, we need to create a
*public* version of it. We do not want cheaters to check the JavaScript console and
know where his opponent has placed the ships. What this function basically does is
getting the opponent's board state, update all the cells that have a `grid_value_ship` value
with a `grid_value_water` value and remove the ship list.

Any time a player needs to get the game state it pushes a `game:get_data` to the
`GameChannel` so let's implement it:

```elixir
# lib/battleship/game.ex

defmodule Battleship.Game do
  use GenServer

  # ...

  def handle_call(:get_data, _from, game), do: {:reply, game, game}
  def handle_call({:get_data, player_id}, _from, game) do
    game_data = Map.put(game, :my_board, Board.get_data(player_id))

    opponent_id = get_opponents_id(game, player_id)

    if opponent_id != nil do
      game_data = Map.put(game_data, :opponents_board, Board.get_opponents_data(opponent_id))
    end

    {:reply, game_data, game}
  end

  def get_opponents_id(%__MODULE__{attacker: player_id, defender: nil}, player_id), do: nil
  def get_opponents_id(%__MODULE__{attacker: player_id, defender: defender}, player_id), do: defender
  def get_opponents_id(%__MODULE__{attacker: attacker, defender: player_id}, player_id), do: attacker
  # ...
end
```

The `Game` module handles two different `:get_data` messages. The first one, which
doesn't receive a `player_id`, simply replies with the game state. On the other hand,
the second one which receives the `player_id` and which is the one being called from the
`GameChannel`, it does something a little more complex. First, it creates
a new `game_data` map by adding the `:my_board` key with the player's board to the game
state. Then it gets the opponent's id from the game's state using the passed `player_id`.
If it is not null, or in other words, if the opponent already joined the game, if
*updates* the `game_data` map a adding the `:opponents_board` and as value the result of
calling `Board.get_opponents_data(opponent_id)`. Finally it replies the `game_data` map.


That is all for now. In the next part, we are going to code the functionality related to
placing ships, sending chat messages and handling possile errors thanks to **OTP**.
Meanwhile, feel free to checkout the final (but still in progress, though)
source code or challenge a friend to a [battleship game][16b56e99].

<div class="btn-wrapper">
  <a href="https://phoenix-battleship.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/phoenix-battleship" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>

Happy coding!


[0ff361bf]: /blog/2016/05/03/building-phoenix-battleship-pt-2/ "Building Phoenix Battleship (pt. 2)"
[d7a21b37]: http://elixir-lang.org/docs/stable/elixir/Agent.html "Agent"
[16b56e99]: https://phoenix-battleship.herokuapp.com/ "Phoenix Battleship"
