---
title: Introducing the MultInput jQuery plugin
date: 2014-01-12
tags: jquery, coffeescript, sass
---
Last month I discovered <a target="_blank" href="http://www.bucketlistly.com/">BucketListly</a>, a web application that lets you create a bucket list of real life goals, earn points and badges completing them, share your progress with your family and friends and some more nice features which gives you an extra motivation to improve oneself. As the new year was around the corner, I decided to give it a try and create my new year's resolution list adding some of the goals I want to achieve in 2014. 

One of this goals is to start sharing into **GitHub** some of the stuff I like to create, like a small **jQuery** plugin I've been working on recently, using **CoffeeScript** and **Sass**.

<!--more-->

### Enter the MultInput
The <a href="http://codeloveandboards.com/multinput/" target="_blank">MultInput</a> is a simple **jQuery** plugin which lets you split automatically any form text input  into multiple smaller inputs by specifying a pattern of your choice. The initial idea came from helping the user to introduce any kind of account number, serial number or whatever combination between letters and numbers following a pattern in an easier way. So if the user has to introduce a value in a field following a pattern like *AZ-9999-9999-9999*, you can apply the plugin to that field by just adding two `data` attributes to the field:

	<input type="text" data-multinput data-pattern="AZ-9999-9999-9999">
  
And the plugin will do the following:

1. Check if the pattern is correct.
2. Hide your original input.
3. Create 4 new inputs, one with a `maxlength` of 2 chars and three with a  `maxlength` of 4.
4. When the user starts typing on them it will ignore wrong characters. This means that only letters will be allowed on fields with the *AZ* part of the pattern and only numbers on the *9999* ones.
5. As the user keeps entering valid characters it will auto focus the next field to give the user the feeling of filling a single text input.
6. On every keystroke, the original text input (now hidden, remember) will have automatically updated its own value.

If you want to skip the *data attributes* initialization you can also use the plain old jQuery way:

```javascript
$(function() {
  $('#your_input_id').multinput();
});
```

It is in a very early stage of development and I'm planing to add more features soon as also some unit testing too. Meanwhile, I hope you like it :)

Happy coding!

<a href="http://codeloveandboards.com/multinput/" target="_blank">MultInput homepage</a> - <a href="https://github.com/bigardone/multinput/" target="_blank">MultInput on GitHub</a>
