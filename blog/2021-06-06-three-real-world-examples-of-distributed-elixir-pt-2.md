---
title: "Three real-world examples of distributed Elixir (pt. 2)"
excerpt: "The tale of the periodic singleton process and the three different global registries."
date: "2021-06-06"
tags: elixir
image: "https://bigardone.dev/images/blog/2021-06-06-three-real-world-examples-of-distributed-elixir-pt-2/post-meta.png"
---

<div class="index">
  <p>This post belongs to the <strong>Three real-world examples of distributed Elixir</strong> series.</p>
  <ol>
    <li><a href="/blog/2021/05/22/three-real-world-examples-of-distributed-elixir-pt-1">A gentle introduction to distributed Elixir.</a></li>
    <li><a href="/blog/2021/06/06/three-real-world-examples-of-distributed-elixir-pt-2">The tale of the periodic singleton process and the three different global registries.</a></li>
    <li><a href="/blog/2021/06/18/three-real-world-examples-of-distributed-elixir-pt-3">The distributed download requester and progress tracker.</a></li>
    <li><a href="/blog/2021/06/27/three-real-world-examples-of-distributed-elixir-pt-4">The distributed application version monitor.</a></li>
  </ol>
  <a href="https://github.com/bigardone/distributed-elixir-examples" target="_blank"><i class="fa fa-github"></i> Source code</a>
</div>

In the [last part] of the series, we saw how to manually build a cluster of nodes in an Elixir application, ending up automating the process using libcluster. In this part, we will implement the first of our three real-world examples: a singleton process across the cluster that executes a periodic task and restarts in any node when it dies or starts in a new node when the current node where it is running goes down.  Let's get cracking!

## A tale of a periodic singleton process and three different global registries
The tricky part of making a process unique across the cluster is registering it using a unique name in a global registry. There are some global registries out there, being `:global`, `swarm`, and `horde`, probably the most popular ones. All of them have their caveats and issues, so before implementing a solution like this, you should first consider if you can deal with them, especially if you plan to store any data in the global process, in which case it is not probably the best solution. Nevertheless, our global process will only be in charge of executing a periodic task, like deleting outdated data from a database, so we should be ok if something goes wrong since it will not affect our main business logic. This said, let's start building our solution around `:global` and then iterate using `swarm` and `horde` alternatives.

## The database cleaner process using the `:global` registry

<div class="btn-wrapper">
  <a href="https://github.com/bigardone/distributed-elixir-examples/tree/master/03_global_background_job" target="_blank" class="btn">
    <i class="fa fa-github"></i> Source code of this example
  </a>
</div>

The first registry that we will use is [:global], a global name registry provided by Erlang out of the box. It stores names in a table locally on every node, syncing them on any table or cluster topology change. Let's start by generating a new application:

```text
mix new global_background_job --sup
```

Let's add the only dependency that we need, which is `libcluster`:

```elixir
# ./mix.exs

defmodule GlobalBackgroundJob.MixProject do
  use Mix.Project

  # ...

  defp deps do
    [
      {:libcluster, "~> 3.3"}
    ]
  end
end
```

After running the corresponding `mix deps.get`, let's configure our cluster:

```elixir
# ./lib/background_job/application.ex

defmodule GlobalBackgroundJob.Application do
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      {Cluster.Supervisor, [topologies(), [name: GlobalBackgroundJob.ClusterSupervisor]]}
    ]

    # ...
  end

  defp topologies do
    [
      background_job: [
        strategy: Cluster.Strategy.Gossip
      ]
    ]
  end
```

We will use the `Cluster.Strategy.Gossip` strategy, which auto-discovers new nodes, letting us add any number of nodes that want to the cluster without defining them statically. With the cluster configured, we can implement the server which runs the periodic task to delete outdated data from the database:

```elixir
# ./lib/background_job/database_cleaner.ex

defmodule GlobalBackgroundJob.DatabaseCleaner do
  use GenServer
  require Logger

  alias __MODULE__.Runner

  @impl GenServer
  def init(args \\ []) do
    timeout = Keyword.get(args, :timeout)

    schedule(timeout)

    {:ok, timeout}
  end

  @impl GenServer
  def handle_info(:execute, timeout) do
    Task.start(Runner, :execute, [])

    schedule(timeout)

    {:noreply, timeout}
  end

  defp schedule(timeout) do
    Process.send_after(self(), :execute, timeout)
  end
end

```

As you can see, this is pretty much a straightforward generic server, which takes a `timeout` value from its `init` configuration,  calling `schedule` with it and setting it as the server state. The `schedule` function takes the timeout value and calls `Process.send_after(self(), :execute, timeout)` with it. Finally, the `def handle_info(:execute, timeout)` callback takes the `timeout` value from the state and spawns a new task that we will define in a moment and calls `schedule(timeout)` again, building up the periodic loop. Let's implement the fake runner module:

```elixir
# ./lib/background_job/database_cleaner/runner.ex

defmodule GlobalBackgroundJob.DatabaseCleaner.Runner do
  require Logger

  def execute do
    random = :rand.uniform(1_000)

    Process.sleep(random)

    Logger.info("#{__MODULE__} #{random} records deleted")
  end
end
```

This module fakes deleting the data logging a message with the eliminated count. Why using a task to execute this action? I like implementing these kinds of workers as simply as possible, adding only the necessary functionality to handle messages, putting any other business logic in its corresponding module, separating concerns and responsibilities. The worker module only is in charge of spawning the task and scheduling the next run, and it does not care about the task result. Let's jump into the terminal and run or new periodic server:

```text
➜ iex -S mix
Erlang/OTP 24 [erts-12.0.1] [source] [64-bit] [smp:12:12] [ds:12:12:10] [async-threads:1] [jit]

Interactive Elixir (1.12.0) - press Ctrl+C to exit (type h() ENTER for help)
iex(1)> GenServer.start_link(GlobalBackgroundJob.DatabaseCleaner, [timeout: 1000])

[info]  ---- [nonode@nohost] Elixir.GlobalBackgroundJob.DatabaseCleaner starting
[info]  ---- [nonode@nohost] Elixir.GlobalBackgroundJob.DatabaseCleaner scheduling for 1000ms
[info]  ---- [nonode@nohost] Elixir.GlobalBackgroundJob.DatabaseCleaner deleting outdated records...
[info]  ---- [nonode@nohost] Elixir.GlobalBackgroundJob.DatabaseCleaner scheduling for 1000ms
[info]  Elixir.GlobalBackgroundJob.DatabaseCleaner.Runner 948 records deleted
[info]  ---- [nonode@nohost] Elixir.GlobalBackgroundJob.DatabaseCleaner deleting outdated records...
.......
```

So far, so good. However, if we add the database cleaner server to the application's main supervision tree and start several nodes,  the database cleaner process will run on each of them, and we don't want that. So how can we register it globally and only allow a single instance of the process across the cluster? Let's add the final piece of the puzzle, which consists of a new GenServer which spawns the database cleaner process registering it globally using `:global`, and monitors it, restarting the process again if for whatever reason it goes down:

```elixir
defmodule GlobalBackgroundJob.DatabaseCleaner.Starter do
  use GenServer

  alias GlobalBackgroundJob.DatabaseCleaner

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl GenServer
  def init(opts) do
    pid = start_and_monitor(opts)

    {:ok, {pid, opts}}
  end

  @impl GenServer
  def handle_info({:DOWN, _, :process, pid, _reason}, {pid, opts} = state) do
    {:noreply, {start_and_monitor(opts), opts}}
  end

  defp start_and_monitor(opts) do
    pid =
      case GenServer.start_link(DatabaseCleaner, opts, name: {:global, DatabaseCleaner}) do
        {:ok, pid} ->
          pid

        {:error, {:already_started, pid}} ->
          pid
      end

    Process.monitor(pid)

    pid
  end
end
```

Its `start_link/1` function expects the configuration options for the database cleaner process. While starting the singleton process, its `init/1` function builds its internal state and calls `start_and_monitor/1`, which takes the `opts` to start the database cleaner process, using `{:global, name}` to register it. Whether spawning the database cleaner process succeeds or fails (because it has already started in a different node), it takes its `pid`, assigns it to its internal state, and monitors it. Finally, it implements the `handle_info({:DOWN, ...` callback, which will receive the corresponding message if the monitored process dies, calling again `start_and_monitor/1` to restart it and begin the monitor loop. Let's update our application module, so it starts a singleton process on the service start:

```elixir
# ./lib/background_job/application.ex

defmodule GlobalBackgroundJob.Application do
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      {Cluster.Supervisor, [topologies(), [name: GlobalBackgroundJob.ClusterSupervisor]]},
      {GlobalBackgroundJob.DatabaseCleaner.Starter, [timeout: :timer.seconds(2)]}
    ]

    # ...
  end

  # ...
```

If we jump to the terminal and start two different nodes, we should see the following:

```text
# NODE 1
➜ iex --sname n1 -S mix
Erlang/OTP 24 [erts-12.0.1] [source] [64-bit] [smp:12:12] [ds:12:12:10] [async-threads:1] [jit]

[info]  ----[n1@mbp] Elixir.GlobalBackgroundJob.Singleton starting
[info]  ----[n1@mbp] Elixir.GlobalBackgroundJob.Singleton restarting...
[info]  ----[n1@mbp] Elixir.GlobalBackgroundJob.DatabaseCleaner scheduling for 5000ms...
[info]  ----[n1@mbp] Elixir.GlobalBackgroundJob.Singleton monitoring...
[info]  ----[n1@mbp] Elixir.GlobalBackgroundJob.DatabaseCleaner deleting outdated records...
[info]  ----[n1@mbp] Elixir.GlobalBackgroundJob.DatabaseCleaner scheduling for 5000ms...
[info]  Elixir.GlobalBackgroundJob.DatabaseCleaner.Runner 979 records deleted
[info]  ----[n1@mbp] Elixir.GlobalBackgroundJob.DatabaseCleaner deleting outdated records...
[info]  ----[n1@mbp] Elixir.GlobalBackgroundJob.DatabaseCleaner scheduling for 5000ms...
```


```text
# NODE 2
➜ iex --sname n2 -S mix
Erlang/OTP 24 [erts-12.0.1] [source] [64-bit] [smp:12:12] [ds:12:12:10] [async-threads:1] [jit]

[info]  ----[n2@mbp] Elixir.GlobalBackgroundJob.Singleton starting
[info]  ----[n2@mbp] Elixir.GlobalBackgroundJob.Singleton restarting...
[info]  ----[n2@mbp] Elixir.GlobalBackgroundJob.DatabaseCleaner scheduling for 5000ms...
[info]  ----[n2@mbp] Elixir.GlobalBackgroundJob.Singleton monitoring...
[info]  ----[n2@mbp] Elixir.GlobalBackgroundJob.Singleton starting
[info]  ----[n2@mbp] Elixir.GlobalBackgroundJob.Singleton restarting...
[info]  ----[n2@mbp] Elixir.GlobalBackgroundJob.Singleton ...already started!
[info]  ----[n2@mbp] Elixir.GlobalBackgroundJob.Singleton monitoring...

```

`n1` succeeds in starting the `DatabaseCleaner` process, whereas `n2` detects that it has already begun and monitors it. If we stop `n1`, we can see the following in `n2`:

```text
[info]  ----[n2@mbp] Elixir.GlobalBackgroundJob.Singleton process down, restarting...
[info]  ----[n2@mbp] Elixir.GlobalBackgroundJob.DatabaseCleaner scheduling for 5000ms...
[info]  ----[n2@mbp] Elixir.GlobalBackgroundJob.Singleton monitoring...
[info]  ----[n2@mbp] Elixir.GlobalBackgroundJob.DatabaseCleaner deleting outdated records...
....
```

As we planned, `n2` detects that the `DatabaseCleaner` process in `n1` died, restarting and monitoring it again. Let's check the `:global` registry:

```text
iex(n2@mbp)4> :global.registered_names
[GlobalBackgroundJob.DatabaseCleaner]
iex(n2@mbp)5> :global.whereis_name GlobalBackgroundJob.DatabaseCleaner
#PID<19759.204.0>
```

If you play around starting new nodes, stopping them, or killing the `DatabaseCleaner` process, use these functions to check how the process always is registered again with a different `PID`.

## The database cleaner process using `swarm`

<div class="btn-wrapper">
  <a href="https://github.com/bigardone/distributed-elixir-examples/tree/master/04_swarm_background_job" target="_blank" class="btn">
    <i class="fa fa-github"></i> Source code of this example
  </a>
</div>


[Swarm] is a globally distributed registry architected to handle dynamic node membership and creating/removing large volumes of process registrations in short time windows. It also has some cool features like automatic distribution of processes across the cluster and easy process handoff between nodes, including their current state. The former means that when `swarm` moves a process to a different node, it can continue with its current state. However, implementing the singleton DatabaseCleaner process using `swarm` has been tricky, and I haven't figured out an optimal solution that takes advantage of its features. Nevertheless, let's create a new application, implementing the solution and see what issues do we encounter and how to solve them:

```text
mix new swarm_background_job --sup
```

Let's add `swarm` and libcluster to its dependencies and configure libcluster's topologies:

```elixir
# ./mix.exs

defmodule SwarmBackgroundJob.MixProject do
  use Mix.Project

  # ...

  defp deps do
    [
      {:libcluster, "~> 3.3"},
      {:swarm, "~> 3.4"}
    ]
  end
end
```

```elixir
# ./lib/swarm_background_job/application.ex

defmodule SwarmBackgroundJob.Application do
  # ...

  def start(_type, _args) do
    children = [
      {Cluster.Supervisor, [topologies(), [name: SwarmBackgroundJob.ClusterSupervisor]]}
    ]
    # ...
  end

  defp topologies do
    [
      background_job: [
        strategy: Cluster.Strategy.Gossip
      ]
    ]
  end
```

Initially, both the `DatabaseCleaner` and the `Runner` module should be the same as in the `:global` registry solution, except that their namespace should start with `SwarmBackgroundJob`, so let's copy both modules into the new project and edit their current module name. Checking the swarm's documentation, we have to implement a supervisor  which it will use to distribute the processes across the cluster, so let's go ahead and add it:

```elixir
# ./lib/swarm_background_job/database_cleaner/supervisor.ex

defmodule SwarmBackgroundJob.DatabaseCleaner.Supervisor do
  use DynamicSupervisor

  def start_link(state) do
    DynamicSupervisor.start_link(__MODULE__, state, name: __MODULE__)
  end

  def init(_) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  def start_child(opts) do
    child_spec = %{
      id: SwarmBackgroundJob.DatabaseCleaner,
      start: {SwarmBackgroundJob.DatabaseCleaner, :start_link, [opts]},
      restart: :transient
    }

    DynamicSupervisor.start_child(__MODULE__, child_spec)
  end
end
```

We have implemented a simple `DynamicSupervisor` module implementation, with a `start_child/1` function that defines the `child_spec` of the workers it manages, in this case, our `DatabaseCleaner`. Please note that we use the `:transient` restart strategy, which restarts a child process only if it terminates abnormally. This is crucial for not duplicating the workers once `swarm` starts moving them around the cluster. Next, we have to add the new supervisor to the application's children:

```elixir
# ./lib/swarm_background_job/application.ex

defmodule SwarmBackgroundJob.Application do
  # ...

  def start(_type, _args) do
    children = [
      {Cluster.Supervisor, [topologies(), [name: SwarmBackgroundJob.ClusterSupervisor]]},
      SwarmBackgroundJob.DatabaseCleaner.Supervisor
    ]

    # ...
  end
```

Since `DynamicSupervisor` doesn't automatically start any process on its initialization, we have to find a way of spawning the `DatabaseCleaner` process, register it using `swarm`, and supervise it using our supervisor. We could do this in the application module, after the `Supervisor.start_link(children, opts)` call. However, I don't particularly like adding any logic to the main application init function, so what I do is creating a helper module for these  tasks:

```elixir
# ./lib/swarm_background_job/database_cleaner/starter.ex

defmodule SwarmBackgroundJob.DatabaseCleaner.Starter do
  require Logger

  alias SwarmBackgroundJob.DatabaseCleaner
  alias SwarmBackgroundJob.DatabaseCleaner.Supervisor, as: DatabaseCleanerSupervisor

  def child_spec(opts) do
    %{
      id: __MODULE__,
      start: {__MODULE__, :start_link, [opts]},
      type: :worker
    }
  end

  def start_link(opts) do
    Swarm.register_name(DatabaseCleaner, DatabaseCleanerSupervisor, :start_child, [opts])

    :ignore
  end
end
```

Think about the `Starter` module as a fake `GenServer` implementation that any logic in its `start_link/1` function and returns `:ignore`. Now we can add it to the main application children, and when the application starts, it will call the `Swarm.register_name/4` function, passing the name, along with the module, function, and arguments, that `swarm` will use to start the process and register the name:


```elixir
# ./lib/swarm_background_job/application.ex

defmodule SwarmBackgroundJob.Application do
  # ...

  def start(_type, _args) do
    children = [
      {Cluster.Supervisor, [topologies(), [name: SwarmBackgroundJob.ClusterSupervisor]]},
      SwarmBackgroundJob.DatabaseCleaner.Supervisor,
      {SwarmBackgroundJob.DatabaseCleaner.Starter, [[timeout: :timer.seconds(2)]]}
    ]

    # ...
  end
end
```

Last but not least, let's edit the `DatabaseCleaner` module to add the necessary callback functions required by `swarm`:

```elixir
# ./lib/swarm_background_job/database_cleaner.ex

defmodule SwarmBackgroundJob.DatabaseCleaner do
  use GenServer

  # ...


  def handle_call({:swarm, :begin_handoff}, _from, state) do
    {:reply, :restart, state}
  end

  def handle_cast({:swarm, :resolve_conflict, _}, state) do
    {:noreply, state}
  end

  def handle_info({:swarm, :die}, state) do
    {:stop, :shutdown, state}
  end

  # ...
end
```

Since we don't need to manage any state handoff, we are handling the following messages:

 - `{:swarm, :begin_handoff}`:  called when a handoff has initiated due to changes in cluster topology. In our particular case, `:restart` makes the process restart in the new node.
 - `{:swarm, :resolve_conflict, _}`: called when a network split is healed and the local process should continue running, but a duplicated process on the other side of the split hands off its state to the current.
 - `{:swarm, :die}`: sent when this process has moved to a different node. Since we don't want duplicates, we stop it.


Let's jump back to the terminal and start a node:

```text
# NODE 1
➜ iex --sname n1 -S mix
Erlang/OTP 24 [erts-12.0.1] [source] [64-bit] [smp:12:12] [ds:12:12:10] [async-threads:1] [jit]
[info]  [swarm on n1@mbp] [tracker:init] started
[info]  [swarm on n1@mbp] [tracker:cluster_wait] joining cluster..
[info]  [swarm on n1@mbp] [tracker:cluster_wait] no connected nodes, proceeding without sync
[debug] [swarm on n1@mbp] [tracker:handle_call] registering SwarmBackgroundJob.DatabaseCleaner as process started by Elixir.SwarmBackgroundJob.DatabaseCleaner.Supervisor.start_child/1 with args [[[timeout: 2000]]]
[debug] [swarm on n1@mbp] [tracker:do_track] starting SwarmBackgroundJob.DatabaseCleaner on n1@mbp
[info]  ----[n1@mbp] Elixir.SwarmBackgroundJob.DatabaseCleaner scheduling for 2000ms
[debug] [swarm on n1@mbp] [tracker:do_track] started SwarmBackgroundJob.DatabaseCleaner on n1@mbp
[info]  ----[n1@mbp] Elixir.SwarmBackgroundJob.DatabaseCleaner deleting outdated records...
[info]  ----[n1@mbp] Elixir.SwarmBackgroundJob.DatabaseCleaner scheduling for 2000ms
```

The application starts as usual and `swarm` registers the database cleaner process with success, which starts doing its thing. Let's ask `swarm` for the registered processes:

```text
iex(n1@mbp)2> Swarm.registered
[{SwarmBackgroundJob.DatabaseCleaner, #PID<0.244.0>}]
```

There it is. Let's start a new node and see what happens:

```text
# NODE 2
➜ iex --sname n2 -S mix
Erlang/OTP 24 [erts-12.0.1] [source] [64-bit] [smp:12:12] [ds:12:12:10] [async-threads:1] [jit]
[info]  [swarm on n2@mbp] [tracker:init] started
[info]  [swarm on n2@mbp] [tracker:ensure_swarm_started_on_remote_node] nodeup n1@mbp
[info]  [swarm on n2@mbp] [tracker:cluster_wait] joining cluster..
[info]  [swarm on n2@mbp] [tracker:cluster_wait] syncing with n1@mbp
[debug] [swarm on n2@mbp] [tracker:cluster_wait] forking clock: {1, 0}, lclock: {{1, 0}, 0}, rclock: {{0, 1}, 0}
[info]  [swarm on n2@mbp] [tracker:awaiting_sync_ack] received sync acknowledgement from n1@mbp, syncing with remote registry
[debug] [swarm on n2@mbp] [tracker:sync_registry] local tracker is missing SwarmBackgroundJob.DatabaseCleaner, adding to registry
[info]  [swarm on n2@mbp] [tracker:awaiting_sync_ack] local synchronization with n1@mbp complete!
[info]  [swarm on n2@mbp] [tracker:resolve_pending_sync_requests] pending sync requests cleared
[debug] [swarm on n2@mbp] [tracker:handle_call] registering SwarmBackgroundJob.DatabaseCleaner as process started by Elixir.SwarmBackgroundJob.DatabaseCleaner.Supervisor.start_child/1 with args [[[timeout: 2000]]]
[debug] [swarm on n2@mbp] [tracker:do_track] found SwarmBackgroundJob.DatabaseCleaner already registered on n1@mbp
```

It is very similar to `n1` except that `swarm` tries to start the process and eventually realizes it has already spawned in `n1`.  Let's confirm we still have a single process registered:

```text
# NODE 2
iex(n2@mbp)1> Swarm.registered
[{SwarmBackgroundJob.DatabaseCleaner, #PID<19868.244.0>}]
```

The PID is the same corresponding to `n1`, excellent! Let's start the third node:

```text
# NODE 3

➜ iex --sname n3 -S mix
Erlang/OTP 24 [erts-12.0.1] [source] [64-bit] [smp:12:12] [ds:12:12:10] [async-threads:1] [jit]


[info]  [swarm on n3@mbp] [tracker:init] started
[info]  [swarm on n3@mbp] [tracker:ensure_swarm_started_on_remote_node] nodeup n1@mbp
[info]  [swarm on n3@mbp] [tracker:ensure_swarm_started_on_remote_node] nodeup n2@mbp
[info]  [swarm on n3@mbp] [tracker:cluster_wait] joining cluster..
[info]  [swarm on n3@mbp] [tracker:cluster_wait] found connected nodes: [:n2@mbp, :n1@mbp]
[info]  [swarm on n3@mbp] [tracker:cluster_wait] selected sync node: n2@mbp
[info]  [swarm on n3@mbp] [tracker:syncing] received registry from n2@mbp, merging..
[debug] [swarm on n3@mbp] [tracker:sync_registry] local tracker is missing SwarmBackgroundJob.DatabaseCleaner, adding to registry
[info]  [swarm on n3@mbp] [tracker:syncing] local synchronization with n2@mbp complete!
[info]  [swarm on n3@mbp] [tracker:resolve_pending_sync_requests] pending sync requests cleared
[debug] [swarm on n3@mbp] [tracker:handle_call] registering SwarmBackgroundJob.DatabaseCleaner as process started by Elixir.SwarmBackgroundJob.DatabaseCleaner.Supervisor.start_child/1 with args [[[timeout: 2000]]]
[debug] [swarm on n3@mbp] [tracker:do_track] starting SwarmBackgroundJob.DatabaseCleaner on remote node n2@mbp
[debug] [swarm on n3@mbp] [tracker:handle_replica_event] replica event: untrack #PID<19868.244.0>
[debug] [swarm on n3@mbp] [tracker:handle_replica_event] replicating registration for SwarmBackgroundJob.DatabaseCleaner (#PID<19869.241.0>) locally
[debug] [swarm on n3@mbp] [tracker:start_pid_remotely] SwarmBackgroundJob.DatabaseCleaner already registered to #PID<19869.241.0> on n2@mbp, registering locally
```

Swarm detects a new topology change in the cluster and restarts the database cleaner on `n2`, which starts to work again as if nothing happened. Let's check once again the registered processes:

```text
# NODE 3
iex(n3@mbp)3> Swarm.registered
[{SwarmBackgroundJob.DatabaseCleaner, #PID<19869.228.0>}]
```

It now has a different `PID`. If we shut down `n2`, we can see how `swarm` detects a new change and restarts the process in one of the remaining nodes. Everything is working like in the first example using `:global`, let's start all the nodes again and force kill the cleaner process and see what happens:

```text
# NODE 3
iex(n3@mbp)3> Swarm.registered
[{SwarmBackgroundJob.DatabaseCleaner, #PID<19869.234.0>}]
iex(n3@mbp)4> SwarmBackgroundJob.DatabaseCleaner |> Swarm.whereis_name |> GenServer.call(:kaboom)
# ...lots of errors
# ...process restarts in the same node
iex(n3@mbp)4> Swarm.registered
[]
```

The process explodes, and since we are supervising, it gets restarted. However, if we check again for the registered process in `swarm` it returns an empty list. If we start a new node, a new database cleaner process starts, having two different ones running across the cluster. How come? It turns out that `swarm` does not re-register processes that die and restart outside its handoff flow. Therefore, although the process continues thanks to its supervisor, it does not exist anymore for `swarm`, making it possible to have more than one instance at a time. Luckily, Elixir gives us the tools to fix this, so let's get to it. First of all, let's change the dynamic supervisor so that it does not restart any child process at all, no matter how it dies:

```elixir
# ./lib/swarm_background_job/database_cleaner/supervisor.ex

defmodule SwarmBackgroundJob.DatabaseCleaner.Supervisor do
  # ...

  def start_child(opts) do
    child_spec = %{
      # ...
      restart: :temporary
    }

    DynamicSupervisor.start_child(__MODULE__, child_spec)
  end

end
```

Secondly, and taking a similar approach we did in the `GlobalBackgroundJob.DatabaseCleaner.Starter`, let's refactor the `Starter` module like so:

```elixir
# lib/swarm_background_job/database_cleaner/starter.ex

defmodule SwarmBackgroundJob.DatabaseCleaner.Starter do
  # ..

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl GenServer
  def init(opts) do
    {:ok, opts, {:continue, {:start_and_monitor, 1}}}
  end

  @impl GenServer
  def handle_continue({:start_and_monitor, retry}, opts) do
    case Swarm.whereis_or_register_name(
           DatabaseCleaner,
           DatabaseCleanerSupervisor,
           :start_child,
           [opts]
         ) do
      {:ok, pid} ->
        Process.monitor(pid)

        {:noreply, {pid, opts}}

      other ->
        Process.sleep(500)

        {:noreply, opts, {:continue, {:start_and_monitor, retry + 1}}}
    end
  end

  @impl GenServer
  def handle_info({:DOWN, _, :process, pid, _reason}, {pid, opts}) do
    {:noreply, opts, {:continue, {:start_and_monitor, 1}}}
  end
end
```

The `Starter` module is now a real GenServer, which instead of registering the database cleaner process on its `start_link/1` function and returning `:ignore`, it starts like any other generic server. The `init/1` callback function function returns a tuple containing `opts` and `{:continue, {:start_and_monitor, 1}`, which leads us to the `handle_continue({:start_and_monitor, retry}, opts)` callback, in which calls `Swarm.whereis_or_register_name/4` which finds the current `PID` of the process, registering it if it does not exist. If everything goes fine, it monitors the resulting `PID`. Otherwise, it sleeps for 500 milliseconds and returns `{:continue, {:start_and_monitor, retry + 1}`, forcing a new monitoring retry. Finally, it implements the ` handle_info({:DOWN, ...` callback, triggered when the monitored process dies, entering in the register + monitor loop again. Let's try out these changes by starting the three different nodes and killing the process like we previously did:

```text
# NODE 3
iex(n3@mbp)1> Swarm.registered
[{SwarmBackgroundJob.DatabaseCleaner, #PID<19949.240.0>}]
iex(n3@mbp)2> SwarmBackgroundJob.DatabaseCleaner |> Swarm.whereis_name |> GenServer.call(:kaboom)
# ...lots of errors
# ...process restarts in the same node
iex(n3@mbp)2> Swarm.registered
[{SwarmBackgroundJob.DatabaseCleaner, #PID<19949.247.0>}]
```

If you play around with starting new nodes, stopping the current one, and killing the process, you can verify that the process keeps starting with no duplicates.

## The database cleaner process using `horde`

<div class="btn-wrapper">
  <a href="https://github.com/bigardone/distributed-elixir-examples/tree/master/05_horde_background_job" target="_blank" class="btn">
    <i class="fa fa-github"></i> Source code of this example
  </a>
</div>

The last registry that we are going to be looking at is [horde]. Inspired by `swarm`, it addresses some of its deficiencies, like clearly separating the registration and supervision of processes, [among others]. Let's jump straight into the terminal and create a new project, add the necessary dependencies, and configure libcluster:

```text
mix new horde_background_job --sup
```

```elixir
# ./mix.exs

defmodule HordeBackgroundJob.MixProject do
  use Mix.Project

  # ...

  defp deps do
    [
      {:libcluster, "~> 3.3"},
      {:horde, "~> 0.8.3"}
    ]
  end
end
```

```elixir
# ./lib/horde_background_job/application.ex

defmodule HordeBackgroundJob.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      {Cluster.Supervisor, [topologies(), [name: BackgroundJob.ClusterSupervisor]]}
    ]

    # ...
  end

  defp topologies do
    [
      background_job: [
        strategy: Cluster.Strategy.Gossip
      ]
    ]
  end
end
```

Suppose we want `horde` to work in a dynamic cluster like in our case. In that case, we need to add three different modules to our application, which correspond to a supervisor, a registry, and a node listener which sticks everything together. Let's start by implementing the supervisor:

```elixir
# ./lib/horde_background_job/horde_supervisor.ex

defmodule HordeBackgroundJob.HordeSupervisor do
  use Horde.DynamicSupervisor

  def start_link(_) do
    Horde.DynamicSupervisor.start_link(__MODULE__, [strategy: :one_for_one], name: __MODULE__)
  end

  def init(init_arg) do
    [members: members()]
    |> Keyword.merge(init_arg)
    |> Horde.DynamicSupervisor.init()
  end

  def start_child(child_spec) do
    Horde.DynamicSupervisor.start_child(__MODULE__, child_spec)
  end

  defp members() do
    Enum.map([Node.self() | Node.list()], &{__MODULE__, &1})
  end
end
```

Using [Horde.DynamicSupervisor] under the hood, it computes all the members in the cluster while starting. We have also added the `start_child(child_spec)` function, convenient for creating and supervising new processes. Let's go ahead and add the registry module:

```elixir
# ./lib/horde_background_job/horde_registry.ex

defmodule HordeBackgroundJob.HordeRegistry do
  use Horde.Registry

  def start_link(_) do
    Horde.Registry.start_link(__MODULE__, [keys: :unique], name: __MODULE__)
  end

  def init(init_arg) do
    [members: members()]
    |> Keyword.merge(init_arg)
    |> Horde.Registry.init()
  end

  defp members() do
    Enum.map([Node.self() | Node.list()], &{__MODULE__, &1})
  end
end
```

As the supervisor, the registry starts a [Horde.Registry] computing all the available nodes. How do the supervisor and registry consider changes in the cluster topology when get nodes added or removed? Here is where the node observer module comes into play:

```elixir
# ./lib/horde_background_job/node_observer.ex

defmodule HordeBackgroundJob.NodeObserver do
  use GenServer

  alias HordeBackgroundJob.{HordeRegistry, HordeSupervisor}

  def start_link(_), do: GenServer.start_link(__MODULE__, [])

  def init(_) do
    :net_kernel.monitor_nodes(true, node_type: :visible)

    {:ok, nil}
  end

  def handle_info({:nodeup, _node, _node_type}, state) do
    set_members(HordeRegistry)
    set_members(HordeSupervisor)

    {:noreply, state}
  end

  def handle_info({:nodedown, _node, _node_type}, state) do
    set_members(HordeRegistry)
    set_members(HordeSupervisor)

    {:noreply, state}
  end

  defp set_members(name) do
    members = Enum.map([Node.self() | Node.list()], &{name, &1})

    :ok = Horde.Cluster.set_members(name, members)
  end
end
```

The node observer module is a simple GenServer that subscribes to the cluster's changes using `:net_kernel.monitor_nodes/2` just like we did in the first part of the series. On receiving any change, it gets the current available nodes and updates both the supervisor and registry using `Horde.Cluster.set_members(name, members)`.

We have everything we need to run a cluster under horde, so let's add these modules to the main supervision tree:

```elixir
# .lib/horde_background_job/application.ex

defmodule HordeBackgroundJob.Application do
  # ...

  def start(_type, _args) do
    children = [
      {Cluster.Supervisor, [topologies(), [name: BackgroundJob.ClusterSupervisor]]},
      HordeBackgroundJob.HordeRegistry,
      HordeBackgroundJob.HordeSupervisor,
      HordeBackgroundJob.NodeObserver
    ]

    # ...
  end

  # ..
end
```

To speed up things since this post has gone out of hands, let's copy the swarm's application `DatabaseCleaner` and the `DatabaseCleaner.Runner` modules into the current module, renaming their corresponding namespaces to `HordeBackgroundJob`. Finally, let's implement the module that spawns the cleaner process under `horde`:

```elixir
# lib/horde_background_job/database_cleaner/starter.ex

defmodule HordeBackgroundJob.DatabaseCleaner.Starter do
  require Logger

  alias HordeBackgroundJob.{DatabaseCleaner, HordeRegistry, HordeSupervisor}

  def child_spec(opts) do
    %{
      id: __MODULE__,
      start: {__MODULE__, :start_link, [opts]},
      type: :worker,
      restart: :temporary,
      shutdown: 500
    }
  end

  def start_link(opts) do
    name =
      opts
      |> Keyword.get(:name, DatabaseCleaner)
      |> via_tuple()

    new_opts = Keyword.put(opts, :name, name)

    child_spec = %{
      id: DatabaseCleaner,
      start: {DatabaseCleaner, :start_link, [new_opts]}
    }

    HordeSupervisor.start_child(child_spec)

    :ignore
  end

  def whereis(name \\ DatabaseCleaner) do
    name
    |> via_tuple()
    |> GenServer.whereis()
  end

  defp via_tuple(name) do
    {:via, Horde.Registry, {HordeRegistry, name}}
  end
end
```

Using the same fake GenServer technique we did in the `swarm` implementation, it takes the name from the received options and builds a tuple in the form of `{:via, Horde.Registry, {HordeRegistry, name}}` to set it again and use the resulting options to call the `HordeSupervisor.start_child(child_spec)` function that we defined previously. The tuple containing the name specifies how we want to register the process, in our case using the `Horde.Registry` under the `HordeBackgroundJobs.HordeRegsitry`. He have also defined a `whereis` function to help us finding the process while testing. Let's add the starter module to the application start:

```elixir
# .lib/horde_background_job/application.ex

defmodule HordeBackgroundJob.Application do
  # ...

  def start(_type, _args) do
    children = [
      # ...
      {HordeBackgroundJob.DatabaseCleaner.Starter,
       [name: HordeBackgroundJob.DatabaseCleaner, timeout: :timer.seconds(2)]}
    ]

    # ...
  end

  # ..
end
```

We already have all the necessary pieces of the puzzle, so let's start some nodes and see what happens:

```text
# NODE 1

➜ iex --sname n1 -S mix
Erlang/OTP 24 [erts-12.0.1] [source] [64-bit] [smp:12:12] [ds:12:12:10] [async-threads:1] [jit]

[info]  Starting Horde.RegistryImpl with name HordeBackgroundJob.HordeRegistry
[info]  Starting Horde.DynamicSupervisorImpl with name HordeBackgroundJob.HordeSupervisor
[info]  ----[n1@mbp-#PID<0.253.0>] Elixir.HordeBackgroundJob.DatabaseCleaner scheduling for 2000ms
[info]  ----[n1@mbp-#PID<0.253.0>] Elixir.HordeBackgroundJob.DatabaseCleaner deleting outdated records...
[info]  ----[n1@mbp-#PID<0.253.0>] Elixir.HordeBackgroundJob.DatabaseCleaner scheduling for 2000ms
```

```text
# NODE 2

➜ iex --sname n2 -S mix
Erlang/OTP 24 [erts-12.0.1] [source] [64-bit] [smp:12:12] [ds:12:12:10] [async-threads:1] [jit]

[info]  Starting Horde.RegistryImpl with name HordeBackgroundJob.HordeRegistry
[info]  Starting Horde.DynamicSupervisorImpl with name HordeBackgroundJob.HordeSupervisor
```

```text
# NODE 3

➜ iex --sname n3 -S mix
Erlang/OTP 24 [erts-12.0.1] [source] [64-bit] [smp:12:12] [ds:12:12:10] [async-threads:1] [jit]

[info]  Starting Horde.RegistryImpl with name HordeBackgroundJob.HordeRegistry
[info]  Starting Horde.DynamicSupervisorImpl with name HordeBackgroundJob.HordeSupervisor

iex(n3@mbp)1> HordeBackgroundJob.DatabaseCleaner.Starter.whereis
#PID<20046.239.0>
```

Let's kill the process:


```text
iex(n3@mbp)6> HordeBackgroundJob.DatabaseCleaner.Starter.whereis |> GenServer.cast(:kaboom)
:ok
iex(n3@mbp)7> HordeBackgroundJob.DatabaseCleaner.Starter.whereis
#PID<20046.590.0>
```

The process dies in its current node but gets restarted thanks to Horde's supervisor, and most importantly, the registry does not lose track of its new `PID`, yay!

## Conclusion

In this part of the series, we have seen how to implement a periodic singleton process thanks to three different global registries. Using `:global` has been the easiest and more straightforward one of the three. However, it is also known for not recovering correctly after netsplits, thus having alternatives like `swarm` or `horde`. Between these last two, `swarm` looks very promising, especially its handoff mechanism. However, the amount of issues and lack of activity in its repo makes it not very reliable in the end. Finally, `horde`, although having to build some boilerplate to use it, feels like the perfect balance between the former two. What do you think?

In the next part of the series, we will continue with the second real-world example of distributed Elixir. We will build a download manager taking advantage of what we have learned so far and **Phoenix's PubSub**. In the meantime, you can check the full code of every example of this part in the link below.

Happy coding!


<div class="btn-wrapper">
  <a href="https://github.com/bigardone/distributed-elixir-examples" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>


[last part]: /blog/2021/05/22/three-real-world-examples-of-distributed-elixir-pt-1
[:global]: https://erlang.org/doc/man/global.html
[is not probably the best solution]: https://keathley.io/blog/sgp.html
[Swarm]: https://hexdocs.pm/swarm/readme.html
[horde]: https://hexdocs.pm/horde/readme.html
[among others]: https://moosecode.nl/blog/introducing_horde
[Horde.DynamicSupervisor]: https://hexdocs.pm/horde/Horde.DynamicSupervisor.html#content
[Horde.Registry]: https://hexdocs.pm/horde/Horde.Registry.html#content




