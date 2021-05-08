---
title: Integration tests fun with Phoenix and React
date: 2016-01-29 22:01 PST
tags: elixir, phoenix, react, redux, tests
excerpt:
  Writing integration tests with Phoenix and React are
  easy and fun thanks to Hound, the browser automation and integration tests
  library for Elixir.
---

Testing complex **React** applications can be very tricky, so while coding my [Phoenix Trello][398c43b8]
tribute I needed an easy and fast way to test the critical interactions a user could
have with the application like registering or adding new stuff like boards and cards.

## Hound to the rescue

[Hound][753ceeda] is an **Elixir** library for writing integration tests which is very
easy to setup and works really great. To add it to a project we have to add the dependency:

```elixir
# mix.exs

defmodule PhoenixTrello.Mixfile do
  use Mix.Project
  # ...

  defp deps do
    [
      # ...
      {:hound, "~> 1.0.2"},
      # ...
    ]
  end

  # ...
end
```

Don't forget to run the necessary `mix deps.get`. We also need to tell it to start
before our tests by adding the following line to the `test_helper.exs` file:


```elixir
# test/test_helper.exs

# Add this line!
Application.ensure_all_started(:hound)

# Already existing content...
ExUnit.start

# ...
```

Next we need to change our test environment configuration and set the `server` option
to true:

```elixir
# config/test.exs

use Mix.Config

config :phoenix_trello, PhoenixTrello.Endpoint,
  http: [port: 4001],
  server: true

# ...

```

Now we need to configure **Hound** specifying the web browser driver it will use
to interact with the application. At first I opted for using **PhantomJS** because
it doesn't require opening any browser window while running the test suite, but
I suddenly found that it was not able to interact with some DOM elements like text
inputs due to [this issue][2b40434e]. So I switched to **ChromeDriver** and it
worked like a charm.

For using **ChromeDriver** we first need to download it from its [download page][0c9c3aa8],
install it and configure **Hound** to use it:

```elixir
# config/config.exs

# ...

# Start Hound for ChromeDriver
config :hound, driver: "chrome_driver"
```

The last step would be to create a `IntegrationCase` module which will contain all the
common functionality our integration tests will share:

```elixir
# test/support/integration_case.ex

defmodule PhoenixTrello.IntegrationCase do
  use ExUnit.CaseTemplate
  use Hound.Helpers

  using do
    quote do
      use Hound.Helpers

      import Ecto, only: [build_assoc: 2]
      import Ecto.Model
      import Ecto.Query, only: [from: 2]
      import PhoenixTrello.Router.Helpers
      import PhoenixTrello.Factory
      import PhoenixTrello.IntegrationCase

      alias PhoenixTrello.Repo

      # The default endpoint for testing
      @endpoint PhoenixTrello.Endpoint

      hound_session
    end
  end

  setup tags do
    :ok = Ecto.Adapters.SQL.Sandbox.checkout(PhoenixTrello.Repo)

    unless tags[:async] do
      Ecto.Adapters.SQL.Sandbox.mode(PhoenixTrello.Repo, {:shared, self()})
    end

    :ok
  end
end
```

And that's it! Let's begin with some testing fun.

### Writing integration tests

The first thing I wanted to test was that existing users were able to sign into the
application and see the home route with their boards:

```elixir
# test/integration/sign_in_test.exs

defmodule PhoenixTrello.SignInTest do
  use PhoenixTrello.IntegrationCase

  alias PhoenixTrello.User

  setup do
    user = %User{first_name: "John", last_name: "Doe", email: "john@phoenix-trello.com"}
    |> User.changeset(%{password: "12345678"})
    |> Repo.insert!

    {:ok, ${user: user}}
  end

  @tag :integration
  test "Sign in with existing email and password", {user: user} do
    navigate_to "/"

    sign_in_form = find_element(:id, "sign_in_form")

    sign_in_form
    |> find_within_element(:id, "user_email")
    |> fill_field(user.email)

    sign_in_form
    |> find_within_element(:id, "user_password")
    |> fill_field(user.password)

    sign_in_form
    |> find_within_element(:css, "button")
    |> click

    assert element_displayed?({:id, "authentication_container"})

    assert page_source =~ "#{user.first_name} #{user.last_name}"
    assert page_source =~ "My boards"
  end
end
```

Reading the test is very easy to understand what we it does. Before executing the test
it first inserts a new user into the database. The test starts by visiting the root route,
finding the sign in form and filling both the email and password inputs with the previously created user
data. It clicks the form button and it checks that an element with the id `authentication_container`
is displayed and if it founds in the page the user's full name and the text *My boards*. Don't forget to
check Hound's [official documentation][e46205e0] to learn more about its helpers and selectors.


### Running our test suite
To run it we first need to launch the **ChromeDriver** by opening a new terminal
window and executing:

```
$ chromedriver
Starting ChromeDriver 2.20.353124 (035346203162d32c80f1dce587c8154a1efa0c3b) on port 9515
Only local connections are allowed.
```

Now we can run our test:

```
$ mix test test/integration/sign_in_test.exs
Excluding tags: [:test]

.

Finished in 3.8 seconds (0.5s on load, 3.3s on tests)
1 test, 0 failures, 0 skipped

Randomized with seed 793757

```

Even though our application **DOM** is constantly changing by **React**, the test passes
without any weird hack from our side. This is because **Hound**'s selectors internally perform
a fixed number of retries to request the [specified element][0bf8347a]. Therefor we can
fine-tune the selector calls to perform more retries and even increase the time between retries,
which is very useful if we know that a component will need some more time to render.

### Automatically running our tests

If I'm working on a big test I usually like to run it constantly to check the results, but having
to run the test manually is a bit awkward. To avoid this we can use  the [mix-test-watch][677dbf2a]
library which automatically runs your tests after every save. Just add it to the dependencies and run `mix deps.get`:

```elixir
# mix.exs

defmodule PhoenixTrello.Mixfile do
  use Mix.Project
  # ...

  defp deps do
    [
      # ...
      {:mix_test_watch, "~> 0.2", only: :dev},
      # ...
    ]
  end

  # ...
end
```

Now we only have to run our tests using `mix test.watch` and it will start listening for changes,
running the specified tests when a test file is saved.


### Sharing common stuff between tests

Imagine for a moment that we want to add a new integration test to check if the board
creation functionality is not broken. To do so we first need the user to sign in, and we
already have this functionality implemented in our previous test, so it would be nice if
we could reuse it on every test we might need it. To do so we only need to add a couple of new methods
to the `IntegrationCase` file so they are available in all our integration tests:

```elixir
# test/support/integration_case.ex

defmodule PhoenixTrello.IntegrationCase do
  use ExUnit.CaseTemplate
  use Hound.Helpers

  # ...

  def create_user do
    user = %User{first_name: "John", last_name: "Doe", email: "john@phoenix-trello.com"}
    |> User.changeset(%{password: "12345678"})
    |> Repo.insert!
  end

  def user_sign_in(%{user: user}) do
    navigate_to "/"

    sign_in_form = find_element(:id, "sign_in_form")

    sign_in_form
    |> find_within_element(:id, "user_email")
    |> fill_field(user.email)

    sign_in_form
    |> find_within_element(:id, "user_password")
    |> fill_field(user.password)

    sign_in_form
    |> find_within_element(:css, "button")
    |> click

    assert element_displayed?({:id, "authentication_container"})
  end
end

```

Now we can refactor our `sign_in_test`:

```elixir
# test/integration/sign_in_test.exs

defmodule PhoenixTrello.SignInTest do
  use PhoenixTrello.IntegrationCase

  # ...

  @tag :integration
  test "Sign in with existing email/password" do
    user = create_user

    user_sign_in(%{user: user})

    assert page_source =~ "#{user.first_name} #{user.last_name}"
    assert page_source =~ "My boards"
  end
end
```

And it will keep working as before. Using them in the new test would be just the same:

```elixir
# test/integration/new_board_test.exs

defmodule PhoenixTrello.NewBoardTest do
  use PhoenixTrello.IntegrationCase

  alias PhoenixTrello.{User}

  setup do
    user = create_user

    {:ok, %{user: user}}
  end

  @tag :integration
  test "GET / with existing user", %{user: user} do
    user_sign_in(%{user: user})

    click({:id, "add_new_board"})

    assert element_displayed?({:id, "new_board_form"})

    new_board_form = find_element(:id, "new_board_form")

    new_board_form
    |> find_within_element(:id, "board_name")
    |> fill_field("New board")

    new_board_form
    |> find_within_element(:css, "button")
    |> click

    assert element_displayed?({:css, ".view-container.boards.show"})

    board = last_board(user)

    assert page_title =~ board.name
    assert page_source =~ "New board"
    assert page_source =~ "Add new list..."
  end

  def last_board(user) do
    user
    |> Repo.preload(:boards)
    |> Map.get(:boards)
    |> Enum.at(0)
  end
end
```

This way we can reorganize our code and be [DRY][5022e265].


### Conclusion
Writing integration tests this way is so easy and fun that there's no excuse for
not having at least the basic functionality covered. My only concern is that I would prefer
using **PhantomJS** rather than **ChromeDriver** so the browser window stops poping up
every time I make a change, but until I find a solution I don't mind watching
ghost users navigating through my application :)

Happy coding!

  [398c43b8]: https://github.com/bigardone/phoenix-trello "Phoenix Trello repository"
  [753ceeda]: https://github.com/HashNuke/hound "Hound repository"
  [2b40434e]: https://github.com/HashNuke/hound/issues/70 "PhantomJS issue"
  [0c9c3aa8]: https://sites.google.com/a/chromium.org/chromedriver/downloads "ChromeDriver downloads"
  [e46205e0]: http://hexdocs.pm/hound/readme.html "Hound documentation"
  [0bf8347a]: https://github.com/HashNuke/hound/blob/0.8.2/lib/hound/request_utils.ex#L9 "Hound make_req"
  [677dbf2a]: https://github.com/lpil/mix-test.watch "Mix test.watch"
  [5022e265]: https://en.wikipedia.org/wiki/Don%27t_repeat_yourself "DRY wikipedia"
