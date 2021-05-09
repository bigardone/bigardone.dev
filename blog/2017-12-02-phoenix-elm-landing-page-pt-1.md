---
title: Phoenix & Elm landing page (pt.1)
date: 2017-12-02
tags: elixir, phoenix, elm
excerpt: Bootstrapping the project and the basic API functionality to save our first leads
---

<div class="index">
  <p>This post belongs to the <strong>Phoenix & Elm landing page</strong> series.</p>
  <ol>
    <li><a href="/blog/2017/12/02/phoenix-elm-landing-page-pt-1/">Bootstrapping the project and the basic API functionality to save our first leads</a></li>
    <li><a href="/blog/2017/12/23/phoenix-elm-landing-page-pt-2/">Building the landing page UI and the basic Elm subscription form</a></li>
    <li><a href="/blog/2018/01/06/phoenix-elm-landing-page-pt-3/">Adding Google reCAPTCHA support to avoid spambots</a></li>
  </ol>

  <a href="https://github.com/bigardone/phoenix-and-elm-landing-page" target="_blank"><i class="fa fa-github"></i> Source code</a>
</div>


In these series, we are going to cover some common patterns and best practices related to using **Phoenix** and **Elm** to build a simple landing page with a subscription form. The primary goal is to achieve the following list of tasks:

- Create a new **Phoenix** project.
- Add a new **Phoenix** context for marketing leads.
- Add an **API** endpoint to insert a lead's data into the database.
- Build the landing page template using **Phoenix** and [Bulma](https://bulma.io/) as our CSS framework of choice.
- Add **Elm** to the project and build a subscription form that points to the API endpoint described previously.
- Add [Google's reCAPTCHA](https://developers.google.com/recaptcha/) widget to the **Elm** subscription form, and how to render it and how to handle a visitor's **reCAPTCHA** response.
- Build an HTTP client using [HTTPoison](https://github.com/edgurgel/httpoison) to verify the token received by the **reCAPTCHA** widget against **Google's reCAPTCHA API** from our backend.
- Add tests covering the subscription process using **mocks** for the HTTP clients.

Now that we have detailed what we need let's get cracking!

<img src="/images/blog/phoenix-elm-landing-page/landing-page.jpg" alt="Landing page" style="background: #fff;" />

### Creating the Phoenix project

Let's start by bootstrapping a new **Phoenix** project as we usually do:

```
$ mix phx.new landing_page
* creating landing_page/config/config.exs
* creating landing_page/config/dev.exs
* creating landing_page/config/prod.exs
...
```

After the task finishes, we can go to the generated project folder and create the database:

```
$ cd landing_page
$ mix ecto.create
The database for LandingPage.Repo has already been created
```

Now we are ready to start working on the backend.

### The Marketing context and Lead schema

Before continuing, let's stop for a second and think about what is the primary goal of our future landing page. The principal goal is not only to be the temporally home site of our awesome new product that we are working on but to let potential leads subscribe so we can take any marketing or business decision that we might need, like for instance sending them the latest news and promotions via email campaigns. Having this in mind, we can identify a `Marketing` context and a `leads` table for the database, so let's create both of them using the new **Phoenix** context generator:

```
$ mix phx.gen.context Marketing Lead leads full_name:string email:string
* creating lib/landing_page/marketing/lead.ex
* creating priv/repo/migrations/20171202101203_create_leads.exs
* creating lib/landing_page/marketing/marketing.ex
* injecting lib/landing_page/marketing/marketing.ex
* creating test/landing_page/marketing/marketing_test.exs
* injecting test/landing_page/marketing/marketing_test.exs
```

Before running the migrations task, we need to tweak the migration file just created to add a `unique` index to the `email` column, because we do not want leads subscribing multiple times with the same `email`:

``` elixir
# priv/repo/migrations/20171201145808_create_leads.exs

defmodule LandingPage.Repo.Migrations.CreateLeads do
  use Ecto.Migration

  def change do
    create table(:leads) do
      add(:full_name, :string, null: false)
      add(:email, :string, null: false)

      timestamps()
    end

    create(unique_index(:leads, [:email]))
  end
end
```

Now we can run the migrations task to create the table:

```
mix ecto.migrate
[info] == Running LandingPage.Repo.Migrations.CreateLeads.change/0 forward
[info] create table leads
[info] create index leads_email_index
[info] == Migrated in 0.0s
```

We also have to add the necessary validation rules and constraints to the `Lead` schema module, so let's edit it:

``` elixir
# lib/landing_page/marketing/lead.ex

defmodule LandingPage.Marketing.Lead do
  use Ecto.Schema
  import Ecto.Changeset
  alias LandingPage.Marketing.Lead

  @derive {Poison.Encoder, only: [:full_name, :email]}

  schema "leads" do
    field(:email, :string)
    field(:full_name, :string)

    timestamps()
  end

  @doc false
  def changeset(%Lead{} = lead, attrs) do
    lead
    |> cast(attrs, [:full_name, :email])
    |> validate_required([:full_name, :email])
    |> unique_constraint(:email)
  end
end
```

Apart from adding the `unique_constraint` check function, we are also adding the `@derive` clause specifying the fields we want to return when a `%Lead{}` struct is automatically encoded by **Poison**, which is very convenient while developing **JSON APIs**, as we are going to see in a minute.

### The API endpoint and saving leads

Now that our context and schema are ready to start saving leads, let's add the new **route** that we are going to use for this purpose:

``` elixir
# lib/landing_page_web/router.ex

defmodule LandingPageWeb.Router do
  use LandingPageWeb, :router

	# ...

  # Other scopes may use custom stacks.
  scope "/api", LandingPageWeb do
    pipe_through(:api)

    scope "/v1", V1 do
      post("/leads", LeadController, :create)
    end
  end
end
```

Let's continue with a more test-driven approach and create a new test file that covers how we expect the controller to work:

``` elixir
# test/landing_page_web/controllers/v1/lead_controller_test.exs

defmodule LandingPageWeb.V1.LeadControllerTest do
  use LandingPageWeb.ConnCase

  describe "POST /api/v1/leads" do
    test "returns error response with invalid parms", %{conn: conn} do
      conn = post(conn, lead_path(conn, :create), %{"lead" => %{}})

      assert json_response(conn, 422) == %{
               "full_name" => ["can't be blank"],
               "email" => ["can't be blank"]
             }
    end

    test "returns success response with valid params", %{conn: conn} do
      params = %{
        "lead" => %{"full_name" => "John", "email" => "foo@bar.com"}
      }

      conn = post(conn, lead_path(conn, :create), params)
      assert json_response(conn, 200) == params["lead"]
    end
  end
end
```

It is a very basic test, but it pretty much covers what we need at the moment. If the `lead` parameter is invalid, it should return a `422` response (unprocessable entity) along with the validation errors. On the other hand, if the sent parameters are correct, it will return a success response along with the inserted data. Let's run the `mix test` task and see what happens:

```
$ mix test test/landing_page_web/controllers/v1/lead_controller_test.exs


  1) test POST /api/v1/leads returns success response with valid params (LandingPageWeb.V1.LeadControllerTest)
     test/landing_page_web/controllers/v1/lead_controller_test.exs:14
     ** (UndefinedFunctionError) function LandingPageWeb.V1.LeadController.init/1 is undefined (module LandingPageWeb.V1.LeadController is not available)
     code: conn = post(conn, lead_path(conn, :create), params)
     stacktrace:
       LandingPageWeb.V1.LeadController.init(:create)
       (landing_page) lib/landing_page_web/router.ex:1: anonymous fn/1 in LandingPageWeb.Router.__match_route__/4
       (phoenix) lib/phoenix/router.ex:278: Phoenix.Router.__call__/1
       (landing_page) lib/landing_page_web/endpoint.ex:1: LandingPageWeb.Endpoint.plug_builder_call/2
       (landing_page) lib/landing_page_web/endpoint.ex:1: LandingPageWeb.Endpoint.call/2
       (phoenix) lib/phoenix/test/conn_test.ex:224: Phoenix.ConnTest.dispatch/5
       test/landing_page_web/controllers/v1/lead_controller_test.exs:19: (test)



  2) test POST /api/v1/leads returns error response with invalid parms (LandingPageWeb.V1.LeadControllerTest)
     test/landing_page_web/controllers/v1/lead_controller_test.exs:5
     ** (UndefinedFunctionError) function LandingPageWeb.V1.LeadController.init/1 is undefined (module LandingPageWeb.V1.LeadController is not available)
     code: conn = post(conn, lead_path(conn, :create), %{"lead" => %{}})
     stacktrace:
       LandingPageWeb.V1.LeadController.init(:create)
       (landing_page) lib/landing_page_web/router.ex:1: anonymous fn/1 in LandingPageWeb.Router.__match_route__/4
       (phoenix) lib/phoenix/router.ex:278: Phoenix.Router.__call__/1
       (landing_page) lib/landing_page_web/endpoint.ex:1: LandingPageWeb.Endpoint.plug_builder_call/2
       (landing_page) lib/landing_page_web/endpoint.ex:1: LandingPageWeb.Endpoint.call/2
       (phoenix) lib/phoenix/test/conn_test.ex:224: Phoenix.ConnTest.dispatch/5
       test/landing_page_web/controllers/v1/lead_controller_test.exs:6: (test)



Finished in 0.09 seconds
2 tests, 2 failures

Randomized with seed 665970
```

As expected, the test is failing because we have not created the controller module yet, so let's add it:

``` elixir
# lib/landing_page_web/controllers/v1/lead_controller.ex

defmodule LandingPageWeb.V1.LeadController do
  use LandingPageWeb, :controller

  alias LandingPage.Marketing

  plug(:scrub_params, "lead")

  def create(conn, %{"lead" => params}) do
    with {:ok, lead} <- Marketing.create_lead(params) do
      json(conn, lead)
    end
  end
end
```

We are using the `scrub_params` plug to check if the lead parameter is present and to convert any of its empty keys to nil values. To create the lead, we are using `Marketing.create_lead`, which we created before while generating the context. However, we are only pattern matching against the successful `{:ok, lead}` response, and there might be validation errors, throwing a runtime error due to the missing pattern matching against `{:error, _}`. So what is the reason for doing it like so? Simply because we want to introduce the new `Phoenix.Controller.action_fallback/1` macro, which registers a `plug` to call as a fallback when an action doesn't return a valid `%Plug.Conn{}` structure. In our particular case, if there is any validation error, it returns a `{:error, %Ecto.Changeset{}}` that we need to handle, so let's setup the fallback controller:

``` elixir
# lib/landing_page_web.ex

defmodule LandingPageWeb do
# ...

  def controller do
    quote do
      use Phoenix.Controller, namespace: LandingPageWeb
      import Plug.Conn
      import LandingPageWeb.Router.Helpers
      import LandingPageWeb.Gettext

      action_fallback(LandingPageWeb.FallbackController)
    end
  end

  # ...
end
```

Adding `action_fallback` to the main `LandingPageWeb` module makes it available to all of the controllers, but we also have to create the `FallbackController` plug module itself, implementing the `call/2` function:

``` elixir
# lib/landing_page_web/controllers/fallback_controller.ex

defmodule LandingPageWeb.FallbackController do
  use LandingPageWeb, :controller

  def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
    conn
    |> put_status(:unprocessable_entity)
    |> render(LandingPageWeb.ErrorView, "error.json", changeset: changeset)
  end
end
```

When it receives an error with a `changeset`, it sets the `unprocessable_entity` status to the connection and renders the `error.json` template from the `LandingPageWeb.ErrorView` module that we also need to implement in the existing module:

``` elixir
# lib/landing_page_web/views/error_view.ex

defmodule LandingPageWeb.ErrorView do
  use LandingPageWeb, :view

  import LandingPageWeb.ErrorHelpers

  # ...

  def render("error.json", %{changeset: changeset}) do
    Ecto.Changeset.traverse_errors(changeset, &translate_error/1)
  end

  # ...
end
```

Calling Ectos's `traverse_errors` using the `translate_errors` from the `ErrorHelpers` module, returns the list of changeset errors we have described in the controller's test. Let's rerun the test task to verify that we are good to go:

```
$ mix test test/landing_page_web/controllers/v1/lead_controller_test.exs
..
Finished in 0.1 seconds
2 tests, 0 failures

Randomized with seed 304229
```

Awesome, all test are passing, and the controller is working as we initially planned. In regards to the back-end we have everything that we need, for now, so in the next part we will focus on the front-end side, install all dependencies that we need such as **Elm** and **Bulma**, building the basic layout and the subscription form to start saving the first leads. In the meantime, you can check out the source code of what we have done so far [here](https://github.com/bigardone/phoenix-and-elm-landing-page/tree/tutorial/part-1).

Happy coding!
