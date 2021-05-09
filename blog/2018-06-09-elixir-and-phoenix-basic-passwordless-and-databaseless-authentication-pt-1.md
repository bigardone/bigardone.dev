---
title: Elixir and Phoenix basic passwordless and databaseless authentication (pt.1)
date: 2018-06-09
tags: elixir, phoenix, elm
excerpt: Project setup and the initial functionality for storing and verifying authentication tokens
---
<div class="index">
  <p>This post belongs to the <strong>Elixir and Phoenix basic passwordless and databaseless authentication</strong> series.</p>
  <ol>
    <li><a href="/blog/2018/06/09/elixir-and-phoenix-basic-passwordless-and-databaseless-authentication-pt-1">Project setup and the initial functionality for storing and verifying authentication tokens</a></li>
    <li><a href="/blog/2018/06/20/elixir-and-phoenix-basic-passwordless-and-databaseless-authentication-pt-2">Sending authentication link emails and the user socket connection</a></li>
    <li><a href="/blog/2018/09/01/elixir-and-phoenix-basic-passwordless-and-databaseless-authentication-pt-3">Setting up webpack as our asset bundler and the Elm single-page application</a></li>
  </ol>

  <a href="https://github.com/bigardone/passwordless-auth" target="_blank"><i class="fa fa-github"></i> Source code</a>
</div>

Have you found yourself working on a small project where, at some point,
you are asked to give access to some users to a private part of the
application or a small admin panel of some sort? Depending on the
project's constraints, we can resolve this situation in many different
ways. For instance, if having administrator profiles and roles forms part
of the business logic and the scope of the project, having a standard
authorization and authentication system is probably the way to go. On the
other hand, if we only need administrator users to authenticate and let
them have access to a private part, we can rely on other simple
alternatives like HTTP basic authentication, which might not be as
flexible and secure as we might need them to be.

### Passwordless authentication

A couple of years ago I read [this excellent article] about the current
state of authentication where it showcases the most common ways of
authenticating users, describing their strengths and weaknesses.
Between all of them, passwordless authentication is the one that I liked
the most, as the perfect balance between ease of implementation and security
strength, using this approach in many different projects since then.
If you are not familiar with this technique, it mainly
consists of asking the user for an email address and sending a link
which will automatically authenticate them into the application, just like
Slack does. I'm very pleased with the result so far, as my users
don't need to remember passwords anymore (which tend to be frequently
forgotten), and I don't have to deal with credentials storage, validation and
recovery any longer.

### Databaseless authentication

As I said before, sometimes we don't need a complex authentication system
which involves modifying the database schema or altering the existing
business logic to let a few users access a particular part of the
application. Therefore, I want to experiment alternative ways of storing
credentials, and Elixir is perfect for this particular use case.

### What are we building

For this experiment, we are building a small [Elixir umbrella project]
which consists of two applications:

- **passwordless_auth**: Responsible for token generation, storage and
authentication logic.
- **passwordless\_auth\_web**: Responsible for sending authentication emails and serving the Elm SPA to test out our auth experiment against a Phoenix socket.

The final result looks something like this:

![Final result](https://monosnap.com/image/5VUT424b4Hu9ITi8r1SGae7HQleCPT.png)

We are going to have three screens:

- The last screen in the image corresponds to the root path of the admin panel, which is only displayed to authenticated users.
- The first screen corresponds to '/sign-in', displayed to any user trying to access '/' while not authenticated.
- The second screen corresponds to the success message showed to the user after requesting the magic link.

Bear in mind that these screens might change while we are going through the tutorial, as I keep making changes and refactoring things. Without further ado, let's do this!

### Project setup

First things first. Let's build a new Phoenix project with the following options:

```bash
$ mix phx.new passwordless_auth --umbrella --no-ecto --no-brunch
```

`--umbrella` tells the mix task to generate an umbrella project instead of a regular one. As we don't need to handle any database connections, we use the `--no-ecto` option to prevent having `Ecto` installed, and a default repository created. Finally, I've been having some issues related to assets building with Brunch, so let's remove it with the `--no-brunch` option for the moment as we are going to be using a customized Webpack build when we get to that point.

After running the mix task, we can see that we have our new umbrella project with the two applications inside the `/apps` folder:

```
passwordless-auth
├── README.md
├── apps
│   ├── passwordless_auth
│   └── passwordless_auth_web
├── config
│   ├── config.exs
│   ├── dev.exs
│   ├── prod.exs
│   └── test.exs
├── mix.exs
└── mix.lock
```

### The authentication repository
We are not relying on a database to store admitted user emails and their corresponding authentication tokens, but we have to store them somewhere else. Erlang/Elixir offer a simple and straightforward solution for in-memory storage, the [GenServer] behaviour, which seems to fit perfectly for our needs. Let's go ahead and create the `Repo` module:

```elixir
# apps/passwordless_auth/lib/passwordless_auth/repo.ex

defmodule PasswordlessAuth.Repo do
  use GenServer
  @name __MODULE__

  def start_link(opts) do
    opts = Keyword.put_new(opts, :name, @name)
    {:ok, emails} = Keyword.fetch(opts, :emails)

    GenServer.start_link(__MODULE__, emails, opts)
  end

  @impl true
  def init(emails) when is_list(emails) and length(emails) > 0 do
    state = Enum.reduce(emails, %{}, &Map.put(&2, &1, nil))

    {:ok, state}
  end

  def init(_), do: {:stop, "Invalid list of emails"}
end
```

The `start_link` function receives the options to spawn the `GenServer` process of the repository. These options consist of:

- `:name` which is optional and used for registering the process.
- `:emails` which is mandatory, represents the list of admitted emails, and which we are using in the `init` function to build the initial state of the process.

The `init` function receives a list of emails and creates a `Map` where keys are the emails, and the values will store the authentication tokens, but at the moment we are setting them to `nil`. On the contrary, if what receives is not a list, we want it to return `{:stop, "Invalid list of emails"}`, exiting the process and not letting the application to start.

Let's create a test module to test this out:


```elixir
# apps/passwordless_auth/test/passwordless_auth/repo_test.exs

defmodule PasswordlessAuth.RepoTest do
  use ExUnit.Case, async: true

  alias PasswordlessAuth.Repo

  describe ".init/1" do
    test "returns error when emails are wrong" do
      Process.flag(:trap_exit, true)

      name = :repo_test_1
      Repo.start_link(name: name, emails: "")

      assert_receive {:EXIT, _, "Invalid list of emails"}
    end

    test "starts the repo when emails is a list" do
      name = :repo_test_1
      assert {:ok, _pid} = Repo.start_link(name: name, emails: ["foo@email.com"])
    end
  end
end
```

Running the test shows that everything works as we expect:

```bash
$ mix test test/passwordless_auth/repo_test.exs
==> passwordless_auth
..

Finished in 0.1 seconds
2 tests, 0 failures

Randomized with seed 407876
==> passwordless_auth_web
Test patterns did not match any file: test/passwordless_auth/repo_test.exs
```

Cool! Now we need to spawn the `Repo` process once the application starts, so let's add it to the main supervision tree:


```elixir
# apps/passwordless_auth/lib/passwordless_auth/application.ex

defmodule PasswordlessAuth.Application do
  use Application

  def start(_type, _args) do
    import Supervisor.Spec, warn: false

    children = [
      worker(
        PasswordlessAuth.Repo,
        [[emails: emails()]]
      )
    ]

    Supervisor.start_link(children, strategy: :one_for_one, name: PasswordlessAuth.Supervisor)
  end

  defp emails, do: Application.get_env(:passwordless_auth, :repo)[:emails]
end
```

If we try to start the application at this point, it will not do it, due to we have not set the emails in the configuration yet, just like we have asserted in the previous test:

```
$ iex -S mix
Erlang/OTP 21 [RELEASE CANDIDATE 1] [erts-10.0] [source] [64-bit] [smp:8:8] [ds:8:8:10] [async-threads:1] [hipe]

[info] Application passwordless_auth exited: PasswordlessAuth.Application.start(:normal, []) returned an error: shutdown: failed to start child: PasswordlessAuth.Repo
    ** (EXIT) "Invalid list of emails"
** (Mix) Could not start application passwordless_auth: PasswordlessAuth.Application.start(:normal, []) returned an error: shutdown: failed to start child: PasswordlessAuth.Repo
    ** (EXIT) "Invalid list of emails"
```

Let's add a list of emails to the configuration:


```elixir
# apps/passwordless_auth/config/config.exs

use Mix.Config

config :passwordless_auth,
       :repo,
       emails: ~w(foo@email.com bar@email.com baz@email.com)
```

And try to start it again:

```
$ iex -S mix
Erlang/OTP 21 [RELEASE CANDIDATE 1] [erts-10.0] [source] [64-bit] [smp:8:8] [ds:8:8:10] [async-threads:1] [hipe]

Interactive Elixir (1.6.5) - press Ctrl+C to exit (type h() ENTER for help)
iex(1)>
```

It works as expected, so let's move on to adding some logic to the `Repo` module.

### Repo logic

Before continuing, let's start the application and check how the current state of the `Repo` process looks like:

```
$ iex -S mix
...
iex(1)> :sys.get_state PasswordlessAuth.Repo
%{"bar@email.com" => nil, "baz@email.com" => nil, "foo@email.com" => nil}
iex(2)>
```

There is the map where we are going to store the authentication tokens. Let's continue by adding some functionality to validate if an email is valid, save and fetch token values:

```elixir
# apps/passwordless_auth/lib/passwordless_auth/repo.ex

defmodule PasswordlessAuth.Repo do
  #...

  def exists?(pid \\ @name, email),
    do: GenServer.call(pid, {:exists, email})

  def save(pid \\ @name, email, token),
    do: GenServer.call(pid, {:save, email, token})

  def fetch(pid \\ @name, email),
    do: GenServer.call(pid, {:fetch, email})

  # ...

  @impl true
  def handle_call({:exists, email}, _from, state) do
    {:reply, Map.has_key?(state, email), state}
  end

  def handle_call({:save, email, token}, _from, state) do
    if Map.has_key?(state, email) do
      {:reply, :ok, Map.put(state, email, token)}
    else
      {:reply, {:error, :invalid_email}, state}
    end
  end

  def handle_call({:fetch, email}, _from, state) do
    {:reply, Map.fetch(state, email), state}
  end
end
```

- `exists?/2` takes an email and checks if it belongs to the state's keys.
- `save/3` takes an email and a token, and tries to store it into the state, returning `:ok` if the email exists or `{:error, :invalid_email}` if it does not.
- `fetch/2` takes an email and fetches the state for its token value.

Let's add some tests for the new functionality:


```elixir
# apps/passwordless_auth/test/passwordless_auth/repo_test.exs

defmodule PasswordlessAuth.RepoTest do
  use ExUnit.Case, async: true

  alias PasswordlessAuth.Repo

  # ...

    describe ".exists?/2" do
    test "returns true when passed email is in the repo's state" do
      name = :repo_test_2
      email = "foo@test.com"
      {:ok, _pid} = Repo.start_link(name: name, emails: [email])

      assert Repo.exists?(name, email)
    end

    test "returns false when passed email no it repo's state" do
      name = :repo_test_3
      email = "foo@test.com"
      {:ok, _pid} = Repo.start_link(name: name, emails: [email])

      refute Repo.exists?(name, "not_found@test.com")
    end
  end

  describe ".save/3" do
    test "returns :ok and sets token value in state when email exists" do
      name = :repo_test_4
      email = "foo@test.com"
      token = "token-value"
      {:ok, _pid} = Repo.start_link(name: name, emails: [email])

      assert :ok = Repo.save(name, email, token)
      assert %{"foo@test.com" => ^token} = :sys.get_state(name)
    end

    test "returns {:error, :invalid_email} when email does not exist" do
      name = :repo_test_5
      email = "foo@test.com"
      token = "token-value"
      {:ok, _pid} = Repo.start_link(name: name, emails: [email])

      assert {:error, :invalid_email} = Repo.save(name, "bar@test.com", token)
    end
  end

  describe ".fetch/2" do
    test "returns {:ok, token} for passed email" do
      name = :repo_test_6
      email = "foo@test.com"
      token = "token-value"
      {:ok, _pid} = Repo.start_link(name: name, emails: [email])
      :ok = Repo.save(name, email, token)

      assert {:ok, ^token} = Repo.fetch(name, email)
    end

    test "returns :error when token not found" do
      name = :repo_test_7
      email = "foo@test.com"
      token = "token-value"
      {:ok, _pid} = Repo.start_link(name: name, emails: [email])
      :ok = Repo.save(name, email, token)

      assert :error = Repo.fetch(name, "not_found@test.com")
    end
  end
end
```

And check that they all pass:

```bash
$ mix test test/passwordless_auth/repo_test.exs
==> passwordless_auth
........

Finished in 0.1 seconds
8 tests, 0 failures
```

### Token logic

It looks like we have the basic stuff covered, for now, so let's create the `Token` module to handle token generation and verification. Phoenix has a convenient module for these purposes, [Phoenix.Token], and we can build our module wrapping it:

```elixir
# apps/passwordless_auth/lib/passwordless_auth/token.ex

defmodule PasswordlessAuth.Token do
  alias Phoenix.Token, as: PhoenixToken

  @salt "token salt"
  @max_age :timer.minutes(5) / 1000
  @secret Application.get_env(:passwordless_auth, __MODULE__)[:secret_key_base]

  def generate(data) when data in [nil, ""], do: {:error, :invalid}

  def generate(data) do
    {:ok, PhoenixToken.sign(@secret, @salt, data)}
  end

  def verify(token, data, max_age \\ @max_age) do
    case PhoenixToken.verify(
           @secret,
           @salt,
           token,
           max_age: max_age
         ) do
      {:ok, ^data} ->
        {:ok, data}

      {:ok, _other} ->
        {:error, :invalid}

      {:error, reason} ->
        {:error, reason}
    end
  end
end
```

- `generate/1` takes some `data` and returns `{:ok, token}` with the token generated using `Phoenix.Token.sign/4` unless the `data` it is receiving is either `nil` or and empty string, in which case it returns the corresponding `{:error, :invalid}` tuple.
- `verify/3` takes a `token`, `data` and a `max_age` and uses `Phoenix.Token.verify/4` to check id the `token` corresponds to `data`, and it has not expired yet.

Let's add a test module to check that everything works as it should:

```elixir
# apps/passwordless_auth/test/passwordless_auth/token_test.exs

defmodule PasswordlessAuth.TokenTest do
  use ExUnit.Case, async: true

  alias PasswordlessAuth.Token

  describe ".generate/1" do
    test "returns {:error, :invalid} when value is nil" do
      assert {:error, :invalid} = Token.generate(nil)
      assert {:error, :invalid} = Token.generate("")
    end

    test "returns {:ok, token}" do
      assert {:ok, _token} = Token.generate("foo")
    end
  end

  describe ".verify/3" do
    test "returns {:ok, data} when token is valid" do
      {:ok, token} = Token.generate("foo")

      assert {:ok, "foo"} = Token.verify(token, "foo")
    end

    test "returns {:error, :invalid} when token is not valid" do
      {:ok, token} = Token.generate("foo")

      assert {:error, :invalid} = Token.verify(token, "bar")
    end

    test "returns {:error, reason} when token expires" do
      {:ok, token} = Token.generate("foo")

      Process.sleep(150)
      assert {:error, :expired} = Token.verify(token, "foo", 0.1)
    end
  end
end
```

Now we can run the tests and see the result:

```
$ mix test test/passwordless_auth/token_test.exs
==> passwordless_auth


  1) test .verify/3 returns {:error, reason} when token expires (PasswordlessAuth.TokenTest)
     test/passwordless_auth/token_test.exs:30
     ** (UndefinedFunctionError) function nil.config/1 is undefined or private
     code: {:ok, token} = Token.generate("foo")
     stacktrace:
       nil.config(:secret_key_base)
       (phoenix) lib/phoenix/token.ex:202: Phoenix.Token.get_endpoint_key_base/1
       (phoenix) lib/phoenix/token.ex:111: Phoenix.Token.sign/4
       (passwordless_auth) lib/passwordless_auth/token.ex:25: PasswordlessAuth.Token.generate/1
       test/passwordless_auth/token_test.exs:31: (test)
```

It looks like we forgot adding the `:secret` value in the configuration, so let's go ahead and set it:

```elixir
# apps/passwordless_auth/config/config.exs

# ...

config :passwordless_auth,
       PasswordlessAuth.Token,
       secret_key_base: "your_secret_key_base"

```

To generate the `secret_key_base` value, you can use the `phx.gen.secret` mix task. After setting the value and running once more the tests, everything should be working fine now:

```bash
$ mix test test/passwordless_auth/token_test.exs
==> passwordless_auth
.....

Finished in 0.2 seconds
5 tests, 0 failures
```

### Providing and verifying tokens

Let's edit the main `PasswordlessAuth` module and add a new function to provide new tokens by using what we have done so far:

```elixir
# apps/passwordless_auth/lib/passwordless_auth.ex

defmodule PasswordlessAuth do
  alias PasswordlessAuth.{Repo, Token}

  def provide_token_for(repo \\ Repo, email)
  def provide_token_for(_, email) when email in [nil, ""], do: {:error, :invalid_email}

  def provide_token_for(repo, email) do
    with true <- Repo.exists?(repo, email),
         {:ok, token} <- Token.generate(email),
         :ok <- Repo.save(repo, email, token) do
      {:ok, token}
    else
      false ->
        {:error, :not_found}

      other ->
        {:error, :internal_error, other}
    end
  end
end
```

Before moving on to adding the verification logic, let's stop for a second and think about what we need. The function will receive a token, and we want to check not only it corresponds to any of the stored ones in the `Repo`, but also that the token's signed value corresponds to the email key under which is stored. Therefore, let's add a new function to return an email by its token from the `Repo` module:

```elixir
# apps/passwordless_auth/lib/passwordless_auth/repo.ex

defmodule PasswordlessAuth.Repo do
  # ...

  def find_by_token(pid \\ @name, token),
    do: GenServer.call(pid, {:find_by_token, token})

  # ...

  def handle_call({:find_by_token, token}, _from, state) do
    {:reply, Enum.find(state, &(elem(&1, 1) == token)), state}
  end
end
```

`find_by_token/2` checks if there is an element it the state with the value, returning the tuple of `{email, token}` or nil if not found. This might not be the most performant way of doing it, but as we have already agreed on that the repo is only going to store a few emails, let's keep it like this for simplicity's sake. Let's test it out:

```elixir
# apps/passwordless_auth/test/passwordless_auth/repo_test.exs

defmodule PasswordlessAuth.RepoTest do
  use ExUnit.Case, async: true

  alias PasswordlessAuth.Repo

  # ...

  describe ".find_by_token/2" do
    test "returns {email, token} when token exists" do
      name = :repo_test_8
      email = "foo@test.com"
      token = "token-value"
      {:ok, _pid} = Repo.start_link(name: name, emails: [email])
      :ok = Repo.save(name, email, token)

      assert {^email, ^token} = Repo.find_by_token(name, token)
    end

    test "returns nil when token not found" do
      name = :repo_test_9
      email = "foo@test.com"
      token = "token-value"
      {:ok, _pid} = Repo.start_link(name: name, emails: [email])
      :ok = Repo.save(name, email, token)

      assert nil == Repo.find_by_token(name, "other-token")
    end
  end
```

```bash
$ mix test test/passwordless_auth/repo_test.exs
==> passwordless_auth
..........

Finished in 0.1 seconds
10 tests, 0 failures
```

Now we are ready to continue where we left it, so let's go ahead and add the verification functionality to the `PasswordlessAuth` module:

```elixir
# apps/passwordless_auth/lib/passwordless_auth.ex

defmodule PasswordlessAuth do
  alias PasswordlessAuth.{Repo, Token}

  # ...

  def verify_token(repo \\ Repo, token) do
    repo
    |> Repo.find_by_token(token)
    |> do_verify()
  end

  # ...

  defp do_verify(nil), do: {:error, :not_found}
  defp do_verify({email, token}), do: Token.verify(token, email)
end
```

As we've been doing so far, let's create a test module for the `PasswordlessAuth` module:

```elixir
# apps/passwordless_auth/test/passwordless_auth_test.exs

defmodule PasswordlessAuthTest do
  use ExUnit.Case, async: true

  alias PasswordlessAuth.Repo

  describe "provide_token_for/2" do
    test "returns error when email is blank" do
      assert {:error, :invalid_email} = PasswordlessAuth.provide_token_for(nil)
      assert {:error, :invalid_email} = PasswordlessAuth.provide_token_for("")
    end

    test "returns error when email does not exist" do
      repo = :"repo_test_#{__MODULE__}_1"
      email = "foo@test.com"
      {:ok, _pid} = Repo.start_link(name: repo, emails: [email])

      assert {:error, :not_found} =
               PasswordlessAuth.provide_token_for(repo, "not-found-email@test.com")
    end

    test "returns token when valid email" do
      repo = :"repo_test_#{__MODULE__}_2"
      email = "foo@test.com"
      {:ok, _pid} = Repo.start_link(name: repo, emails: [email])

      assert {:ok, token} = PasswordlessAuth.provide_token_for(repo, email)
      assert byte_size(token) > 0
    end
  end

  describe "verify_token/2" do
    test "returns error when token not found" do
      repo = :"repo_test_#{__MODULE__}_3"
      email = "foo@test.com"
      {:ok, _pid} = Repo.start_link(name: repo, emails: [email])
      {:ok, _token} = PasswordlessAuth.provide_token_for(repo, email)

      assert {:error, :not_found} = PasswordlessAuth.verify_token(repo, "not-found-token")
    end

    test "returns value when token valid" do
      repo = :"repo_test_#{__MODULE__}_4"
      email = "foo@test.com"
      {:ok, _pid} = Repo.start_link(name: repo, emails: [email])
      {:ok, token} = PasswordlessAuth.provide_token_for(repo, email)

      assert {:ok, ^email} = PasswordlessAuth.verify_token(repo, token)
    end
  end
end
```

And finally run it to confirm that everything is working as it should:

```bash
$ mix test test/passwordless_auth_test.exs
==> passwordless_auth
.....

Finished in 0.07 seconds
5 tests, 0 failures

Randomized with seed 291795
```

Yay! Let's leave it here for now. In the next part of the series, we will take care of sending the authentication link via email to the user, and use this link to verify the token and authenticate a Phoenix Socket connection. In the meantime, don't forget to check out the source code with the final result of our small experiment:


<div class="btn-wrapper">
  <a href="https://github.com/bigardone/passwordless-auth" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>

Happy coding!


[this excellent article]:
https://www.smashingmagazine.com/2016/06/the-current-state-of-authentication-we-have-a-password-problem/
[Elixir umbrella project]:
https://elixir-lang.org/getting-started/mix-otp/dependencies-and-umbrella-projects.html#umbrella-projects
[GenServer]:https://hexdocs.pm/elixir/GenServer.html
[Phoenix.Token]:https://hexdocs.pm/phoenix/Phoenix.Token.html
