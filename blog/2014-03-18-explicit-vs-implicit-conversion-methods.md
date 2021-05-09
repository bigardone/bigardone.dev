---
title: Explicit vs. implicit conversion methods
date: 2014-03-18
tags: ruby, code
---

Some weeks ago I started reading <a target="_blank" href="http://devblog.avdi.org/" title="Virtuous code">Avdi Grimm's</a> book <a target="_blank" href="http://www.confidentruby.com/" title="Confident **Ruby**">Confident **Ruby**</a> and I have to say that I simply love it. It describes a set of patterns to help us having fun writing better **Ruby** code. After reading some chapters you start feeling more comfortable with the flexibility **Ruby** offers thanks to the power of <a target="_blank" href="http://en.wikipedia.org/wiki/Duck_typing">duck typing</a> where an object's importance relies on it's messages and how it behaves instead of it's type. A very good example of *duck typing* in **Ruby** can be found on it's conversion methods, so lets take a closer look at how they work.

###Conversion methods
For those unfamiliar with **Ruby** conversion methods, these are functions used to convert objects into new ones of a different type.

```ruby
number = 1
# => 1
number.class
# => Fixnum
new_number = number.to_s
# => "1"
new_number.class
# => String
```

We can find two types of this methods, non-strict (also called explicit conversion methods) and strict (implicit conversion methods).

###Non-strict or explicit conversion methods
This methods are used to convert an object into another type if it can have a decent representation of the desire type. For instance, every object in **Ruby** has the *to_s* method, and it's usually used where the method doesn't expect the object to be or act as a String, but to have a valid String representation of it. In the example above, *new_number* is now a String representing the *number* object. What would happen if we try to sum up both?

```ruby
number = 1
# => 1
new_number = number.to_s
# => "1"

number + new_number
# => TypeError: no implicit conversion of Fixnum into String
```

To make this work, we have to call ourselves the *to_i* explicit conversion method of *String*, to get an adequate integer representation of it's value:

```ruby
number = 1
# => 1
new_number = number.to_s
# => "1"

number + new_number.to_i
# => 2
```

Imagine we have the following *SurfBoard* class:

```ruby
class SurfBoard
  def initialize(attributes)
    @type = attributes.fetch(:type)
    @fins = attributes.fetch(:fins)
  end
end
```

Knowing that string interpolation uses the *to_s* method to concatenate strings, we could overwrite our SurfBoard's to_s method, to return a better string representation of itself:

```ruby
class SurfBoard
  ...

  def to_s
    "#{@type} with #{@fins} fins"
  end
end
```

Now we have a nice string representation of our *SurfBoard* objects that can be used nicely when using string interpolation for instance:

```ruby
surf_board = SurfBoard.new(type: 'Retro fish', fins: 2)
puts "I'm looking for a #{surf_board}"
# => I'm looking for a Retro fish with 2 fins
```



###Strict or implicit conversion methods
This kind of conversion is used by **Ruby** core classes and expects the target to act exactly as a specific type. We can find them in situations where a certain type is needed, otherwise an *Error* will be risen. The reason for this is that it may be used for a very specific purpose and in the case of not acting as the desired type it may lead to an unexpected behavior. This is why they are called strict or implicit, because **Ruby** will automatically call them every time it needs to ensure that it is working with a expected type.

To concatenate strings, **Ruby** uses the implicit *#to_str* conversion method. So using or previous example, if we try to concatenate our surfboard to a String object:

```ruby
puts "I'm looking for a " + surf_board
# => TypeError: no implicit conversion of SurfBoard into String
```

So if we want to tell **Ruby** that a *SurfBoard* is a string-like object, we can create the *to_str* method:

```ruby
class SurfBoard
  ...

  def to_str
    "#{@type} with #{@fins} fins"
  end
end
```

Now in case a *SurfBoard* object is concatenated to a String no *TypeError* will be risen, and a String object will be returned:

```ruby
puts "I'm looking for a " + board
# => I'm looking for a Fish with 2 fins
```

###Conclusion
With the help of *duck typing* and conversion methods we have the power to write very flexible code because we don't have to worry anymore about 
what type of parameters a function needs as long as they can behave as the types needed.

Happy coding!
