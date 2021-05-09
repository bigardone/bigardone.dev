---
title: Mejores hojas de estilo con Sass
date: 2012-12-17
tags: code, sass, css
---

Cuando desarrollo el interfaz de alguna aplicación, siempre hay una cosa que me vuelve loco que son las hojas de estilo. Siempre empiezo organizándolas por apartados, intentando poner cada cosa en su su sitio, para que luego sea sencillo encontrar cada cosa y no volverme loco. Pero esta organización solía durarme pocas semanas, hasta que entraba en vorágine de cambios de diseño, y terminaba destrozando ese orden con el que había empezado... hasta que descubrí <a title="Sass - Syntactically Awesome Stylesheets" href="http://sass-lang.com" target="_blank">Sass</a>!!!

<!--more-->


<h3>¿Qué es Sass?</h3>
Sass son las siglas de Syntactically Awesome Stylesheets, o lo que viene a ser Hojas de Estilo Sintácticamente Impresionantes, un lenguaje que genera CSS y que os aseguro que hace honor a su nombre ya que imaginaos poder escribir vuestras hojas de estilo usando variables, funciones, extendiendo clases, usando bucles y muchas más cosas que harán que  escribir CSS sea divertido fácil de mantener y todo ello con una sintaxis muy simple e intuitiva.

<h3>Sintaxis</h3>
Bueno, en realidad hay dos sintaxis, que puedes elegir según la extensión del fichero que uses, una es .SCSS y la otra .SASS, la cual es la que yo prefiero, ya que es más simplificada, y te permite olvidarte de usar puntos y coma, llaves y demás elementos que en css son necesarios teniendo solo en cuenta que tienes que ser estricto con la indentación que uses (en mi caso 2 espacios), ya que luego te generará el css usando anidando los elementos usando esa indentación:

```sass
// Esto en .sass
$primaryColor: #000
$secondaryColor: lighten($primaryColor, 20%)
=underlined
  border-bottom: 1px solid $secondaryColor
ul
  li
    a
      color: $primaryColor
      text-decorarion: none
      &amp;:hover
        color: $secondaryColor
        +underlined
```
```css

/* Es esto en .css */
ul li a {
  color: black;
  text-decorarion: none;
}
ul li a:hover {
  color: #333333;
  border-bottom: 1px solid #333333;
}
```

Como podéis ver, adios a las llaves, puntos y comas, podemos declarar variables, mixins, anidar selectores y muchas más cosas. A continuación os detallo las cosas que más me gustan y uso:

<h4>Variables</h4>
Imagino que ya podréis imaginar el potencial que esto nos da en nuestras hojas de estilo, para poder modificar colores, tamaños, márgenes y demás cambiándolo en un solo sitio, ya que además se pueden usar operaciones aritméticas con ellas.

```sass
// .sass
$globalPadding: 10px
.inner
  padding: $globalPadding ($globalPadding * 2)

/* .css */
.inner {
  padding: 10px 20px;
}
```

<h4>Mixins</h4>
Los mixins nos permiten declarar un grupo de reglas css que luego podremos reutilizar donde queramos:

```sass
// .sass
=border-radius($radius)
  -webkit-border-radius: $radius
  -moz-border-radius: $radius
  border-radius: $radius
.widget
  +border-radius(5px)
.button
  +border-radius(10px)
```

```css
/* .css */
.widget {
  -webkit-border-radius: 5px;
  -moz-border-radius: 5px;
  border-radius: 5px;
}
.button {
  -webkit-border-radius: 10px;
  -moz-border-radius: 10px;
  border-radius: 10px;
}
```

<h4>Funciones con colores</h4>
Esto es lo que más me gusta ya que siempre ando tocando colores, buscando paletas y colores similares para mis aplicaciones. Normalmente siempre he usado servicios como <a title="0to255" href="http://0to255.com" target="_blank">0to255</a>, pero con las funciones de colores, Sass se encarga de calcularte los colores a partir del que tu quieras.

```sass
// .sass
$orange: #d74c17
.element
  background-color: lighten($orange, 10%)
  border: 1px solid darken($orange, 20%)
  color: complement($orange)
```

```sass
/* .css */
.element {
  background-color: #ea6937;
  border: 1px solid #7b2b0d;
  color: #17a2d7;
}
```

<h4>Bucles</h4>
Otra característica muy útil e importante cuando tienes que repetir la misma reglas en varios sitios pero con pequeñas variaciones:

```sass
// .sass
@each $logo in twitter, facebook, linkedin
  .#{$logo}-logo
    background-image: url('/images/logos/#{$logo}.jpg')
// .css
.twitter-logo {
  background-image: url("/images/logos/twitter.jpg");
}
.facebook-logo {
  background-image: url("/images/logos/facebook.jpg");
}
.linkedin-logo {
  background-image: url("/images/logos/linkedin.jpg");
}
```
<h4>¡Y muchas cosas más!</h4>
Esto es solo un pequeño resumen de las muchísimas cosas que se pueden hacer con Sass, y que te ayudan escribir css de manera más sencilla, rápida y mantenible. A continuación os dejo unos enlaces donde podréis aprender mas sobre este lenguaje que hará que os volváis a divertir escribiendo css ;)
<ul>
	<li><span style="line-height:13px;"><a title="Documentación Sass" href="http://sass-lang.com/docs/yardoc/file.SASS_REFERENCE.html" target="_blank">Documentación oficial</a>.</span></li>
	<li><a title="The Sass Way" href="http://thesassway.com" target="_blank">The Sass Way</a>: Un sitio donde encontrar trucos y ejemplos de como hacer las cosas en sass.</li>
	<li><a title="Css converter" href="http://cssconvert.mgwebsolutions.net" target="_blank">CSS converter</a>: Un sitio donde transformar facilmente tu css a Sass y viceversa.</li>
</ul>
