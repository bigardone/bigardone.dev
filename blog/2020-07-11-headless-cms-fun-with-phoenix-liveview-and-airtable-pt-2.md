---
title: Headless CMS fun with Phoenix LiveView and Airtable (pt. 2)
date: 2020-07-11 00:54 PDT
tags: elixir, phoenix, liveview
excerpt: The project set up and implementing the repository pattern.
---
<div class="index">
  <p>This post belongs to the <strong>Headless CMS fun with Phoenix LiveView and Airtable</strong> series.</p>
  <ol>
    <li><a href="/blog/2020/07/02/headless-cms-fun-with-phoenix-liveview-and-airtable-pt-1">Introduction.</a></li>
    <li><a href="/blog/2020/07/11/headless-cms-fun-with-phoenix-liveview-and-airtable-pt-2">The project set up and implementing the repository pattern.</a></li>
    <li><a href="/blog/2020/07/19/headless-cms-fun-with-phoenix-liveview-and-airtable-pt-3">Content rendering using Phoenix LiveView.</a></li>
    <li><a href="/blog/2020/07/27/headless-cms-fun-with-phoenix-liveview-and-airtable-pt-4">Adding a cache to the repository and broadcasting changes to the views..</a></li>
  </ol>
  <a href="https://phoenixcms.herokuapp.com/" target="_blank"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/phoenix-cms" target="_blank"><i class="fa fa-github"></i> Source code</a>
</div>

In the [previous part] of these series, we talked about what we are going to be building and its two main parts. Today, we will focus on the Phoenix application, but you need the Airtable base to follow up on the tutorial. Therefore, if you don't have an Airtable account, [sign up], and click on the *Copy base* link located at the top right corner of the source base. Once you have imported it into your workspace, we can continue creating the Phoenix application.

<img class="center" src="/images/blog/phoenix-cms-1/site.jpg"/>

## Creating the Phoenix application

Before generating the project scaffold, let's install the latest version of [phx_new], which by the time I'm writing this part is `v1.5.3`.

```console
mix archive.install hex phx_new 1.5.3
```

Now we can generate the project by running the `mix phx.new` with the following options:

```console
mix phx.new phoenix_cms --no-ecto --no-gettext --no-dashboard --live
```

If you are not familiar with the options that we are using, here's a quick description of them:

- `--no-ecto`: we are not using any database connection, so let's get rid of the Ecto files and configuration.
- `--no-gettext`: we can also remove any translation-related dependency and files.
- `--no-dashboard`: Phoenix has a brand new [live dashboard] where you can see all the metrics related to your application. We are going to be installing it, later on, so let's remove it for now.
- `--live`: includes support for [Phoenix LiveView], which is essential for this project.


Once the task finishes generating the project files and installing the necessary dependencies, I like to do some cleanup, removing the extra content that the generator creates for you, usually these [CSS files and HTML].


## The Airtable client

Before continuing any further, let's define our domain entities, which are going to map the data stored in Airtable, starting with the `Content` struct which represents a content section, from the [contents table]:

```elixir
# lib/phoenix_cms/content.ex

defmodule PhoenixCms.Content do
  alias __MODULE__

  @type t :: %Content{
          id: String.t(),
          position: non_neg_integer,
          type: String.t(),
          title: String.t(),
          content: String.t(),
          image: String.t(),
          styles: String.t()
        }

  defstruct [:id, :position, :type, :title, :content, :image, :styles]
end
```

Let's continue by defining the `Article` struct, corresponding to the blog posts stored in the [articles table]:

```elixir
# lib/phoenix_cms/article.ex

defmodule PhoenixCms.Article do
  alias __MODULE__

  @type t :: %Article{
          id: String.t(),
          slug: String.t(),
          title: String.t(),
          description: String.t(),
          image: String.t(),
          content: String.t(),
          author: String.t(),
          published_at: Date.t()
        }

  defstruct [:id, :slug, :title, :description, :image, :content, :author, :published_at]
end
```

The next step is to request the data to Airtable, taking advantage of its API, and convert the received data into the domain entities we have just defined. To implement the HTTP client, let's add [Tesla] to the project's dependencies, and install them running `mix deps.get`.


```elixir
# mix.exs

defmodule PhoenixCms.MixProject do
  use Mix.Project

  # ...
  # ...


  defp deps do
    [
      # ...

      # Http client
      {:tesla, "~> 1.3"},
      {:hackney, "~> 1.16.0"}
    ]
  end

  # ...
end
```

Tesla suggests setting `hackney` as its default adapter, so let's go ahead and do that:

```elixir
# config/config.exs

use Mix.Config

# ...

# Tesla configuration
config :tesla, adapter: Tesla.Adapter.Hackney

# ...
```

Once we have everything ready we can start implementing the client. When I have to use external services, such as Airtable, I like to separate any related logic in a different namespace, such as `Services`:


```elixir
# lib/services/airtable.ex

defmodule Services.Airtable do
  # We are going to implement the public interface in a minute...

  defp client do
    middleware = [
      {Tesla.Middleware.BaseUrl, api_url() <> base_id()},
      Tesla.Middleware.JSON,
      Tesla.Middleware.Logger,
      {Tesla.Middleware.Headers, [{"authorization", "Bearer " <> api_key()}]}
    ]

    Tesla.client(middleware)
  end

  defp do_get(path) do
    client()
    |> Tesla.get(path)
    |> case do
      {:ok, %{status: 200, body: body}} ->
        {:ok, body}

      {:ok, %{status: status}} ->
        {:error, status}

      other ->
        other
    end
  end

  defp api_url, do: Application.get_env(:phoenix_cms, __MODULE__)[:api_url]

  defp api_key, do: Application.get_env(:phoenix_cms, __MODULE__)[:api_key]

  defp base_id, do: Application.get_env(:phoenix_cms, __MODULE__)[:base_id]
end
```

The `client` function returns a `Tesla.Client` using the following middleware:

- `Tesla.Middleware.BaseUrl`, which sets the base URL for all the requests.
- `Tesla.Middleware.JSON`, which encodes requests and decodes responses as JSON.
- `Tesla.Middleware.Logger`, which logs requests and responses.
- `Tesla.Middleware.Headers`, which sets headers for all requests, and in this particular case, the `authorization` header with the bearer token from Airtable.

For the base URL, we need to set both the `api_url` and `base_id` keys in the application's configuration. The same happens for `api_key`:

```elixir
# config/config.exs

use Mix.Config

# ...


# Airtable configuration
config :phoenix_cms, Services.Airtable,
  api_key: "YOUR API KEY",
  base_id: "YOUR BASE ID",
  api_url: "https://api.airtable.com/v0/"
```

You can find your `api_key` in your Airtable account page, and the `base_id` in your API documentation page.

The `do_get` function takes a `path` and performs a `GET` request using the client. Since we don't want to deal with anything related to Tesla outside this module, it returns either a `{:ok, body}` or a `{:error, reason}` tuple. There's one thing left: to add the public interface, so let's go ahead and add two functions, one for getting all records from a table and the other for getting a table record by its ID:

```elixir
# lib/services/airtable.ex

defmodule Services.Airtable do
  def all(table), do: do_get("/#{table}")

  def get(table, record_id), do: do_get("/#{table}/#{record_id}")

  # ...
end
```

Let's jump into `iex` and test the client, limiting the response to a single record:

```console
➜ iex -S mix
Erlang/OTP 23 [erts-11.0.2] [source] [64-bit] [smp:8:8] [ds:8:8:10] [async-threads:1]

Interactive Elixir (1.10.4) - press Ctrl+C to exit (type h() ENTER for help)
iex(1)> Services.Airtable.all("contents?maxRecords=1")
[info] GET https://api.airtable.com/v0/YOUR_TABLE_ID/contents?maxRecords=1 -> 200 (614.224 ms)
[debug]
>>> REQUEST >>>
(Ommited request headers)

<<< RESPONSE <<<
(Ommited response headers)

(Ommited response payload)
{:ok,
 %{
   "records" => [
     %{
       "createdTime" => "2020-07-01T05:27:44.000Z",
       "fields" => %{
         "content" => "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
         "id" => "feature_4",
         "image" => [
           %{
             "filename" => "pipe.png",
             "id" => "attJxlSNbmLRra4qx",
             "size" => 11828,
             "thumbnails" => %{
               "full" => %{
                 "height" => 3000,
                 "url" => "https://dl.airtable.com/.attachmentThumbnails/fe2e0dcd3e2a969f1816570e02dad366/7c9e2246",
                 "width" => 3000
               },
               "large" => %{
                 "height" => 512,
                 "url" => "https://dl.airtable.com/.attachmentThumbnails/2651c43ab85e28d2ba0c574f36ee7a1a/fe4a5495",
                 "width" => 512
               },
               "small" => %{
                 "height" => 36,
                 "url" => "https://dl.airtable.com/.attachmentThumbnails/0d717bf44d9552c7e25482496bc30c3c/6e29a1ad",
                 "width" => 36
               }
             },
             "type" => "image/png",
             "url" => "https://dl.airtable.com/.attachments/70ff8a20d056c7dfb677f1fc6bc79771/abea3535/pipe.png"
           }
         ],
         "position" => 10,
         "title" => "Feature 4",
         "type" => "feature"
       },
       "id" => "rec7VPdanrfUyvYnw"
     }
   ]
 }}
```

It works! Now let's confirm that the `get/2` function works as well using the previous record ID:

```console
iex(2)> Services.Airtable.get("contents", "rec7VPdanrfUyvYnw")
[info] GET https://api.airtable.com/v0/YOUR_TABLE_ID/contents/rec7VPdanrfUyvYnw -> 200 (6455.924 ms)
[debug]
>>> REQUEST >>>
(Ommited request headers)
<<< RESPONSE <<<
(Ommited response headers)

(Ommited response payload)
{:ok,
 %{
   "createdTime" => "2020-07-01T05:27:44.000Z",
   "fields" => %{
     "content" => "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
     "id" => "feature_4",
     "image" => [
       %{
         "filename" => "pipe.png",
         "id" => "attJxlSNbmLRra4qx",
         "size" => 11828,
         "thumbnails" => %{
           "full" => %{
             "height" => 3000,
             "url" => "https://dl.airtable.com/.attachmentThumbnails/fe2e0dcd3e2a969f1816570e02dad366/7c9e2246",
             "width" => 3000
           },
           "large" => %{
             "height" => 512,
             "url" => "https://dl.airtable.com/.attachmentThumbnails/2651c43ab85e28d2ba0c574f36ee7a1a/fe4a5495",
             "width" => 512
           },
           "small" => %{
             "height" => 36,
             "url" => "https://dl.airtable.com/.attachmentThumbnails/0d717bf44d9552c7e25482496bc30c3c/6e29a1ad",
             "width" => 36
           }
         },
         "type" => "image/png",
         "url" => "https://dl.airtable.com/.attachments/70ff8a20d056c7dfb677f1fc6bc79771/abea3535/pipe.png"
       }
     ],
     "position" => 10,
     "title" => "Feature 4",
     "type" => "feature"
   },
   "id" => "rec7VPdanrfUyvYnw"
 }}
```

Yay! The Airtable client is ready. However, we still have to convert the returned payload into the domain entities we created previously, and for that, we are going to make use of the *Repository pattern*.

### The Repository pattern

This pattern provides an abstraction of the data layer, which decouples it from its source or persistence layer, making it accessible through a series of straightforward functions. The basic idea is to have a public interface as the primary repository module that relies on different adapters, using the most suitable one depending on the situation or environment. The two adapters that we are going to implement are:

- An HTTP adapter, powered by the `Services.Airtable` client, which we are going to be using while developing and in the production environment.
- A fake adapter that returns hardcoded results, which we can use in our tests, prevents unnecessary HTTP requests against Airtable's API.

Let's go ahead and implement the main repository module:

```elixir
# lib/phoenix_cms/repo.ex

defmodule PhoenixCms.Repo do
  alias PhoenixCms.{Article, Content}

  # Behaviour callbacks

  @type entity_types :: Article.t() | Content.t()

  @callback all(Article | Content) :: {:ok, [entity_types]} | {:error, term}
  @callback get(Article | Content, String.t()) :: {:ok, entity_types} | {:error, term}

  # Sets the adapter
  @adapter Application.get_env(:phoenix_cms, __MODULE__)[:adapter]

  # Public API functions
  def articles, do: @adapter.all(Article)

  def contents, do: @adapter.all(Content)

  def get_article(id), do: @adapter.get(Article, id)
end
```

In this module we are doing three different things:

1. First of all, it is describing the necessary callback functions that any module needs to implement to become a repository adapter. These functions are, `all` which receives an Article or Content atom and returns a `{:ok, items}` tuple on success or a `{:error, reason}` tuple on error.
2. It's also setting the current `@adapter` module variable from the application configuration.
3. Finally, it also implements three different functions, the public API of the repository, which internally use the corresponding adapter functions thanks to the previous dependency injection.

Knowing the repository interface, let's implement the HTTP adapter that relies on the `Services.Airtable` client that we created before:

```elixir
# lib/phoenix_cms/repo/http.ex

defmodule PhoenixCms.Repo.Http do
  alias __MODULE__.Decoder
  alias PhoenixCms.{Article, Content, Repo}
  alias Services.Airtable

  @behaviour Repo

  @articles_table "articles"
  @contents_table "contents"

  @impl Repo
  def all(Article), do: do_all(@articles_table)
  def all(Content), do: do_all(@contents_table)

  @impl Repo
  def get(Article, id), do: do_get(@articles_table, id)
  def get(Content, id), do: do_get(@contents_table, id)

  defp do_all(table) do
    case Airtable.all(table) do
      {:ok, %{"records" => records}} ->
        {:ok, Decoder.decode(records)}

      {:error, 404} ->
        {:error, :not_found}

      other ->
        other
    end
  end

  defp do_get(table, id) do
    case Airtable.get(table, id) do
      {:ok, response} ->
        {:ok, Decoder.decode(response)}

      {:error, 404} ->
        {:error, :not_found}

      other ->
        other
    end
  end
end
```

The module implements the necessary callback functions from the `Repo` behavior, using the `Services.Airtable` client to fetch the data from the corresponding table. Since the behaviour specifies that both of these functions return `Article` or `Contents` structs, it uses a `Decoder` module to convert the raw HTTP response items into these domain data structures:

```elixir
# lib/phoenix_cms/repo/http/decoder.ex

defmodule PhoenixCms.Repo.Http.Decoder do
  @moduledoc false

  alias PhoenixCms.{Article, Content}

  def decode(response) when is_list(response) do
    Enum.map(response, &decode/1)
  end

  def decode(%{
        "id" => id,
        "fields" =>
          %{
            "slug" => slug
          } = fields
      }) do
    %Article{
      id: id,
      slug: slug,
      title: Map.get(fields, "title", ""),
      description: Map.get(fields, "description", ""),
      image: decode_image(Map.get(fields, "image")),
      content: Map.get(fields, "content", ""),
      author: Map.get(fields, "author", ""),
      published_at: Date.from_iso8601!(Map.get(fields, "published_at"))
    }
  end

  def decode(%{
        "fields" =>
          %{
            "type" => type
          } = fields
      }) do
    %Content{
      id: Map.get(fields, "id", ""),
      position: Map.get(fields, "position", ""),
      type: type,
      title: Map.get(fields, "title", ""),
      content: Map.get(fields, "content", ""),
      image: decode_image(Map.get(fields, "image", "")),
      styles: Map.get(fields, "styles", "")
    }
  end

  defp decode_image([%{"url" => url}]), do: url
  defp decode_image(_), do: ""
end
```

Using pattern matching, it takes the necessary data to build the structs. Airtable does not send empty values, thus defaulting missing keys to empty strings. Let's jump back into `iex` and try it out:

```console
➜ iex -S mix
Erlang/OTP 23 [erts-11.0.2] [source] [64-bit] [smp:8:8] [ds:8:8:10] [async-threads:1]

Interactive Elixir (1.10.4) - press Ctrl+C to exit (type h() ENTER for help)
iex(1)> PhoenixCms.Repo.Http.all(PhoenixCms.Article)
{:ok,
 [
   %PhoenixCms.Article{
     author: "author-1@phoenixcms.com",
     ...
     ...
  ]
}

iex(2)> PhoenixCms.Repo.Http.all(PhoenixCms.Content)
{:ok,
 [
   %PhoenixCms.Content{
     content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
     id: "feature_4",
     ...
     ...
  ]
}
```

It works as expected! Let's continue with the fake adapter definition:

```elixir
# lib/phoenix_cms/repo/fake.ex

defmodule PhoenixCms.Repo.Fake do
  @moduledoc false

  alias PhoenixCms.{Article, Content, Repo}

  @behaviour Repo

  @impl Repo
  def all(Content) do
    {:ok,
     [
       %PhoenixCms.Content{
         id: "contents-1",
         # ...
       },
       %PhoenixCms.Content{
         id: "contents-2",
         # ...
       }
     ]}
  end

  def all(Article) do
    {:ok,
     [
       %Article{
         id: "article-1",
         # ..
       },
       %Article{
         id: "article-2",
         # ..
       }
     ]}
  end

  def all(_), do: {:error, :not_found}

  @impl Repo
  def get(entity, id) when entity in [Article, Content] do
    with {:ok, items} <- all(entity),
         {:ok, nil} <- {:ok, Enum.find(items, &(&1.id == id))} do
      {:error, :not_found}
    end
  end

  def get(_, _), do: {:error, :not_found}
end
```

This is the most basic implementation that we can make. However, since we are not going to be using it during the tutorial, it's good enough.

We are missing something tho, which is configuring the adapter module we want to use in our different environments:

```elixir
# config/config.exs

use Mix.Config

# ...

# Repo configuration
config :phoenix_cms, PhoenixCms.Repo, adapter: PhoenixCms.Repo.Http
```

I don't want to extend the articles more than the necessary, so we are not going to be implementing any tests. Nevertheless, if you're going to write your own, add the fake adapter to the test environment configuration to prevent unnecessary HTTP requests against Airtable:

```elixir
# config/test.exs

use Mix.Config

# ...

# Repo configuration
config :phoenix_cms, PhoenixCms.Repo, adapter: PhoenixCms.Repo.Fake
```

And that's all for today. In the next part, we will focus on the front-end, rendering the `Phoenix.LiveView` pages using the data returned by the repository, and eventually discovering that this is not a very good solution, and thinking about a more performant one. In the meantime, you can check the end result [here](https://phoenixcms.herokuapp.com/), or have a look at the [source code](https://github.com/bigardone/phoenix-cms).


Happy coding!

<div class="btn-wrapper">
  <a href="https://phoenixcms.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/phoenix-cms" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>



[previous part]: /blog/2020/07/02/headless-cms-fun-with-phoenix-liveview-and-airtable-pt-1
[sign up]: https://airtable.com/invite/r/uJ5KeMkl
[source base]: https://airtable.com/shribMafJ0mAR7nic/tblLCFjonKFPr4yiN/viwgxDq0PyWSRs8N4?blocks=hide
[phx_new]: https://hex.pm/packages/phx_new
[live dashboard]: https://github.com/phoenixframework/phoenix_live_dashboard
[Phoenix LiveView]: https://github.com/phoenixframework/phoenix_live_view
[CSS files and HTML]: https://github.com/bigardone/phoenix-cms/commit/cc718f7e2fff17a4126ab2cb4ef643ee25023ce7
[contents table]: https://airtable.com/shribMafJ0mAR7nic/tblLCFjonKFPr4yiN/viwgxDq0PyWSRs8N4?blocks=hide
[articles table]: https://airtable.com/shribMafJ0mAR7nic/tbli19sQuKyiKOwVL/viwbGrlrj6obHy0jl?blocks=hide
[Tesla]: https://hex.pm/packages/tesla

