---
title: Limpiando y organizando tus vistas en Rails
date: 2013-06-06
tags: ruby, rails, views
---

A medida que nuestros modelos y controladores van creciendo en tamaño y complejidad, lo mismo pueden ir haciendo sus respectivas vistas hasta tal punto que pueda ser muy complicado mantenerlas, por no hablar de formar parte de un equipo y que le toque a otro hacerlo :)
Por eso es importante también saber qué herramientas tenemos a nuestra disposición para reutilizar partes comunes de nuestras vistas y al mismo tiempo liberarlas de lineas de código para hacerlas más comprensibles.

<!--more-->

En uno de los proyectos que estoy desarrollando por mi cuenta tengo una vista para mostrar el detalle de un pedido. En esta vista hay una sección donde se muestra información sobre si este pedido se ha notificado o no a los proveedores, y si no, mostrar un botón para hacerlo. Así que partiremos de esta base:

``` ruby

# app/views/orders/show.html.haml
...

  %section
    %header
      %h4 Providers notifications

    - @order.providers.each do |provider|
      .panel
        %h5= provider.name
        - if @order.sent_to_provider?(provider.id)
          %p.muted
            = raw "Last email sent on <strong>#{format_date @order.emails_to_provider(provider.id).first.created_at}</strong>, "
            = link_to 'send email again', new_order_provider_email_path(@order.id, provider.id)

        - else
          = link_to 'Send email now', new_order_provider_email_path(@order.id, provider.id)

...


```

Esto funciona correctamente y hace bien su trabajo. ¿Pero que pasaría si quisiéramos mostrar uno de esos paneles para un solo proveedor en otra vista? Que tendríamos que copiar y pegar esas lineas en la otra vista, con la locura que luego sería el tener que hacer modificaciones en cada una de las vistas si tuviéramos que cambiar algo de ellas.

### Usando *partials* ###

Para evitar esto tenemos que hacer el uso de **partials**, que no son otra cosa que vistas parciales que luego podremos reutilizar desde cualquier otra vista.
Así que creamos nuestro **partial**, acordándonos de que su nombre siempre empiece por '_', según la convención de Rails:


``` ruby
# app/views/orders/_provider_notification.html.haml

.panel
  %h5= provider.name
  - if order.sent_to_provider?(provider.id)
    %p.muted
      = raw "Last email sent on <strong>#{format_date order.emails_to_provider(provider.id).first.created_at}</strong>, "
      = link_to 'send email again', new_order_provider_email_path(order.id, provider.id)

  - else
    = link_to 'Send email now', new_order_provider_email_path(order.id, provider.id)


```

Y ahora solo tenemos que renderizarla desde nuestra vista principal:


``` ruby
# app/views/orders/show.html.haml
...

  %section
    %header
      %h4 Providers notifications

    - @order.providers.each do |provider|
      = render partial: 'provider_notification', locals: { order: @order, provider: provider }
...


```

Ahora nuestra vista principal es mucho más fácil de entender y además podremos usar ese partial desde cualquier otro sitio, simplemente pasándole los parámetros que necesita.

Aún así vemos que en el **partial** hay cierta lógica para mostrar o no el botón que podríamos simplificar sacándola a otro tipo de objeto que nos ayude con esta lógica de presentación del propio modelo. Esto lo podríamos hacer con los propios **helpers** de las vistas, pero el uso abundante de estos puede llegar a hacer complicado su mantenimiento, y no es el sitio más lógico ni natural para hacerlo.

###Usando el patrón *decorator* con draper###
Un **decorator** no es más que un <a href="http://es.wikipedia.org/wiki/Decorator_(patr%C3%B3n_de_dise%C3%B1o)" target="_blank">patrón de diseño</a> con el cual podemos ampliar o "decorar" dinámicamente la funcionalidad de otra clase y que usaremos para aportar a nuestro modelo **Order** de toda esa lógica de visualización que estamos usando en nuestro **partial**.
Para esto, vamos a usar la gema <a href="https://github.com/drapergem/draper" title="draper", target="_blank">draper</a>, que además de simplificarnos la creación de nuestros propios decorators, nos añade una serie de **generadores** y **helpers** que nos van a ser nuy útiles.
Así que vamos a añadirla a nuestro <code>.gemfile</code> y hacemos un <code>bundle install</code>

    gem 'draper'

Creamos un nuevo **decorator** para nuestro modelo **Order** usando en nuevo generador que nos acaba de proporcionar **draper**

    rails g decorator Order

Y creamos un par de métodos para meter la funcionalidad que tenemos en el **partial**. Para hacer esto tenemos que tener en cuenta que podemos acceder al modelo original **Order** a través del objeto **object** o su alias **model**, y a todos los helpers a través de **helper** o **h**.

``` ruby
# app/decorators/order_decorator.rb
class OrderDecorator < Draper::Decorator
  delegate_all

  def provider_notification(provider)
    if object.sent_to_provider?(provider.id)
      h.raw "Last email sent on <strong>#{h.format_date object.emails_to_provider(provider.id).first.created_at}</strong>"
    else
      notify_provider_button(provider)
    end
  end

  private

  def notify_provider_button(provider)
    h.link_to h.raw('<i class="icon-envelope"></i> Send email now'), h.new_order_provider_email_path(object.id, provider.id), class: 'send-email btn btn-block btn-warning btn-large'
  end
end

```

Teniendo ya el nuevo **decorator** listo , lo siguiente es modificar el **controller** para decorar nuestro objeto "order":

``` ruby
# app/controllers/orders_controller.rb
class OrdersController < ApplicationController

  def show
    @order = Order.find(params[:id]).decorate
  end

  ...

```

Y por último modificar nuestro **partial** para poder llamar al nuevo método que hemos creado en nuestro **decorator**

``` ruby
# app/views/orders/_provider_notification.html.haml

.panel
  %h5= provider.name
  = @order.provider_notification provider
```

Y ya está. Ahora podemos ir añadiendo a nuestro nuevo **decorator** toda la funcionalidad de visualización que queramos que tenga nuestro modelo **Order**, sin sobrecargar a este mismo con esa funcionalidad, dejando solo la relativa a sus propios datos, y simplificando y minificando nuestras vistas.

Love and Boards!

