---
title: Ahorra tiempo generando tus vistas con Haml
date: 2013-01-15
tags: code, haml, html
---

Después de haber escrito sobre <a title="Mejores hojas de estilo con Sass" href="http://codeloveandboards.wordpress.com/2012/12/17/mejores-hojas-de-estilo-con-sass/">Sass</a> y <a title="Mejor JavaScript con CoffeeScript" href="http://codeloveandboards.wordpress.com/2013/01/04/mejor-javascript-con-coffeescript/">CoffeScript</a>, y teniendo cubierto con ambas tanto la generación de las hojas de estilo como el javascript de una aplicación de manera simple y con una sintaxis más intuitiva, no podía deja atrás al origen de todo esto, <a title="Beautiful, DRY, well-indented, clear markup: templating haiku." href="http://haml.info" target="_blank">Haml</a>, que viene a ser lo mismo pero para la generación de las plantillas HTML para las vistas.

<!--more-->

<h3>Sintaxis</h3>
Estamos ante otro lenguaje de sintaxis simplificada, que nos ayuda a codificar de manera más rápida usando los menos caracteres posibles, y utilizando la indentación del documento para ir construyendo el árbol de elementos que generará nuestro HTML final. Olvidate de abrir etiquetas y de cerrarlas, de usar atributos como <strong>id=""</strong> o <strong>class=""</strong>, de volverte loco intentado encontrar donde cerrabas no se qué elemento, etc.

Vamos a ver un ejemplo muy sencillo de html estático:

```html
<div class="surf-spot" id="salinas">
  <header>
    <h3>Playa de Salinas</h3>
    <ul class="options">
      <li>
        <a class="view" title="View spot details" href="/surf_spots/5">View</a>
      </li>
      <li>
        <a class="edit" title="Edit spot details" href="/surf_spots/5/edit">Edit</a>
      </li>
    </ul>
  </header>
  <div class="details">
    <dl>
      <dt class="type">Type</dt>
      <dd>Beach brake</dd>
      <dt class="swell-dir">Swell direction</dt>
      <dd>NW</dd>
      <dt class="wind-dir">Wind direction</dt>
      <dd>S, SW, SE</dd>
    </dl>
  </div>
</div>
```

¿Y como sería su versión en <strong>Haml</strong>? Muy sencillo:

```haml
#salinas.surf-spot
  %header
    %h3 Playa de Salinas
    %ul.options
      %li
        %a.view{title: "View spot details", href: "/surf_spots/5"} View
      %li
        %a.edit{title: "Edit spot details", href: "/surf_spots/5/edit"} Edit
  .details
    %dl
      %dt.type Type
      %dd Beach brake
      %dt.swell-dir Swell direction
      %dd NW
      %dt.wind-dir Wind direction
      %dd S, SW, SE
```

Como puedes ver, es mucho más simple. Como norma general, si el elemento que quieres añadir es un <strong>div</strong>, con una clase o identificador, no hace falta poner el nombre del tag, simplemente basta con usar el nombre de la clase precedido por un "<strong>.</strong>" o una "<strong>#</strong>" si se trata de un identificador. En caso de tener ambos, puedes usarlos también. En el caso de que no se trate de un simple div, sino de cualquier otro elemento html, deberás poner su nombre precedido de un "<strong>%</strong>", pudiendo añadirle clases e identificador igual que antes. Para el resto de atributos del elemento, solo tienes que incluirlos dentro de un hash "<strong>{}</strong>", justo después del nombre del mismo. Es <strong>muy importante</strong> la indentación de los elementos, ya que es lo que va a usar para anidar los elementos unos dentro de otros.

<h3>¿Dónde lo uso?</h3>
Inicialmente se creó para ser usado con <strong>Ruby </strong>pudiendo añadirlo a tus proyectos de Ruby on Rails como generador de plantillas por defecto gracias a la gema <a title="Haml Rails" href="https://github.com/indirect/haml-rails" target="_blank">ham-rails</a>. Pero ya hay muchas implementaciones para otros lenguajes como JAVA, .NET, PHP y demás. La verdad es que desde que he empezado a usarlo, cada vez me gusta más y lo uso siempre que puedo aunque sea para desarrollar simple html estático. Para compilarlo uso <a title="CodeKit helps you build websites faster and better." href="http://incident57.com/codekit/" target="_blank">CodeKit</a>, una de esas joyas que solo hay en Mac, de la que ya hablaré en otro post ;)
<ul>
	<li><span style="line-height:13px;"><a title="Haml" href="http://haml.info" target="_blank">http://haml.info</a> - Sitio oficial
</span></li>
	<li><a title="HTML 2 HAML" href="http://html2haml.heroku.com" target="_blank">http://html2haml.heroku.com</a> - Compilador de HTML a HAML online.</li>
</ul>
