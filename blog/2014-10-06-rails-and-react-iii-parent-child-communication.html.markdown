---
title: 'Rails and React III: Parent-child communication'
date: 2014-10-06
tags: rails, reactjs
---

[In the last post](/blog/2014/09/10/rails-and-react-ii-a-real-use-case) we saw how to install **React** in a **Ruby on Rails** application 
and how to code our first components. The result is a simple application where we display a list of contacts and we can filter them thanks to a search form. Every contact's card and the search form are **React components**, all of them children of the same parent, the *PeopleSection*, which is responsible for:

- Requesting and providing the necessary data to the list of contacts.
- Handling the search form's submit event so it can request the data depending on the user's input.

This two are the main points to keep in mind while coding **React** components. Data flows from the parent to it's children and events are handled from children, all the way up, to their parent. But there may be also situations where we are going to need communication between components that don't share this parent-child relationship and **React** gives us the freedom to set this up as we desire. So lets take a closer look to the first way of communication between components.

## Parent-child communication
**React**'s documentation specifies that communication between parent-child components must be done using **props**. This means that a parent component passes to it's children the necessary properties for them to render and uses them also to handle events. So let's put this into practice and code some new components to enhance our application.

### The paginator section
As there are going to be many contacts in our application we need to paginate them. On the back-end I have installed the <a href="https://github.com/amatsuda/kaminari" title="Kaminari gem" target="_blank">Kaminari gem</a> so in the *PeopleController* we just have to pass the page number received in the request and **Kaminari** will do the rest:

```ruby
# /app/controllers/people_controller.rb

class PeopleController < ApplicationController
  before_filter :search_people

  def index
    render json: {
      people: @people,
      # Necessary meta data to make the PaginatorSection component work
      meta: {
        current_page: @people.current_page,
        next_page: @people.next_page,
        prev_page: @people.prev_page,
        total_pages: @people.total_pages,
        total_count: @people.total_count
      }
    }
  end

  private

  def search_people
    @people =  if params[:search].present?
      Person.search(params[:search])
    else
      Person.all
    end.sorted.page(params[:page]) # Kaminari's paging
  end
end

```

Now it's time to create the new pagination components. So let's start with the *PaginatorSection*:

```coffee
# /app/assets/javascripts/react/paginator/paginator_section.js.coffee

# @cjsx React.DOM

@PaginatorSection = React.createClass
  displayName: 'PaginatorSection'
  # Link on click event handler
  _handleOnClick: (pageNumber) ->
    # Uses it's own props as callback, so it's parent component can 
    # handle it and receive the pageNumber value.
    @props.onPaginate(pageNumber)
  render: ->
    # If there is more than 1 page...
    if @props.totalPages > 1
      # Render the links list
      <ul className="pagination">
        {
          for i in [1..@props.totalPages]
            <li key={i}>
              {
                # Different item for current page
                if i == @props.currentPage
                  <span>&nbsp;</span>
                else
                  # PaginatorLink component with a pageNumber prop that will 
                  # used to set the value passed by it's other 
                  # onPaginatorLinkClick prop callback.
                  <PaginatorLink pageNumber={i} onPaginatorLinkClick={@_handleOnClick} />
              }
            </li>
        }
      </ul>
    # ... if one page only or none
    else
      # Remember that the render function has to return always a single node
      <div>&nbsp;</div>
```

This component renders a list of links depending on it's *totalPages* and *currentPage* props. It will also handle it's *PaginatorLink* children clicks, and propagate upwards the *pageNumber* value to it's parent.

### The paginator link

The *PaginatorLink* component is very simple:

```coffee
# /app/assets/javascripts/react/paginator/paginator_link.js.coffee

# @cjsx React.DOM

@PaginatorLink = React.createClass
  displayName: 'PaginatorLink'
  # Click handler will use it's onPaginatorLinkClick prop to pass 
  # the pageNumber value to it's parent.
  _handleOnClick: (e) ->
    e.preventDefault()
    @props.onPaginatorLinkClick(@props.pageNumber)
  render: ->
    <a href="#" onClick={@_handleOnClick}>&nbsp;</a>
```

With this two we have a simple way to add pagination capabilities to any other component we may want to add it. So let's add it to the main *PeopleSection* we coded in the last post. 

### The people section


```coffee
# app/assets/javascripts/react/people/people_section.js.coffee

# @cjsx React.DOM

@PeopleSection = React.createClass
  
  # ...
  
  getInitialState: ->
    didFetchData: false
    people: []
    # Meta data used for the PaginationSection component
    meta:
      total_pages: 0
      current_page: 1
      total_count: 0
    # Data we are going to send to the back-end to search and paginate results
    fetchData:
      search: ''
      page: 1

  # ...

  _fetchPeople: ()->
    $.ajax
      url: Routes.people_path()
      dataType: 'json'
      # Send the state defined previously
      data: @state.fetchData
    .done @_fetchDataDone
    .fail @_fetchDataFail

  _fetchDataDone: (data, textStatus, jqXHR) ->
    return false unless @isMounted()
    @setState
      didFetchData: true
      # Sets the state to show the results and make the paginator work
      people: data.people
      meta: data.meta

  # ...
  
  # PaginatorSection handler
  _handleOnPaginate: (pageNumber) ->
    # Changes  the sate pageNumber value and cal
    @state.fetchData.page = pageNumber
    # Retrieve new results page
    @_fetchPeople()


  render ->
    # ...
    <div>
      # ...
      # Adding the PaginatorSection with all its props
      <PaginatorSection totalPages={@state.meta.total_pages} currentPage={@state.meta.current_page} onPaginate={@_handleOnPaginate}/>
      <div className="cards-wrapper">
        #...
      </div>
      # Lets add another PaginatorSection at the bottom
      <PaginatorSection totalPages={@state.meta.total_pages} currentPage={@state.meta.current_page} onPaginate={@_handleOnPaginate}/>
    </div>
```

As you can notice, now we are using the state's *fetchData* property as the data sent to the back-end. This is because I wanted to keep the 
user's search value and page number while paginating.

### React's flow

So in brief this is what is happening:

- *PeopleSection* renders, mounts and fetches data.
- Receives data, changes it's state and passes this state as props to it's *PaginatorSection* child.
- Using this props it creates multiple *PaginatorLink* components.
- When one of this *PaginatorLink* gets clicked, it informs it's *PaginatorSection* parent using it's props.
- *PaginatorSection* informs the *PeopleSection* about the requested *pageNumber*.
- *PeopleSection* uses this *pageNumer* to fetch the data.
- All the process starts again.

As I mentioned before we can also make independent components communicate with each other and we have all the freedom to achieve this as we like. This 
is what we are going to do **in the next post**, so in the meanwhile check out the final result and the source code:

<img src="/images/blog/rails_and_react_iii/final_result.jpg" alt="Heroku" style="background: #fff;" />
<div class="btn-wrapper">
  <a href="http://rails-and-react-iii.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/rails_and_react/tree/feature/part_three" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>

Happy coding!
