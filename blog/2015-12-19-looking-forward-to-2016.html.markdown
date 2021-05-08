---
title: Looking forward to 2016
date: 2015-12-19
tags: code, love
---

2015 has been one the most fun years regarding my career by far. While continuing improving my **Ruby** and **Rails** skills
I was already using Facebook's **React** to code small components for the projects I was working on. This
gave me the ability to start creating more and more sophisticated and dynamic UI's. If your'e into React then
you'll know that the next level is using a **Flux** implementation to manage the state through all of your components.
My first choice was **Marty.js** and it changed for ever the way I used to code the views. Instead of
creating plain **haml** views and adding some components to them, now I could move all that logic to a **cjsx** view component
which made a lot of a more sense.

So without even noticing it I was starting to focus my development
more and more into the front-end and it's separation from the back-end. The missing piece of the
puzzle was **react-router** and with it I was able to create my first single-page applications, leaving my
**Rails** back-ends as mere JSON API's. If I wanted to make them even more independent I had to
stop **Rails** being in charge of managing and building my assets, so I started to use **npm** and **webpack** for this.
Now I could install new libraries from the command line and require them where needed. Awesome.

Suddenly sad news came, and **Marty's** development was stopped. But every cloud has a silver lining, and while
looking for an alternative I met **Redux**, which was even easier to use than Marty.
Rails 5 was also announced, and **ActionCable** was it's most interesting feature to me. Finally **websockets** on Rails out
of the box. But to make them work you need to have at least **Redis** and a multithreaded server like **Puma**, which are
dependencies I might not need or want for certain projects and I felt a little upset about the path
my favorite framework was following.

I have to admit that even though I was very excited about using the front-end stack I've been mastering all over the year, I was
also starting to get bored and loosing interest on coding back-end stuff using Rails. And this is something I haven't felt for
the last years. But one day <a href="https://twitter.com/hopsor" target="_blank">Victor</a> (thank you bro!), my teammate at <a href="https://diacode.com/" target="_blank">Diacode</a>, told me about the **Elixir** language and the **Phoenix** framework, and a new era has started for me.

Now I'm so excited about coding back-end stuff as I was back when I started with **Ruby** and **Rails** five years ago. **Elixir** is
a **functional** programming language based on **Erlang** which has a all of it's benefits like immutability and concurrency with
a friendly syntax very similar to Ruby's one. It's kind of difficult at the beginning to change your mindset from object oriented
programming to functional programming, but once you start to get used to it you feel like it's even easier and that what happens in
the code is also easier to understand.

**Phoenix** is it's most popular framework and it not only has the good parts and standards Rails brought to
web development, but also some cool features like assets management and building via **npm** and **brunch**/**webpack**, and **websockets** out of the box done right (with no external dependencies or restrictions), you can start coding modern, realtime and functional applications in just a couple of minutes.

Right now I'm developing at <a href="https://diacode.com/" target="_blank">Diacode</a> our first **Elixir** and **Phoenix** single-page, realtime application using as front-end stack **npm**, **webpack**, **React**, **Redux** and **ES6**. If someone had told me this a year ago I wouldn't have believed it, and I feel like a kid on Christmas day.

This is why I love what I do. This is why I love my profession. This is why I'm looking forward to 2016 and I can't wait to see what it brings.

Merry Christmas and Happy New Coding Year!
