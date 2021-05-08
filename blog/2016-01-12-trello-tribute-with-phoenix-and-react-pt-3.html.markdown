---
title: Trello tribute with Phoenix and React (pt.3)
date: 2016-01-12
tags: elixir, phoenix, ecto
canonical: https://blog.diacode.com/trello-clone-with-phoenix-and-react-pt-3
excerpt:
  Defining the User model and adding JWT authentication to our Phoenix Trello clone.
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

## User sign up
Now that we have our [project all set up][547446b0], we are ready to create the ```User```
database migration and model. In this post we will see how to do this and also how
to let a visitor create a new user account.

### The User migration and model
**Phoenix** uses [Ecto][fc5b7c2a] for wrapping any interaction needed with the
database. If we were using **Rails** we could say that **Ecto** would be
something similar to **ActiveRecord** although it separates all the similar
functionality into different modules.

Before continuing we have to create the database by running:

```bash
$ mix ecto.create
```

Now let's create the new **Ecto** migration and model. The model generation task
receives as parameters the module name, its plural form for the schema name and the fields
it's going to have using a ```name:type``` syntax, so let's run it:

```bash
$ mix phoenix.gen.model User users first_name:string last_name:string email:string encrypted_password:string
```

If we take a look to the migration file just created we can notice instantly its
similarities with a **Rails** migration file:

```elixir
# priv/repo/migrations/20151224075404_create_user.exs

defmodule PhoenixTrello.Repo.Migrations.CreateUser do
  use Ecto.Migration

  def change do
    create table(:users) do
      add :first_name, :string, null: false
      add :last_name, :string, null: false
      add :email, :string, null: false
      add :encrypted_password, :string, null: false

      timestamps
    end

    create unique_index(:users, [:email])
  end
end

```

I've added ```null``` restrictions to the fields and even a unique index to the email.
This is because I like the database to be responsible for the data integrity
instead of relying on the application to do so as many other developers do. It's
just a matter of personal preferences I guess.

Now that the migration file is ready,
let's run it to create the ```users``` database table:

```bash
$ mix ecto.migrate
```

Now it's time to take a closer look to the ```User``` model:

```elixir
# web/models/user.ex

defmodule PhoenixTrello.User do
  use Ecto.Schema
  import Ecto.Changeset

  schema "users" do
    field :first_name, :string
    field :last_name, :string
    field :email, :string
    field :encrypted_password, :string

    timestamps
  end

  @required_fields ~w(first_name last_name email)
  @optional_fields ~w(encrypted_password)

  def changeset(model, params \\ %{}) do
    model
    |> cast(params, @required_fields, @optional_fields)
  end
end
```

Here can find two main different sections:

 - The **schema block** where we have all the metadata regarding table fields.
 - The **changeset** function, where we can define all validations and transformations applied to the data before being ready to use it in our application.

### Changeset validations and transformations

So when a user signs up we want to add some validations to the process because we have previously added
null restrictions to the table fields, and a unique constraint to the email. We have
to reflect this on the ```User``` model in order to handle possible runtime errors
caused by invalid data. We also want to encrypt the ```encrypted_password``` field
so even though we will use plain strings to specify a user's password, it will be
inserted in a secure way.

Let's update the model and add some validations first:

```elixir
# web/models/user.ex

defmodule PhoenixTrello.User do
  # ...

  schema "users" do
    # ...
    field :password, :string, virtual: true
    # ...
  end

  @required_fields ~w(first_name last_name email password)
  @optional_fields ~w(encrypted_password)

  def changeset(model, params \\ %{}) do
    model
    |> cast(params, @required_fields, @optional_fields)
    |> validate_format(:email, ~r/@/)
    |> validate_length(:password, min: 5)
    |> validate_confirmation(:password, message: "Password does not match")
    |> unique_constraint(:email, message: "Email already taken")
  end
end
```

Basically we've done the following modifications:

  - Added a new virtual ```password``` field which will not be inserted into the database but can be used as any other field for any other purpose. In our case it will be populated from the sign up form.
  - Make the ```password``` field required.
  - Added a validation to check the ```email``` format.
  - Added a validation to check if the ```password``` length is at least 5 chars long and also a it will check in the params if the ```password_confirmation``` has the same value.
  - Added a unique constraint to check if the ```email``` already exists.

With all these changes we have our validations covered. But we also need to fill
the ```encrypted_password``` field before saving the data. To do so, let's use the
[comeonin][00be625d] password hashing library by adding it to the ```mix.exs``` file
as an application and dependency:

```elixir
# mix.exs

defmodule PhoenixTrello.Mixfile do
  use Mix.Project
  # ...

  def application do
    [mod: {PhoenixTrello, []},
     applications: [
       # ...
       :comeonin
       ]
     ]
  end

  #...

  defp deps do
    [
      # ...
      {:comeonin, "~> 2.5.3"},
      # ...
    ]
  end
end
```

Don't forget to install by running:

```bash
$ mix deps.get

```

Now that we have **comeonin** installed let's get back to the ```User``` model and
add a new step in the **changeset** pipeline to generate the ```encrypted_password```
field:

```elixir
# web/models/user.ex

defmodule PhoenixTrello.User do
  # ...

  def changeset(model, params \\ %{}) do
    model
    # ... other validations and contraints
    |> generate_encrypted_password
  end

  defp generate_encrypted_password(current_changeset) do
    case current_changeset do
      %Ecto.Changeset{valid?: true, changes: %{password: password}} ->
        put_change(current_changeset, :encrypted_password, Comeonin.Bcrypt.hashpwsalt(password))
      _ ->
        current_changeset
    end
  end
end
```

In this new method we first check if the changeset is valid and if the ```password```
has changed. If so, we encrypt the password using **comeonin** and put it in the ```encrypted_password```
field of the changeset, otherwise we just return the changeset.

### The router

Now that our ```User``` model is ready let's continue implementing the sign up
process by modifying the ```router.ex``` file to create the ```:api``` pipeline
and our first route:

```elixir
# web/router.ex

defmodule PhoenixTrello.Router do
  use PhoenixTrello.Web, :router

  #...

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api", PhoenixTrello do
    pipe_through :api

    scope "/v1" do
      post "/registrations", RegistrationController, :create
    end
  end

  #...
end

```
So any ```POST``` request to ```/api/v1/registrations``` will be processed by the ```create```
action of the ```RegistrationController``` accepting **json**... quite self explanatory :)

### The controller

Before implementing the controller let's think about what we need. The visitor will
visit the sign up page, fill the form and submit it. If the data received by the
controller is valid then we want to insert a new ```User``` into the database, sign it into the system
and return its data along with the [jwt][dd02a897] authentication
token resulting of the signing process as **json** to the front-end. This token is
the one we are going to need not only to send it in every request
to authenticate the user, but also for allowing the user to access the private screens
of the application.

To handle this authentication and **jwt** generation we are going to use the
[Guardian][aa85d547] library which works really well. Just add it to the ```mix.exs```
file:

```elixir
# mix.exs

defmodule PhoenixTrello.Mixfile do
  use Mix.Project

  #...

  defp deps do
    [
      # ...
      {:guardian, "~> 0.13.0"},
      # ...
    ]
  end
end
```

After running ```mix deps.get``` we need to configure it in the ```config.exs``` file:

```elixir
# config/confg.exs

#...

config :guardian, Guardian,
  issuer: "PhoenixTrello",
  ttl: { 3, :days },
  verify_issuer: true,
  secret_key: <your guardian secret key>,
  serializer: PhoenixTrello.GuardianSerializer
```

We also need to create the ```GuardianSerializer``` that will tell **Guardian**
how to encode and decode the user into and out of the token:

```elixir
# lib/phoenix_trello/guardian_serializer.ex

defmodule PhoenixTrello.GuardianSerializer do
  @behaviour Guardian.Serializer

  alias PhoenixTrello.{Repo, User}

  def for_token(user = %User{}), do: { :ok, "User:#{user.id}" }
  def for_token(_), do: { :error, "Unknown resource type" }

  def from_token("User:" <> id), do: { :ok, Repo.get(User, String.to_integer(id)) }
  def from_token(_), do: { :error, "Unknown resource type" }
end

```

Now that everything is ready let's implement the ```RegistrationController```:


```elixir
# web/controllers/api/v1/registration_controller.ex

defmodule PhoenixTrello.RegistrationController  do
  use PhoenixTrello.Web, :controller

  alias PhoenixTrello.{Repo, User}

  plug :scrub_params, "user" when action in [:create]

  def create(conn, %{"user" => user_params}) do
    changeset = User.changeset(%User{}, user_params)

    case Repo.insert(changeset) do
      {:ok, user} ->
        {:ok, jwt, _full_claims} = Guardian.encode_and_sign(user, :token)

        conn
        |> put_status(:created)
        |> render(PhoenixTrello.SessionView, "show.json", jwt: jwt, user: user)

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(PhoenixTrello.RegistrationView, "error.json", changeset: changeset)
    end
  end
end

```

Thanks to **Elixir**'s [pattern matching](http://elixir-lang.org/getting-started/pattern-matching.html)
the ```create``` action expects a ```"user"```
key inside the params. With these params we will create a new ```User``` changeset and insert
it. If everything goes ok we use **Guardian** to ```encode_and_sign``` the new user
retrieving the ```jwt``` token and render it with the user as **json**. Otherwise,
if the changeset is invalid, we will render the errors as **json** so we can show
them to the user in the registration form.

### JSON serialization
**Phoenix** uses [Poison][7b1d0da0] as its default **JSON** library. As it's one of
**Phoenix**'s dependencies we don't have to do anything special to install it. What
we have to do is to update the ```User``` model to specify which fields we need
to serialize:

```elixir
# web/models/user.ex

defmodule PhoenixTrello.User do
  use PhoenixTrello.Web, :model
  # ...

   @derive {Poison.Encoder, only: [:id, :first_name, :last_name, :email]}

   # ...
 end
```

From now on when we render a user, or list of users, as the response of a controller
action or channel it will just return those specified fields. Easy as pie!

Having our back-end ready for registering new users in the next post we will move to
our front-end and code some **React** and **Redux** fun stuff to finish the sign up
process. Meanwhile, don't forget to check out the live demo and final source code:


<div class="btn-wrapper">
  <a href="https://phoenix-trello.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/phoenix-trello" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>

Happy coding!


  [547446b0]: /blog/2016/01/11/trello-tribute-with-phoenix-and-react-pt-2 "Part 2"
  [fc5b7c2a]: https://github.com/elixir-lang/ecto "Ecto"
  [00be625d]: https://github.com/elixircnx/comeonin "Comeonin"
  [dd02a897]: https://en.wikipedia.org/wiki/JSON_Web_Token "JWT"
  [aa85d547]: https://github.com/ueberauth/guardian "Guardian"
  [7b1d0da0]: https://github.com/devinus/poison "Poison"
