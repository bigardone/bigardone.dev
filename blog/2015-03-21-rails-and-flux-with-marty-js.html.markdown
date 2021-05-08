---
title: Rails and Flux with Marty.js
date: 2015-03-21 01:10 PDT
tags: rails, reactjs, flux
---

After using Facebook's **React JS** for the last months and for different projects I have to say I'm as excited as the first day of using it. I feel that as a full-stack developer I have finally found a front-end framework which fits perfectly to my needs. This doesn't mean I think it's better or worse than any other framework, it's just different and exactly what I need for the current projects I'm involved in.

But the more I've been using it the more I've been starting to feel like creating only just **React components** and a [homemade solution](/blog/2014/11/28/rails-and-react-iv-independent-components-communication) for managing the communication and data flow between them was not the right direction to follow. 

Then I met **Flux**.

## Facebook's Flux


<a href="http://facebook.github.io/flux/" target="_blank">Flux</a> is an application architecture created by **Facebook** for building client-side applications. 

>  It's more of a pattern rather than a formal framework, and you can start using Flux immediately without a lot of new code.

This means that is not a framework by itself, it's more like a way of structuring applications using **React JS** components and how they communicate thanks to the **unidirectional data flow**. To do so it introduces 4 new concepts:

<img src="https://github.com/facebook/flux/raw/master/docs/img/flux-diagram-white-background.png" alt="Flux">

### The Dispatcher
The central hub of the application. It manages actions and *dispatches* actions and data to the stores using the callbacks they provide.

### Stores
Stores are the ones to keep and manage the application's state for a specific domain. This means that there can be multiple **stores** to manage the **state** of multiple **components** like a list of records to display, the visibility of a modal window, validation errors for a form or whatever the components used might need. 
They register with the **dispatcher** and provide callbacks which receive the **action** as a parameter, so they can update their state via hooks for specific **actions**. When the change their state they broadcast an event declaring so, and components listening may use the new state to update themselves.

### Actions
Helper methods that trigger a dispatch to the **stores** and may include a payload of data. There can be two types of actions:

- **User actions** which are invoked as a result of the user interaction with the application, like a button click.
- **Server actions** which are commonly used to provide some payload to the stores received from an API, for instance.

### Views and Controller-Views
**Views** are the **React components** we already know and **Controller-Views** are parent components which receive the state from the **stores** and pass it to their children as **props**.


## Marty.js as Flux implementation
After understanding this simple principles and how the data flows, you can take a look to it's git repository where you can find the source code of the **dispatcher** and some examples to start creating your own **Flux** implementation. There are also some open source implementations for you to use like:

- <a target="_blank" href="http://fluxxor.com/">Fluxxor</a> 
- <a target="_blank" href="https://github.com/yoshuawuyts/barracks">Barracks</a> 
- <a target="_blank" href="http://deloreanjs.com/">Delorean</a> 
- <a target="_blank" href="https://github.com/spoike/refluxjs">Reflux</a> 
- <a target="_blank" href="http://kenwheeler.github.io/mcfly/">McFly</a> 
- <a target="_blank" href="https://github.com/jmreidy/fluxy">Fluxy</a> 
- <a target="_blank" href="http://martyjs.org/">Marty.js</a> 

They all have their good parts and add their own value to Flux, but my chosen one is **Marty.js** and it's the one I'm actually using. Some of the reasons are:

- It has a nice website where you can find some decent documentation and code examples.
- I like the way it organizes and structures the different components taking part in the **unidirectional data flow**.
- It introduces the concept of **data sources** which I personally love.
- The author, <a href="https://github.com/jhollingworth" target="_blank">James Hollingworth</a>, is not only constantly updating and enhancing it but also answering any doubt you may have regarding it's functionality.

On my next post I will write about how to use **Marty.js** as the front-end framework for a Rails application. If you have read my past post series about **Rails and React** you'll be familiar with the final result:

<img src="/images/blog/rails_and_flux/final_result.jpg" alt="Rails and Flux" style="background: #fff;" />
<div class="btn-wrapper">
  <a href="http://rails-and-flux.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/rails_and_flux" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>

So stay tunned and happy coding!

