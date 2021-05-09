---
title: elmcsspatterns.io
date: 2020-04-27
tags: elm
excerpt: Common CSS patterns done in elm and elm-css
---

## The inspiration

A couple of weeks ago, while searching for a convenient CSS pattern that I needed to implement in one of my elm projects, I stumbled upon [csslayout.io] and felt in love with it instantly. His author, [phuocng](https://dev.to/phuocng), has done a fantastic job not only collecting such a massive collection of patterns but making them easy to find and implement.

## The motivation

[csslayout.io] is the kind of resource that I like to keep handy while working on my front-end, as I tend to write my styles without using any CSS framework whatsoever. Moreover, for the last year, I only use [elm-css] to generate the CSS, which feels to me like [Sass] but functional and statically typed, which is just awesome. Unfortunately, there aren't any similar resources for [elm-css] that I'm aware of, so I couldn't resist writing my version, collecting and sharing the common patterns that I often use.

On the other hand, I've been looking for an excuse to play around with [elm-spa] lately, which I think is going to be one of the next big things in the elm ecosystem. If you are not familiar with [elm-spa], it basically consists of an elm library and a JS client, which automagically takes care of generating all the boilerplate regarding elm single-page applications, letting you focus on the fun part. His author, [ryannhg](https://github.com/ryannhg), is doing an excellent job, keep it up!

## The result

So having [csslayout.io] as inspiration, and [elm-css] + [elm-spa] as motivation, I have started working on [elmcsspatterns.io]. It is still an early version, and I will probably change everything now and then, but if you are into **elm** and **elm-css** I hope you find it useful, and if not, I hope it makes you want to try them :)

<a href="https://elmcsspatterns.io/" target="_blank" class="btn">
<img class="center" src="/images/blog/elmcsspatterns/home.png"/>
</a>


Happy coding!

<div class="btn-wrapper">
  <a href="https://elmcsspatterns.io/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Site</a>
  <a href="https://github.com/bigardone/elm-css-patterns" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>


[csslayout.io]: https://csslayout.io/
[elm-css]: https://github.com/rtfeldman/elm-css
[Sass]: https://sass-lang.com/
[elm-spa]: https://github.com/ryannhg/elm-spa
[elmcsspatterns.io]: https://elmcsspatterns.io/
