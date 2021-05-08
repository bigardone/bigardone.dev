---
title: Rails and PostgreSQL hstore simple use case
date: 2014-07-16
tags: rails, postgresql
---
As you saw in the latest post about [Rails and full-text search](/blog/2014/06/20/easy-multi-table-full-text-search-whith-rails), 
**PostgreSQL** has some nice and powerful features for managing data which can make your life easier. Another of this awesome features is
the **hstore** column type, which gives you the ability to store hashes in columns. This means that you can store unstructured data in a column 
of our database using a key/value storage system, as it was a **NoSQL** database, and also query this data by their keys.

## A real yet simple use case.
Another feature I wanted to add to the new pet project I'm working on, was giving to users the ability to save custom searches assigning them a name, so 
if there's a frequently search they perform every once in a while, they can save it and afterwards select it from a drop-down menu, instead of having 
to fill every field on the search form. This can be implemented in many ways, but as I'm using **Rails 4** and **PostgreSQL** I wanted to give a try to 
the **hstore extension**.

### Preparing everything.
The first step is to activate it. The simplest way to do so is by creating a new migration:

```ruby
class CreateHstore < ActiveRecord::Migration
  def up
    enable_extension "hstore"
  end

  def down
    disable_extension "hstore"
  end
end
```

After runing the migration, let's create a new model with it's corresponding migration, and let's assign the **hstore** type to the desired column:

```ruby
class CreateNamedSearches < ActiveRecord::Migration
  def change
    create_table :named_searches do |t|
      t.integer :user_id
      t.string :name
      t.hstore :query_params # Notice the hstore type here
    end

    add_index :named_searches, :user_id
  end
end
```

```ruby
class NamedSearch < ActiveRecord::Base
  # Relations
  belongs_to :user

  # Validations
  validates :name, :query_params, presence: true
end
```

As you can see, this **NamedSearch** model is very simple. It only has a *name* attribute to help the user identifying it, and a *query_params* 
one, where the hash with all the parameters from the search form will be stored.

### The search form.
I've created a *Form Object* to encapsulate the search of people and the creation of named searches:

```ruby
class PeopleFilter
  include ActiveModel::Model
  include ActiveModel::AttributeMethods
  include ActiveModel::Validations
  include ActiveModel::Conversion
  
  # Attributes you are going to use to search and save
  # the NamedSearch model.
  attr_accessor :name,
                :gender,
                :education_level,
                :skills,
                :interests,
                :save_search,
                :search_name,

  def initialize(attributes)
    attributes.each do |name, value|
      send("#{name}=", value)
    end
  end

  def persisted?
    false
  end
  
  # Method to perform the search for the Person model.
  def filter(ability)
    people = Person.accessible_by(ability)
    people = people.where("first_name || ' ' || last_name ILIKE ?", "%#{name}%") unless name.blank?
    people = people.where(gender: gender) unless gender.blank?
    people = people.where(education_level: education_level) unless education_level.blank?
    people = people.tagged_with(skills, on: :skills) unless skills.blank?
    people = people.tagged_with(interests, on: :interests) unless interests.blank?

    people
  end
  
  # Method to confirm if the filter can be saved into a NamedSearch
  def confirm_save?
    save_search.to_bool && ! search_name.blank?
  end

  # Method to create a new NamedSearch and persist it.
  def save(user)
    user.named_searches.create({name: search_name, query_params: to_hash})
  end

  private 

  # Mehtod to create a hash with the desired attributes you want to 
  # store in de NamedSearch's query_params field.
  def to_hash
    {
      name:                 name,
      gender:               gender,
      education_level:      education_level,
      skills:               skills,
      interests:            interests
    }
  end
end
```

To present this search form to the user I've created the following partial view to include it in our main index:

```haml
#filter_form_wrapper
  %header
    %h3 Filter people
  .form-wrapper
    = simple_form_for @filter, url: people_path, method: :get do |f|
      = f.input :name
      = f.input :gender
      = f.input :education_level
      = f.input :skills, as: :string
      = f.input :interests, as: :string

      %hr/
      =f.input :save_search, as: :boolean
      =f.input :search_name

      .form-actions
        = f.submit 'Apply filter'
        or
        %a.cancel{href: '#'}  Cancel
```

There are two inputs, *save_search* and *search_name*, that are going to be used to check if the user wants to save this search, and to assign the
search a name.

### Tying it all together.
Now that you have your model, form object and partial view, let's take a look to the controller, where all of these three parts come into play together:

```ruby
class PeopleController < ApplicationController
  before_action :set_filter
  before_action :set_named_searches

  def index
    # If the user marked the 'Save this search' and added a name...
    if @filter.confirm_save?
      # Let`s save this into a NamedSearch
      @filter.save(current_user)
      flash[:notice] = "Search was successfully saved."
    end

    @people = @filter.filter(current_ability).sorted
  end
  
  ...
  ...

  private

  def set_filter
    # If a NamedSearch id is sent
    @filter = if params.include?(:named_search_id)
      # find that NamedSearch
      named_search = current_user.named_searches.find params[:named_search_id]
      # and initialize the filter with the it's query_params hash values
      PeopleFilter.new named_search.query_params
    else
      # Otherwise initialize a new one
      PeopleFilter.new filter_params
    end
  end

  def set_named_searches
    @named_searches = current_user.named_searches
  end

  def filter_params
    return unless params.include? :people_filter

    params.require(:people_filter).permit(
      :name,
      :gender,
      :education_level,
      :skills,
      :interests,
      :competencies,
      :save_search,
      :search_name,
      :named_search_id,
    )
  end
end
```

So basically what it does is:

1. In the ```set_filter``` method it checks if there's a *named_search_id*. This means that instead of searching, the user has selected an already existing **NamedSearch**, so it has to find it in order to apply the stored *query_params* to the **PeopleFilter** when it initializes it. If there is no *named_search_id* parameter, then it just initialize an empty one.
2. If the user wants to save the filter, it justs has to check the *save_search* check-box and fill the *search_name*, so it can save it before filtering in the ```index``` action.
3. It calls the ```filter``` method from the form object to retrieve the records.

After saving a **NamedSearch** this is how it looks like it the Rails console:

```
NamedSearch.first
NamedSearch Load (1.1ms)  SELECT  "named_searches".* FROM "named_searches"   ORDER BY "named_searches"."id" DESC LIMIT 1
=> #<NamedSearch id: 1, user_id: 1, name: "Freelance rubyists", query_params: {"name"=>"", "gender"=>"", "skills"=>"ruby, rails", "interests"=>"remote work",  "education_level"=>"2"}">
```

As you can see, the *query_params* attribute is storing the parameters hash the user sent to the controller, so just getting that field and initializing the **PeopleFilter** object with it will work as if the user had requested the same search again. 
As I mentioned before, you can also query by that field too:

```
NamedSearch.where("query_params -> 'interests' = 'remote work'").count
(1.0ms)  SELECT COUNT(*) FROM "named_searches"  WHERE (query_params -> 'interests' = 'remote work')
=> 1
```

## Conclusion
For those cases when you are working with **PostegreSQL** and you may feel like you need some **NoSQL** capabilities to store unstructured data, give **hstore** a try. I'm sure you'll like how easy is implementing it and how well it works.

Happy coding!
