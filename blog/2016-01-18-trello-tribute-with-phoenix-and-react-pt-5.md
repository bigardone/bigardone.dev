---
title: Trello tribute with Phoenix and React (pt.5)
date: 2016-01-18
tags: elixir, phoenix, ecto
canonical: https://blog.diacode.com/trello-clone-with-phoenix-and-react-pt-5
published: true
excerpt:
  Seeding the database and creating the sign in controller for the Phoenix Trello Clone.
---
<div class="index">
  <p>This post belongs to the <strong>Trello tribute with Phoenix Framework and React</strong> series.</p>
  <ol>
    <li><a href="/blog/2016/01/04/trello-tribute-with-phoenix-and-react-pt-1">Intro and selected stack</a></li>
    <li><a href="/blog/2016/01/11/trello-tribute-with-phoenix-and-react-pt-2">Phoenix Framework project setup</a></li>
    <li><a href="/blog/2016/01/12/trello-tribute-with-phoenix-and-react-pt-3">The User model and JWT auth</a></li>
    <li><a href="/blog/2016/01/14/trello-tribute-with-phoenix-and-react-pt-4/">Front-end for sign up with React and Redux</a></li>
    <li><a href="/blog/2016/01/18/trello-tribute-with-phoenix-and-react-pt-5/">Database seeding and sign in controller</a></li>
    <li><a href="/blog/2016/01/20/trello-tribute-with-phoenix-and-react-pt-6/">Front-end authentication with React and Redux</a></li>
    <li><a href="/blog/2016/01/25/trello-tribute-with-phoenix-and-react-pt-7/">Sockets and channels</a></li>
    <li><a href="/blog/2016/01/28/trello-tribute-with-phoenix-and-react-pt-8/">Listing and creating boards</a></li>
    <li><a href="/blog/2016/02/04/trello-tribute-with-phoenix-and-react-pt-9/">Adding new board members</a></li>
    <li><a href="/blog/2016/02/15/trello-tribute-with-phoenix-and-react-pt-10/">Tracking connected board members</a></li>
    <li><a href="/blog/2016/02/24/trello-tribute-with-phoenix-and-react-pt-11/">Adding lists and cards</a></li>
    <li><a href="/blog/2016/03/04/trello-tribute-with-phoenix-and-react-pt-12/">Deploying our application on Heroku</a></li>
  </ol>

  <a href="https://phoenix-trello.herokuapp.com/"><i class="fa fa-cloud"></i> Live demo</a> |
  <a href="https://github.com/bigardone/phoenix-trello"><i class="fa fa-github"></i> Source code</a>
</div>

## User sign in
In the last [two][9d87aa6e] [posts][66de27d6] we prepared everything so that visitors
could sign up and create new user accounts. In this part we are going to see how
to seed the database with some predefined users. We are also going to create the
necessary functionality to let visitors sign in using their email and password.
Finally we will create a mechanism to retrieve the users data from
their authentication token.

### Seeding the database
If you have any previous experience with **Rails** then you will find that seeding the database in **Phoenix** is very similar. To do so, we just need to have a ```seedx.exs``` file:

```elixir
# priv/repo/seeds.exs

alias PhoenixTrello.{Repo, User}

[
  %{
    first_name: "John",
    last_name: "Doe",
    email: "john@phoenix-trello.com",
    password: "12345678"
  },
]
|> Enum.map(&User.changeset(%User{}, &1))
|> Enum.each(&Repo.insert!(&1))

```

In this file we basically insert into the database all the necessary data we want
our application to have as initial data. If you want to have any other user
just add it to the list and run the seed file like this:

```
$ mix run priv/repo/seeds.exs
```

### The sign in controller
Before creating the controller we need to make some modifications to the ```router.ex```
file:

```ruby
# web/router.ex

defmodule PhoenixTrello.Router do
  use PhoenixTrello.Web, :router

  #...

  pipeline :api do
    # ...

    plug Guardian.Plug.VerifyHeader
    plug Guardian.Plug.LoadResource
  end

  scope "/api", PhoenixTrello do
    pipe_through :api

    scope "/v1" do
      # ...

      post "/sessions", SessionController, :create
      delete "/sessions", SessionController, :delete

      # ...
    end
  end

  #...
end

```

Our first change is to add two new [plugs](http://www.phoenixframework.org/docs/understanding-plug)
to the ```:api``` pipeline:

 - **VerifyHeader**: this plug just looks for the token in the ```Authorization``` header.
 - **LoadResource**: makes the current resource available through ```Guardian.Plug.current_resource(conn)``` if the token is present.

We also need to add two more routes to the ```/api/v1``` scope for creating and
destroying the user's session,  both processed by the ```SessionController```. Let's begin
with the ```create``` action:

```ruby
# web/controllers/api/v1/session_controller.ex

defmodule PhoenixTrello.SessionController do
  use PhoenixTrello.Web, :controller

  plug :scrub_params, "session" when action in [:create]

  def create(conn, %{"session" => session_params}) do
    case PhoenixTrello.Session.authenticate(session_params) do
      {:ok, user} ->
        {:ok, jwt, _full_claims} = user |> Guardian.encode_and_sign(:token)

        conn
        |> put_status(:created)
        |> render("show.json", jwt: jwt, user: user)

      :error ->
        conn
        |> put_status(:unprocessable_entity)
        |> render("error.json")
    end
  end

  # ...
end
```

We are going to use the ```PhoenixTrello.Session``` helper module to authenticate the user
with the parameters we are receiving. If everything goes ```:ok``` then we will encode and sign in
the user. This will give us the ```jwt``` token so we can return it along with the ```user```
data as **JSON**. Let's take a look to the ```Session``` helper module before
continuing any further:

```ruby
# web/helpers/session.ex

defmodule PhoenixTrello.Session do
  alias PhoenixTrello.{Repo, User}

  def authenticate(%{"email" => email, "password" => password}) do
    user = Repo.get_by(User, email: String.downcase(email))

    case check_password(user, password) do
      true -> {:ok, user}
      _ -> :error
    end
  end

  defp check_password(user, password) do
    case user do
      nil -> false
      _ -> Comeonin.Bcrypt.checkpw(password, user.encrypted_password)
    end
  end
end

```

It tries to find the user by his email and check if the given password matches
the user's encrypted one. If the user exists and the password is correct it returns
a [tuple][afa8b01b] containing ```{:ok, user}```. On the other hand, if no user
is found or the password doesn't happen to match it just return the [atom][a6acb810] ```:error```.

Going back to the ```SessionController``` note it renders the ```error.json``` template
when the result of authenticating the user is the previous ```:error``` atom.
Finally we have to create the ```SessionView``` module for rendering both results:

```elixir
# web/views/session_view.ex

defmodule PhoenixTrello.SessionView do
  use PhoenixTrello.Web, :view

  def render("show.json", %{jwt: jwt, user: user}) do
    %{
      jwt: jwt,
      user: user
    }
  end

  def render("error.json", _) do
    %{error: "Invalid email or password"}
  end
end

```

### Already signed users
The reason for also returning the user's **JSON** representation while signing into
the application is that we might need it for multiple purposes like, for instance,
showing his name in the application's header. This is fulfilled with what we've
done so far. But what if the user refreshes the browser once in the
root route view? Simple, our application state managed by **Redux** would be reseted and
we wouldn't have that information available anymore possibly causing unwanted errors.
And we don't want that, so to prevent it we can create a new controller which
will be responsible for returning the authenticated user's data when needed.

Let's add a new route in the ```router.ex``` file:

```ruby
# web/router.ex

defmodule PhoenixTrello.Router do
  use PhoenixTrello.Web, :router

  #...

  scope "/api", PhoenixTrello do
    pipe_through :api

    scope "/v1" do
      # ...

      get "/current_user", CurrentUserController, :show

      # ...
    end
  end

  #...
end
```

Now we need the ```CurrentUserController``` which looks like this:

```ruby
# web/controllers/api/v1/current_user_controller.ex

defmodule PhoenixTrello.CurrentUserController do
  use PhoenixTrello.Web, :controller

  plug Guardian.Plug.EnsureAuthenticated, handler: PhoenixTrello.SessionController

  def show(conn, _) do
    user = Guardian.Plug.current_resource(conn)

    conn
    |> put_status(:ok)
    |> render("show.json", user: user)
  end
end

```

The ```Guardian.Plug.EnsureAuthenticated``` checks if there is a previously verified
token and if not it will handle the request with the ```:unauthenticated``` function of
the ```SessionController```. This is the way we are going to protect the private controllers,
so if we want certain routes to be accessible only by authenticated users we only have
to add this **plug** to their controllers. The rest of the functionality is pretty simple.
After ensuring there is an authenticated token, it will render the ```current_resource``` which
in our case would be the user.

Finally we have to add the ```unauthenticated``` handler to the ```SessionController```:

```elixir
# web/controllers/api/v1/session_controller.ex

defmodule PhoenixTrello.SessionController do
  use PhoenixTrello.Web, :controller

  # ...

  def unauthenticated(conn, _params) do
    conn
    |> put_status(:forbidden)
    |> render(PhoenixTrello.SessionView, "forbidden.json", error: "Not Authenticated")
  end
end
```

It will return a ```403``` forbidden status code along with a simple **JSON**
error string. With this we have finished all the back-end functionality related to
the user **sign in** and subsequent **authentications**. In the next post we'll
cover how to handle it in our front-end application and how to connect to the **UserSocket**,
the core of all the real-time sugar. Meanwhile, don't forget to check out the live
demo and final source code:

<div class="btn-wrapper">
  <a href="https://phoenix-trello.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/phoenix-trello" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>

Happy coding!


  [9d87aa6e]: /blog/2016/01/12/trello-tribute-with-phoenix-and-react-pt-3 "Part 3"
  [66de27d6]: /blog/2n016/01/14/trello-tribute-with-phoenix-and-react-pt-4 "Part 4"
  [afa8b01b]: http://elixir-lang.org/getting-started/basic-types.html#tuples "Elixir tuples"
  [a6acb810]: http://elixir-lang.org/getting-started/basic-types.html#atoms "Elixir atoms"
