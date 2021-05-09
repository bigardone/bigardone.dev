---
title: 'Rails and React IV: Independent components communication'
date: 2014-11-28
tags: rails, reactjs
---

On my [previous post](/blog/2014/10/06/rails-and-react-iii-parent-child-communication) about the **Rails & React** series I explained how the communication between **parent-child** components works. The flow is very simple: as components must be as stateless as possible, parents pass the necessary data to their children as **props** and they also keep an eye on their events to propagate event handling all the way up back to the parents. But how do we make independent components, not sharing any parent, communicate with each other?


## Pub/Sub event system
As **React's** official documentation specifies: 
> For communication between two components that don't have a parent-child relationship, you can set up your own global event system.

Basically what out components have to do is to  subscribe to events in the *componentDidMount()* method, unsubscribe in the *componentWillUnmount()*, and call *setState()* when needed.

### The *reset filter* button
So for the demo application I want to add a button to reset the filter when no matches are found while filtering our contacts. As  I want this button to be placed anywhere we want, or even added multiple times in our main view and not necessary as a child of the *PeopleSection* component, it's the perfect candidate for a different communication approach.

<img src="/images/blog/rails_and_react_iv/reset_button.jpg" alt="Heroku" style="background: #fff;" />
<div class="btn-wrapper">
  <a href="http://rails-and-react-iii.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/rails_and_react/tree/feature/part_three" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>

Instead of creating my own **pub/sub** system, to handle events between independent components, I decided to use <a href="https://github.com/mroderick/PubSubJS" target="_blank">PubSubJS</a> which I have already used before and it works really well.

After downloading the script and placing it in the *vendor/assets/javascripts* folder, we just have to require it in the *application.js.coffee* manifest:

```coffee
# app/assets/javascripts/application.js.coffee

# ...
#= require pubsub
# ...
```
Now let's take a look to the reset button component:

```coffee
# app/assets/javascripts/react/buttons/reset_button.js.coffee
 
# @cjsx React.DOM

@ResetButton = React.createClass
  displayName: 'ResetButton'

  _handleOnClick: (e) ->
    e.preventDefault()
    # Publish the following topic when clicked
    PubSub.publish 'resetButton:onClick'

  render: ->
    <a className={@props.styleClass} href="#" onClick={@_handleOnClick}>{@props.text}</a>
```

As you can see, this is a very simple component. It only renders a link with a text (passed as a prop) and it only publishes the *resetButton:onClick* topic when clicked. It also receives a *styleClass* prop so it can have a different look & feel depending on where do we want to place it.

Now other components can subscribe to this *resetButton:onClick* topic. So let's get back to the *PeopleSection* component and reset the results so it shows all off our contacts:

```coffee
# app/assets/javascripts/react/people/people_section.js.coffee

# @cjsx React.DOM

@PeopleSection = React.createClass
  # ...
  componentDidMount: ->
    @_subscribeToEvents()
    # ...
    
  componentWillUnmount: ->
    # When the component unmounts then unsubscribe
    @_unsubscribeFromEvents()
  
  _subscribeToEvents: ->
    # When the reset button is clicked...
    PubSub.subscribe 'resetButton:onClick', ()=>
      # Reset the fetch data...
      @state.fetchData =
        search: ''
        page: 1
        
      # ... and fetch people
      @_fetchPeople()
 
  _unsubscribeFromEvents: ->
    PubSub.unsubscribe 'resetButton:onClick'
 
  # ...

```

The *PeopleSearh* component is going to be also subscribed to the *resetButton:onClick* topic, so when it's triggered the search input text will also reset it's value:

```coffee
# app/assets/javascripts/react/people/people_search.js.coffee

# @cjsx React.DOM

@PeopleSearch = React.createClass
  # ...
  
  componentDidMount: ->
    @_subscribeToEvents()

  componentWillUnmount: ->
    @_unsubscribeFromEvents()

  _subscribeToEvents: ->
    $(@refs.search.getDOMNode()).on 'keyup', @_handleSearchOnKeyup
    
    # When the reset button is clicked...
    PubSub.subscribe 'resetButton:onClick', ()=>
      # Reset the search input value
      @refs.search.getDOMNode().value = ''
      @setState
        searchLength: 0
        
  _unsubscribeFromEvents: ->
    PubSub.unsubscribe 'resetButton:onClick'
    
```

Now that  we have the new *ResetButton* component ready to go, let's add it wherever we need it just like this:

```coffee
<ResetButton text="Reset filter" styleClass="btn" />
```

As you can see, using a library such as <a href="https://github.com/mroderick/PubSubJS" target="_blank">PubSubJS</a> provides a very easy way to handle communication between independent components, but as **React** gives us the freedom to achieve this however we prefer, there can be many different ways to do it. What's your favorite one?

Happy coding!
