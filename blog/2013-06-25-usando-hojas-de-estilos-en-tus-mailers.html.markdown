---
title: Usando hojas de estilos en tus mailers
date: 2013-06-25
tags: ruby, rails, mailer, gems
---

En un post anterior vimos cómo [probar nuestros mailers](/blog/2013/01/30/probando-tus-emails-desde-tu-entorno-de-desarrollo-en-ruby-on-rails) en nuestro entorno de desarrollo sin necesidad de tener que enviarlos de forma real. También conocimos una gema muy útil llamada <a href="https://github.com/37signals/mail_view" target="_blank" title="Mail view">mail_view</a> que nos puede ayudar con el diseño de nuestros emails mostrándonos el resultado final desde nuestro navegador a medida que vamos desarrollando las vistas de los mismos. ¿Pero qué pasa cuando queremos diseñar una plantilla chula para nuestro emails?

<!--more-->

Debido a la gran variedad de clientes de correo que existen y sus <a href="http://www.campaignmonitor.com/css/" target="_blank">múltiples incompatibilidades</a>, una buena práctica que se recomienda llevar a cabo para generar emails con contenido HTML es la de añadir todos los **estilos en linea**. Es decir, cada elemento de nuestro HTML al que queremos dar estilos, debe llevarlos en su propio atributo <code>style</code>. Con que queramos generar una plantilla un poco curiosa, esto va a significar que vamos a tener **repetir muchos estilos**, y lo que es peor aún, si queremos cambiar algo vamos a tener que cambiarlo en muchos sitios, lo que choca un poco con el principio <a href="http://es.wikipedia.org/wiki/No_te_repitas" target="_blank" title="Don't repear yourself">DRY</a> de **Rails**. Además, habiendo desarrollado ya unas hojas de estilos decentes para nuestra aplicación, que menos que poder reutilizar parte de estos estilos en nuestros emails. ¿Pero cómo podemos hacer esto?

###Roadie al rescate###
<a href="https://github.com/Mange/roadie" target="_blank" title="Roadie">Esta gema</a> nos ayuda en esta labor, cogiendo las hojas de estilos que especifiquemos en nuestra plantilla y reescribiendo todo el HTML del email para aplicarle los estilos en linea. Además de esto nos ayuda a sobrescribir todas las URLs de nuestras imágenes para que sean **absolutas**, y así visibles desde cualquiera de nuestro entornos.

Para instalarla solo la tenemos que añadir a nuestro <code>Gemfile</code>:

    gem 'roadie'

Una vez ejecutamos el consiguiente <code>bundle install</code>, ya la tendremos lista para funcionar. Para que coja cualquier hoja de estilos y haga su magia, podemos elegir varia formas de hacerlo:

La primera sería añadiendo un tag haciendo referencia a la hoja de estilos que queramos usar:

    <link rel="stylesheet" href="nombre_de_tu_hoja_de_estilos.css"/>

También podemos incrustar en nuestra plantilla sus estilos en su correspondiente <code>style</code> tag:

    <style type="text/css">
      ...
    </style>

Usando cualquiera de las anteriores opciones, **Roadie** quitaría esas referencias o estilos, aplicándolos en line sobre el propio HTML. Si no queremos insertar estos tags en nuestro layout, nos permite pasarle el nombre de la hoja de estilos que queremos aplicarle como parámetro <code>:css</code> en nuestros **mailers**:

``` ruby

# app/mailers/invoice_mailer.rb
class InvoiceMailer < ActionMailer::Base

  default from: "orders@gvbtool.com", css: :email

  ...

end
```

Para que reemplace todas las URLs de nuestras imágenes por rutas absolutas, tenemos que especificar la siguiente configuración en nuestro <code>application.rb</code>, o en cada fichero de configuración de entorno, si variase la ruta entre ellos:

    config.action_mailer.default_url_options = { host: 'localhost', port: 3000 }


Ahora todos a diseñar emails chulos para vuestros usuarios :)

Love & Boards!

