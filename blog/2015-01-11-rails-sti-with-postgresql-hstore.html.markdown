---
title: Rails STI with PostgreSQL hstore
date: 2015-01-11
tags: rails, postgresql
---

These last weeks I've been spending most of my spare time working on one of my favorite side projects, <a href="https://eventos.talentoit.org/" target="_blank">Eventos TalentoIT</a>. At first it was a place where anyone could participate on raffles to win tickets for tech events, but suddenly we realized that we wanted to raffle more prizes than just tickets, so after having a couple of beers with Emma, <a href="https://talentoit.org/" target="_blank">TalentoIT</a>'s CEO and product owner, and talking about it, we decided to raffle also books and subscriptions to online courses.

### Single-Table Inheritance, STI.

The application was already running on production and we had just raffled the <a href="https://eventos.talentoit.org/sorteo/1" target="_blank">first tickets</a>, so almost all the functionality was done. The problem was that there was an **Event** model and now we needed also a **Book** and **Course**. As these three models were going to be very similar (excepting for some minor data attributes regarding each of them) and the logic for creating the raffle and choosing the winners was implemented in an independent **service object**, the easiest way of implementing these new models was using <a href="https://en.wikipedia.org/wiki/Single_Table_Inheritance" target="_blank">Single-Table Inheritance</a>.

The first step was to replace the old **Event** model for the new **Item** one, which was going the be the base model for the rest. After some renaming and refactoring this was done so next step was to create the migration to add the **type** column to the **items**:

 ```ruby
 class AddTypeToItems < ActiveRecord::Migration
   def change
     add_column :items, :type, :string, null: false, index: true
   end
 end
 ```

And creating all the new models:

```ruby
# app/models/item.rb

# == Schema Information
#
# Table name: items
#
#  id          :integer          not null, primary key
#  name        :string           not null
#  description :text
#  site_url    :string
#  image       :string
#  raffle_date :date
#  raffled_at  :datetime
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  type        :string           not null

class Item < ActiveRecord::Base
end
```

```ruby
# app/models/event.rb

class Event < Item
end
```

```ruby
# app/models/book.rb

class Book < Item
end
```

```ruby
# app/models/course.rb

class Course < Item
end
```

At this point the simplest form of **STI** was implemented and the next step was to start creating migrations to add the necessary columns to the **items** table for storing events, books and courses data. But this is one the the things I don't really like about using **STI**. Having a single table like **items** with multiple columns, some of them used for events, others for books and the others for courses it just doesn't feel right for me. So there had to be a more suitable alternative and, as I was using **PostgreSQL**, I already had the solution.

### STI and PostgreSQL hstore
I had already written a post about [PostgreSQL's hstore](/blog/2014/07/16/rails-and-prostgresql-hstore-simple-use-case) and it's benefits, so I wanted try if it suited correctly on a **STI** scenario. So first I added the **hstore** module with a simple migration:

```ruby
class AddHstoreModule < ActiveRecord::Migration
  def up
    enable_extension "hstore"
  end

  def down
    disable_extension "hstore"
  end
end
```

Next thing to do was to add the **hstore** column to the **items** table which will store all the particular data for events, books and courses:

```ruby
class AddDataToItems < ActiveRecord::Migration
  def change
    add_column :items, :data, :hstore
    add_index :items, :data, using: :gin
  end
end
```

After having the database ready, next thing was to update the models to specify their particular attributes and validations:

```ruby
# app/models/item.rb

# == Schema Information
#
# Table name: items
#
#  id          :integer          not null, primary key
#  name        :string           not null
#  description :text
#  site_url    :string
#  image       :string
#  raffle_date :date
#  raffled_at  :datetime
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  type        :string           not null
#  data        :hstore

class Item < ActiveRecord::Base
end
```

```ruby
# app/models/event.rb

class Event < Item
  # Accessible attributes for hstore
  store_accessor :data, :start_date, :end_date, :location

  # Validations
  validates :start_date, :end_date, :location, presence: true
end
```

```ruby
# app/models/book.rb

class Book < Item
  # Accessible attributes for hstore
  store_accessor :data, :author

  # Validations
  validates :author, presence: true
end
```

```ruby
# app/models/course.rb

class Course < Item
  # Accessible attributes for hstore
  store_accessor :platform

  # Validations
  validates :platform, presence: true
end
```

One thing to remember when using **hstore** is that every attribute is stored as a string so having this in mind I also rewrote the *start_date* and *end_date* getter methods from the **Event** model so they would return a date:

```ruby
# app/models/event.rb

class Event < Item
  ...

  def start_date
      super.try(:to_date)
    end

    def end_date
      super.try(:to_date)
    end
end
```

And that's all. Taking a closer look to the stored data from the rails console this is how it looks like:

```ruby
pry(main)> Event.first
  Event Load (1.2ms)  SELECT  "items".* FROM "items" WHERE "items"."type" IN ('Event')  ORDER BY "items"."id" ASC LIMIT 1
#<Event:0x007f940b1fa5a8
 id: 1,
 name: "Codemotion",
 description:"Codemotion es uno de los eventos de IT más importante de España. 2 días dedicados a hablar de la profesión informática y de las telecomunicaciones de nuestro país. Queremos apoyar este tipo de iniciativas y nuestra forma de contribuir es sorteando 3 entradas. Sorteamos dos para profesionales y una para estudiantes ¿Te gustaría conseguir una de ellas?",
 site_url: "http://2014.codemotion.es/en/",
 image: nil,
 raffle_date: Tue, 13 Jan 2015,
 raffled_at: nil,
 created_at: Tue, 13 Jan 2015 08:57:10 CET +01:00,
 updated_at: Tue, 13 Jan 2015 08:57:10 CET +01:00,
 type: "Event",
 data:
  {"end_date"=>"2015-01-23",
   "location"=>"Campus de Montepríncipe, Alcorcón, España",
   "start_date"=>"2015-01-20"}>
```

I think this is a great alternative for implementing **STI**. Taking advantage of **PostgreSQL's hstore** won't make you have your tables crowded of columns all of which will be empty most of the times. What do you think?

Happy coding!
