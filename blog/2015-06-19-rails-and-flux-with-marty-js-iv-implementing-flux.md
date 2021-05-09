---
title: "Rails and Flux with Marty.js IV: Implementing Flux"
date: 2015-06-19
tags: rails, reactjs, flux, webpack
---

In the [last post](/blog/2015/06/14/rails-and-flux-with-marty-js-iii-the-main-application/) of this series  we took a look to the **MainApplication** and how it <a href="https://github.com/bigardone/rails_and_flux/blob/master/app/frontend/application.cjsx#L7" target="_blank">registers</a> the necessary elements that we are going to need. We also viewed how to create an **ApplicationContainer** which receives the  main application as a prop and wraps the main React component which will have access to all the elements registered previously. Now we are ready to start implementing Flux, so let's do it!

### The PeopleSection
If you first take a look to the <a href="https://github.com/bigardone/rails_and_flux/blob/master/app/frontend/flux/components/people/people_section.cjsx" target="_blank">source code</a> you can see that there are two main elements, the **React** component it self and a **Marty's Container** which wraps it. By doing this we are making the **PeopleSection** stateless, leaving the state requests to the **Container** which will pass it to the **PeopleSection** as *props*.

#### The React component
This is the main React component and parent of the rest of the components involved in the application.

```coffee  
# /app/frontend/flux/components/people/people_section.cjsx

# Requiring components involved
PeopleSearch = require './people_search'
PersonCard = require './person_card'
PaginatorSection = require '../paginator/paginator_section'
ResetButton = require '../buttons/reset_button'

PeopleSection = React.createClass
  displayName: 'PeopleSection'

  # When a page number is clicked let's find the next results page
  _handlePageNumberClicked: (pageNumber)->
    @app.people.queries.findPeople pageNumber, @props.searchText

  _renderPeople: ->
    # Render message when no results found
    if @props.people.length is 0 then return @_renderNoResultsFound()
    
    # Create a person card for each person found
    @props.people.map (person) ->
      <PersonCard key={person.id} {...person}/>

  _renderNoResultsFound: ->
    <div className="warning">
      <span className="fa-stack">
        <i className="fa fa-meh-o fa-stack-2x"></i>
      </span>
      <h4>No people found...</h4>
      <ResetButton text="Reset filter" styleClass="btn" />
    </div>

  render: ->
    <div>
      <PeopleSearch totalCount={@props.meta.total_count} value={@props.searchText}/>
      <PaginatorSection totalPages={@props.meta.total_pages} currentPage={@props.meta.current_page} pageNumberClicked={@_handlePageNumberClicked}/>
      <div className="cards-wrapper">
        {@_renderPeople()}
      </div>
      <PaginatorSection totalPages={@props.meta.total_pages} currentPage={@props.meta.current_page} pageNumberClicked={@_handlePageNumberClicked}/>
    </div>

...
```

This results to be a very simple component except for the fact that for being the main parent component **it has no state at all**. So how 
does it gets the data to display? Here's where the **Container** comes into play.

#### The Container
In the **Flux** architecture the state lives in **stores**. Marty's containers listen to stores and get the necessary state from them 
passing it to their wrapped components as props.

```coffee
... 

module.exports = Marty.createContainer PeopleSection,
  # Listen to the store registered previously in the application
  listenTo: 'people.store'

  # Props that are going to be passed to the component
  fetch:
    people: ->
      @app.people.store.fetchPeople()
    meta: ->
      @app.people.store.getState().meta
    searchText: ->
      @app.people.store.getState().searchText

  # What to render when fetches are still pending
  pending: ->
    <div className="warning">
      <span className="fa-stack">
        <i className="fa fa-search fa-stack-2x"></i>
      </span>
      <h4>Searching...</h4>
    </div>

  # What to render if there's any error during fetches
  failed: (errors) ->
    <div className="warning">
      <span className="fa-stack">
        <i className="fa fa-exclamation-triangle fa-stack-2x"></i>
      </span>
      <h4>{errors}</h4>
    </div>
```

The most important parts of the container are the **listenTo** property which specifies the store (or list of stores) from where the 
container is going to get the state, and the **fetch** object which are functions commonly used to fetch the state from the store and pass it to the component as props by their key. This means that when the component calls `@props.meta.total_count` the **meta** prop has been passed to it by the container by previously getting it from the store wit it's `meta` fetch method.

### The PeopleStore
Here's where the state lives and changes:

```coffee
# /app/frontend/flux/stores/people_store.coffee

PeopleConstants = require '../constants/people_constants'

module.exports = Marty.createStore
  id: 'PeopleStore'

  getInitialState: ->
    searchText: ''
    meta:
      total_pages: 0
      current_page: 0
  
  # Handle dispatcher's actions
  handlers:
    receivePeople: PeopleConstants.RECEIVE_PEOPLE
    updateSearchText: PeopleConstants.SET_SEARCH_TEXT
    resetSearch: PeopleConstants.RESET_SEARCH
  
  # Initial people fetch
  fetchPeople: () ->
    @fetch
      id: 'all-people'
      locally: () =>
        @state.people
      remotely: () =>
        @app.people.queries.findPeople()
  
  receivePeople: (response) ->
    @setState
      people: response.people
      meta: response.meta

  updateSearchText: (text) ->
    @setState
      searchText: text

  resetSearch: ->
    @setState
      searchText: ''
```

To handle state changes it listens to the **Flux dispatcher**. When it receives an action corresponding to any of the values specified in the handlers property it calls the corresponding method to update the state making the **PeopleSection's container** re-render itself.

#### Fetching state
When the component renders for the first time we need to get all the people from the **Rails back-end**. The store provides a **fetch** method that we're using inside `fetchPeople` and which behaves as follows:

1. First it looks in the current state if **people** is set to return it using `locally`.
2. If `locally` returns `undefined` then it calls `remotely` where it will request the data from the Rails back-end and set it in the state.
3. As now **people** is set in the state, additional calls to `fetchPeople` will return them using `localy` again instead of from the Rails back-end.

#### PeopleConstants
As you can see the store's handlers use **PeopleConstants** values to identify which actions from the dispatcher wants to handle. If we take a look to it's source code we can find all the available action types:

```coffee
# /app/frontend/flux/constants/people_constants.coffee

module.exports = Marty.createConstants [
  "FIND_PEOPLE"
  "RECEIVE_PEOPLE"
  "SET_SEARCH_TEXT"
  "RESET_SEARCH"
]
```


### The PeopleQueries
Marty's queries are in charge of getting the sate from outside the application.

```coffee
# /app/frontend/flux/queries/people_queries.coffee

PeopleConstants = require '../constants/people_constants'

module.exports = Marty.createQueries
  id: 'PeopleQueries'

  findPeople: (pageNumber, searchText)->
    # Call the state source and handle response
    @app.people.sources.findPeople(pageNumber, searchText)
    .then (res) =>
      # Create action and pass result
      @dispatch PeopleConstants.RECEIVE_PEOPLE, res
    .catch (err) ->
      console.log err
```

The `findPeople` method calls the sate source which will request the data from the **Rails back-end**. When the data is received it creates an action identified by `PeopleConstants.RECEIVE_PEOPLE` and passes the result with all the people found. This is how we set the people array in the state of the **PeopleStore** using it's `receivePeople` handler previously seen.

### The PeopleAPI
The last thing left is how to we get the data we need from the **Rails back-end**. To do so we are going to use a Marty's http **StateSource**.

```coffee
# /app/frontend/flux/sources/people_api.coffee

module.exports = Marty.createStateSource
  id: 'PeopleAPI'
  # Type of StateSource
  type: 'http'

  findPeople: (pageNumber, searchText) ->
    url = Routes.api_v1_people_path
      page: pageNumber
      search: searchText

    @get(url).then (res) ->
      if res.ok then return res.json()

      throw new Error('Error while finding people', res)
```

This helps us to encapsulate all the complexity of connecting to the back-end by just calling it's `get` method and returning the resulting **json** if everything went as expected.

### Conclusion
Taking a look again to the Flux flow diagram we can see that thanks to **Marty.js** we have easily covered all the elements in it:

<img src="https://github.com/facebook/flux/raw/master/docs/img/flux-diagram-white-background.png" alt="Flux">

The *Web API Utils* is the **PeopleAPI** state source used to access the *back-end*, *Action Creators*  is the **PeopleQueries** which creates *Actions* identified by the **PeopleConstants**, the *Store* is the **PeopleStore** that handles the *Callbacks* which change the *State* causing the *React Views* which is the **Container** wrapping the  **People Section** to re-render.

We are just missing *User Interactions* but we're going to leave this part for the next and final post of this series. In the meanwhile don't forget to take a look to <a href="http://martyjs.org/guides/getting-started/" target="_blank">Marty's documentation</a> and to the example application:

<img src="/images/blog/rails_and_flux/final_result.jpg" alt="Rails and Flux" style="background: #fff;" />
<div class="btn-wrapper">
  <a href="http://rails-and-flux.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/rails_and_flux" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>

Happy coding!
