---
title: Easy multi-table full-text search with Rails
date: 2014-06-20
tags: rails, activerecord, postgresql
---

In my new personal project I've been working for the past months I wanted the user to have the 
ability to search for certain records of a given model across multiple of it's fields and relations 
using a simple form with just one text field. This is known as <a href="https://en.wikipedia.org/wiki/Full_text_search" target="_blank">full-text search</a> and there are many standalone 
services you can use to handle it such as <a href="http://www.elasticsearch.org/" target="_blank">Elasticsearch</a>, 
<a href="http://sphinxsearch.com/" target="_blank">Sphinx</a> or <a href="https://lucene.apache.org/solr/" target="_blank">Solr</a>, but 
I didn't wanted to add and additional complexity layer to the project so I decided to choose **PostgreSQL** as my database of choice and 
take advantage of it's power.

### The goal

So imagine we have a model named **Person** which looks like this:

```ruby
# == Schema Information
#
# Table name: people
#
#  id                      :integer          not null, primary key
#  first_name              :string(255)
#  last_name               :string(255)
#  location                :string(255)
#  headline                :string(255)
#  summary                 :text

class Person < ActiveRecord::Base
  validates :first_name, presence: true
end
```

We also want to add this **Person** a couple of tag lists for *interests* and *skills*. To achieve this I decided to use the 
<a href="https://github.com/mbleigh/acts-as-taggable-on" target="_blank">ActsAsTaggableOn</a> gem which I have already used before and I like it because 
of it's simplicity of use. So we add it to our ```gemfile```:

 ```
 gem 'acts-as-taggable-on'
 ```

After running ```bundle install``` we have to create the needed migrations to create the needed tables for the gem to work properly:

```
rake acts_as_taggable_on_engine:install:migrations
rake db:migrate
```

Now we can add the desired tag contexts to our **Person** model:

```ruby
# == Schema Information
#
# Table name: people
#
#  id                      :integer          not null, primary key
#  first_name              :string(255)
#  last_name               :string(255)
#  location                :string(255)
#  headline                :string(255)
#  summary                 :text

class Person < ActiveRecord::Base
  acts_as_taggable_on :skills, :interests
  
  validates :first_name, presence: true
end
```

By adding this ```acts_as_taggable_on``` we are providing the model with some very useful functionality to manage it's tags lists (for skills and interests), so if we want to search for people with a certain skill we can do the following:

```ruby
Person.tagged_with(["surf", "longboard"]), on: :interests
```

And it will return all the people with those interests in common. Take a look at the <a href="http://rubydoc.info/gems/acts-as-taggable-on/" target="_blank">gem's documentation</a> to learn more about the wide range of methods and helpers it offers us.

At first this could be enough to find people by their skills or interests, but what if someone didn't add a skill or interests in those 
fields but he did it in his headline or summary? Or what if the user wants to search also for other people living in a certain place with similar 
skills or interests by using a simple form with a single text input? Well, here is where **full-text search** comes into play.

### The solution
There are many ways activating and taking advantage of PostgreSQL's full-text search but I think that using the <a href="https://github.com/Casecommons/pg_search" target="_blank">pg_search gem</a> it is indeed one the easiest ones. First, add it to you ```gemfile``` and run the corresponding bundle:

```
gem 'pg_search'
```

The gem offers us two different techniques for searching, <a href="https://github.com/Casecommons/pg_search#multi-search" target="_blank">multi-search</a> and <a href="https://github.com/Casecommons/pg_search#multi-search" target="_blank">search-scopes</a>. As I just wanted to search in a specific model I chose to implement the **search scopes** approach.

```ruby

# == Schema Information
#
# Table name: people
#
#  id                      :integer          not null, primary key
#  first_name              :string(255)
#  last_name               :string(255)
#  location                :string(255)
#  headline                :string(255)
#  summary                 :text

class Person < ActiveRecord::Base
  acts_as_taggable_on :skills, :interests
  
  pg_search_scope :quick_search, against: [:headline, :location, :summary]
  
  validates :first_name, presence: true
end
```

So we are adding a new scope named *quick_search* which will perform a full-text search within the *headline*, *location* and *summary* fields:

```ruby

search_text = 'spain rails surf'
@people = Person.quick_search(search_text)
```

But how can we make the scope to search also inside a person's skills and interests to see if any of them matches? As easy as pie:

```ruby

# == Schema Information
#
# Table name: people
#
#  id                      :integer          not null, primary key
#  first_name              :string(255)
#  last_name               :string(255)
#  location                :string(255)
#  headline                :string(255)
#  summary                 :text

class Person < ActiveRecord::Base
  acts_as_taggable_on :skills, :interests
  
  pg_search_scope :quick_search, 
                  against: [:headline, :location, :summary],
                  associated_against: {
                    skills: [:name],
                    interests: [:name]
                  }
  
  validates :first_name, presence: true
end
```

Just adding the *associated_against* parameter and specifying which relations you want to include and in which of their columns to search.

### Final words
Though **pg_search** full-text search is very powerful, this is for sure the most simple example of what can be done. So go ahead and check the **pg_search** documentation and give your next project the power of PostgreSQL's full-text search.

Happy coding!


