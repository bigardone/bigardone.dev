---
title: Building Phoenix Battleship (pt. 1)
date: 2016-04-29 08:22 PDT
tags: elixir, phoenix, otp
excerpt:
  Designing the game mechanics
---

<div class="index">
  <p>This post belongs to the <strong>Building Phoenix Battleship</strong> series.</p>
  <ol>
    <li><a href="/blog/2016/04/29/building-phoenix-battleship-pt-1">Designing the game mechanics</a></li>
    <li><a href="/blog/2016/05/03/building-phoenix-battleship-pt-2/">The lobby channel and game supervision</a></li>
    <li><a href="/blog/2016/05/21/building-phoenix-battleship-pt-3/">The game setup</a></li>
    <li><a href="/blog/2016/07/28/building-phoenix-battleship-pt-4/">Placing ships on the board's grid</a></li>
    <li><a href="/blog/2016/08/08/building-phoenix-battleship-pt-5/">Let the battle begin!</a></li>
    <li>Coming soon...</li>
  </ol>
</div>

## Designing the game mechanics
After cloning [Trello][83ef4d19] and [Toggl][28808ea3] I wanted to try something
completely different for my next side-project on **Elixir** and **Phoenix**.
Therefore, after reading more and more about **OTP**, **GenServer**, **Agent** and **GenEvent**
I was so excited about all these new elements to me, that I wanted to build a project where
I could put all of them to work together. I also wanted to create something fun with
a strong real-time touch, so I ended up knowing that I had to build some
kind of multiplayer game. And what better game than the Good Old [Battleship game][4a6f7f89]?

### The puzzle pieces

I draw a lot of diagrams since I started working with **Elixir**.
Before coding a single line of code I like taking some time to think about what I want to
do and what elements are going to be involved in terms of processes and messages. Once
I have an overall idea, I start drawing some sketches representing all that communication flow.
I have personally found this very helpful, once you have every element clear in terms of what role is it
going to take and how it will communicate with the other system components,
coding it is definitely much easier. So after taking some time I finally ended up
sketching something similar to the following diagram:

<img class="center" src="/images/blog/building_phoenix_battleship/diagram.jpg"/>


Before continuing any further I'd like to say that for this tutorial series
we are not going to dig too much into the front-end, which is very similar to the
**Trello** clone. In other words, it's based on the same **React**
 and **Redux** implementation with some subtle changes. I've also started learning
[Elm][6ffd6f5d], so I will probably try to refactor all the front-end and write
another tutorial about it... with some luck :)

Having this said, let's take a closer look at the involved components:

#### The LobbyChannel
A default [Phoenix Channel][6c51ddb1]. Users will join it when visiting the
game's main page. It will be in charge of broadcasting updates of the existing games,
and it will also create new games with the help of the **Game.Supervisor**.

#### The Game.Supervisor
This module will use the [Supervisor][4d783b08] behaviour. It will be responsible for
creating new **Game** processes and supervising them, as well as for
returning the list of the current games that are actually taking place.

#### The Game
Will use the [GenServer][18a2f400]. This processes, supervised by the **Game.Supervisor**,
will store the state for a given game. The state will consist of a map containing
the ids for both the attacker player and the defender, their **GameChannel pids**, the
list of shot results, chat messages, etc. It will also monitor **GameChannel** and **Game.Board** processes,
to detect any error and stop the game.

#### The GameChannel
Another [Phoenix Channel][6c51ddb1]. The main interface between the player's browser and
the **Game** process. It will handle things like joining an existing game, placing
ships in the grid, chat messages, shooting, etc. Monitored by a **Game** process so
in case the channel's process ends, the game process ends as well.

#### The Game.Board
This module will define the basic structure of a player's board. It will
internally use [Agent][d7a21b37] for managing a player's board state. Its state will store
the list of ships, the grid map, hit points, etc. It will also have additional
functionality related to placing ships and taking shots.

#### The Game.Event
This module will be added as a worker to the main application supervision tree.
It will start a new [GenEvent][d096bb08] manager and set up its event handlers.

#### The Game.EventHandler
This module will use [GenEvent][d096bb08] to handle event messages from the previous
**Game.Event** manager and, thanks to the **LobbyChannel**, broadcast
every current game change to any connected visitor's browser.

Despite having represented all these different elements, we actually don't need them all
to build a simple game like this. But implementing them will give us the chance to
learn some useful concepts related to **OTP**, the differences between **GenServer** and
**Agent**, monitoring processes and creating event handlers. I have really enjoyed
building it and putting all the pieces together, so I hope you enjoy it too. Therefore, on the next
part of this series we'll start digging deepereer into them. Meanwhile, feel free to take a look
to the final (but still in progress, though) source code or challenge a
friend to a [battleship game][16b56e99]... Yo ho ho, let the battle begin!


Happy coding!

<a href="https://phoenix-battleship.herokuapp.com/" target="_blank">
  <img class="center" src="/images/blog/building_phoenix_battleship/lobby.jpg"/>
</a>

<div class="btn-wrapper">
  <a href="https://phoenix-battleship.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/phoenix-battleship" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>


  [83ef4d19]: https://github.com/bigardone/phoenix-trello "Phoenix Trello"
  [28808ea3]: https://github.com/bigardone/phoenix-toggl "Phoenix Toggl"
  [4a6f7f89]: https://en.wikipedia.org/wiki/Battleship_(game) "Battleship Game"
  [6ffd6f5d]: http://elm-lang.org/ "Elm"
  [6c51ddb1]: https://hexdocs.pm/phoenix/Phoenix.Channel.html "Phoenix Channel"
  [4d783b08]: http://elixir-lang.org/docs/stable/elixir/Supervisor.html "Supervisor behaviour"
  [18a2f400]: http://elixir-lang.org/docs/stable/elixir/GenServer.html "GenServer behaviour"
  [d7a21b37]: http://elixir-lang.org/docs/stable/elixir/Agent.html "Agent"
  [d096bb08]: http://elixir-lang.org/docs/stable/elixir/GenEvent.html "GenEvent"
  [16b56e99]: https://phoenix-battleship.herokuapp.com/ "Phoenix Battleship"
