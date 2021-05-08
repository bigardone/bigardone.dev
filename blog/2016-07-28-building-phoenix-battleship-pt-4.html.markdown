---
title: Building Phoenix Battleship (pt. 4)
date: 2016-07-28 22:12 PDT
tags: elixir, phoenix, otp
excerpt:
  Placing ships on the board's grid
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

## Placing ships on the board's grid

In the [last part](/blog/2016/05/21/building-phoenix-battleship-pt-3) of these series, we covered everything related to the game setup, joining an existing game, creating
players boards and returning the game state to the players. Now it is time to start with the fun part, and let the players
place their corresponding so they can begin the battle.

<img class="center" src="/images/blog/building_phoenix_battleship/diagram-3.jpg"/>

### The BoardChannel
When a player joins an existing game, and his board `Agent` process is created and ready, the player can start placing his ships.
Any ship can be selected by clicking on it in the ship selector. Clicking it twice will change its orientation
from horizontal to vertical. Once selected, the player has to click on a cell from his game board to place it.
Once a cell is clicked (selecting it as the starting position of the ship), a new message is sent to the `GameChannel` to place
it in the player's `Board` process.

```elixir
# web/channels/game_channel.ex

defmodule Battleship.GameChannel do
  use Phoenix.Channel
  ...

  def handle_in("game:place_ship", %{"ship" => ship}, socket) do
    player_id = socket.assigns.player_id
    game_id = socket.assigns.game_id

    ship = %Ship{
      x: ship["x"],
      y: ship["y"],
      size: ship["size"],
      orientation: String.to_atom(ship["orientation"])
    }

    case Board.add_ship(player_id, ship) do
      {:ok, _} ->
        game = Game.get_data(game_id, player_id)
        board = Board.get_opponents_data(player_id)

        broadcast(socket, "game:player:#{Game.get_opponents_id(game, player_id)}:opponents_board_changed", %{board: board})

        {:reply, {:ok, %{game: game}}, socket}
      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  ...
end
```

Along with the `game:place_ship` message, the client is sending the ship's data, which consists of its starting cell coordinates (represented
by `x` and `y`), its `size` and `orientation`. Using this data, we create a new `Ship` struct and call the `Board.add_ship(player_id, ship)` function, which
will place the ship on the corresponding board. If the ship is placed correctly, we get the new game state for the current player, so it is
returned to the client. We also need to tell the opponent that the player has placed a new ship, so we get the *public* board data
(hiding the ships placements), and broadcast it to the opponents client. On the other hand, it there is an error in the ship placement, we notify it to the player.

### The Ship module

Before continuing with the `Board.add_ship/2` implementation, let's define the `Ship` struct:

```ruby
# web/models/ship.ex

defmodule Battleship.Ship do
  defstruct [
    x: 0,
    y: 0,
    size: 0,
    orientation: :vertical,
    coordinates: %{}
  ]

  def coordinates(%{x: x, y: y, size: size, orientation: :vertical}) do
    Enum.map(y..(y + (size - 1)), &coordinate_key(&1, x))
  end
  def coordinates(%{x: x, y: y, size: size, orientation: :horizontal}) do
    Enum.map((x..x + (size - 1)), &coordinate_key(y, &1))
  end

  defp coordinate_key(y, x), do: Enum.join([y, x], "")
end
```

It consists of the previously commented `x`, `y`, `size` and `orientation` keys, and a `coordinates` map, which stores any hit
on any of its coordinates. The `coordinates/1` function returns a list of coordinates representing the ship, depending on its
orientation and size.

### The Board module

Now that the `Ship` module is defined, we can continue implementing the missing `Board` functionality:

```ruby
# lib/battleship/game/board.ex

defmodule Battleship.Game.Board do
  ...

  @ships_sizes [5, 4, 3, 2, 2, 1, 1]
  @size 10
  @orientations [:horizontal, :vertical]

  ...

  def add_ship(_player_id, %Ship{size: size}) when not size in @ships_sizes, do: {:error, "Invalid size"}
  def add_ship(_player_id, %Ship{x: x}) when x > (@size - 1) or x < 0, do: {:error, "Invalid position"}
  def add_ship(_player_id, %Ship{y: y}) when y > (@size - 1) or y < 0, do: {:error, "Invalid position"}
  def add_ship(_player_id, %Ship{orientation: orientation}) when not orientation in @orientations, do: {:error, "Invalid orientation"}
  def add_ship(player_id, ship) do
    board = Agent.get(ref(player_id), &(&1))

    cond do
      board.ready ->
        {:error, "All ships are placed"}
      ship_already_placed?(board, ship) ->
        {:error, "Ship already added"}
      ship_with_invalid_bounds?(ship) || ship_with_invalid_coordinates?(board, ship) ->
        {:error, "Ship has invalid coordinates"}
      true ->
        new_board = board
          |> add_ship_to_grid(ship)
          |> set_hit_points
          |> set_is_ready

        Agent.update(ref(player_id), fn(_) -> new_board end)

        {:ok, new_board}
    end
  end
  ...

  # Checks if a similar ship has been already placed
  defp ship_already_placed?(%__MODULE__{ships: ships}, %Ship{size: size}) do
    permited_amount = Enum.count(@ships_sizes, &(&1 == size))
    Enum.count(ships, &(&1.size == size and ship_placed?(&1))) == permited_amount
  end

  # Checks if the ship is inside the boards boundaries
  defp ship_with_invalid_bounds?(%Ship{orientation: :horizontal} = ship) do
    ship.x + ship.size > @size
  end
  defp ship_with_invalid_bounds?(%Ship{orientation: :vertical} = ship) do
    ship.y + ship.size > @size
  end

  # Checks is the ship is overlaps an exisiting one
  defp ship_with_invalid_coordinates?(board, ship) do
    ship
    |> Ship.coordinates
    |> Enum.map(&(board.grid[&1] == @grid_value_ship))
    |> Enum.any?(&(&1 == true))
  end

  ...

end
```

<img class="center" src="/images/blog/building_phoenix_battleship/ship-error.jpg"/>

Thanks to Elixir's **pattern matching** and **guard clauses**, we can add some basic and straightforward validation.
Therefore, the first four `add_ship` function clauses validate size, position and orientation against the
predefined configuration of the module, returning any possible `{:error, reason}`. In case these first validations succeed,
we need to make more complex ones, so in the last clause we retrieve the board's state from the `Agent` process and check
the following:

- If the board is ready, we return an error notifying that all ships have been already placed.
- If the player is trying to place a ship twice, we also need to return an error.
- Same if the ship is placed out of bounds or overlapping a previously added ship.

If none of these happen, then we can add the ship to the grid, set the current hit points and check if the board is ready to start the battle:

```ruby
# lib/battleship/game/board.ex

defmodule Battleship.Game.Board do
  ...

  def add_ship(player_id, ship) do
    board = Agent.get(ref(player_id), &(&1))

    cond do
      ...

      true ->
        new_board = board
          |> add_ship_to_grid(ship)
          |> set_hit_points
          |> set_is_ready

        Agent.update(ref(player_id), fn(_) -> new_board end)

        {:ok, new_board}
    end
  end

  ...

  defp set_hit_points(board), do: %{board | hit_points: Enum.reduce(board.ships, 0, &(&1.size + &2))}

  defp set_is_ready(board), do: %{board | ready: Enum.all?(board.ships, &ship_placed?(&1))}

  defp ship_placed?(ship), do: length(Map.keys(ship.coordinates)) != 0
end
```

Note that board's total hit points are the sum of all its placed ships sizes, and it is ready when all ships have been placed.
Finally, we have to update the board's process state with the new modifications by using the `Agent.update/1` function,
and also return it in a tuple along with the `:ok` atom.

Enough for now :) In the next part we are going to cover the functionality related to shooting, handling possible errors and what to do
when one of the players leaves the game in the middle of the battle. Meanwhile, feel free to take a look
to the final (but still in progress, though) source code or challenge a
friend to a [battleship game][16b56e99].


<div class="btn-wrapper">
  <a href="https://phoenix-battleship.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/phoenix-battleship" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>

Happy coding!

  [16b56e99]: https://phoenix-battleship.herokuapp.com/ "Phoenix Battleship"
