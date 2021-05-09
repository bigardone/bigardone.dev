---
title: Elixir and Phoenix basic passwordless and databaseless authentication (pt.2)
date: 2018-06-20
tags: elixir, phoenix, elm
excerpt: Sending authentication link emails and the user socket connection
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

In the [previous part] of the series, we set up the umbrella application for our new project and created the necessary modules for storing and generating authentication tokens. Having this done, the next step is sending emails to valid users, containing the sign-in link that will authenticate them into the system once clicked.

![Final result](https://monosnap.com/image/5VUT424b4Hu9ITi8r1SGae7HQleCPT.png)

### Sending emails
To send emails in an Elixir application I usually rely on [Bamboo] from the awesome team at [thoughtbot], which is not only simple and powerful, but very customizable as well. Let's go ahead and add the dependency to the project, under the `PasswordlessAuthWeb` application:

```elixir
# apps/passwordless_auth_web/mix.exs

defmodule PasswordlessAuthWeb.Mixfile do
  use Mix.Project

  # ...

  defp deps do
    [
      {:phoenix, "~> 1.3.2"},
      {:phoenix_pubsub, "~> 1.0"},
      {:phoenix_html, "~> 2.10"},
      {:phoenix_live_reload, "~> 1.0", only: :dev},
      {:gettext, "~> 0.11"},
      {:passwordless_auth, in_umbrella: true},
      {:cowboy, "~> 1.0"},
      {:bamboo, "~> 0.8"}
    ]
  end

  # ...
end
```

Don't forget to run the necessary `deps.get` mix task in order to install it. Next step is configuring Bamboo:

```elixir
# apps/passwordless_auth_web/config/config.exs

use Mix.Config

# ...

# Bamboo mailer configuration
config :passwordless_auth_web,
       PasswordlessAuthWeb.Service.Mailer,
       adapter: Bamboo.LocalAdapter

# ...
```

In the configuration we are specifying two things:

- The name of the module we are going to use as an interface with `Bamboo`'s functionality.
- The adapter we want to use to send emails.

For our particular case and while developing the project, we are going to take advantage of the [LocalAdapter] which stores sent emails in memory and offers us a small inbox application where we can view them. In order to have access to this inbox application, we need to mount a new route it in the router, which will be only accessible in the `:dev` environment:

```elixir
# apps/passwordless_auth_web/lib/passwordless_auth_web/router.ex

defmodule PasswordlessAuthWeb.Router do
  use PasswordlessAuthWeb, :router

  if Mix.env() == :dev, do: forward("/sent_emails", Bamboo.EmailPreviewPlug)

  # ...
end
```

The only part we are missing is creating the `Mailer` module, so let's go ahead and add it:

```elixir
# apps/passwordless_auth_web/lib/passwordless_auth_web/service/mailer.ex

defmodule PasswordlessAuthWeb.Service.Mailer do
  use Bamboo.Mailer, otp_app: :passwordless_auth_web
end
```

If we start the Phoenix server at this point and visit [http://localhost:4000/sent_emails](http://localhost:4000/sent_emails), we should see the following message:

![Empty inbox](https://monosnap.com/image/gB604OQdzH4yWfhptA9PyaxD16M3AD.png)

This is completely fine, as we haven't sent any emails yet, so let's go ahead and create the necessary functionality to build up an email containing the authentication link using an email address and a token:

```elixir
# apps/passwordless_auth_web/lib/passwordless_auth_web/emails/auth_email.


defmodule PasswordlessAuthWeb.Emails.AuthEmail do
  import Bamboo.Email, only: [new_email: 1]
  import PasswordlessAuthWeb.Router.Helpers, only: [page_url: 4]

  @from "support@passwordlessauth.com"

  def build(email, token) do
    url = page_url(PasswordlessAuthWeb.Endpoint, :index, [], token: token)

    new_email(
      to: email,
      from: @from,
      subject: "Your authentication link",
      html_body: """
      <p>Here is your authentication link:</p>
      <a href="#{url}">#{url}</a>
      <p>It is valid for 5 minutes.</p>
      """,
      text_body: """
      Here is your authentication link: \n
      #{url}\n
      It is valid for 5 minutes.
      """
    )
  end
end
```

With the token parameter and thanks to Phoenix's route helpers, we build the new Bamboo email which has the authentication link in its body, and which addressee is the email parameter. For the time being, let's use the default route that comes with Phoenix out of the box, and which points to `/`.

Let's test this out by starting the Phoenix server again and sending a new email:

```elixir
$ iex -S mix phx.server
Erlang/OTP 21 [erts-10.0] [source] [64-bit] [smp:8:8] [ds:8:8:10] [async-threads:1] [hipe]

[info] Running PasswordlessAuthWeb.Endpoint with Cowboy using http://0.0.0.0:4000
Interactive Elixir (1.6.6) - press Ctrl+C to exit (type h() ENTER for help)
iex(1)> email = PasswordlessAuthWeb.Emails.AuthEmail.build("foo@email.com", "token")
%Bamboo.Email{
  assigns: %{},
  bcc: nil,
  cc: nil,
  from: "support@passwordlessauth.com",
  headers: %{},
  html_body: "<p>Here is your authentication link:</p>\n<a href=\"http://localhost:4000/?token=token\">http://localhost:4000/?token=token</a>\n<p>It is valid for 5 minutes.</p>\n",
  private: %{},
  subject: "Your authentication link",
  text_body: "Here is your authentication link: \n\nhttp://localhost:4000/?token=token\n\nIt is valid for 5 minutes.\n",
  to: "foo@email.com"
}
iex(2)> PasswordlessAuthWeb.Service.Mailer.deliver_later email
[debug] Sending email with Bamboo.LocalAdapter:

%Bamboo.Email{assigns: %{}, bcc: [], cc: [], from: {nil, "support@passwordlessauth.com"}, headers: %{}, html_body: "<p>Here is your authentication link:</p>\n<a href=\"http://localhost:4000/?token=token\">http://localhost:4000/?token=token</a>\n<p>It is valid for 5 minutes.</p>\n", private: %{}, subject: "Your authentication link", text_body: "Here is your authentication link: \n\nhttp://localhost:4000/?token=token\n\nIt is valid for 5 minutes.\n", to: [nil: "foo@email.com"]}

iex(3)>

```

If we revisit [http://localhost:4000/sent_emails](http://localhost:4000/sent_emails), we can see the email that we just sent:

![Bamboo inbox](https://monosnap.com/image/PLsLxEljpZnc3KHuJLc7oR3Tl0CLPK.png)

But, how are the users going to request the authentication email?

### The authentication controller

Despite the admin site being an Elm single page application, that relies on a socket connection, we still need to provide a mechanism so users can request the authentication email. Let's use a controller for this:

```elixir
# apps/passwordless_auth_web/lib/passwordless_auth_web/controllers/authentication_controller.ex

defmodule PasswordlessAuthWeb.AuthenticationController do
  use PasswordlessAuthWeb, :controller

  alias PasswordlessAuthWeb.{Emails.AuthEmail, Service.Mailer}

  @email_regex ~r/^[A-Za-z0-9._%+-+']+@[A-Za-z0-9.-]+\.[A-Za-z]+$/

  def create(conn, params) do
    with %{"email" => email} <- params,
         true <- valid_email?(email),
         {:ok, token} <- PasswordlessAuth.provide_token_for(email) do
      build_and_deliver_email(email, token)
    end

    json(conn, %{message: gettext("auth.message")})
  end

  def valid_email?(email), do: Regex.match?(@email_regex, email)

  defp build_and_deliver_email(email, token) do
    email
    |> AuthEmail.build(token)
    |> Mailer.deliver_later()
  end
end
```

If the received parameters contain the `email` with a valid format, it provides a token, builds and delivers the authentication email. On the contrary, for security reasons we don't want to give any clues to the user if the email provided has a wrong format or it does not exist, so it just returns the same success message. Let's add a new route for this controller and action:

```elixir
# apps/passwordless_auth_web/lib/passwordless_auth_web/router.ex

defmodule PasswordlessAuthWeb.Router do
  use PasswordlessAuthWeb, :router

	if Mix.env() == :dev, do: forward("/sent_emails", Bamboo.EmailPreviewPlug)

	# ...

	pipeline :api do
		plug(:accepts, ["json"])
	end

	# ...

	scope "/api", PasswordlessAuthWeb do
		pipe_through(:api)

		post("/auth", AuthenticationController, :create)
	end
```

Finally, to check that everything works as we expect, let's add a new test module for the controller:

```elixir
# apps/passwordless_auth_web/test/passwordless_auth_web/controllers/authentication_controller_test.exs

defmodule PasswordlessAuthWeb.AuthenticationControllerTest do
  use PasswordlessAuthWeb.ConnCase
  use Bamboo.Test

  import PasswordlessAuthWeb.Gettext

  alias PasswordlessAuth.Repo
  alias PasswordlessAuthWeb.Emails.AuthEmail

  describe "POST /api/auth" do
    test "always returns success message no matter what parameters receives", %{conn: conn} do
      conn = post(conn, authentication_path(conn, :create), email: "foo@test.com")
      assert %{"message" => _} = json_response(conn, 200)

      conn = post(conn, authentication_path(conn, :create), %{})
      assert assert %{"message" => _} = json_response(conn, 200)
    end

    test "delivers the email only when valid email", %{conn: conn} do
      email = "#{__MODULE__}@email.com"
      Repo.add_email(email)

      post(conn, authentication_path(conn, :create), email: email)

      {:ok, token} = Repo.fetch(email)

      assert_delivered_email(AuthEmail.build(email, token))
    end

    test "does not deliver the email only when invalid email format", %{conn: conn} do
      email = "#{__MODULE__}emailcom"
      Repo.add_email(email)

      post(conn, authentication_path(conn, :create), email: email)

      {:ok, token} = Repo.fetch(email)

      refute_delivered_email(AuthEmail.build(email, token))
    end
  end
end
```

If we run it, we can check that it is actually working fine:

```bash
$ mix test test/passwordless_auth_web/controllers/authentication_controller_test.exs
==> passwordless_auth
Test patterns did not match any file: test/passwordless_auth_web/controllers/authentication_controller_test.exs
==> passwordless_auth_web
...

Finished in 0.1 seconds
3 tests, 0 failures

Randomized with seed 547795
```

Yay! Now that we have the email generation and delivery sorted out, let's move on the next important part of our application, the user socket.

### Authenticating the user socket connection

Phoenix creates a default `UserSocket` module while bootstrapping a new project, so let's edit it to add the authentication logic:

```elixir
# apps/passwordless_auth_web/lib/passwordless_auth_web/channels/user_socket.ex

defmodule PasswordlessAuthWeb.UserSocket do
  use Phoenix.Socket

  alias PasswordlessAuth

  ## Transports
  transport(:websocket, Phoenix.Transports.WebSocket)

  def connect(%{"token" => token}, socket) do
    case PasswordlessAuth.verify_token(token) do
      {:ok, email} ->
        {:ok, assign(socket, :user, %{email: email})}

      _ ->
        :error
    end
  end

  def connect(_, _socket), do: :error

  def id(socket), do: "user_socket:#{socket.assigns.user.email}"
end
```

The `connect/2` callback function receives a `token` parameter, and using `PasswordlessAuth.verify_token/1` checks whether this token is valid or not, assigning to the socket the corresponding email on success. On the other hand, if no `token` parameter is received or the verification goes wrong, it returns `:error` rejecting the connection. Let's add some unit tests to ensure that it works as we expect:

```elixir
# apps/passwordless_auth_web/test/passwordless_auth_web/channels/user_socket_test.exs

defmodule PasswordlessAuthWeb.UserSocketTest do
  use PasswordlessAuthWeb.ChannelCase, async: true

  alias Phoenix.Socket
  alias PasswordlessAuth.Repo
  alias PasswordlessAuthWeb.UserSocket

  describe "connect/2" do
    test "errors when passing invalid params or token" do
      assert :error = connect(UserSocket, %{})
      assert :error = connect(UserSocket, %{"token" => "invalid-token"})
    end

    test "joins when passing valid token" do
      email = "foo@#{__MODULE__}.com"
      :ok = Repo.add_email(email)
      {:ok, token} = PasswordlessAuth.provide_token_for(email)

      assert {:ok, %Socket{assigns: %{user: %{email: ^email}}}} =
               connect(UserSocket, %{"token" => token})
    end
  end
end
```

And run them to check the result:

```bash
$ mix test test/passwordless_auth_web/channels/user_socket_test.exs
==> passwordless_auth
Test patterns did not match any file: test/passwordless_auth_web/channels/user_socket_test.exs
==> passwordless_auth_web
..

Finished in 0.06 seconds
2 tests, 0 failures

Randomized with seed 589379
```

Cool, it works! I think this is all for today. In the next part, we will work on the front end side, configuring [webpack] as our asset build tool of choice, adding Elm support to start building the admin single page application, using everything we have done until now to authenticate users. In the meantime, don't forget to check out the source code with the final result:

<div class="btn-wrapper">
  <a href="https://github.com/bigardone/passwordless-auth" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>

Happy coding!


[previous part]: /blog/2018/06/09/elixir-and-phoenix-basic-passwordless-and-databaseless-authentication-pt-1
[Bamboo]: https://github.com/thoughtbot/bamboo
[thoughtbot]: https://thoughtbot.com/
[LocalAdapter]: https://hexdocs.pm/bamboo/Bamboo.LocalAdapter.html
[webpack]: https://webpack.js.org/
