---
title: Desarrollo web moderno con Middleman, parte I
date: 2013-11-03
tags: code, ruby, web
---

Hace ya un tiempo que trabajo con **Ruby**, **Rails**, **Haml**, **Sass** y **CoffeeScript**. Me he habituado a este *stack* de herramientas que me ayudan a ser más productivo y realizar de manera más cómoda y divertida mi trabajo. El hecho de usarlas en mi día a día hace que cada vez sea más consciente de sus virtudes y ventajas y esto a su vez hace que quiera usarlas cada vez más, afrontando nuevos retos y usándolas en proyectos totalmente diferentes, no solo para el desarrollo de aplicaciones como tal.

<!-- more -->

Mi último *side project* es algo que estoy desarrollando para una de las personas más importantes en vida, y que estoy haciendo con todo mi amor y pasión. Se trata del rediseño de su blog actual en algo más profesional y chulo que la ayude en la nueva nueva etapa profesional en la que se ha embarcado recientemente, igual que ella me ayudó a mí cuando comencé esta aventura.

Una cosa que tenía clara es que quería usar las herramientas que uso a diario. Podría haber usado **Yeoman**, sobre la que ya he escrito y usado en [varias](/blog/2013/02/27/desarrollo-web-moderno-con-yeoman) [ocasiones](/blog/2013/03/14/creando-un-nuevo-proyecto-web-con-yeoman), pero quería que fuera algo que luego pudiera fácilmente migrar el sitio a una aplicación **Rails** cuando algunas de las ideas que iban surgiendo para su negocio cuajaran y necesitase algo más que una simple web.

### Middleman al rescate

Hace ya tiempo que tenía el ojo puesto en <a href="http://middlemanapp.com/" target="_blank" title="Middleman">este generador</a> y estaba buscando el momento para probarlo. Se trata de una generador creado en **Ruby** y basado en el *framework* web **Sinatra** que nos va a permitir crear sitios web usando las herramientas a las que ya estamos habituados pero además usando otros elementos para hacer nuestro trabajo más cómodo.

{% blockquote %}
Middleman is a static site generator using all the shortcuts and tools in modern web development.
{% endblockquote %}

### ¿Qué nos aporta?

Si estáis acostumbrados a trabajar con **Ruby on Rails**, enseguida descubriréis que la manera de trabajar con **Middleman** es muy similar, y que comparten muchas similitudes como:

* Poder generar un nuevo proyecto usando plantillas para crear el esqueleto y todo lo necesario de tu nuevo sitio web.
* Puedes añadir diversas extensiones incluyéndolas en el <code>Gemfile</code>.
* Puedes usar las herramientas que ya conoces, como **Haml**, **Sass** y **CoffeeScript**.
* El uso de plantillas y *layouts* para reutilizar elementos comunes en las vistas pudiendo anidarlas y usar vistas parciales.
* El uso de *helpers* en tus plantillas para generar enlaces, formularios, formateo, etc.
* Páginas dinámicas usando elementos de bloque.
* Tiene un *Asset Pipeline* como en **Rails** para la gestión de librerías JavaScript y CSS.
* Sistema de urls amigables.
* Puedes tener datos locales usando un sistema de ficheros <code>.yml</code>, <code>.yaml</code> o <code>.json</code> para poder usar estos datos en tus plantillas y crear páginas "dinámicas".
* Internacionalización de tu sitio web gracias al uso de ficheros de idiomas, donde tener las traducciones de los textos que aparecerán en tus páginas.
* Puedes crear tus propias extensiones en **Ruby**.
* Al generar el resultado final puedes decidir si quieres que te comprima, minimice y optimice tus *scripts*, hojas de estilo e incluso imágenes añadiéndole a estos *assets* un nombre único cada vez que se generan para prevenir problemas de caché.
* Tiene hasta un sistema de *blogging* muy parecido a [Octopress](/blog/2013/01/23/cambiando-de-wordpress-a-octopress) basado, como no, en páginas estáticas.

Como veis la lista de características que tiene es muy extensa, permitiéndonos crear sitios web estáticos con múltiples páginas de manera muy sencilla gracias al uso de herramientas modernas, la posibilidad de darle un toque dinámico con el uso de datos locales y la reutilización de elementos comunes.

### Instalación
Para instalarlo solo tenemos que ejecutar lo siguiente desde nuestra consola:

    gem install middleman

Con esto ya tendremos a nuestra disposición tres nuevos comandos para **crear** nuestro nuevo proyecto, **previsualizar** lo que estamos haciendo mientras desarrollamos y **generar** el resultado final optimizado, pero todo eso lo veremos en el próximo *post* :)

Happy coding!



