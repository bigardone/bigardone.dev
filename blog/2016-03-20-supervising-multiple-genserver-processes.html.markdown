---
title: Supervising multiple GenServer processes
date: 2016-03-20 01:55 PDT
tags: elixir, otp, genserver, supervisor
excerpt:
  Small refactoring I did on the Trello clone project for keeping track
  of connected board members using multiple supervised processes.
---
<div class="index">
  <p>Special thanks to Daniel Grieve (<a href="https://twitter.com/cazzrin" target="_blank">@cazzrin</a>)
  for helping me understand supervised processes and for sharing his <a href="https://github.com/cazrin/stranger" target="_blank">Stranger</a> project which has been
  an awesome source of inspiration for this refactoring.</p>
</div>

In [part 10][6bf70ca6] of the **Trello tribute/clone series** we talked about creating a [GenServer][f8b721be] processes to keep track of the current connected board members.
The state of this process, `PhoenixTrello.BoardChannel.Monitor`, consists of a map
which stores a list of user ids indexed by the board is:

```elixir
%{
  "1" => [1, 2, 3],
  "2" => [4, 5]
}
```

This was a good starting point for our goal, but while working on the project I realized
that there was an important drawback. If, for any reason, the process dies or it's
restarted by the application's supervision tree, it will lose the current state and the
application will not be able to display which board members are connected or not.

In our particular case it's not really crucial because it doesn't break any functionality
of the application. But imagine for a moment that it's storing important
information for multiple different entities... if the process happens to restart
due to an error regarding just one entity, the other are also going to be affected.
How can we solve this?

## The solution
Instead of having just one process with the state for all boards with connected members,
lets create multiple process, one for each board with their connected users, and also a
**supervisor** process that will be in charge of starting this process and restarting
the one that breaks so the others won't lose their current state.

### The Supervisor
If we take a look the official [Elixir documentation][e764d701] we can read the following:

> A supervisor is a process which supervises other processes, called child processes.
>
> ...
>
> A supervisor implemented using this module will have a standard set of interface
> functions and include functionality for tracing and error reporting.
> It will also fit into a supervision tree.

So lets start by creating the new **module-based** `Supervisor`:

```elixir

# lib/phoenix_trello/board_channel/supervisor.ex

defmodule PhoenixTrello.BoardChannel.Supervisor do
  use Supervisor

  def start_link do
    Supervisor.start_link(__MODULE__, :ok, name: __MODULE__)
  end

  def init(:ok) do
    children = [
      worker(PhoenixTrello.BoardChannel.Monitor, [], restart: :transient)
    ]

    supervise(children, strategy: :simple_one_for_one)
  end
end
```

This module will supervise `PhoenixTrello.BoardChannel.Monitor` processes. The
`restart: transient` option determines that the children processes will be restarted
just if they terminate **abnormally**, which is perfect for our case. We are also
using the `strategy: :simple_one_for_one` which will make the supervisor
restart only the child process that breaks.

### The BoardChannel Monitor
Now that we have the new `Supervisor` lets refactor the existing `PhoenixTrello.BoardChannel.Monitor`
so:

1. There can exist multiple processes of it.
2. We can use a dynamic name to identify them.
3. Every new process is started by the `Supervisor`.

```elixir
defmodule PhoenixTrello.BoardChannel.Monitor do
  # lib/phoenix_trello/board_channel/monitor.ex

  use GenServer

  def create(board_id) do
    case GenServer.whereis(ref(board_id)) do
      nil ->
        Supervisor.start_child(PhoenixTrello.BoardChannel.Supervisor, [board_id])
      _board ->
        {:error, :board_already_exists}
    end
  end

  def start_link(board_id) do
    GenServer.start_link(__MODULE__, [], name: ref(board_id))
  end

  # ...

  defp ref(board_id) do
    {:global, {:board, board_id}}
  end
end
```

To understand this better, lets start from the bottom. The private `ref` function
will receive a `board_id` and will return a tuple that will be used to identify the
process **globally** so we can access it eventually to modify and retrieve its list
of user ids. The `start_link` function now receives the `board_id` and uses
the `ref` function to start with a **dynamic** name. In the `create` function is where
the `Supervisor` comes into play. It receives the `board_id` and checks if there is
a process running with the name resulting of the `ref` function. When no process
is found it will use `Supervisor.start_child` function specifying the **supervisor** we want to
use, in our case our new `BoardChannel.Supervisor`, and it will pass the
`board_id` to it making the **supervisor** call the previously commented `start_link` function.
In case there is already a process with the same name it returns an error tuple so we can
handle it wherever we want.

The next step is to update the existing functions so they are called in the correct
process identified by the `board_id` param:


```elixir
defmodule PhoenixTrello.BoardChannel.Monitor do
  # lib/phoenix_trello/board_channel/monitor.ex

  # ...

  def user_joined(board_id, user) do
   try_call board_id, {:user_joined, user}
  end

  def users_in_board(board_id) do
   try_call board_id, {:users_in_board}
  end

  def user_left(board_id, user) do
    try_call board_id, {:user_left, user}
  end

  #####
  # GenServer implementation

  def handle_call({:user_joined, user}, _from, users) do
    users = [user | users]
      |> Enum.uniq

    {:reply, users, users}
  end

  def handle_call({:users_in_board}, _from, users) do
    { :reply, users, users }
  end

  def handle_call({:user_left, user}, _from, users) do
    users = List.delete(users, user)
    {:reply, users, users}
  end

  defp ref(board_id) do
    {:global, {:board, board_id}}
  end

  defp try_call(board_id, message) do
    case GenServer.whereis(ref(board_id)) do
      nil ->
        {:error, :invalid_board}
      board ->
        GenServer.call(board, message)
    end
  end

  # ...
end
```

The implementation is almost the same but instead of using the `__MODULE__` to tell
which process we want to use to handle the calls, we are going to use the private
function `try_call` that will first look for the process identified using the `board_id`
and make the call on it. Also note that the state is now a list instead of a map.

### Updating the application

We also need to change the application supervision tree by removing the `worker`
with the old `Monitor` and adding the new `Supervisor`:

```elixir
# /lib/phoenix_trello.ex

defmodule PhoenixTrello do
  use Application

  def start(_type, _args) do
    import Supervisor.Spec, warn: false

    children = [
      # ...
      supervisor(PhoenixTrello.BoardChannel.Supervisor, []),
      # ...
    ]

    # ...
  end
end
```


And that's it! Now every list of connected users to a single board will be stored
in a independent process and won't be affected by errors firing on other processes
of the same type. Don't forget to check out the changes on the demo and in the
source repository:

<div class="btn-wrapper">
  <a href="https://phoenix-trello.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/phoenix-trello" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>


Happy coding!


  [6bf70ca6]: /blog/2016/02/15/trello-tribute-with-phoenix-and-react-pt-10/ "Tracking connected board members"
  [f8b721be]: http://elixir-lang.org/docs/stable/elixir/GenServer.html "Elixir GenServer documentation"
  [e764d701]: http://elixir-lang.org/docs/stable/elixir/Supervisor.html "Elixir Supervisor documentation"
