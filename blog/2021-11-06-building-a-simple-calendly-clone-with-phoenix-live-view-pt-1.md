---
title: "Building a simple Calendly clone with Phoenix LiveView (pt. 1)"
excerpt: "Introduction."
date: "2021-11-06"
tags: elixir, phoenix, liveview
image: "https://bigardone.dev/images/blog/2021-11-06-building-a-simple-calendly-clone-with-phoenix-live-view-pt-1/post-meta.png"
---

<div class="index">
  <p>This post belongs to the <strong>Building a simple Calendly clone with Phoenix LiveView</strong> series.</p>
  <ol>
    <li><a href="/blog/2021/11/06/building-a-simple-calendly-clone-with-phoenix-live-view-pt-1">Introduction.</a></li>
    <li><a href="/blog/2021/11/08/building-a-simple-calendly-clone-with-phoenix-live-view-pt-2">Generating the initial project and domain models.</a></li>
    <li><a href="/blog/2021/11/11/building-a-simple-calendly-clone-with-phoenix-live-view-pt-3">The event type selection page.</a></li>
    <li><a href="/blog/2021/11/22/building-a-simple-calendly-clone-with-phoenix-live-view-pt-4">Rendering the monthly calendar.</a></li>
    <li><a href="/blog/2021/12/01/building-a-simple-calendly-clone-with-phoenix-live-view-pt-5">Booking time slots for an event type.</a></li>
    <li><a href="/blog/2021/12/20/building-a-simple-calendly-clone-with-phoenix-live-view-pt-6">Managing event types, part one.</a></li>
    <li><a href="/blog/2022/01/11/building-a-simple-calendly-clone-with-phoenix-live-view-pt-7">Managing event types, part two.</a></li>
    <li><a href="/blog/2022/01/31/building-a-simple-calendly-clone-with-phoenix-live-view-pt-8">Managing event types, part three.</a></li>
    <li>Coming soon...</li>
  </ol>
  <a href="https://github.com/bigardone/calendlex" target="_blank"><i class="fa fa-github"></i> Source code</a><br>
  <a href="https://calendlex.herokuapp.com/" target="_blank"><i class="fa fa-cloud"></i> Live demo</a>
</div>

## Motivation
I've been using **Elixir** and **Phoenix** for the last six years to build from APIs to complete web applications using **React** and **Elm** on the front-end, being **Elm** my weapon of choice primarily. Since **LiveView** came out, I have played around with it a couple of times, first to build an [ant farm] and second to set up a [headless CMS]. However, I never ended up getting hooked by it, and I kept relying on **Elm** to build my front-ends. But when **Phoenix v1.6** and **LiveView v0.17** came out, my feelings about **LiveView** changed utterly, and I couldn't resist making something more extensive to test out all its new features, making me finally understand all of its power.

## Why Calendly?
When I want to dive deep into new technology, I like building a small clone of a popular service to see how far I can get with it. Scheduling services like [Calendly] have become very popular, and often people share their public calendar links so others can select the ideal date and time for a meeting. Therefore, after examining its UI, I thought it would be a fun pet project and an excellent tutorial to share.

## What are we going to build?
Since **Calendly** has tons of features, and this tutorial is about **Phoenix LiveView**, we will focus on its core, which is managing even types and scheduling events. Our application will consist of two different parts:

1. The sharable public page where invitees can select an event type, a date, and a slot to schedule a meeting with us.
2. The private admin site, protected by Basic HTTP authentication, where we can create and edit event types and manage all the scheduled events.

Regarding **LiveView**, we are going to rely on some of its more powerful features such as:

- Live sessions.
- Live components.
- Function components.
- JS hooks.
- JS commands.

Here are some screenshots of the final result:

### The home page.
<a href="/images/blog/2021-11-06-building-a-simple-calendly-clone-with-phoenix-live-view-pt-1/home.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-11-06-building-a-simple-calendly-clone-with-phoenix-live-view-pt-1/home.png"/>
</a>

### The calendar page.
<a href="/images/blog/2021-11-06-building-a-simple-calendly-clone-with-phoenix-live-view-pt-1/calendar.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-11-06-building-a-simple-calendly-clone-with-phoenix-live-view-pt-1/calendar.png"/>
</a>

### The schedule event page.
<a href="/images/blog/2021-11-06-building-a-simple-calendly-clone-with-phoenix-live-view-pt-1/schedule.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-11-06-building-a-simple-calendly-clone-with-phoenix-live-view-pt-1/schedule.png"/>
</a>

### The event types admin page.
<a href="/images/blog/2021-11-06-building-a-simple-calendly-clone-with-phoenix-live-view-pt-1/event-types.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-11-06-building-a-simple-calendly-clone-with-phoenix-live-view-pt-1/event-types.png"/>
</a>

### The create/edit event type admin page.
<a href="/images/blog/2021-11-06-building-a-simple-calendly-clone-with-phoenix-live-view-pt-1/edit-event-type.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-11-06-building-a-simple-calendly-clone-with-phoenix-live-view-pt-1/edit-event-type.png"/>
</a>

### The scheduled events admin page.
<a href="/images/blog/2021-11-06-building-a-simple-calendly-clone-with-phoenix-live-view-pt-1/scheduled-events.png">
  <img class="shadow-lg rounded-md" src="/images/blog/2021-11-06-building-a-simple-calendly-clone-with-phoenix-live-view-pt-1/scheduled-events.png"/>
</a>

In the next part of the series, we will jump into the action by creating a new Phoenix project and generating the necessary Ecto schemas for modeling both event types and events. In the meantime, you can check the end result [here](https://calendlex.herokuapp.com/), or have a look at the [source code](https://github.com/bigardone/calendlex).

Happy coding!

<div class="btn-wrapper">
  <a href="https://calendlex.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/calendlex" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>


[ant farm]: https://github.com/bigardone/phoenix-liveview-ant-farm
[headless CMS]: https://github.com/bigardone/phoenix-cms
[Calendly]: https://calendly.com/
