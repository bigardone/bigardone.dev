---
title: "Three real-world examples of distributed Elixir (pt. 1)"
excerpt: "A gentle introduction to distributed Elixir."
date: "2021-05-22"
tags: elixir, phoenix
image: "https://bigardone.dev/images/blog/2021-05-22-three-real-world-examples-of-distributed-elixir-pt-1/post-meta.png"
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

While deploying any project to a production environment, you can either scale
it vertically (adding more resources to the single instance where it is running) or horizontally (adding multiple instances).
If you don't like putting all the eggs in a single basket and choose the horizontal approach, Elixir offers all the necessary
distributed features that you need out of the box without
any additional dependencies, letting you build a cluster between the different instances of your application.

Clustering your service allows you to do very interesting stuff, from spawning new processes in any instance to sending messages between cluster nodes,
letting you build very creative solutions. Although this might sound complex, in reality, it is straightforward to achieve since
these distributed capabilities are integrated into the language that you already know,
letting you design your applications in a totally different way. Along with these post series, we will explore three different
real-world use cases of distributed Elixir, but before, let's go back to the basics and see how to build an Elixir cluster.
Let's get cracking!

## Building a simple cluster

Let's generate a basic OTP application, and start iterating from there:

```text
➜ mix new simple_cluster --sup
...
➜ cd simple_cluster
```

To build the cluster, we need two things:

- To provide a name for the current application instance.
- To connect the different nodes once the application starts.

The first one is straightforward, and we can achieve it by adding the `--name` argument to the start command:

```text
➜ iex --name n1@127.0.0.1 -S mix
Erlang/OTP 24 [erts-12.0.1] [source] [64-bit] [smp:12:12] [ds:12:12:10] [async-threads:1] [jit]

Interactive Elixir (1.12.0) - press Ctrl+C to exit (type h() ENTER for help)
iex(n1@127.0.0.1)1>
```

Easy, right? Please note the iex prompt `iex(n1@127.0.0.1)1>` containing the node name we just assigned. Let's start a new node in a different terminal window setting the `n2` name:

```text
➜ iex --name n2@127.0.0.1 -S mix
Erlang/OTP 24 [erts-12.0.1] [source] [64-bit] [smp:12:12] [ds:12:12:10] [async-threads:1] [jit]

Interactive Elixir (1.12.0) - press Ctrl+C to exit (type h() ENTER for help)
iex(n2@127.0.0.1)1>
```

Now that we have both nodes up and running, let's create the cluster by manually connecting the nodes using Elixir's [Node.connect/1]:

```elixir
iex(n1@127.0.0.1)1> Node.connect :"n2@127.0.0.1"
true
iex(n1@127.0.0.1)2>
```

To confirm that everything went fine, let's run [Node.list/0] on each node, which returns the list of nodes to which the current instance has connected:

```elixir
iex(n1@127.0.0.1)2> Node.list
[:"n2@127.0.0.1"]
iex(n1@127.0.0.1)3>
```

```elixir
iex(n2@127.0.0.1)2> Node.list
[:"n1@127.0.0.1"]
iex(n2@127.0.0.1)3>
```

Our first clustered application is ready, yay! However, connecting manually to each of the nodes from `iex` is less than ideal. There is a more convenient way of doing it, which is adding a [sys.config] file to the root of the project with the following content:

```erlang
[{kernel,
  [
    {sync_nodes_optional, ['n1@127.0.0.1', 'n2@127.0.0.1']},
    {sync_nodes_timeout, 5000}
  ]}
].
```

This file sets default values on the application start, in this particular case:

- `sync_nodes_optional`: the list of possible nodes in the cluster.
- `sync_nodes_timeout`: the timeout to synchronize the nodes.

To apply this configuration, let's start each node setting the `--erl` parameter with the configuration file:

```elixir
➜ iex --name n1@127.0.0.1 --erl "-config sys.config" -S mix
Erlang/OTP 24 [erts-12.0.1] [source] [64-bit] [smp:12:12] [ds:12:12:10] [async-threads:1] [jit]

Interactive Elixir (1.12.0) - press Ctrl+C to exit (type h() ENTER for help)
iex(n1@127.0.0.1)1>
```

```elixir
➜ iex --name n2@127.0.0.1 --erl "-config sys.config" -S mix
Erlang/OTP 24 [erts-12.0.1] [source] [64-bit] [smp:12:12] [ds:12:12:10] [async-threads:1] [jit]

Interactive Elixir (1.12.0) - press Ctrl+C to exit (type h() ENTER for help)
iex(n2@127.0.0.1)1
```

To confirm that the nodes are connected, let's create a module that spawns a process on each node that observes any change in the cluster membership:

```elixir
# ./lib/simple_cluster/observer.ex
  use GenServer
  require Logger

  def start_link(_), do: GenServer.start_link(__MODULE__, %{})

  @impl GenServer
  def init(state) do
    :net_kernel.monitor_nodes(true)

    {:ok, state}
  end

  @impl GenServer
  def handle_info({:nodedown, node}, state) do
    # A node left the cluster
    Logger.info("--- Node down: #{node}")

    {:noreply, state}
  end

  def handle_info({:nodeup, node}, state) do
    # A new node joined the cluster
    Logger.info("--- Node up: #{node}")

    {:noreply, state}
  end
```

This simple GenServer calls [:net_kernel.monitor_nodes/1] on its initialization, subscribing to any node status change in the cluster. Therefore, it receives both `{:nodeup, node}` and `{:nodedown, node}` messages whenever a node joins or leaves the cluster. Let's add this generic server to the main supervision tree of the application:

```elixir
# ./lib/simple_cluster/application.ex

defmodule SimpleCluster.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      SimpleCluster.Observer
    ]

    opts = [strategy: :one_for_one, name: SimpleCluster.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
```

Let's start again our two nodes and see what happens. If we start `n2`, we can see the following log message in `n1`:


```text
06:02:40.129 [info]  --- Node up: n2@127.0.0.1
```

If we stop `n2`, we can see the corresponding logger message:

```text
06:05:22.051 [info]  --- Node down: n2@127.0.0.1
```

To test out communication between the nodes, let's add a new module that sends a message to all the nodes in the cluster, printing the result:

```elixir
# .lib/simple_cluster/ping.ex

defmodule SimpleCluster.Ping do
  use GenServer
  require Logger

  def start_link(_) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  def ping do
    Node.list()
    |> Enum.map(&GenServer.call({__MODULE__, &1}, :ping))
    |> Logger.info()
  end

  @impl GenServer
  def init(state), do: {:ok, state}

  @impl GenServer
  def handle_call(:ping, from, state) do
    Logger.info("--- Receiving ping from #{inspect(from)}")

    {:reply, {:ok, node(), :pong}, state}
  end
end
```

This GenServer has two different parts. First of all, it exposes a public `ping/0` function, which takes all the nodes in the cluster and sends them a `:ping` message using [GenServer.call/3]. This function accepts the following as the first parameter:

```elixir
server() :: pid() | name() | {atom(), node()}
```
By using `{__MODULE__, &1}` we are saying: Send `:ping` to the process with the name `SimpleCluster.Ping` in the node `&1`. This takes us to the second part of the module, the callback `handle_call(:ping, from, state)`, which receives the incoming message logging the sender and responding with a `{:ok, node(), :pong}` tuple. Let's add this module to the main supervision tree, restart our instances and see it in action:

```elixir
# ./lib/simple_cluster/application.ex

defmodule SimpleCluster.Application do
  ...
  def start(_type, _args) do
    children = [
      SimpleCluster.Observer,
      SimpleCluster.Ping
    ]
    ...
  end
end
```

```text
iex(n1@127.0.0.1)1> SimpleCluster.Ping.ping

06:33:19.704 [info]  [{:ok, :"n2@127.0.0.1", :pong}]
:ok
```

```text
iex(n2@127.0.0.1)1>
06:33:19.701 [info]  --- Receiving ping from {#PID<6589.174.0>, [:alias | #Reference<6589.2917998909.4144300034.261849>]}
```

Nodes have automagically connected, and processes can communicate between them as we expected. Nevertheless, this is again far from ideal in a real-world application deployed into a production environment. How would we handle dynamic IPs? How would we manage new nodes connecting or leaving the cluster? Thankfully there is a library that addresses this for us.

## Automatic cluster formation with `libcluster`

libcluster provides a mechanism for automatically forming clusters of Erlang nodes, with either static or dynamic node membership, offering a wide variety of strategies and even letting you create your own. We will not dive too deep into its internal details in this series, but you can look at its different strategies in its official docs. To use it, let's get rid of the `sys.config` file, and add `libcluster` to our application dependencies:

```text
➜ rm sys.config
```

```elixir
# mix.exs

defmodule SimpleCluster.MixProject do
  use Mix.Project
  ...

  defp deps do
    [
      {:libcluster, "~> 3.3"}
    ]
  end
end
```

Don't forget to run the corresponding `mix deps.get` :P. To create the cluster, libcluster uses [different strategies], and in this particular case, we will use the [Cluster.Strategy.Epmd] strategy, in which we can set the list of hosts as we did with the former `sys.config` file. Let's go ahead and add the cluster supervisor and its configuration to the main supervision tree:

```elixir
# ./lib/simple_cluster/application.ex
defmodule SimpleCluster.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      {Cluster.Supervisor, [topologies(), [name: SimpleCluster.ClusterSupervisor]]},
      SimpleCluster.Observer,
      SimpleCluster.Ping
    ]

    opts = [strategy: :one_for_one, name: LibclusterCluster.Supervisor]
    Supervisor.start_link(children, opts)
  end

  defp topologies do
    [
      example: [
        strategy: Cluster.Strategy.Epmd,
        config: [
          hosts: [
            :"n1@127.0.0.1",
            :"n2@127.0.0.1"
          ]
        ]
      ]
    ]
  end
end
```

Now we can start both nodes without the `--erl` flag:

```text
➜ iex --name n1@127.0.0.1 -S mix
Erlang/OTP 24 [erts-12.0.1] [source] [64-bit] [smp:12:12] [ds:12:12:10] [async-threads:1] [jit]

07:06:38.384 [warn]  [libcluster:example] unable to connect to :"n2@127.0.0.1"
Interactive Elixir (1.12.0) - press Ctrl+C to exit (type h() ENTER for help)
iex(n1@127.0.0.1)1>
07:06:56.968 [info]  --- Node up: n2@127.0.0.1
iex(n1@127.0.0.1)2> SimpleCluster.Ping.ping()
:ok

07:07:36.098 [info]  [{:ok, :"n2@127.0.0.1", :pong}]
07:10:10.305 [info]  --- Node down: n2@127.0.0.1
```

Everything is working like before, yay! Now that we have ready the basics of a clustered Elixir application, in the following posts
we will implement three creative solutions around it, starting with the most simple one in which we will build a singleton process
across the cluster in charge of executing a periodic task.

Happy coding!



<div class="btn-wrapper">
  <a href="https://github.com/bigardone/distributed-elixir-examples" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>


[Node.connect/1]: https://hexdocs.pm/elixir/1.12/Node.html#connect/1
[Node.list/0]: https://hexdocs.pm/elixir/1.12/Node.html#list/0
[sys.config]: https://erlang.org/doc/man/config.html
[libcluster]: https://hexdocs.pm/libcluster/readme.html
[libcluster's official docs]: https://hexdocs.pm/libcluster/readme.html#clustering
[:net_kernel.monitor_nodes/1]: https://erlang.org/doc/man/net_kernel.html#monitor_nodes-1
[GenServer.call/3]: https://hexdocs.pm/elixir/1.12/GenServer.html#call/3
[libcluster]: https://hexdocs.pm/libcluster/readme.html
[different strategies]: https://hexdocs.pm/libcluster/readme.html#clustering
[Cluster.Strategy.Epmd]: https://hexdocs.pm/libcluster/Cluster.Strategy.Epmd.html


