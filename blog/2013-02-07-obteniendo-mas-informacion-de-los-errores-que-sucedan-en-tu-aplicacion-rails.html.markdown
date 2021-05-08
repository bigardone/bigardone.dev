---
title: Obteniendo más información de los errores que suceden en tu aplicación Rails
date: 2013-02-07
tags: code, rails, errors
---

Por muchas pruebas que hagamos y creamos tener todo controlado, los errores ocurren. Por eso es importante poder conseguir la mayor información sobre ellos en cuanto aparezcan, para poder corregirlos lo antes posible. Así mismo, en producción es importante si algo que no esperamos ocurre, al usuario se le notifique de manera amigable, en vez de mostrar una página de error que provoque en él el reflejo de apagar directamente su ordenador por si "ha roto algo". Por estos motivos quiero compartir con vosotros tres formas muy sencillas de hacer nuestras páginas de errores y la información que recibimos sobre ellos más amigable y entendible.

<!--more-->

### Mejores páginas de error en el entorno de desarrollo con better_errors ###
Aunque mientras desarrollamos, la página de error por defecto de Rails puede sernos de ayuda para entender que ha ido mal, con la gema <a href="https://github.com/charliesome/better_errors" target="_blank" title="Better Errors">better_errors</a> la cosa cambia completamente. Esta joya (más que gema) reemplaza esa página de error sosa por una suya propia tuning, con el siguiente aspecto:

<img src="https://a248.e.akamai.net/camo.github.com/f05d967fb90cbe3e686ad794062c2151f7ee19a5/687474703a2f2f692e696d6775722e636f6d2f7a594f58462e706e67"/>

Ya no solo supera gráficamente a la original, sino que además nos aporta las siguientes mejoras a nivel funcional:

* **La traza de la pila completa**, donde si pinchas en la clase por donde ha ido sucediendo el error, se actualizará en panel de la derecha de la pantalla con el código de esa clase para que puedas inspeccionarlo.
* **Inspección de variables locales y de instancia**, donde podremos ver sus valores en todo momento.
* Y lo que más me ha flipado, **REPL en vivo**, es decir, nos proporciona una consola de Rails donde probar nuestro código y hacer lo que queramos como si se tratase del mismísimo FireBug o la consola de JavaScript de Chrome.

No se para vosotros, pero para mi es una de las gemas más chulas y útiles que he visto últimamente, así que no dudéis en instalarla en vuestro aplicación. Para ello solo tenéis que añadir lo siguiente a vuestro **Gemfile**


```ruby
group :development do
  gem "better_errors"
  gem "binding_of_caller
end
```

### Recibiendo notificaciones de los errores en producción con Airbrake ###
<a href="https://airbrake.io/pages/home" target="_blank" title="Airbrake">Airbrake</a> es una aplicación web que se encarga de recolectar toda la información de los errores en vuestras aplicaciones para luego informaros de ellos. Para usarla, solo tenéis que daros de alta (existe un <a href="https://signup.airbrake.io/account/new/Free" target="_blank" title="Airbrake free plan">plan gratuito</a> si lo queréis usar mientras estáis desarrollando) y copiar la clave de Api que os crea. A continuación añadís su gema en vuestro Gemfile:

```ruby
gem "airbrake"
```

Y ejecutais lo siguiente desde vuestra consola:

```
$ bundle install
$ rails generate airbrake --api-key vuestra_clave_api
```

La próxima vez que despleguéis, Airbrake se encargará de ir recibiendo los errores que ocurran e ir avisándoos por email de ellos. Si entráis en vuestro panel de control de la propia aplicación podréis ver vuestros proyectos con sus respectivos errores, sus trazas completas, las veces que han sucedido, incluso podéis vincularlo con vuestro repositorio **GitHub**

<img src="/images/blog/airbrakescreen.png"/>

Recientemente desplegando en **Heroku** un determinado controlador siempre me devolvía un error 500, y los logs de Heroku no me daban más información sobre qué estaba pasando. Al entrar en mi Airbrake, puede ver que simplemente se trataba de que no había pre compilado una hoja de estilos de un plugin que había añadido en la carpeta vendors de mi proyecto. Así de fácil :)

### Páginas personalizadas de error para los usuarios en el entorno de producción ###
Las páginas de error por defecto de una aplicación Rails son muy simples, y poco integradas con la aplicación en si en cuanto a información que aparece e incluso estilos. En entornos de producción como <a href="http://www.heroku.com/" target="_blank" title="Heroku">Heroku</a> estas se pueden personalizar colgándolas en otros sitio y configurando el entorno para que las muestre cuando un error suceda. Pero hay una manera más sencilla de mostrar páginas de error personalizadas y completamente integradas con vuestra aplicación. En vuestro <code>application_controller.rb</code> añadid lo siguiente:

```ruby
class ApplicationController < ActionController::Base

  unless Rails.application.config.consider_all_requests_local
    rescue_from Exception, with: :render_500
    rescue_from ActionController::RoutingError, with: :render_404
    rescue_from ActionController::UnknownController, with: :render_404
    rescue_from AbstractController::ActionNotFound, with: :render_404
    rescue_from ActiveRecord::RecordNotFound, with: :render_404
  end

  def render_404(exception)
    render template: 'errors/error_404', layout: 'layouts/application', status: 404
  end

  def render_500(exception)
    @error = exception
    render template: 'errors/error_500', layout: 'layouts/application', status: 500
  end

end
```

De esta manera capturará esas excepciones o las que queráis capturar, mostrando las vistas que le indiquéis para cada caso. No os olvidéis de añadir la siguiente linea en vuestra configuración de desarrollo para que ignore esto y os siga mostrando las páginas de errores por defecto o la de **better_errors**

    # config/environments/development.rb
    config.consider_all_requests_local = true

Espero que estos tres simples métodos os ayuden como me ayudan a mi a comprender y terminar con todos lo errores que van saliendo en mis aplicaciones.

Love & Boards!
