---
title: "Rails and React I: A happy medium"
date: 2014-08-24
tags: rails, reactjs
---

Since I started developing using **Ruby on Rails** as my main framework of choice, I have different approaches to 
make my front-side JavaScript fit better into my projects. This is one of the never-ending discussions since Rails gives you the freedom 
to do it as you like, so there are dozens of different approaches, some of them defending the use of **JavaScript MV* frameworks** and some of them not.

I discovered my favorite approach some months ago while reading this great article about *<a target="_blank" href="https://medium.com/@cblavier/rails-with-no-js-framework-26d2d1646cd">Rails with no JS framework</a>*, where the author explains why a **MV* framework** is not always necessary. The main argument is because not all applications require complex functionality on the client-side, so he shows a really nice way to organize and manage your *JavaScript* just using common tools we are already used to like **jQuery**, **CoffeeScript** and **Turbolinks**. The result is so nice that I've been using it in all my projects since then. 

### The happy medium
I totally agree with Christian Blavier's opinion of not using **client-side frameworks** such as **Backbone**, **AngularJS** or **EmberJS** unless the situation strongly requires it. This libraries are sometimes very complex and as a Rails developer and lover I like to use it's good parts instead of just having an **API application** just serving *json*. 

But as a *full-stack* developer I also love being creative on the *client-side* and building interactive views to enhance as much as possible the user's experience, so I use *JavaScript* more and more. A couple of months ago I started the search for a simple but powerful library to use on my future projects and which feels just fine in conjunction with Rails. And then I met **React**...

### React, the V in MV*
<a target="_blank" href="http://facebook.github.io/react/">React</a> is a *JavaScript library for building user interfaces* from the people at **Facebook**, who have been using it for a while and decided to open-source it after it was stable enough. The main differences with other frameworks and libraries are:

- **React** focuses on entities called **Components**.
- Every **Component** has an immutable set of properties called **props** which are passed to the component as *parameters* and cannot be changed after the it's rendered.
- Every **Component** also has an internal **state**, which can be changed, and when it does, the components re-renders again.
- Every **Component** has a **render** function.
- Instead of using a template engine, components use plain **JS** or **JSX** to render.
- What makes **React** really powerful and fast is the way it renders components when their **props** or **state** change. Instead of manipulating the existing **DOM** as other frameworks do, it uses what they call the *virtual DOM*.
- When the **state** of a **Component** changes, **Reactjs** checks for diffs between the *virtual DOM* and the *current DOM* and only applies those changes instead of having to re-render the whole *DOM* again. So imagine the *virtual DOM* as a **GIT** system for the *DOM*.
- **Components** can be nested, so you can write really small reusable components which pass data from parents to children, and bind event handling from children to parents.

### Conclusion
I really like **React**. After a couple of months writing components for my new pet project I feel very comfortable with it and I'm really happy with the final result. It's really easy to learn how it works and to use it in those views where there is some extra complex behavior needed, but not too much as for using a full **MV*** framework for the whole project. In the next post I will write a real example of how to integrate **React** with **Rails** and build some reusable components, so stay tuned :)

Happy coding!
