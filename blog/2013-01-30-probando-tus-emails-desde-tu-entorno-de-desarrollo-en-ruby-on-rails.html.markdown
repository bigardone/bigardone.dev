---
title: Probando tus emails desde tu entorno de desarrollo en Ruby on Rails
date: 2013-01-30
tags: code, rails, development, mailer
---

Desde que me embarqué en el nuevo proyecto personal que estoy desarrollado en Ruby on Rails siempre he tenido en mente automatizar muchas acciones que los usuarios de la antigua versión de la aplicación tienen que hacer manualmente. Una de estas acciones es la de enviar por **email** a sus proveedores los detalles de los nuevos pedidos que reciben de sus compradores. Esto aunque parezca una cosa simple, les roba mucho tiempo de su día a día, así que en esta nueva versión de la aplicación le he dado máxima prioridad a esta funcionalidad.
Para ello y gracias al uso de los <a href="http://guides.rubyonrails.org/action_mailer_basics.html" target="_blank" title="Action Mailers">Action Mailers</a> de Rails, he diseñado una serie de emails que se envían automáticamente después de ciertas acciones. Pero... ¿cómo podemos probar que estos emails se generan de manera correcta y se envian a sus destinatarios?

<!--more-->

Pues según lo que he podido encontrar y probar, se puede hacer de dos maneras:

<h3>Primera manera, previsualizarlos en tu navegador sin tener que enviarlos.</h3>
Buscando y buscando, encontré una gema muy útil y encima de los genios de <a href="37signals" target="_blank" title="37signals">37signals</a>, llamada <a href="" target="_blank" title="mail_view">mail_view</a> que te genera un visualizador de todos tus emailers, a los que podrás acceder desde tu navegador. Su funcionamiento es muy simple:

- Instala la gema añadíendola a tu Gemfile

    ```
    gem 'mail_view', :git => 'https://github.com/37signals/mail_view.git'
    ```
  
- Crea la clase que se encargará de crear los emails como si fueran tests, pero cuya salida será la representación gráfica de ellos

```ruby
# app/mailers/mail_preview.rb
class MailPreview < MailView
  def new_order_email
    user = User.select_owner
    order = Order.first
    OrderMailer.new_order_email(user, order)
  end
end
```

- Añade una entrada a tu fichero de rutas para poder acceder a tu <strong>MailPreview</strong>

```ruby
# config/routes.rb
if Rails.env.development?
  mount MailPreview => 'mail_view'
end
```

- Para poder visualizar tus emails, solo tienes que acceder a <strong>http://localhost:3000/mail_view</strong> y ahí verás listados todos los emails que has definido en tu <strong>MailPreview</strong>. Pinchando en ellos, podrás verlos, e ir haciendo los cambios necesarios en estilos y demás.


<h3>Segunda manera, instalando un servidor local SMTP y enviándolos ahí.</h3>
Para hacer esto hay muchas opciones, de las cuales he probado las 3 siguientes.
<h4><a href="http://mocksmtpapp.com/" target="_blank" title="MockSMTP.app">MockSMTP.app</a></h4>
Es una aplicación muy chula para **Mac OS X** que cuesta unos 14,50€ aunque podéis usarla de manera gratuita durante 30 días si la descargáis desde su web. Su uso es muy sencillo, solo tenéis que instalarla y en vuestro fichero de entorno de desarrollo configurar así vuestro **action_mailer**:

```ruby
config.action_mailer.delivery_method = :smtp
ActionMailer::Base.smtp_settings = {
  :address => "localhost",
  :port => 1025,
  :domain => "www.yourdomain.com"
}
```

A partir de ahora todos los emails que envíes desde tu entorno de desarrollo llegarán a la bandeja de entrada de tu **MockSMTP.app**, y así podrás ver todos sus detalles.

<h4><a href="http://nufex.com/rails-mail-preview" target="_blank" title="Rails Mail Preview">RailsMailPreview</a></h4>
Después de que expirase mi tiempo de prueba de la anterior opción, busqué algo que fuera gratuito y que se integrase mejor con mi aplicación. Entonces encontré esta simple pero útil aplicación, que viene acompañada de su propia gema, <a href="https://github.com/fernyb/rails_mail_preview" target="_blank" title="rails_mail_preview">rails_mail_preview</a>. Para que funcione, solo tenéis que añadir la gema a vuestro **Gemfile**

```ruby
gem "rails_mail_preview", '0.0.4', group: :development
```

Una vez arrancada la aplicación, cualquier email enviado desde tu entorno de desarrollo, podrá ser visualizado desde ella.

<h4><a href="http://mailcatcher.me/" target="_blank" title="Mail Catcher">MailCatcher</a></h4>
Esta es la opción que uso ahora. La que más me ha gustado. ¿Y por qué? Muy sencillo, porque es como las anteriores pero mucho más simple y sin necesidad de tener que instalar ninguna aplicación en tu equipo. Para instalarla solo tienes que:

- Añadir la gema en tu Gemfile

```ruby
gem "mailcatcher", group: :development
```

- Cambia la configuración de tu entorno de desarrollo para que apunte al servidor que te crea

```ruby
config.action_mailer.delivery_method = :smtp
config.action_mailer.smtp_settings = { :address => "localhost", :port => 1025 }
```

- Arranca el servidor local desde tu consola:
    
    $ mailcatcher

Para ver los emails solo tienes que acceder en tu browser al cliente que te genera en la url **http://localhost:1080**.

<img src="/images/blog/mailcatcher.png"/>



Estas son las opciones que he probado hasta ahora, ¿cuál preferís vosotros?

Love & Boards!




