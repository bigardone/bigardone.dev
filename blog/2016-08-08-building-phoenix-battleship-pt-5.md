---
title: Building Phoenix Battleship (pt. 5)
date: 2016-08-08
tags: elixir, phoenix, otp
excerpt:
  Let the battle begin!
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

## Let the battle begin!
After finishing [last part](/blog/2016/07/28/building-phoenix-battleship-pt-4/) of these series, we have both players
placing their corresponding ships and ready to start the battle. On every turn, one of the players clicks on a
cell of the opponent's board grid, trying his best to hit one of the rival ships, until one of the players gets all of his ships
destroyed, losing the game. Whereas this might look like a simple process, actually it is more complex, so let's do this!

<img class="center" src="/images/blog/building_phoenix_battleship/diagram-4.jpg"/>

### Open fire!
We are going to start imagining that everything goes ok, and both players fight until one of them loses all of his ships.
Every turn, when the player clicks on an opponent's cell, it sends a `game:shoot` message, along with the clicked coordinates,
 to the `GameChannel` through the socket. Let's implement its handler function:

```ruby
# web/channels/game_channel.ex

defmodule Battleship.GameChannel do
  use Phoenix.Channel
  ...

  def handle_in("game:shoot", %{"x" => x, "y" => y}, socket) do
    player_id = socket.assigns.player_id
    game_id = socket.assigns.game_id

    case Game.player_shot(game_id, player_id, x: x, y: y) do
      {:ok, %Game{over: true} = game} ->
        broadcast(socket, "game:over", %{game: game})
        {:noreply, socket}
      {:ok, game} ->
        opponent_id = Game.get_opponents_id(game, player_id)
        broadcast(socket, "game:player:#{opponent_id}:set_game", %{game: Game.get_data(game_id, opponent_id)})
        {:reply, {:ok, %{game: Game.get_data(game_id, player_id)}}, socket}
      _ ->
        {:error, {:error, %{reason: "Something went wrong while shooting"}}, socket}
    end
  end

  ...

end
```

We get both the `player_id` and the `game_id` from the socket `assigns` and use them along with the received coordinates
to call the `Game.player_shot/3` function to perform the shot. Depending on the result, it does one of the
following:

- If everything goes `:ok` and the game is over, it broadcasts the `game:over` message through the socket, along with the updated game's state.
- On the other hand, if the game is still not over, it gets the opponent's id and broadcasts him the updated game state, reflecting the shot result. It returns the game to the attacker as well.
- If by any chance, there is an error, it notifies it to the player.

Having this explained, we can now move on to the `Game.player_shot` implementation:

```ruby
# lib/battleship/game.ex

defmodule Battleship.Game do
  use GenServer

  ...

  def player_shot(id, player_id, x: x, y: y), do: try_call(id, {:player_shot, player_id, x: x, y: y})

  ...

  def handle_call({:player_shot, player_id, x: x, y: y}, _from, game) do
    opponent_id = get_opponents_id(game, player_id)

    {:ok, result} = Board.take_shot(opponent_id, x: x, y: y)

    game = game
    |> udpate_turns(player_id, x: x, y: y, result: result)
    |> check_for_winner

    Battleship.Game.Event.player_shot

    {:reply, {:ok, game}, game}
  end

  ...

  defp udpate_turns(game, player_id, x: x, y: y, result: result) do
    %{game | turns: [%{player_id: player_id, x: x, y: y, result: result} | game.turns]}
  end

  defp check_for_winner(game) do
    attacker_board = Board.get_data(game.attacker)
    defender_board = Board.get_data(game.defender)

    cond do
      attacker_board.hit_points == 0 ->
        %{game | winner: game.defender, over: true}
      defender_board.hit_points == 0 ->
        %{game | winner: game.attacker, over: true}
      true ->
        game
    end
  end

  ...

end
```

It gets the `opponent_id` and  calls the `Board.take_shot/2` function which we are going to implement
in a moment. With the result, it updates the game's turns and checks if there is a winner.
The private `check_for_winner/1` function gets both players and checks if any of them
has 0 hit points, wich means that the other player is the winner, and the game is over, updating the game
and returning it. `Battleship.Game.Event.player_shot` triggers an event, so the list of
current games in the lobby gets updated, but we are going to talk about it later, so let's define the
`Board.take_shot/2` function:

```ruby
# lib/battleship/game/board.ex

defmodule Battleship.Game.Board do
  @grid_value_ship "/"
  @grid_value_water_hit "O"
  @grid_value_ship_hit "*"

  ...

  def take_shot(player_id, x: x, y: y) do
    result = player_id
      |> get_data
      |> Map.get(:grid)
      |> Map.get(Enum.join([y, x], ""))
      |> shot_result

    result
    |> add_result_to_board(player_id, coords)
    |> update_hit_points

    {:ok, result}
  end

  def get_data(player_id), do: Agent.get(ref(player_id), &(&1))

  defp shot_result(@grid_value_ship), do: @grid_value_ship_hit
  defp shot_result(@grid_value_ship_hit), do: @grid_value_ship_hit
  defp shot_result(_current_value), do: @grid_value_water_hit

  defp add_result_to_board(result, player_id, coords) do
    Agent.update(ref(player_id), &(put_in(&1.grid[coords], result)))

    get_data(player_id)
  end

  defp update_hit_points(board) do
    hits = board.grid
    |> Map.values
    |> Enum.count(&(&1 == @grid_value_ship_hit))

    hit_points =  Enum.reduce(board.ships, 0, &(&1.size + &2)) - hits

    Agent.update(ref(board.player_id), fn(_) -> %{board | hit_points: hit_points} end)

    {:ok, get_data(board.player_id)}
  end

  ...

end
```

This is a nice example of how Elixir's **pipe operator** and **pattern matching** can tell the story of what is going on.
So in `take_shot/2` it uses the opponent's `player_id` to get the state of its board's agent process. Then it gets the `:grid`
key which is the map with the all the board cells, and gets the cell corresponding to joining the coordinates. With the
current value of this cell, it calls the `shot_result` private function to calculate the shot result. So for instance, if the cell has
a value of a ship (`@grid_value_ship`), the result is a ship hit (`@grid_value_ship_hit`). Then it calls `add_result_to_board`,
which updates the agent process state, setting the result into the corresponding grid cell. Finally, by calling `update_hit_points`
it calculates and updates the remaining hit points, which is the result of subtracting the total count of `@grid_value_ship_hit` in the
grid map to the sum of the sizes of all the ships on the board.

<img class="center" src="/images/blog/building_phoenix_battleship/battle.jpg"/>

So, from a player's perspective, we are done. Players can create new games, join them, place their ships, start shooting in
turns and win a game. However, from a development perspective, we are not done yet.  What if a player leaves the game before ending?
What if the game process ends accidentally? What if a board process terminates due to an unexpected error? We are going to cover all this
in the next part, meanwhile feel free to take a look to the final (but still in progress, though) source code or challenge a
friend to a [battleship game][16b56e99].


<div class="btn-wrapper">
  <a href="https://phoenix-battleship.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/phoenix-battleship" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>

Happy coding!

  [16b56e99]: https://phoenix-battleship.herokuapp.com/ "Phoenix Battleship"