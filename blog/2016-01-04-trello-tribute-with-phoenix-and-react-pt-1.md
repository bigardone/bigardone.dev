---
title: Trello tribute with Phoenix and React (pt.1)
date: 2016-01-04
tags: elixir, phoenix, react
excerpt:
  Step by step tutorial on how to create a Trello clone with Elixir,
  Phoenix Framework, React and Redux.
canonical: https://blog.diacode.com/trello-clone-with-phoenix-and-react-pt-1
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

[Trello][455d6e81] is one of my favorite web applications of all time. I've been using
it since its very beginning and I love the way it works, its simpleness and
flexibility. Every time I start learning a new technology I like
to create a real-case application where I can put in practice everything I'm learning
into possible real-life problems and test out how to solve them.
So when I started to learn [Elixir][0cff6a5b] and it's [Phoenix][86fc0250]
framework it was clear to me: I had to put in practice all the awesome stuff I was
learning and share it as a tutorial on how to code a simple, but functional,
tribute to **Trello**.

## What are we going to build
Basically we are going to code a single-page application where existing users are
will be able to sign in, create some boards, share them with other existing
users and add lists and cards to them. While viewing a board, connected users will
be displayed and any modification will be automatically reflected on every
connected user's browser in real-time a la Trello style.

### The current stack

**Phoenix** manages static assets with **npm** and builds them using **Brunch** or
**Webpack** out of the box, so it's pretty simple to really separate both the
front-end and the back-end, while having them in the same codebase. So for the back-end
we are going to use:

  - Elixir.
  - Phoenix framework.
  - Ecto.
  - PostgreSQL.

And to build the single-page front-end we are going for:

  - Webpack.
  - Sass for the stylesheets.
  - React.
  - React router.
  - Redux.
  - ES6/ES7 JavaScript.

We'll be using some more **Elixir** dependencies and **npm** packages, but
I will talk about them as soon as we use them.

### Why this stack?
**Elixir** is a very fast and powerful functional language based on **Erlang** and with friendly
syntax very similar to **Ruby**. It's very robust and specialized in concurrency so it can
automatically manage thousands of concurrent processes thanks to the **Erlang VM**.
I'm an Elixir newbie so I still have a lot to learn, but I can say that from what I've
tested so far it is really impressive.

We are going to use **Phoenix** which is Elixir's most popular web
framework right now which not only uses some of the parts and standards that **Rails**
brought to web development, but also it offers many other cool features like the
way it manages static assets I mentioned before and, the most important to me,
**real-time** functionality out of the box through **websockets** easy as pie and with no
need of any external dependency (and trust me, it works like a charm).

On the other hand we are using **React**, **react-router** and **Redux** because
I just love this combination to create single-page applications and manage the their
state. Instead of using **CoffeeScript** as I always do, this new year I want to start using **ES6** and
**ES7**, so it's the perfect occasion to start doing so and get used to it.

### The final result
The application will consist of four different screens.
The first two are the sign up and sign in screens.

<img src="/images/blog/trello_tribute_pt_1/sign-in.jpg"/>

The main screen will consist of the list of owned boards by the user and the list of
boards he's been added as member by other users:

<img src="/images/blog/trello_tribute_pt_1/boards.jpg"/>

And finally the board screen where all users will be able to see who is connected,
and manage lists and cards around.

<img src="/images/blog/trello_tribute_pt_1/show-board.jpg"/>

So that's enough talk for now. Let's leave it here so I can start preparing the second
part in which we will see how to create a new **Phoenix** project and what changes we
need to make in order to use **Webpack** instead of **Brunch** and how to setup the
front-end foundations.

Happy coding!


  [455d6e81]: https://trello.com/ "Trello"
  [0cff6a5b]: http://elixir-lang.org/ "Elixir"
  [86fc0250]: http://www.phoenixframework.org/ "Phoenix framework"
