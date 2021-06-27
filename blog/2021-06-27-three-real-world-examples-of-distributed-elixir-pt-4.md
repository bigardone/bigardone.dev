---
title: "Three real-world examples of distributed Elixir (pt. 4)"
excerpt: "The distributed application version monitor."
date: "2021-06-27"
tags: elixir, phoenix, elm
image: "https://bigardone.dev/images/blog/2021-06-27-three-real-world-examples-of-distributed-elixir-pt-4/post-meta.png"
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

In the [previous part] of the series, we built a distributed download request manager and tracker, taking advantage of Elixir's distributed capabilities. In this fourth and last part, we will implement a real-world example which consists of a widespread pattern in which a web service serves a JavaScript single-page application. One of the issues that can occur in this type of scenario is that we have users that keep the browser open for long sessions, in which there can be multiple deployments of the service. If any of the versions that we deploy contain breaking changes between the front-end and the back-end, they will most likely experience unexpected errors due to outdated UI versions. A good example would be changing some business logic behind a form submission that depends on a new field, which is not currently being sent because the outdated UI is not rendering, even though the backend is expecting it. This scenario gets even trickier when you can have multiple instances of your application running simultaneously, and you can have multiple nodes running different versions temporarily until the cluster eventually syncs. A best practice to prevent a bad user experience consists of displaying a warning message to the user suggesting a page refresh to get the latest app version. Let's get cracking!

## The base application

<div class="btn-wrapper">
  <a href="https://github.com/bigardone/distributed-elixir-examples/tree/master/07_version_observer" target="_blank" class="btn">
    <i class="fa fa-github"></i> Source code of this example
  </a>
</div>

For this particular example, we are going to build a new web application consisting of two different parts:

1. A standard [Phoenix] application that relies on [libcluster] to manage the node cluster and [Horde] to register and supervise global processes.
2. A JavaScript single-page application built using [Elm], containing the user interface.

Let's start by scaffolding the new project:

```text
mix phx.new version_observer --no-ecto --no-live --no-dashboard --no-gettext
```

After everything gets installed, let' add the necessary dependencies:

```elixir
# ./mix.exs

defmodule VersionObserver.MixProject do
  use Mix.Project

	# ...


  defp deps do
    [
      # ...

      {:libcluster, "~> 3.3"},
      {:horde, "~> 0.8.3"}
    ]
  end

	# ...
end
```

And configure the cluster:

```elixir
# ./lib/version_observer/application.ex

defmodule VersionObserver.Application do
  use Application

  def start(_type, _args) do
    children = [
      {Cluster.Supervisor, [topologies(), [name: BackgroundJob.ClusterSupervisor]]},

      # Start the Telemetry supervisor
      VersionObserverWeb.Telemetry,
      # Start the PubSub system
      {Phoenix.PubSub, name: VersionObserver.PubSub},

      # Start Horde
      VersionObserver.HordeRegistry,
      VersionObserver.HordeSupervisor,
      VersionObserver.NodeObserver,

      # Start the Endpoint (http/https)
      VersionObserverWeb.Endpoint
      # Start a worker by calling: VersionObserver.Worker.start_link(arg)
      # {VersionObserver.Worker, arg}
    ]

    opts = [strategy: :one_for_one, name: VersionObserver.Supervisor]
    Supervisor.start_link(children, opts)
  end

	# ...

  defp topologies do
    [
      background_job: [
        strategy: Cluster.Strategy.Gossip
      ]
    ]
  end
end
```

Just like we did in the [previous part], we are going to be copy the `DownloadManager.{HordeRegistry, HordeSupervisor, NodeObserver}` modules from the previous example [source code repository], and pasting them into out brand new project, renaming their namespace accordingly to `VersionObserver.*`. We have to make a subtle change in the `NodeObserver` module, though:

```elixir
# lib/version_observer/node_observer.ex

defmodule VersionObserver.NodeObserver do
  use GenServer

  # ...

  alias Phoenix.PubSub

  @topic "node_observer"

  def topic, do: @topic

  def handle_info({:nodeup, _node, _node_type}, state) do
    # ...

    PubSub.broadcast(VersionObserver.PubSub, @topic, :nodeup)

    {:noreply, state}
  end

  def handle_info({:nodedown, _node, _node_type}, state) do
    # ...

    PubSub.broadcast(VersionObserver.PubSub, @topic, :nodedown)

    {:noreply, state}
  end
end
```

In this particular example, the node observer publishes `:nodeup` and `:nodedown` messages through `Phonenix.PubSub`, which we will use later.

Since we are going to be testing the final result locally, we need to provide a different port to each Phoenix's server instance that we start:

```elixir
# ./config/dev.exs

use Mix.Config

config :version_observer, VersionObserverWeb.Endpoint,
  http: [
    port: String.to_integer(System.get_env("PORT") || "4000")
  ],
  # ...
```

Frontend-wise, we are going to get rid of Phoenix's default webpack set up in favor of [Parcel], which is faster and does not need any additional configuration whatsoever:

```json
# ./assets/package.json

{
  "repository": {},
  "description": " ",
  "license": "MIT",
  "scripts": {
    "watch": "parcel watch js/app.js --out-dir ../priv/static/js --public-url /js"
  },
  "dependencies": {
    "phoenix": "file:../deps/phoenix",
    "phoenix_html": "file:../deps/phoenix_html"
  },
  "devDependencies": {
    "@babel/core": "^7.14.6",
    "elm": "^0.19.1-5",
    "elm-hot": "^1.1.6",
    "node-elm-compiler": "^5.0.6",
    "parcel-bundler": "^1.12.5"
  }
}
```

```elixir
# ./config/dev.exs

use Mix.Config

config :version_observer, VersionObserverWeb.Endpoint,
  # ...

  watchers: [
    npm: ["run", "watch", cd: Path.expand("../assets", __DIR__)]
  ]

  # ...
```

We will not be diving into the front-end Elm application internals. However, you can find its source code [here](). Nevertheless, we need to initialize it into our main JS file:

```javascript
// ./assets/js/app.js

import { Elm } from '../src/Main.elm';
import socket from './socket';
import '../css/app.css';
import 'phoenix_html';


const { appVersion } = window;

const app = Elm.Main.init({ flags: { appVersion } });
```

The critical part is the `appVersion` variable that we pass as a flag to the Elm application. This `appVersion` holds the version value of the Phoenix instance that serves the initial HTML that renders JavaScript single-page application. In this case, we are taking it from the [window] object, but where do we get its value, and where do we set it?

## The application version

If we take a closer look at the `mix.exs` file, one of the configuration options that the `project/0` function returns is `version`:

```elixir
# ./mix.exs

defmodule VersionObserver.MixProject do
  use Mix.Project

  def project do
    [
      app: :version_observer,
      version: "0.1.0",
      # ...
    ]
  end

  # ...
end
```

We are going to use this value to set and read the current version of the application. Setting its value is straightforward; we only need to update it and rebuild the project. How do we read it, though? Elixir has a convenient [Application.spec/1] function that returns the specifications of a given application:

```text
iex(1)> Application.spec(:version_observer)
[
  description: 'version_observer',
  id: [],
  vsn: '0.1.0',
  modules: [VersionObserver, VersionObserver.Application,
   VersionObserver.HordeRegistry, VersionObserver.HordeSupervisor,
   VersionObserver.NodeObserver, VersionObserver.Version.Monitor,
   VersionObserver.Version.Monitor.Runner,
   VersionObserver.Version.Monitor.Starter, VersionObserver.Version.Repo,
   VersionObserverWeb, VersionObserverWeb.Endpoint,
   VersionObserverWeb.ErrorHelpers, VersionObserverWeb.ErrorView,
   VersionObserverWeb.LayoutView, VersionObserverWeb.PageController,
   VersionObserverWeb.PageView, VersionObserverWeb.Router,
   VersionObserverWeb.Router.Helpers, VersionObserverWeb.Telemetry,
   VersionObserverWeb.UserSocket, VersionObserverWeb.VersionChannel],
  maxP: :infinity,
  maxT: :infinity,
  registered: [],
  included_applications: [],
  optional_applications: [],
  applications: [:kernel, :stdlib, :elixir, :logger, :runtime_tools, :phoenix,
   :phoenix_html, :phoenix_live_reload, :telemetry_metrics, :telemetry_poller,
   :jason, :plug_cowboy, :libcluster, :horde],
  mod: {VersionObserver.Application, []},
  start_phases: :undefined
]
```

The option that we are looking for is `:vsn`, which we can get directly using `Application.spec(:version_observer, :vsn)`.

```text
iex(1)> Application.spec(:version_observer, :vsn)
'0.1.0'
```

Let's implement a module that represents the version of our application:

```elixir
# ./lib/version_observer/version.ex

defmodule VersionObserver.Version do
  alias __MODULE__

  @type t :: %Version{
          major: non_neg_integer,
          minor: non_neg_integer,
          patch: non_neg_integer
        }

  defstruct major: 0, minor: 0, patch: 0

  def from_string(value) do
    with [major, minor, patch] <- to_chunks(value) do
      {:ok, %Version{major: major, minor: minor, patch: patch}}
    end
  end

  def incompatible?(%Version{major: major_1}, %Version{major: major_2}), do: major_1 != major_2

  defp to_chunks(value) do
    case String.split(value, ".") do
      [_major, _minor, _patch] = chunks ->
        Enum.map(chunks, &String.to_integer/1)

      _ ->
        {:error, :invalid_version}
    end
  rescue
    _ ->
      {:error, :invalid_version}
  end

  defimpl String.Chars do
    def to_string(%Version{major: major, minor: minor, patch: patch}) do
      "#{major}.#{minor}.#{patch}"
    end
  end
end
```

This module consists of a Version struct based on the [semantic versioning specification] and two helper functions:

- `from_string`: builds a new struct from a string.
-  `incompatible?`: it takes two versions and returns whether both are incompatible or not.

It also implements the `String.Chars` protocol, to convert a version into a string. For the sake of simplicity, the logic of this module is very simple, however, you can adapt it to your personal needs, especially the `incompatible?` implementation. To continue, let's add a new repository module in charge of storing the application version:

```elixir
# ./lib/version_observer/version/repo.ex

defmodule VersionObserver.Version.Repo do
  use GenServer

  alias VersionObserver.Version

  def start_link(opts) do
    name = Keyword.get(opts, :name, __MODULE__)

    GenServer.start_link(__MODULE__, %{}, name: name)
  end

  def get(name \\ __MODULE__), do: GenServer.call(name, :get)

  @impl true
  def init(_) do
    {:ok, version} =
      :version_observer
      |> Application.spec(:vsn)
      |> to_string()
      |> Version.from_string()

    {:ok, version}
  end

  @impl GenServer
  def handle_call(:get, _, version) do
    {:reply, {:ok, version}, version}
  end
end
```

The `VersionObserver.Version.Rep` module is a basic [GenServer] implementation that takes the `:vsn` value from the application, builds a new `%Version{}` with it, and stores it in its state. It also exposes a `get/0` function that returns the stored version struct. Finally, we have to add the repo to the main application's children specification:

```elixir
# ./lib/version_observer/application.ex

defmodule VersionObserver.Application do
  use Application

  def start(_type, _args) do
    children = [
      # ...

      VersionObserver.Version.Repo,

      # ...
    ]
  end

  # ...
end
```

And expose a convenient function in the main `VersionObserver` module:

```elixir
# ./lib/version_observer.ex

defmodule VersionObserver do
  defdelegate get_current_version, to: VersionObserver.Version.Repo, as: :get
end
```

Jumping to `IEX` and requesting the version should return the following:

```text
Interactive Elixir (1.12.1) - press Ctrl+C to exit (type h() ENTER for help)
iex(1)> VersionObserver.get_current_version()
{:ok, %VersionObserver.Version{major: 0, minor: 1, patch: 0}}
```

It works like a charm. Let's update the main layout view and template to set the current value in the `window` object:

```html
# ./lib/version_observer_web/templates/layout/app.html.eex

<!DOCTYPE html>
<html lang="en">
  <head>
    <%# ... %>

    <script>window.appVersion = '<%= get_current_version() %>';</script>
  </head>
  <body>
    <%= @inner_content %>
  </body>
</html>
```

```elixir
# ./lib/version_observer_web/views/layout_view.ex

defmodule VersionObserverWeb.LayoutView do
  use VersionObserverWeb, :view

  def get_current_version do
    {:ok, version} = VersionObserver.get_current_version()

    to_string(version)
  end
end
```

If we now start the Phoenix server and visit http://localhost:4000, we should see the single-page application getting rendered correctly:


<a href="/images/blog/2021-06-27-three-real-world-examples-of-distributed-elixir-pt-4/spa.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-06-27-three-real-world-examples-of-distributed-elixir-pt-4/spa.png"/>
</a>

At this point, we have or base application ready. When a user visits the home page, the main layout renders, setting the current version of the application and starting the JS app, passing the version as a flag. However, if we deploy a different version number, the user will still be running the app's initial version unless there is a page refresh. How can we alert the user about this?

## Monitoring version changes in a cluster of nodes

If we start different nodes, they will be running their own `NodeObserver.Version.Repo` that stores their application version. We need a new process, unique across all nodes, that listens to topology changes in the cluster, broadcasting any version changes when they occur. Following the same approach that we did in the [second part], let's implement a singleton process to take care of this task:

```elixir
# ./lib/version_observer/version/monitor.ex

defmodule VersionObserver.Version.Monitor do
  use GenServer

  alias __MODULE__.Runner
  alias Phoenix.PubSub
  alias VersionObserver.{NodeObserver, Version}

  @publish_opic "version_monitor"

  def start_link(opts) do
    name = Keyword.get(opts, :name, __MODULE__)
    subscribe_topic = Keyword.get(opts, :subscribe_topic, NodeObserver.topic())

    GenServer.start_link(__MODULE__, subscribe_topic, name: name)
  end

  def init(subscribe_topic) do
    PubSub.subscribe(VersionObserver.PubSub, subscribe_topic)

    {:ok, %Version{}}
  end

  def handle_info(:nodeup, state) do
    {:noreply, state, {:continue, :check}}
  end

  def handle_info(:nodedown, state) do
    {:noreply, state, {:continue, :check}}
  end

  def handle_continue(:check, state) do
    with {:ok, new_version} <- Runner.run(),
         true <- Version.incompatible?(new_version, state) do
      Process.sleep(1_000)

      PubSub.broadcast(
        VersionObserver.PubSub,
        @publish_topic,
        {:new_version, to_string(new_version)}
      )

      {:noreply, new_version}
    else
      false ->
        {:noreply, state}

      {:error, :invalid_nodes} ->
        Process.sleep(1_000)

        {:noreply, state, {:continue, :check}}

      {:error, :out_of_sync} ->
        {:noreply, state}
    end
  end
end
```

The `VersionObserver.Version.Monitor` is another straightforward [GenServer] implementation, which takes its `name` and `subscribe_topic`  from the `start_link/1` function options. On its `init/1` function, it takes the `subscribe_topic` to subscribe to the `Phoenix.PubSub` node observer topic, that we will see in a moment, and sets an empty `%Version{}` as its state. Subscribing to this topic involves that the monitor process will receive incoming messages whenever nodes join or leave the cluster, so we need to implement this message handling with their corresponding `handle_info(:nodeup, state)` and `handle_info(:nodedown, state)` callbacks, which return a `{:continue, :check}` tuple handled by `handle_continue(:check, state)`, which:

- It calls its `Runner.run/0` module function, which we will see now, which checks if all nodes run the same application version.
- It checks if the returned version is incompatible with the current one stored in its state, publishing the new version through `Phoenix.Pubsub` if so.
- On the other hand, if they are compatible, everything is fine, and it does nothing.
- If the runner module returns `{:error, :invalid_nodes}`, it means that the new nodes are still starting, and it sleeps for a second and retries the whole process again by returning `{:continue, :check}`.
- Finally, if the return value is `{:error, :out_of_sync}`, it means that there are nodes currently running different versions of the application, probably due to an ongoing deployment, so we need to wait until it finishes and the cluster recovers.

Let's add the runner module:

```elixir
# ./lib/version_observer/version/monitor/runner.ex

defmodule VersionObserver.Version.Monitor.Runner do
  alias VersionObserver.Version.Repo

  def run do
    case GenServer.multi_call(Repo, :get) do
      {nodes, []} ->
        do_check(nodes)

      {_, invalid_nodes} ->
        {:error, :invalid_nodes}
    end
  end

  defp do_check(nodes) do
    nodes
    |> Keyword.values()
    |> Enum.uniq()
    |> case do
      [{:ok, version}] ->
        {:ok, version}

      other ->
        {:error, :out_of_sync}
    end
  end
end
```

The `run/0` function runs [GenServer.multi_call/4], which calls all the `NodeObserver.Version.Repo` process in the cluster. The result is a tuple containing two elements:

- The first one is the list of replies in the form of `[node, result]`.
- The second, a list of invalid nodes or nodes that didn't reply.

If there are invalid nodes, it returns a `{:error, :invalid_nodes}` tuple. On the other hand, if all nodes have replied correctly, it takes all the unique versions and checks if there is only one, which means that all nodes are running the same one, returning `{:ok, version}` or `{:error, :out_of_sync}` if the contrary. The last thing we have to implement is the process that starts and registers the singleton `NodeObserver.Version.Monitor` globally across the cluster:

```elixir
# ./lib/version_observer/version/monitor/starter.ex

defmodule VersionObserver.Version.Monitor.Starter do
  require Logger

  alias VersionObserver.{
    HordeRegistry,
    HordeSupervisor,
    Version.Monitor
  }

  # ...

  def start_link(opts) do
    name =
      opts
      |> Keyword.get(:name, Monitor)
      |> via_tuple()

    opts = Keyword.put(opts, :name, name)

    child_spec = %{
      id: Monitor,
      start: {Monitor, :start_link, [opts]}
    }

    HordeSupervisor.start_child(child_spec)

    :ignore
  end

  defp via_tuple(name) do
    {:via, Horde.Registry, {HordeRegistry, name}}
  end
end
```

```elixir
# ./lib/version_observer/application.ex

defmodule VersionObserver.Application do
  use Application

  def start(_type, _args) do
    children = [
      # ...
      VersionObserver.Version.Monitor.Starter,

      # ...
    ]

    opts = [strategy: :one_for_one, name: VersionObserver.Supervisor]
    Supervisor.start_link(children, opts)
  end

	# ...
end
```

## Alerting the user about new available application versions

The only thing left is to subscribe to the `NodeObserver.Version.Monitor` messages and show the corresponding alert to the user. To achieve this, let's add a new Phoenix channel module:

```elixir
# ./lib/version_observer_web/channels/user_socket.ex

defmodule VersionObserverWeb.UserSocket do
  use Phoenix.Socket

  channel("version", VersionObserverWeb.VersionChannel)

  # ...
end
```

```elixir
# ./lib/version_observer_web/channels/version_channel.ex

defmodule VersionObserverWeb.VersionChannel do
  use VersionObserverWeb, :channel

  alias Phoenix.PubSub

  def join("version", _payload, socket) do
    PubSub.subscribe(VersionObserver.PubSub, "version_monitor")

    {:ok, socket}
  end

  def handle_info({:new_version, version}, socket) do
    push(socket, "new_version", %{version: version})

    {:noreply, socket}
  end
end
```

When the client joins the channel, its process subscribes to the version monitor topic, pushing any new version through the socket. We also need to change the `app.js` logic to pass the new version to the JavaScript single-page application:

```javascript
// ./assets/js/app.js

// ...

const channel = socket.channel('version', {});

channel.join()
  .receive('ok', (resp) => {
    channel.on('new_version', ({ newVersion }) => {
      app.ports.newVersion.send(newVersion);
    });
  });
```

Finally, the logic inside the Elm, React, or whatever front-end technology you choose should be straightforward. It compares the version it received via its initialization flags to the one received from the Phoenix socket client, displaying the corresponding message suggesting to refresh the page. Let's jump back to the terminal, start the load balancer like in the [previous part], and start a a couple of instances of our application, and try to simulate some deployments:

<a href="/images/blog/2021-06-27-three-real-world-examples-of-distributed-elixir-pt-4/same-version.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-06-27-three-real-world-examples-of-distributed-elixir-pt-4/same-version.png"/>
</a>

`n1` starts, and as soon as `n2` joins the cluster, the `VersionObserver.Version.Monitor` receives a `:nodeup` message from the `VersionObserver.NodeObserver`, requesting the application version to all the nodes. However, `n2` is not yet ready, so it receives the invalid nodes error, making the monitor retry again after a second. In the second attempt, `n2` is ready, and both nodes have the same version, so nothing else happens. Let's kill all the instances and start a single one, and visit http://localhost:


<a href="/images/blog/2021-06-27-three-real-world-examples-of-distributed-elixir-pt-4/single-instance.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-06-27-three-real-world-examples-of-distributed-elixir-pt-4/single-instance.png"/>
</a>

Next, let's update the `mix.exs` file, setting the `version` value to a new major value, and start `n2` and `n3`:

```elixir
# ./mix.exs

defmodule VersionObserver.MixProject do
  use Mix.Project

  def project do
    [
      app: :version_observer,
      version: "1.0.0",
      # ...
    ]
  end

  # ...
end
```

<a href="/images/blog/2021-06-27-three-real-world-examples-of-distributed-elixir-pt-4/inconsitent-nodes.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-06-27-three-real-world-examples-of-distributed-elixir-pt-4/inconsistent-nodes.png"/>
</a>

 `n2` and `n3` start, and the version monitor running on `n1` starts checking for the version on each node, ending up receiving two different: version `0.1.0` running in `n1` and `1.0.0` running in both `n2` and `n3`. Let's kill `n1`, leaving the cluster with nodes that have the same version:

<a href="/images/blog/2021-06-27-three-real-world-examples-of-distributed-elixir-pt-4/consitent-nodes.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-06-27-three-real-world-examples-of-distributed-elixir-pt-4/consistent-nodes.png"/>
</a>

If we check the browser, we should see the corresponding message popping up:

<a href="/images/blog/2021-06-27-three-real-world-examples-of-distributed-elixir-pt-4/final-result.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-06-27-three-real-world-examples-of-distributed-elixir-pt-4/final-result.png"/>
</a>

Yay!

## Conclusion

In this series, we have seen how to build a cluster of Elixir nodes and take advantage of its distribution capabilities to implement three different creative solutions to real-world problems, otherwise impossible without adding external dependencies and complexity to our projects. This power and flexibility make me like Elixir so much and enjoy writing back-end code every day. I hope you enjoyed the posts as much as I did writing them, and if you have any examples about distributed Elixir solutions, please share them with me, I'd love to hear from you 🙌.

Happy coding!

<div class="btn-wrapper">
  <a href="https://github.com/bigardone/distributed-elixir-examples" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>


[previous part]: /blog/2021/06/18/three-real-world-examples-of-distributed-elixir-pt-3
[previous part]: /blog/2021/06/18/three-real-world-examples-of-distributed-elixir-pt-3
[libcluster]: https://hexdocs.pm/libcluster/readme.html
[Horde]: https://hexdocs.pm/horde/readme.html
[Phoenix]: https://hexdocs.pm/phoenix/Phoenix.html
[Elm]: https://elm-lang.org/
[source code repository]: https://github.com/bigardone/distributed-elixir-examples/tree/master/06_download_manager/lib/download_manager
[window]: https://developer.mozilla.org/en-US/docs/Web/API/Window
[Application.spec/1]: https://hexdocs.pm/elixir/1.3.0-rc.0/Application.html#spec/1
[semantic versioning specification]: https://semver.org/
[Parcel]: https://parceljs.org/
[second part]: /blog/2021/06/06/three-real-world-examples-of-distributed-elixir-pt-2
[GenServer]: https://hexdocs.pm/elixir/1.12/GenServer.html#content
[GenServer.multi_call/4]: https://hexdocs.pm/elixir/1.12/GenServer.html#multi_call/4
