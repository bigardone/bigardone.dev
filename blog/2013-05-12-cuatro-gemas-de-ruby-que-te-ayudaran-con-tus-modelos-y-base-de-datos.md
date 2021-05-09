---
title: Cuatro gemas de Ruby que te ayudarán con tus modelos y base de datos.
date: 2013-05-12
tags: ruby, rails, gems, data base
---

Últimamente he estado usando estas gemas para ayudarme a tener una mejor visión global de la estructura de los datos en los proyectos nuevos en los que estoy participando, o para ayudarme a optimizar las base de datos y las consultas con las que las aplicaciones acceden a estos.

<!--more-->

###Annotate (aka AnnotateModels)###
<a href="https://github.com/ctran/annotate_models" target="_blank">Esta gema</a> hace una cosa muy sencilla, pero muy útil. Crea una serie de anotaciones en tus modelos, tests, fixtures y factorias acerca del esquema de la tabla que usan.

```ruby
# == Schema Info
#
# Table name: line_items
#
#  id                  :integer(11)    not null, primary key
#  quantity            :integer(11)    not null
#  product_id          :integer(11)    not null
#  unit_price          :float
#  order_id            :integer(11)
#

 class LineItem < ActiveRecord::Base
   belongs_to :product
  . . .
```

Para instalarla solo tenemos que añadirla a nuestro <code>Gemfile</code>:

    gem 'annotate'

Una vez hecho esto, para crear las anotaciones, desde el directorio raiz de nuestra aplicación:

    $ annotate

Esta es la manera más básica de anotar todo, y **Annotate** permite una gran flexibilidad en cuanto a qué anotar y cómo, que podemos encontrar en su <a href="https://github.com/ctran/annotate_models" target="_blank">página de GitHub</a>.

###lol_dba###
¿Necesitas añadir índices a tu tablas? Con <a href="https://github.com/plentz/lol_dba" target="_blank">lol_dba</a> es muy sencillo, ya que escanea tus modelos para mostrarte las columnas que probablemente deberías indexar. Y no sólo eso, ya que además te puede generar una migración para crear automáticamente esos índices. Para instlarlar, la añadimos al <code>Gemfile</code>:

    gem "lol_dba"

Una vez hecho ejecutado el consiguiente <code>bundle install</code>, podemos hacer que nos muestre por consola las columnas que podrían necesitar ser indexadas:

    $ lol_dba db:find_indexes

Y también podemos hacer que genere para nosotros la migración para añadir esos índeces:

    $ rake db:migrate_sql

###Bullet###
En un [post anterior](/blog/2013/02/14/dos-maneras-de-tener-siempre-a-mano-toda-la-informacion-de-tu-aplicacion-rails-en-desarrollo) vimos un par de gemas con las que poder ver información sobre lo que ocurre en nuestra aplicación mientras la desarrollamos. Una de esa información que nos porporcionan son las consultas que se realizan contra la base de datos. Cuando el número se dispara suele ser debido al uso de consultas infecientes, obligando a realizar más de las debidas para cargar colecciones y otras relaciones dependientes.

¿Cómo podemos solucionar esto? <a href="https://github.com/flyerhzm/bullet" target="_blank">Bullet</a> nos lo pone muy fácil, ya que detecta todas esas ineficiencias en nuestro código y, lo que es mejor, nos aconseja sobre como solucionarlas. Para instalarla la añadimos a nuestro <code>Gemfile</code>:

    gem "bullet", :group => "development"

Luego tendremos que agregar a nuestro fichero de entorno de desarrollo <code>config/environments/development.rb</code> su configuración:

```ruby
config.after_initialize do
  Bullet.enable = true
  Bullet.alert = true
  Bullet.bullet_logger = true
  Bullet.console = true
  Bullet.growl = true
  Bullet.xmpp = { :account  => 'bullets_account@jabber.org',
                  :password => 'bullets_password_for_jabber',
                  :receiver => 'your_account@jabber.org',
                  :show_online_status => true }
  Bullet.rails_logger = true
  Bullet.airbrake = true
end
```

Con estas opciones podremos configurar la manera en la que nos va a notificar sobre las consultas que deberíamos cambiar. Una vez hecho todo esto, empezaremos a recibir su feedback, que tendrá el siguiente formato:

    2009-08-25 20:40:17[INFO] N+1 Query: PATH_INFO: /posts;    model: Post => associations: [comments]·
    Add to your finder: :include => [:comments]
    2009-08-25 20:40:17[INFO] N+1 Query: method call stack:·
    /Users/richard/Downloads/test/app/views/posts/index.html.erb:11:in `_run_erb_app47views47posts47index46html46erb'
    /Users/richard/Downloads/test/app/views/posts/index.html.erb:8:in `each'
    /Users/richard/Downloads/test/app/views/posts/index.html.erb:8:in `_run_erb_app47views47posts47index46html46erb'
    /Users/richard/Downloads/test/app/controllers/posts_controller.rb:7:in `index'

Sólo nos queda seguir sus instrucciones para ir viendo como el número de consultas van disminuyendo llegando aun número más óptimo.

###RailRoady###

<a href="https://github.com/preston/railroady" target="_blank">Otra gema</a> muy útil si necesitamos tener una visión global de nuestros modelos y controladores, ya que nos genera diagramas UML que nos exporta a ficheros <code>.svg</code> donde podremos ver como se relacionan todas las entidades.
Para poder funcionar, necesitará que previamente tengamos instalada <a href="http://www.graphviz.org/">Graphviz</a>, la cual la podemos instalar de la siguientes maneras:

    # Usuarios Mac
    $ brew install graphviz

    # Usuarios Ubuntu
    $ sudo apt-get install graphviz

Una vez instalada esta dependencia, añadimos la gema al <code>Gemfile</code>:

    group :development, :test do
        gem 'railroady'
    end

Y una vez hecho el <code>bundle install</code>, podremos generar los diagramas con:

    $ rake diagram:all

Esto nos creará 4 ficheros <code>.svg</code> en la carpeta <code>doc/</code> de nuestro proyecto. Para más información y opciones de configuración visitad su página de <a href="https://github.com/preston/railroady" target="_blank">GitHub</a>.

Espero que estas cuatro gemas os ayuden tanto como me ayudan a mi.

Code, Love & Boards!


