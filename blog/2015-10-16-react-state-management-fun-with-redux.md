---
title: React state management fun with Redux
date: 2015-10-16
tags: react, redux
---
Some months ago <a href="http://martyjs.org/" target="_blank">Marty.js</a> creator announced that *v0.10* was going to be the last major release. This were sad news to me as I've been using **Marty** as my **Flux** implementation of choice for several months in many different projects, I have also written some posts about it and I really love it. He also commented that he had started using **Redux** and recommended everyone to check it out. So that's what I did.

## Redux to the rescue
After visiting <a href="http://redux.js.org/">Redux's</a> website and reading it's documentation I ended up with the following conclusions about it:

- First of all it's not a **Flux** implementation. It's inspired on it, but it handles the *state* in a different way and it's not dependent on **React** at all, you can use it to handle the *state* for what ever you might need, not only **React** components.
- It doesn't have all the bunch of different concepts other **Flux** implementations do, meaning that it's really simple to understand and use.
- Instead of having multiple *stores* there's only one keeping all the *state* of the application.
- Actions are the same as in other **Flux** implementations. They are the starting point of a change in the *state*.
- The *state* object in the *store* is immutable and the *store* is the only one capable of replacing it. We have to use *reducer functions* to tell the *store* what is the next new *state* we want to have.
- Thanks to it's React bindings we can map the *state* to component *props*, so we have stateless components.

So wrapping up, we have a single *store* with all the *state* of the application. To trigger a status update we use *action creators* functions which return an *action* object that has a type to identify it and the data for the change. To apply this changes we have to write a *reducer function* which will return the new state combining the current state and the data provided by the action.

## A little less talk and a lot more Redux action
Now that we now the basics, let's start coding some real stuff. I have cloned my good old Rails and Flux project and re-factored to use Redux instead of Marty. 

<a href="http://rails-and-redux.herokuapp.com" target="_blank">
    <img src="/images/blog/rails_and_redux/redux.jpg" alt="Rails and Flux" style="background: #fff;" />
</a>
<div class="btn-wrapper">
  <a href="http://rails-and-redux.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/rails_and_redux" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>

### Designing the state tree 
Since I've started working with **Redux**, I like starting writing my reducers first, so I can design how the *state* is going to look like. 

```coffee
# app/frontend/reducers/index.coffee

{ combineReducers } = require 'redux'

module.exports = combineReducers
  people: require './people'
  person: require './person'
  ...
```

We combine all the *reducers* so the *state* will have a ```people``` object with all the list of contacts, search and pagination related data:

```coffee
# app/frontend/reducers/people.coffee

initialState =
  people: null
  meta: {}
  search: ''
  isLoading: false
  pageNumber: 1

module.exports = (state = initialState, action) ->
  state
```

And also a ```person``` object storing the data of the person we click to see his details.

```coffee
# app/frontend/reducers/person.coffee

initialState =
  person: {}
  isLoading: false

module.exports = (state = initialState, action) ->
    state
```

### Connecting components to Redux
Now that we have our state tree designed, let's connect one of our components to the *store* and specify what state is going to be passed as props to it.

```coffee
# app/frontend/components/people/list.cjsx

{ connect } = require 'react-redux'
PersonCard = require './card'

List = React.createClass
  displayName: 'PeopleSection'
  
  _renderPeople: <->    </->
    @props.people.map (person) ->
      <PersonCard key={person.id} {...person}/>

  render: ->
    <div>
      <div className="cards-wrapper">
        {@_renderPeople()}
      </div>
    </div>

mapStateToProps = (state) ->
  state.people

module.exports = connect(mapStateToProps)(List)
```
We're rendering ```PersonCard``` components iterating over the *people* prop. As we are connecting it to the store and mapping it to the ```state.people``` object, the component will have *people*, *meta*, *search*, *isLoading* and *pageNumber* as props. Easy as pie!

### Retrieving the initial list of people
So right now the component will render an empty list because we have no people in our initial state. To get the initial list and update the state we need to create an *action*, so let's do it.

```coffee
# app/frontend/actions/people.coffee

fetch = require 'isomorphic-fetch'
{ RECEIVE_PEOPLE, SET_SEARCH } = require '../constants'

module.exports =
  fetchPeople: (params = {}) ->
    (dispatch) =>
      fetch(Routes.api_v1_people_path(params))
      .then (req) =>
        req.json()
      .then (json) =>
        dispatch @receivePeople(json)

  receivePeople: (json) ->
    type: RECEIVE_PEOPLE
    people: json.people
    meta: json.meta
```

With the ```fetchPeople``` action creator we're making a call to the Rails back-end API and dispatching the ```RECEIVE_PEOPLE``` action with the resulting response. No we need to reflect this in the *state*, so let's change the previous *reducer* to return the new *state* tree when this *action* gets dispatched:

```coffee
# app/frontend/reducers/people.coffee

initialState =
  people: null
  meta: {}
  search: ''
  isLoading: false
  pageNumber: 1

module.exports = (state = initialState, action) ->
  switch action.type
    when constants.RECEIVE_PEOPLE
      newState =
        people: action.people
        meta: action.meta

      Object.assign {}, state, newState

    else
      state
```

Now it is evaluating the actions type and if it corresponds to the one it's expecting, we create a new state tree merging the existing one with the returned ```people``` array and ```metadata``` object from the action. The *store* will replace the current state with this one returned, causing the component to render again and showing the people cards.

Now we only have to call the *action creator* once the component renders for the first time:

```coffee
# app/frontend/components/people/list.cjsx

{ connect } = require 'react-redux'
PersonCard = require './card'
actions = require '../../actions'

List = React.createClass
  displayName: 'PeopleSection'

  componentDidMount: ->
    { dispatch } = @props
    dispatch actions.people.fetchPeople()
....
```
And that's it.

### Paginating results
To show the next page of results we need to call the back-end passing the page number we want. To do so let's update a bit more our component:

```coffee
# app/frontend/components/people/list.cjsx

{ connect } = require 'react-redux'
PaginatorSection = require '../paginator/paginator_section'
PersonCard = require './card'
actions = require '../../actions'

List = React.createClass
  displayName: 'PeopleSection'
  
  componentDidMount: ->
    @_fetchPeople()

  _fetchPeople: (pageNumber = @props.pageNumber)->
    { dispatch } = @props
    dispatch actions.people.fetchPeople(page: pageNumber)
  
  render: ->
    <div>
      <PaginatorSection totalPages={@props.meta.total_pages} currentPage={@props.meta.current_page} pageNumberClicked={@_fetchPeople}/>
      <div className="cards-wrapper">
        {@_renderPeople()}
      </div>
    </div>
```

When a page link is clicked the ```PaginatorSection``` component calls the ```_fetchPeople``` function passing the ```pageNumber``` which calls the previously described ```fetchPeople``` action creator, and beginning the cycle again.

### Conclusion
Although this is a very simple example of how to use **Redux**, it's good enough to show how easy is using it. I have to say that at the beginning of switching from Marty I was very confused and I missed a lot of concepts I already was using. But now that I use it almost every day **I just love it**. Managing the state in my **React** applications has being reduced to writing simple *action creators* and *reducer* functions, with no surprises or unwanted side effects. If you want to learn more check out it's awesome <a href="http://redux.js.org/" target="_blank">official documentation</a> and also the source code of the <a href="https://github.com/bigardone/rails_and_redux" target="_blank">example project</a> we're you'll find a bit more complex functionality like searching and using **react-router** for navigating to a person's detail page and backwards.

Long live **Redux**!

