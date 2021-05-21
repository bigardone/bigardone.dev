---
title: Headless CMS fun with Phoenix LiveView and Airtable (pt. 3)
date: 2020-07-19 23:14 PDT
tags: elixir, phoenix, liveview
excerpt: Content rendering using Phoenix LiveView.
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

In the [previous part], we generated the base application, and the Airtable API HTTP client to request both contents and blog articles. We also defined the `Article` and `Content` domain models, and implemented the repository pattern with two different adapters, one returning fake data for testing purposes, and the other using the Airtable HTTP client to request and convert the returned data into our domain. It's time for some front-end fun, so let's get cracking.

<img class="center" src="/images/blog/phoenix-cms-1/site.jpg"/>

## Rendering content using LiveView

One thing before continuing, though. I'm using [Bulma], which is very good looking and easy to use CSS framework for the UI styles. To use it, you need to add [this line](https://github.com/bigardone/phoenix-cms/blob/50c2fa1c83df5ffb9d13b92e9f2742fe1e013b55/lib/phoenix_cms_web/templates/layout/root.html.leex#L8) in the `root.html.leex` template, and [here](https://github.com/bigardone/phoenix-cms/blob/master/assets/css/app.scss) you can find the CSS file with the custom styles.

What is [Phoenix.LiveView]? The short definition would be: a library which provides rich, real-time user experiences with server-rendered HTML, without having to write almost any JS whatsoever, only using plain Elixir. But in reality, it is a bit more complicated.

[LiveView](LiveView) initially renders static HTML, which is fast and optimal for search and indexing engines. After the first rendering, it upgrades to a persistent connection, with its state, and is capable of listening to messages from both other processes and the browser, and update its state. Once the state is updated, it re-renders the parts of the HTML corresponding to these changes.

LiveView is currently so well integrated into Phoenix, that we can use them anywhere, including the router file as if they were controllers. Since we created the project with the `--live` option, we already have everything we need to start using it, so let's go ahead and edit the route file to add the three different live view that we need:

```elixir
# lib/phoenix_cms_web/router.ex

defmodule PhoenixCmsWeb.Router do
  use PhoenixCmsWeb, :router

  # ...


  scope "/", PhoenixCmsWeb do
    pipe_through :browser

    live "/", PageLive
    live "/blog", ArticlesLive
    live "/blog/:id/:slug", ShowArticleLive
  end

  # ...
end
```

We have three different routes in our application:

- `/`: which renders the home page using the `PageLive` live view.
- `/blog`: which renders all the articles using the `ArticlesLive` live view.
- `/blog/:id/:slug`: which renders a given article using the `ShowArticleLive` live view.


### Live navigation

LiveView provides support for live navigation using the browser's pushState API, making it possible to navigate between pages without full page reloads. Let's use this feature by adding links to both the home and the blog page in the main navigation bar:

```elixir
# lib/phoenix_cms_web/templates/layout/root.html.leex

<!DOCTYPE html>
<html lang="en">
  # ...

    <nav class="navbar has-shadow" role="navigation" aria-label="main navigation">
      <div class="container">
        <div class="navbar-brand">
          <%= live_patch "PhoenixCMS", to: Routes.live_path(@conn, PhoenixCmsWeb.PageLive), class: "navbar-item has-text-weight-bold has-text-link" %>
        </div>
        <div class="navbar-end">
          <%= live_patch "Blog", to: Routes.live_path(@conn, PhoenixCmsWeb.ArticlesLive), class: "navbar-item" %>
        </div>
      </div>
    </nav>

    # ...
</html>
```

[live_patch] renders a link which patches the current `LiveView` with the one specified in the `to` option, without reloading the whole page and adding a new entry in the browser's history. Now that we can navigate through our views let's implement the home page.

### The PageLive live view

<img class="center" src="/images/blog/phoenix-cms-1/home.png"/>

Let's start with the main home page:

```elixir
# lib/phoenix_cms_web/live/page_live.ex

defmodule PhoenixCmsWeb.PageLive do
  use PhoenixCmsWeb, :live_view

  alias PhoenixCmsWeb.LiveEncoder

  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign_socket(socket)}
  end

  # Missing assign_socket function...
end
```

The `mount/3` function receives `params`, the current `session`, and the `socket`, returning it with the assigned contents. Let's implement the `assign_socket/1` private function:

```elixir
# lib/phoenix_cms_web/live/page_live.ex

defmodule PhoenixCmsWeb.PageLive do
  use PhoenixCmsWeb, :live_view

  # ...

  defp assign_socket(socket) do
    case fetch_contents() do
      {:ok, contents} ->
        socket
        |> assign(:page_title, "Home")
        |> assign(:contents, contents)
        |> put_flash(:error, nil)

      _ ->
        socket
        |> assign(:page_title, "Home")
        |> assign(:contents, nil)
        |> put_flash(:error, "Error fetching data")
    end
  end

  # Missing fetch_contents function...
end
```

Depending on the result of the `fetch_contents/0` function, it assigns `:contents` or a flash `:error`. The `fetch_contents/0` looks like this:

```elixir
# lib/phoenix_cms_web/live/page_live.ex

defmodule PhoenixCmsWeb.PageLive do
  use PhoenixCmsWeb, :live_view

  # ...

  defp fetch_contents do
    with {:ok, contents} <- PhoenixCms.contents() do
      contents =
        contents
        |> Enum.sort_by(& &1.position)
        |> LiveEncoder.contents()

      {:ok, contents}
    end
  end
end
```

This function calls `PhoenixCms.contents/0`, which we haven't implemented yet, sorts contents by `position` and calls `LiveEncoder.contents/1`, which converts these `Content` structs into the payload which the live view template is expecting. When working with Pheonix apps, I like to delegate any business logic functions that need the `*Web` namespace from the main module, in our case `PhoenixCms`, acting as the public API between business logic and presentation. Let's go ahead and expose the functions that we need:

```elixir
# lib/phoenix_cms.ex

defmodule PhoenixCms do
  defdelegate articles, to: PhoenixCms.Repo

  defdelegate contents, to: PhoenixCms.Repo

  defdelegate get_article(id), to: PhoenixCms.Repo
end
```

Now we need to implement the `PhoenixCmsWeb.LiveEncoder` module and convert the list of `PhoenixCms.Content` into the payload that the live template needs to render:

```elixir
# lib/phoenix_cms_web/live/encoder.ex

defmodule PhoenixCmsWeb.LiveEncoder do
  alias PhoenixCms.Content

  def contents(items) when is_list(items) do
    {features, rest} =
      items
      |> Enum.map(&encode/1)
      |> Enum.split_with(&(&1.type == "feature"))

    rest
    |> Enum.concat([%{features: features}])
    |> List.flatten()
  end

  def encode(%Content{} = content) do
    Map.take(content, [:id, :type, :title, :content, :image, :styles])
  end
end
```

We want to render every content in its HTML section node, except for content with type feature, which we want to group them in the same section. Therefore, we split the contents into two different lists, extracting the ones with type `feature` and appending it as a map with a `features` key.

To render HTML in `LiveView`, you can either implement the `render/1` callback function or create a `your_view_template.html.leex` template in your live view folder. Let's take the second choice:

```elixir
# lib/phoenix_cms_web/live/page_live.html.leex

<%= if @contents do %>
  <%= for content <- @contents, do: render_section(content) %>
<% end %>
```

Iterating over the assigned contents, it calls the `render_section/1` function, which we need to add to the `PageLive` module:

```elixir
# lib/phoenix_cms_web/live/page_live.ex

defmodule PhoenixCmsWeb.PageLive do
  use PhoenixCmsWeb, :live_view

  # ...

  def render_section(%{type: "hero"} = content) do
    Phoenix.View.render(PhoenixCmsWeb.PageView, "hero.html", content: content)
  end

  def render_section(%{type: "text_and_image"} = content) do
    Phoenix.View.render(PhoenixCmsWeb.PageView, "text_and_image.html", content: content)
  end

  def render_section(%{features: content}) do
    Phoenix.View.render(PhoenixCmsWeb.PageView, "features.html", content: content)
  end
end
```

As we have three different content types (`hero`, `text_and_image`, and `feature`), we want to give them their layout and style, so we render them using different templates:

```elixir
# lib/phoenix_cms_web/templates/page/hero.html.eex

<section class="hero is-link is-medium">
  <div class="hero-body">
    <div class="container">
      <header class="hero__header">
        <h1 class="mb-6 title is-1"><%= @content.title %></h1>
        <p class="mb-6 subtitle is-3"><%= @content.content %></p>
      </header>
      <figure class="image">
        <img class="" src="<%= @content.image %>" alt="Placeholder image">
      </figure>
    </div>
  </div>
</section>
```

```elixir
# lib/phoenix_cms_web/templates/page/text_and_image.html.eex

<div class="container text-and-image">
  <div class="columns is-variable is-mobile is-8">
    <div class="column is-half">
      <header class="mb-4"><h2 class="title"><%= @content.title %></h2></header>
      <p class="subtitle"><%= @content.content %></p>
    </div>
    <div class="column is-half image-container">
      <figure class="image">
        <img src="<%= @content.image %>" alt="Placeholder image">
      </figure>
    </div>
  </div>
</div>
```

```elixir
# lib/phoenix_cms_web/templates/page/features.html.eex

<section class="section">
  <div class="container mb-6 features">
    <header class="mb-6">
      <h2 class="title is-2">Features</h2>
    </header>
    <div class="columns is-multiline is-mobile is-8">
      <%= for item <- @content do %>
        <div class="column is-one-third feature">
          <figure class="image feature__image">
            <img src="<%= item.image %>" alt="Placeholder image">
          </figure>
          <header class="mb-4"><h4 class="title is-4"><%= item.title %></h4></header>
          <p class="subtitle"><%= item.content %></p>
        </div>
      <% end %>
    </div>
  </div>
</section>
```

### The ArticlesLive live view

<img class="center" src="/images/blog/phoenix-cms-1/blog.png"/>

To render the articles list corresponding to the `/blog` route, let's implement the `ArticlesLive` module:

```elixir
# lib/phoenix_cms_web/live/articles_live.ex

defmodule PhoenixCmsWeb.ArticlesLive do
  use PhoenixCmsWeb, :live_view

  alias PhoenixCmsWeb.LiveEncoder

  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign_socket(socket)}
  end

  defp assign_socket(socket) do
    case fetch_articles() do
      {:ok, articles} ->
        socket
        |> assign(:page_title, "Blog")
        |> assign(:articles, articles)
        |> put_flash(:error, nil)

      _ ->
        socket
        |> assign(:page_title, "Blog")
        |> assign(:articles, nil)
        |> put_flash(:error, "Error fetching data")
    end
  end

  defp fetch_articles do
    with {:ok, articles} <- PhoenixCms.articles() do
      articles
      |> Enum.sort_by(& &1.published_at)
      |> LiveEncoder.articles()

      {:ok, articles}
    end
  end
end
```

Just like in the `PageLive` module, it fetches the articles using `PhoenixCms.articles/0`, which delegates its call to the `PhoenixCms.Repo` module. If everything goes fine, it encodes the items and assigns them to the socket. This step is important because since the socket process stores the assigned elements in memory, we only want to store the necessary values:

```elixir
# lib/phoenix_cms_web/live/encoder.ex

defmodule PhoenixCmsWeb.LiveEncoder do
  alias PhoenixCms.{Article, Content }

  # ...

  def articles(articles) do
    Enum.map(articles, &encode/1)
  end

  def encode(%Article{} = article) do
    Map.take(article, [:id, :slug, :title, :description, :image, :author, :published_at])
  end
end
```

Note that we are not taking the full article `content` for this page, because we don't want to render it. Now let's write its template:

```elixir
# lib/phoenix_cms_web/live/articles_live.html.leex

<%= if @articles  do %>
  <section class="section">
    <div class="container">
      <header class="mb-6"><h2 class="title">Blog</h2></header>
      <div class="columns is-variable is-multiline is-mobile is-8">
        <%= for article <- @articles, do: render_article(@socket, article) %>
      </div>
    </div>
  </section>
<% end %>
```

As we did with the contents list, we have to add the `render_article/2` to the view:

```elixir
# lib/phoenix_cms_web/live/articles_live.ex

defmodule PhoenixCmsWeb.ArticlesLive do
  use PhoenixCmsWeb, :live_view

  # ...


  def render_article(socket, %{id: _id, slug: _slug} = article) do
    Phoenix.View.render(PhoenixCmsWeb.PageView, "article.html", socket: socket, article: article)
  end
end
```

And we can't forget about its article item template:

```elixir
# lib/phoenix_cms_web/templates/page/article.html.eex

<%= live_patch to: Routes.live_path(@socket, PhoenixCmsWeb.ShowArticleLive, @article.id, @article.slug), class: "column is-half article-list__article" do %>
  <img class="article__image" src="<%= @article.image %>">
  <header>
    <h3 class="title is-4"><%= @article.title %></h3>
    <h4 class="subtitle is-5"><%= @article.description %></h4>
    <div class="media">
      <div class="media-left">
        <figure class="image is-48x48">
          <img class="is-rounded avatar" src="<%= "https://avatars.dicebear.com/api/avataaars/#{@article.author}.svg" %>" alt="Placeholder image">
        </figure>
      </div>
      <div class="media-content">
        <p class="title is-6"><%= @article.author %></p>
        <p class="subtitle is-6"><%= @article.published_at %></p>
      </div>
    </div>
  </header>
<% end %>
```

Using the same `live_patch` function as in the main navigation section, we create a link around the article summary to navigate to the article detail page, in which we can read the full version of the article.

### The ShowArticleLive live view

<img class="center" src="/images/blog/phoenix-cms-1/show-blog.png"/>


Last but not least, this LiveView renders the full version of an article:

```elixir
# lib/phoenix_cms_web/live/show_article_live.ex

defmodule PhoenixCmsWeb.ShowArticleLive do
  use PhoenixCmsWeb, :live_view

  @impl true
  def mount(%{"id" => id}, _session, socket) do
    {:ok, assign_socket(socket, id)}
  end

  defp assign_socket(socket, id) do
    case PhoenixCms.get_article(id) do
      {:ok, article} ->
        socket
        |> assign(:page_title, article.title)
        |> assign(:article, article)
        |> put_flash(:error, nil)

      {:error, _} ->
        socket
        |> assign(:page_title, "Blog")
        |> assign(:article, nil)
        |> put_flash(:error, "Error fetching data")
    end
  end
end
```

Following the same pattern as in the previous views, it calls `PhoenixCms.get_article/1` passing the article id received in its mount parameters, and assigning the result to the socket. The corresponding template looks like this:

```elixir
# lib/phoenix_cms_web/live/show_article_live.html.leex

<%= if @article  do %>
  <article class="article">
    <div class="container mt-6">
      <header class="article__header">
        <h1 class="title"><%= @article.title %></h1>
        <div class="media">
          <div class="media-left">
            <figure class="image is-48x48">
              <img class="is-rounded avatar" src="<%= "https://avatars.dicebear.com/api/avataaars/#{@article.author}.svg" %>" alt="Placeholder image">
            </figure>
          </div>
          <div class="media-content">
            <p class="title is-6"><%= @article.author %></p>
            <p class="subtitle is-7"><%= @article.published_at %></p>
          </div>
        </div>
      </header>
      <figure class="image main-image">
        <img src="<%= @article.image %>">
      </figure>
      <p class="subtitle is-italic"><%= @article.description %></p>
      <section class="article__content">
        <%= raw(@article.content) %>
      </section>
    </div>
  </article>
<% end %>
```

### Almost there

Now that we have everything ready, let's start the application and navigate through its pages, checking out the logs in the console:

```console
iex(2)> [info] GET https://api.airtable.com/v0/appXTw8FgG3h55fk6/articles -> 200 (653.723 ms)
[info] GET /
[info] Sent 200 in 20ms
[info] GET https://api.airtable.com/v0/appXTw8FgG3h55fk6/contents -> 200 (153.722 ms)
[info] GET /blog
[info] Sent 200 in 426µs
[info] GET https://api.airtable.com/v0/appXTw8FgG3h55fk6/articles -> 200 (218.254 ms)
[info] GET /blog/rec1osLptzsXfWg5g/lorem-ipsum
[info] Sent 200 in 384µs
[info] GET https://api.airtable.com/v0/appXTw8FgG3h55fk6/articles/rec1osLptzsXfWg5g -> 200 (193.594 ms)
[info] GET /blog
[info] Sent 200 in 581µs
[info] GET https://api.airtable.com/v0/appXTw8FgG3h55fk6/articles -> 200 (211.392 ms)
[info] GET /
[info] Sent 200 in 519µs
[info] GET https://api.airtable.com/v0/appXTw8FgG3h55fk6/contents -> 200 (129.278 ms)
[info] GET /blog
[info] Sent 200 in 427µs
[info] GET https://api.airtable.com/v0/appXTw8FgG3h55fk6/articles -> 200 (224.131 ms)
[info] GET /blog/rec1osLptzsXfWg5g/lorem-ipsum
[info] Sent 200 in 381µs
[info] GET https://api.airtable.com/v0/appXTw8FgG3h55fk6/articles/rec1osLptzsXfWg5g -> 200 (118.158 ms)
```

As we can see, every time we visit a page, the view makes the corresponding HTTP request to get its necessary contents. Although working fine for a single user, if we had many users visiting our site, it could easily overcome Airtable's rate limit of five requests per second. Not to mention the overhead that adds making an HTTP request on every page and what would happen if Airtable is down for whatever reason. In the next and last part of the series, we will look for a solution to all these problems, by implementing an automated cache mechanism using ETS. In the meantime, you can check the end result [here](https://phoenixcms.herokuapp.com/), or have a look at the [source code](https://github.com/bigardone/phoenix-cms).


Happy coding!

<div class="btn-wrapper">
  <a href="https://phoenixcms.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/phoenix-cms" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>



[previous part]: /blog/2020/07/11/headless-cms-fun-with-phoenix-liveview-and-airtable-pt-2
[Phoenix.LiveView]: https://hexdocs.pm/phoenix_live_view/Phoenix.LiveView.html
[Bulma]: https://bulma.io/
[live_patch]: https://hexdocs.pm/phoenix_live_view/Phoenix.LiveView.Helpers.html#live_patch/2
