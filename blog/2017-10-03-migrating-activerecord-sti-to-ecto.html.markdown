---
title: Migrating ActiveRecord STI to Ecto (pt. 1)
date: 2017-10-03 23:01 PDT
tags: elixir, ecto
excerpt: Taking advantage of Ecto's embedded schemas to simulate ActiveRecord's STI
---
## From ActiveRecord STI to Ecto embedded schemas

Almost three years have passed since I wrote a post about [Rails STI with
PostgreSQL hstore](/blog/2015/01/11/rails-sti-with-postgresql-hstore). At
that time I was building a platform called [Eventos Talento
IT](https://eventos.talentoit.org/) which started as a place where
developers could participate in raffles to win tickets for tech events, but we
have ended up raffling books and courses as well. In the mentioned post,
I explain how to achieve **STI** in **Rails** and **PostgreSQL** thanks to
Postgres's **hstore** type. After these years, we want to make some
improvements in the platform, so instead of updating the old codebase, I can't
resist redoing everything in **Elixir** and, of course, **Elm**.

After taking a look at the original **Rails** project and recalling the schema
and models, I have encountered the first problem in regards to migrating
ActiveRecord models to Ecto schemas, inheritance. In the old **Rails** project
we have the following models:

```ruby
# app/models/item.rb

# == Schema Information
#
# Table name: items
#
#  id          :integer          not null, primary key
#  name        :string           not null
#  description :text
#  site_url    :string
#  image       :string
#  raffle_date :date
#  raffled_at  :datetime
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  type        :string           not null
#  data        :hstore
#
# Indexes
#
#  index_items_on_data  (data)
#

class Item < ActiveRecord::Base
  # Validations
  validates :name, :raffle_date, presence: true
end

# app/models/book.rb

class Book < Item
  store_accessor :data, :author

  # Validations
  validates :author, presence: true
end

# app/models/event.rb

class Event < Item
  store_accessor :data, :start_date, :end_date, :location

  # Validations
  validates :start_date, :end_date, :location, presence: true
end
```

The `Item` model has the basic structure with the shared fields for `Book` and
`Event`, and the field `type` specifies which item type is going to be. Both
`Event` and `Book` inherit from `Item` defining their specific fields in
the `store_accessor` function and their validation rules, which will be
checked along with the common rules when needed. In regards to **Rails** and
**ActiveRecord**, this is pretty much it, thanks to a lot of black magic going
on in the background. So, how can we achieve something similar with **Ecto**?

### Defining the table

Let's start by preparing the new schema table to mirror. To make this work
correctly it, is essential that the field `type` is adequately defined and it
only contains the values that we need. Of course, there are multiple ways of
achieving this, but last week my good friend
[Oscar](https://oscardearriba.com/) told me about the
[EctoEnum](https://github.com/gjaldon/ecto_enum) library, which adds support
for enums in **Ecto** schemas, and looks like an excellent opportunity for
trying it out. To install it we need to add it in the `mix.exs` file of the
project:

```elixir
# mix.exs

defmodule TalentoItSchema.Mixfile do
  use Mix.Project

  # ...

  defp deps do
    [
      ...
      {:ecto_enum, "~> 1.0"}
    ]
  end

  # ...
end
```

Next, we have to create a module to define our different enums:

```elixir
# talento_it_schema/lib/talento_it_schema/ecto_enums.ex

defmodule TalentoItSchema.EctoEnums do
  import EctoEnum

  defenum ItemTypeEnum, :item_type, [:book, :event]

  def item_type_book, do: :book

  def item_type_event, do: :event
end
```

Using the `defenum` macro, we are setting a new `ItemTypeEnum` enum that maps
a new Postgres `item_type` enum that will have `book` or `event` as valid
values. Now we have to create both the enum type and the table, so let's create
the migration file:

```ruby
# talento_it_schema/priv/repo/migrations/123456789_create_raffle_items.exs

dule TalentoItSchema.Repo.Migrations.CreateRaffleItems do
  use Ecto.Migration

  alias TalentoItSchema.EctoEnums.ItemTypeEnum

  def change do
    ItemTypeEnum.create_type()

    create table(:raffle_items) do
      add :type, :item_type, null: false
      add :name, :string, null: false
      add :description, :string
      add :site_url, :string
      add :image, :string
      add :raffle_date, :date
      add :raffled_at, :utc_datetime
      add :data, :map

      timestamps()
    end

    create index(:raffle_items, [:type])
  end
end
```

`ItemTypeEnum.create_type()` is a helper function that comes with **EctoEnum**
to create the new enum type in Postgres. Also note that the `data` column is of
type `map`, and will store the specific data for books and events. Let's run
the migration and `run mix ecto.dump` to check in the generated file how it
creates this new type:

```sql
-- talento_it_schema/priv/repo/structure.sql

-- ...

--
-- Name: item_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE item_type AS ENUM (
    'book',
    'event'
);

-- ...
```

Now let's move on the schema module to set it up correctly:

```ruby
# talento_it_schema/lib/talento_it_schame/raffle/item.ex

defmodule TalentoItSchema.Raffle.Item do
  use Ecto.Schema
  import Ecto.Changeset

  alias TalentoItSchema.{
    EctoEnums,
    EctoEnums.ItemTypeEnum
  }

  schema "raffle_items" do
    field :name, :string
    field :description, :string
    field :site_url, :string
    field :image, :string
    field :raffle_date, :date
    field :raffled_at, :utc_datetime
    field :type, ItemTypeEnum
    field :data, :map

    timestamps()
  end

  @fields ~w(type name description site_url image raffle_date raffled_at data)a
  @required_fields ~w(type name data)a

  @doc false
  def changeset(%Item{} = item, attrs) do
    item
    |> cast(attrs, @fields)
    |> validate_required(@required_fields)
  end

  # ...

end
```

As you can see, we have set the type of the `:type` field to `ItemTypeEnum`,
which takes care of validating that the passed attributes only contain allowed
values, in this particular case any of `[:book, :event, "book", "event"]`:

```elixir
Interactive Elixir (1.5.1) - press Ctrl+C to exit (type h() ENTER for help)
iex(1)>Item.changeset(%Item{}, %{type: "IVALID", name: "Foo", data: %{}})
#Ecto.Changeset<action: nil, changes: %{data: %{}, name: "Foo"},
 errors: [type: {"is invalid",
   [type: TalentoItSchema.EctoEnums.ItemTypeEnum, validation: :cast]}],
 data: #TalentoItSchema.Raffle.Item<>, valid?: false>
iex(2)>
nil
iex(3)> Item.changeset(%Item{}, %{type: "book", name: "Foo", data: %{}})
#Ecto.Changeset<action: nil, changes: %{data: %{}, name: "Foo", type: :book},
 errors: [], data: #TalentoItSchema.Raffle.Item<>, valid?: true>
```

Until this point, we have covered the basic `Item` attributes and validations,
but how can we do something similar to the old `Book` and `Event` **Rails**
models to define specific attributes and validations? One of my favorite things
about `Ecto` (and `Elixir` in general) is that there is no hidden magic behind.
Its explicitness forces you to write more code, but on the other hand, it gives
you the freedom to solve problems in many different ways.

### Ecto embedded schemas

After doing some research and watching [Darin
Wilson's](https://github.com/darinwilson) talk on [ElixirConf
2017](https://elixirconf.com/) called [Thinking in
Ecto](https://www.youtube.com/watch?v=YQxopjai0CU), I have decided to use
Ecto's
[embedded_schema](https://hexdocs.pm/ecto/Ecto.Schema.html#embedded_schema/1).
An embedded schema is essentially a schema which doesn't point to any
particular data source. It can't be queried or persisted, but, on the other
hand, it lets you define its structure, types and validation rules, which is
very suitable for our needs. Let's create the embedded schemas for both the
`Book` and `Event` modules:

```ruby
# talento_it_schema/lib/talento_it_schema/raffle/item/book.ex

defmodule TalentoItSchema.Raffle.Item.Book do
  use Ecto.Schema
  import Ecto.Changeset

  embedded_schema do
    field :author, :string
  end

  @fields ~w(author)a

  def changeset(attrs), do: changeset(%__MODULE__{}, attrs)
  def changeset(%__MODULE__{} = book, attrs) do
    book
    |> cast(attrs, @fields)
    |> validate_required(@fields)
  end
end
```

```ruby
# talento_it_schema/lib/talento_it_schema/raffle/item/event.ex

defmodule TalentoItSchema.Raffle.Item.Event do
  use Ecto.Schema
  import Ecto.Changeset

  embedded_schema do
    field :start_date, :date
    field :end_date, :date
    field :location, :string
  end

  @fields ~w(start_date end_date location)a

  def changeset(attrs), do: changeset(%__MODULE__{}, attrs)
  def changeset(%__MODULE__{} = event, attrs) do
    event
    |> cast(attrs, @fields)
    |> validate_required(@fields)
  end
end
```

Just like in the old **Rails** models, the `Book` embed schema contains an
`author` key with a required `string` value. Same happens with `Event`, but
it has `start_date` and `end_date`, both of them `date` fields, and
`location` which is a string, all of them mandatory. Going back to `IEx`, we
can check that everything works as expected:

```
Interactive Elixir (1.5.1) - press Ctrl+C to exit (type h() ENTER for help)
iex(1)> Book.changeset(%{})
#Ecto.Changeset<action: nil, changes: %{},
 errors: [author: {"can't be blank", [validation: :required]}],
 data: #TalentoItSchema.Raffle.Item.Book<>, valid?: false>
iex(2)>
nil
iex(3)> Event.changeset(%{})
#Ecto.Changeset<action: nil, changes: %{},
 errors: [start_date: {"can't be blank", [validation: :required]},
  end_date: {"can't be blank", [validation: :required]},
  location: {"can't be blank", [validation: :required]}],
 data: #TalentoItSchema.Raffle.Item.Event<>, valid?: false>
```

Awesome! Now we just need a way of making the `Item.changeset/2` function call
the respective `changeset` functions of the embedded schemas modules, depending
of course on the `type` enum previously defined:

```elixir
# talento_it_schema/lib/talento_it_schame/raffle/item.ex

defmodule TalentoItSchema.Raffle.Item do
  use Ecto.Schema
  import Ecto.Changeset

  alias TalentoItSchema.{
    EctoEnums,
    EctoEnums.ItemTypeEnum,
    Raffle.Item.Book,
    Raffle.Item.Event
  }

  # ...

  @doc false
  def changeset(%Item{} = item, attrs) do
    item
    |> cast(attrs, @fields)
    |> validate_required(@required_fields)
    |> validate_data
  end

  defp validate_data(changeset) do
    changeset
    |> build_data_changeset
    |> case do
      %{valid?: true} ->
        changeset

      %{errors: errors} ->
        add_data_errors(changeset, errors)
    end
  end

  defp build_data_changeset(changeset) do
    data = get_field(changeset, :data)
    type = get_field(changeset, :type)

    cond do
      type == EctoEnums.item_type_book() ->
        Book.changeset(data)

      type == EctoEnums.item_type_event() ->
        Event.changeset(data)

      true ->
        changeset
    end
  end

  defp add_data_errors(changeset, errors) do
    Enum.reduce(errors, changeset, fn {key, {message, meta}}, acc -> add_error(acc, key, message, meta) end)
  end
end
```

In the `changeset` pipeline we have added a call to a new `validate_data/1`
function, which receives the current `changeset` and depending on the `type`
enum value, calls the specific `Book` or `Event` module `changeset/1`
function passing the `data` map values. If the resulting changeset is valid,
then it returns it. Otherwise, it calls the `add_data_errors/2`, adding the
embedded errors to the `Item` changeset. Let's jump back to the interactive
shell and try it out:

```
Interactive Elixir (1.5.1) - press Ctrl+C to exit (type h() ENTER for help)
iex(1)> Item.changeset(%Item{}, %{name: "Foo", type: "book", data: %{}})
#Ecto.Changeset<action: nil, changes: %{data: %{}, name: "Foo", type: :book},
 errors: [author: {"can't be blank", [validation: :required]}],
 data: #TalentoItSchema.Raffle.Item<>, valid?: false>
iex(2)>
nil
iex(3)> Item.changeset(%Item{}, %{name: "Foo", type: "event", data: %{}})
#Ecto.Changeset<action: nil, changes: %{data: %{}, name: "Foo", type: :event},
 errors: [location: {"can't be blank", [validation: :required]},
  end_date: {"can't be blank", [validation: :required]},
  start_date: {"can't be blank", [validation: :required]}], data:
  #TalentoItSchema.Raffle.Item<>, valid?: false>
```

Validations seem to be working just fine, let's check out some valid data:

```
Interactive Elixir (1.5.1) - press Ctrl+C to exit (type h() ENTER for help)
iex(1)> Item.changeset(%Item{}, %{name: "Foo", type: "book", data: %{author: "Foo"}})
#Ecto.Changeset<action: nil,
 changes: %{data: %{author: "Foo"}, name: "Foo", type: :book}, errors: [],
 data: #TalentoItSchema.Raffle.Item<>, valid?: true>
iex(2)>
nil
iex(3)> Item.changeset(%Item{}, %{name: "Foo", type: "event", data: %{start_date: "2017-10-05", end_date: "2017-10-07", location: "Foo"}})
#Ecto.Changeset<action: nil,
 changes: %{data: %{end_date: "2017-10-07", location: "Foo",
     start_date: "2017-10-05"}, name: "Foo", type: :event}, errors: [], data:
 #TalentoItSchema.Raffle.Item<>, valid?: true>
```

It works as expected, yay! However, we need a proper and reliable way of
testing this functionality correctly instead of trying it out in the
interactive shell. Speaking of which, I have started using [property-based
testing](http://propertesting.com/) in the new project, and I'm very pleased
with the results so far. On the next part I would like to write about it,
and add some tests to what we have done today. In the meantime, what do you
think about the solution so far? Have you happened to run into a similar
problem? How did you solved it?

Happy coding!




