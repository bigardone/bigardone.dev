---
title: Rails Composer, el generador de Rails con esteroides
date: 2012-12-03
categories: code, rails, development
---

A la hora de crear una nueva aplicación, sea en el lenguaje que sea, antes de nada me pregunto que tecnologías voy a usar cómo que tipo de base de datos, qué framework css para los estilos, si usaré algún motor de plantillas para ayudarme en las vistas, y demás cosas que luego tendré que ir añadiendo a la aplicación y configurando para que todo funcione correctamente.

Pués bien, a la hora de generar una nueva aplicación en Rails, se le puede pasar un parámetro para especificarle una plantilla a partir de la cual generar la nueva aplicación. Una plantilla no es más que un fichero que contiene una serie de gemas, inicializadores y demás que quieres que se incluyan de manera predeterminada en tu aplicación.

    $ rails new blog -m http://example.com/template.rb

Investigando sobre esto para la nueva aplicación que estoy desarrollando, encontré <a title="Rails Composer" href="http://railsapps.github.com/rails-composer/" target="_blank">Rails Composer</a>, un pedazo de plantilla que te genera el esqueleto de tu nueva aplicación a partir de una serie de preguntas que te va haciendo y así ahorrándote el tener que ir metiendo todas estas gemas y configurarlas una a una.

<!--more-->
<h3>¿Cómo funciona?</h3>

Solo tenemos que lanzar la siguiente instrucción desde nuestra consola:

    $ rails new myapp -m https://raw.github.com/RailsApps/rails-composer/master/composer.rb

Y a continuación ir contestando a las preguntas que nos va haciendo, seleccionando lo que prefiramos, para que la magia surta efecto :)

<h3>¿Qué nos aporta?</h3>

Para empezar, a parte de poder generar tu propia aplicación a la carta, tiene preestablecidas una serie de aplicaciones de ejemplo con diferentes tecnologías:

      question  Install an example application?
      1)  I want to build my own application
      2)  rails3-bootstrap-devise-cancan
      3)  rails3-devise-rspec-cucumber
      4)  rails3-mongoid-devise
      5)  rails3-mongoid-omniauth
      6)  rails3-subdomains

Como podeis ver, hay gran variedad de alternativas, como la típica pagina de prelaunch para que la gente intrduzca su email, apliaciones con mongodb y omniauth para poder registrarse con Twitter, Facebook, etc, hasta una con devise para la autenticación, cancan para la autorización e incluso twitter bootstrap para los estilos de las vistas. Yo elegí la primera opción para poder personalizarlo lo máximo posible, y estas son las opciones que nos da para ello:

      question  Web server for development?
      1)  WEBrick (default)
      2)  Thin
      3)  Unicorn
      4)  Puma
            
      question  Web server for production?
      1)  Same as development
      2)  Thin
      3)  Unicorn
      4)  Puma
      
      question  Database used in development?
      1)  SQLite
      2)  PostgreSQL
      3)  MySQL
      4)  MongoDB
      
      question  Template engine?
      1)  ERB
      2)  Haml
      3)  Slim
      
      question  Unit testing?
      1)  Test::Unit
      2)  RSpec
      
      question  Integration testing?
      1)  None
      2)  RSpec with Capybara
      3)  Cucumber with Capybara
      4)  Turnip with Capybara
      
      question  Fixture replacement?
      1)  None
      2)  Factory Girl
      3)  Machinist
      
      question  Front-end framework?
      1)  None
      2)  Twitter Bootstrap
      3)  Zurb Foundation
      4)  Skeleton
      5)  Just normalize CSS for consistent styling
      
      question  Twitter Bootstrap version?
      1)  Twitter Bootstrap (Less)
      2)  Twitter Bootstrap (Sass)
    
    question  Add support for sending email?
      1)  None
      2)  Gmail
      3)  SMTP
      4)  SendGrid
      5)  Mandrill
    
    question  Authentication?
      1)  None
      2)  Devise
      3)  OmniAuth
    
    question  Devise modules?
      1)  Devise with default modules
      2)  Devise with Confirmable module
      3)  Devise with Confirmable and Invitable modules
    
    question  Authorization?
      1)  None
      2)  CanCan with Rolify
    
    question  Use a form builder gem?
      1)  None
      2)  SimpleForm
    
    question  Install a starter app?
      1)  None
      2)  Home Page
      3)  Home Page, User Accounts
      4)  Home Page, User Accounts, Admin Dashboard
    
      extras  Add 'therubyracer' JavaScript runtime (for Linux users without node.js)? (y/n)
      extras  Set a robots.txt file to ban spiders? (y/n) n
      extras  Create a project-specific rvm gemset and .rvmrc? (y/n) n
      extras  Create a GitHub repository? (y/n)</pre>

<h3>Resultado</h3>

El resultado es espectacular. Te genera la aplicación dándote la posibilidad de elegir tu servidor favorito para desarrollo, tu motor de base de datos, tu sistema de test y fixtures que prefieras, framework front-end, soporte para envío de emails, autenticación y autorización, páginas de inicio, y si no fuera suficiente hasta te puede crear un repositorio de GitHub para que puedas empezar a commitear tu progreso desde el primer momento... y todo esto con una sola linea desde nuestra consola. Ahora podemos concentrarnos en empezar a desarrollar nuestra aplicación y dedicar nuestros esfuerzos a lo que realmente queremos resolver con ella :)

Love &amp; Boards!
