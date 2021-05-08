---
title: Ruby and method arguments
date: 2014-02-05
tags: ruby, code
---

One thing I like most about **Ruby** is the flexibility it gives you to do the same thing in many different ways, so you can choose the way that suits you better. Deciding how you want your methods to receive arguments and therefore how those arguments are going to be passed is one of the things that you can perform in many different ways. This may sound simple, but as Ruby evolves the way arguments are passed to methods also do, so lets take a closer look to the most common approaches out there.

###Positional arguments

The most common way of passing them is by using **positional arguments**. Every argument has it's own position, they must be passed in the same order as they are defined and all of them are required:

```ruby
def foo(a, b, c)
  puts [a, b, c]
end

foo(1, 2, 3) 
#=> [1, 2, 3]
```

But what happens if any of them are missing?

```ruby
def foo(a, b, c)
  puts [a, b, c]
end

foo(1, 2) 
#=> ArgumentError: wrong number of arguments (2 for 3)
```

This can be easily prevented by assigning some **default values**:

```ruby
def foo(a = 1, b = 2, c = 3)
  puts [a, b, c]
end

foo(1, 2) 
#=> [1, 2, 3]
```

###Array arguments

There might be situations where you need to accept an undetermined number of arguments, or just some optional ones. This can be done using this simple syntax:

```ruby
def foo(*args)
  puts args
end

foo(1, 2, 3) 
#=> [1, 2, 3]
```

Using the <code>*</code> will tell your method to create an array with the received arguments. You can also mix **array arguments** with ordinary ones, and Ruby will be smart enough to assign them:

```ruby
def foo(a, b, c, *d)
  puts [a, b, c]
  puts d
end

foo(1, 2, 3, 4, 5, 6) 
#=> [1, 2, 3]
#=> [4, 5, 6]
```

But what about default values? Yes, you can also use default values, just remember that you have to place default value parameters always before ordinary ones, otherwise you will get a syntax error:

```ruby
def foo(a, b, c = 'default', *d, e)
  puts [a, b, c]
  puts d
  puts e
end

foo(1, 2, 3) 
#=> [1, 2, 'default']
#=> []
#=> 3
```

###Hash arguments
Array arguments look useful, but retrieving their values by their index may not be that useful. That's why Ruby offers us **hash arguments**, so you can access their values by their key, making your code more readable:

```ruby
def foo(args)
  puts args[:a]
  puts args[:b]
end

foo(a: 1, b: 2) 
#=> 1
#=> 2
```

As we saw previously, you can also mix ordinary arguments with hashes:

```ruby
def foo(a, args)
  puts a
  puts args
end

foo(1, b: 2, c: 3)
#=> 1 
#=> {b: 2, c: 3}
```

Cool, right? But what about **missing arguments and default values**? Well, here comes the tricky part. To set default values into **hash arguments** you will have to use the following technique which sets an empty hash as the default value and afterwards merge it with your desired default values:

```ruby
def foo(a, args = {})
  defaults = {b: 2, c: 3}
  args = defaults.merge(args)
  puts a
  puts args
end

foo(1)
#=> 1 
#=> {b: 2, c: 3}
```

This adds some more typing, but without doing so, missing argument's default values will be ignored, and you don't want that.

###Keyword arguments
**Keyword arguments** is one of the most awaited features of **Ruby 2.0**. Thanks to them you have even more freedom and flexibility while defining your arguments. Lets take a look at how to use them:

```ruby
def foo(a: 1, b: 2)
  puts a
  puts b
end

foo(a: 1)
#=> 1 
#=> 2
```

As you can see it's very similar to **hash arguments** but without the ugly merging part. Now you can set default values right in their definition and you can also pass them in any order you like, just remember to set *nil* values to missing (or optional) parameters to avoid any *missing arguments* errors:

```ruby
def foo(a: 1, b: nil)
  puts a
  puts b
end

foo(a: 1)
#=> 1 
```

Combining them with positional arguments is just the same as explained before:

```ruby
def foo(a, b: 2, c: 3)
  puts a
  puts b
  puts c
end

foo(1, b: 2, c: 3)
#=> 1 
#=> 2 
#=> 3 
```

As with array arguments, optional arguments may be defined using the new <code>\*\*args</code> syntax. It's like the old single asterisk <code>\*args</code> we saw before, but now instead of using an array, it will keep those arguments into a hash:

```ruby
def foo(b: 2, c: 3, **args)
  puts b
  puts c
  puts args
end

foo(a: 1, b: 2, c: 3, d: 4)
#=> 2
#=> 3 
#=> {a: 1, d: 4} 
```


As you can see, it's all about flexibility and freedom of choice. 

Happy coding!
