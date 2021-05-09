---
title: Trello tribute with Phoenix and React (pt.11)
date: 2016-02-24 01:48 PST
tags: elixir, phoenix, react, redux
canonical: https://blog.diacode.com/trello-clone-with-phoenix-and-react-pt-11
excerpt: Adding lists and cards and broadcasting them through the board channel
published: true
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
## Adding lists and cards
In the [last part][c7c1ac93] we created a simple, yet useful, mechanism for tracking connected
members to a board's channel with the help of **OTP** and the **GenServer** behaviour.
We also learned how to broadcast this list through the channel so every member
could see who else is viewing the board at the the same time. Now it's time
to let the members add some lists and cards while the changes appear in their
screens in realtime... Lets do this!

<img src="/images/blog/trello_tribute_pt_11/no_lists.jpg"/>

### Migrations and models
A `Board` can have multiple **lists**, which in turn may have multiple **cards** as well,
so having this in mind lets start by generating the `List` model using the following `mix`
task from the console:

```
$ mix phoenix.gen.model List lists board_id:references:board name:string
...
...
$ mix ecto.migrate
```

This will generate the `lists` table in the database and the model:

```elixir
# web/models/list.ex

defmodule PhoenixTrello.List do
  use PhoenixTrello.Web, :model

  alias PhoenixTrello.{Board, List}

  @derive {Poison.Encoder, only: [:id, :board_id, :name]}

  schema "lists" do
    field :name, :string
    belongs_to :board, Board

    timestamps
  end

  @required_fields ~w(name)
  @optional_fields ~w()

  def changeset(model, params \\ %{}) do
    model
    |> cast(params, @required_fields, @optional_fields)
  end
end
```

Generating the `Card` model is going to be pretty similar:

```
$ mix phoenix.gen.model Card cards list_id:references:lists name:string
...
...
$ mix ecto.migrate
```

The resulting model will be something similar to this:

```elixir
# web/models/card.ex

defmodule PhoenixTrello.Card do
  use PhoenixTrello.Web, :model

  alias PhoenixTrello.{Repo, List, Card}

  @derive {Poison.Encoder, only: [:id, :list_id, :name]}

  schema "cards" do
    field :name, :string
    belongs_to :list, List

    timestamps
  end

  @required_fields ~w(name list_id)
  @optional_fields ~w()

  def changeset(model, params \\ %{}) do
    model
    |> cast(params, @required_fields, @optional_fields)
  end
end
```

Don't forget to add the collection of cards to the `lists` schema:

```elixir
# web/models/list.ex

defmodule PhoenixTrello.List do
  # ...

  @derive {Poison.Encoder, only: [:id, :board_id, :name, :cards]}

  # ...

  schema "lists" do
    # ..

    has_many :cards, Card
  end

  # ...
end
```

Now we can move forward to the front-end and create the necessary components.

### The list form component
Before continuing, lets recall the `render` function of the `BoardsShowView` component:

```javascript
// web/static/js/views/boards/show.js

//...
//...
_renderLists() {
  const { lists, channel, id, addingNewCardInListId } = this.props.currentBoard;

  return lists.map((list) => {
    return (
      <ListCard
        key={list.id}
        boardId={id}
        dispatch={this.props.dispatch}
        channel={channel}
        isAddingNewCard={addingNewCardInListId === list.id}
        {...list} />
    );
  });
}

render() {
    const { fetching, name } = this.props.currentBoard;

    if (fetching) return (
      <div className="view-container boards show">
        <i className="fa fa-spinner fa-spin"/>
      </div>
    );

    return (
      <div className="view-container boards show">
        <header className="view-header">
          <h3>{name}</h3>
          {::this._renderMembers()}
        </header>
        <div className="canvas-wrapper">
          <div className="canvas">
            <div className="lists-wrapper">
              {::this._renderLists()}
              {::this._renderAddNewList()}
            </div>
          </div>
        </div>
        {this.props.children}
      </div>
    );
  }

```

Apart from the `BoardMembers` component we created the last time, we need to
render all the lists belonging to the board as well. For the time being we don't
have any lists, therefore lets move on to the `_renderAddNewList` function:

```javascript
// web/static/js/views/boards/show.js

// ...

  _renderAddNewList() {
    const { dispatch, formErrors, currentBoard } = this.props;

    if (!currentBoard.showForm) return this._renderAddButton();

    return (
      <ListForm
        dispatch={dispatch}
        errors={formErrors}
        channel={currentBoard.channel}
        onCancelClick={::this._handleCancelClick} />
    );
  }

  _renderAddButton() {
    return (
      <div className="list add-new" onClick={::this._handleAddNewClick}>
        <div className="inner">
          Add new list...
        </div>
      </div>
    );
  }

  _handleAddNewClick() {
    const { dispatch } = this.props;

    dispatch(Actions.showForm(true));
  }

  _handleCancelClick() {
    this.props.dispatch(Actions.showForm(false));
  }

// ...

```

The `_renderAddNewList` function first checks if the `currentBoard.showForm` property
is set to `true` so it renders the *Add new list...* button instead of the `ListForm` component.

When the user clicks the button, an action will be dispatched to the store and
will set its property `showForm` to `true` making form to be displayed.
Now lets create the form component:

```javascript
// web/static/js/components/lists/form.js

import React, { PropTypes } from 'react';
import Actions              from '../../actions/lists';

export default class ListForm extends React.Component {
  componentDidMount() {
    this.refs.name.focus();
  }

  _handleSubmit(e) {
    e.preventDefault();

    const { dispatch, channel } = this.props;
    const { name } = this.refs;

    const data = {
      name: name.value,
    };

    dispatch(Actions.save(channel, data));
  }

  _handleCancelClick(e) {
    e.preventDefault();

    this.props.onCancelClick();
  }

  render() {
    return (
      <div className="list form">
        <div className="inner">
          <form id="new_list_form" onSubmit={::this._handleSubmit}>
            <input ref="name" id="list_name" type="text" placeholder="Add a new list..." required="true"/>
            <button type="submit">Save list</button> or <a href="#" onClick={::this._handleCancelClick}>cancel</a>
          </form>
        </div>
      </div>
    );
  }
}
```

<img src="/images/blog/trello_tribute_pt_11/list_form.jpg"/>

This is a very simple component with a form containing a text input for the name
of the list, a submit button and a cancel link, which will dispatch the same action
we have previously described but setting the `showForm` property to false to remove
the form. When the form is submitted it will dispatch the `save` action creator with the
name the user has provided, which will push it to the `lists:create` topic of the
`BoardChannel`:

```javascript
// web/static/js/actions/lists.js

import Constants from '../constants';

const Actions = {
  save: (channel, data) => {
    return dispatch => {
      channel.push('lists:create', { list: data });
    };
  },
};

export default Actions;
```

### The BoardChannel
The following step will be making the `BoardChannel` handle the `lists:create` message,
so lets do it:

```elixir
# web/channels/board_channel.ex

defmodule PhoenixTrello.BoardChannel do
  # ...

  def handle_in("lists:create", %{"list" => list_params}, socket) do
    board = socket.assigns.board

    changeset = board
      |> build_assoc(:lists)
      |> List.changeset(list_params)

    case Repo.insert(changeset) do
      {:ok, list} ->
        list = Repo.preload(list, [:cards])

        broadcast! socket, "list:created", %{list: list}

        {:noreply, socket}
      {:error, _changeset} ->
        {:reply, {:error, %{error: "Error creating list"}}, socket}
    end
  end

  # ...
end
```

Using the board assigned to the channel, it will build a `List` changeset with
the received params and insert it. If everything goes `:ok` it will broadcast the
created list through the channel to **all connected members**, including the creator,
thus we don't really need to reply anything and we just return a `:noreply`. If
by any chance there's been an error while inserting the new list, it will return an
error message **just to the creator**, so he knows that something went wrong.

### The reducer

Regarding lists we're almost done. The channel is broadcasting the created list, so
let's add a handler in the front-end for it in the current board actions creator
where the channel was joined:

```javascript
// web/static/js/actions/current_board.js

import Constants  from '../constants';

const Actions = {
  // ...

  connectToChannel: (socket, boardId) => {
    return dispatch => {
      const channel = socket.channel(`boards:${boardId}`);
      // ...

      channel.on('list:created', (msg) => {
        dispatch({
          type: Constants.CURRENT_BOARD_LIST_CREATED,
          list: msg.list,
        });
      });
    };
  },
  // ...
}
```

Finally we need to update the board reducer to append the list to the new state version
it returns:

```javascript
// web/static/js/reducers/current_board.js

import Constants  from '../constants';

export default function reducer(state = initialState, action = {}) {

  switch (action.type) {
    //...

    case Constants.CURRENT_BOARD_LIST_CREATED:
      const lists = [...state.lists];

      lists.push(action.list);

      return { ...state, lists: lists, showForm: false };

    // ...
  }
}
```
We also set the `showForm` attribute to `false` so the form automatically hides,
displaying again the *Add new list...* button and the recently created list:

<img src="/images/blog/trello_tribute_pt_11/new_list.jpg"/>

### The List component
Now that we have at least one list in the board we can create the `List` component
we will use to render them:

```javascript
// /web/static/js/components/lists/card.js

import React, {PropTypes}       from 'react';
import Actions                  from '../../actions/current_board';
import CardForm                 from '../../components/cards/form';
import Card                     from '../../components/cards/card';

export default class ListCard extends React.Component {
  // ...

  _renderForm() {
    const { isAddingNewCard } = this.props;
    if (!isAddingNewCard) return false;

    let { id, dispatch, formErrors, channel } = this.props;

    return (
      <CardForm
        listId={id}
        dispatch={dispatch}
        errors={formErrors}
        channel={channel}
        onCancelClick={::this._hideCardForm}
        onSubmit={::this._hideCardForm}/>
    );
  }

  _renderAddNewCard() {
    const { isAddingNewCard } = this.props;
    if (isAddingNewCard) return false;

    return (
      <a className="add-new" href="#" onClick={::this._handleAddClick}>Add a new card...</a>
    );
  }

  _handleAddClick(e) {
    e.preventDefault();

    const { dispatch, id } = this.props;

    dispatch(Actions.showCardForm(id));
  }

  _hideCardForm() {
    const { dispatch } = this.props;

    dispatch(Actions.showCardForm(null));
  }

  render() {
    const { id, connectDragSource, connectDropTarget, connectCardDropTarget, isDragging } = this.props;

    const styles = {
      display: isDragging ? 'none' : 'block',
    };

    return (
      <div id={`list_${id}`} className="list" style={styles}>
        <div className="inner">
          <header>
            <h4>{this.props.name}</h4>
          </header>
          <div className="cards-wrapper">
            {::this._renderCards()}
          </div>
          <footer>
            {::this._renderForm()}
            {::this._renderAddNewCard()}
          </footer>
        </div>
      </div>
    );
  }
}
```

Just as we did with the lists, lets first focus on rendering the cards form. Basically
we take the same approach of rendering or not the form using a `prop` passed by the
main board component, and dispatching an action to change that state property.

<img src="/images/blog/trello_tribute_pt_11/card_form.jpg"/>

### The card form component
This component is going to be very similar to the `ListForm` one:

```javascript
// /web/static/js/components/cards/form.js

import React, { PropTypes } from 'react';
import Actions              from '../../actions/lists';
import PageClick            from 'react-page-click';

export default class CardForm extends React.Component {
  _handleSubmit(e) {
    e.preventDefault();

    let { dispatch, channel } = this.props;
    let { name }              = this.refs;

    let data = {
      list_id: this.props.listId,
      name: name.value,
    };

    dispatch(Actions.createCard(channel, data));
    this.props.onSubmit();
  }

  componentDidMount() {
    this.refs.name.focus();
  }

  _handleCancelClick(e) {
    e.preventDefault();

    this.props.onCancelClick();
  }

  render() {
    return (
      <PageClick onClick={::this._handleCancelClick}>
        <div className="card form">
          <form id="new_card_form" onSubmit={::this._handleSubmit}>
            <textarea ref="name" id="card_name" type="text" required="true" rows={5}/>
            <button type="submit">Add</button> or <a href="#" onClick={::this._handleCancelClick}>cancel</a>
          </form>
        </div>
      </PageClick>
    );
  }
}

```
Just as we previously did, on submitting the form we'll dispatch an action to create the
card with name provided by the user. The action creator for this, will push
a new message to the board channel:

```javascript
// /web/static/js/actions/lists.js

import Constants from '../constants';

const Actions = {
  // ...

  createCard: (channel, data) => {
    return dispatch => {
      channel.push('cards:create', { card: data });
    };
  },
};

// ...
```

Let's add the handler to the `BoardChannel`:

```elixir
  # web/channels/board_channel.ex

  def handle_in("cards:create", %{"card" => card_params}, socket) do
    board = socket.assigns.board
    changeset = board
      |> assoc(:lists)
      |> Repo.get!(card_params["list_id"])
      |> build_assoc(:cards)
      |> Card.changeset(card_params)

    case Repo.insert(changeset) do
      {:ok, card} ->
        broadcast! socket, "card:created", %{card: card}

        {:noreply, socket}
      {:error, _changeset} ->
        {:reply, {:error, %{error: "Error creating card"}}, socket}
    end
  end

```

In the same way we did when creating the list, the new `Card` will be created associating it to the
board assigned on the channel and the list passed as parameter. If the creation
succeed it will be again dispatched to all connected members on the channel.
Finally we have to add the callback to the **js** channel:

```javascript
  // web/static/js/actions/current_board.js
  //...

  channel.on('card:created', (msg) => {
    dispatch({
      type: Constants.CURRENT_BOARD_CARD_CREATED,
      card: msg.card,
    });
  });

  // ...
```

And add the new card to the state via the reducer:

```javascript
  // web/static/js/reducers/current_board.js

  // ...

  case Constants.CURRENT_BOARD_CARD_CREATED:
    lists = [...state.lists];
    const { card } = action;

    const listIndex = lists.findIndex((list) => { return list.id == card.list_id; });
    lists[listIndex].cards.push(card);

    return { ...state, lists: lists };

  // ...
```

And that's it! The card will appear on every connected member screen.

<img src="/images/blog/trello_tribute_pt_11/new_card.jpg"/>

### Now what?
With this part we have covered the basic functionality we need for letting users
register, sign in, create boards, invite people to them and collaborate in realtime
adding lists and cards. The final version in the repository has a lot more features like
editing lists, sorting lists and cards by dragging them around, showing the card
details where you can also assign members to them and even adding comments and
color tags, but we are not going to talk about any of them here otherwise this
would be the never-ending tutorial :D

But don't worry, there's still one more part
left where we'll talk about sharing the final result with the world by deploying
it on **Heroku**. Meanwhile, don't forget to check out the live demo and final source code:



<div class="btn-wrapper">
  <a href="https://phoenix-trello.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/phoenix-trello" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>

Happy coding!


  [c7c1ac93]: /2016/02/15/trello-tribute-with-phoenix-and-react-pt-10/ "Part 10"
