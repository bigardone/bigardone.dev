---
title: Desarrollo web moderno con Middleman, parte II
date: 2013-11-15
tags: code, ruby, web
---
En el [post anterior](/blog/2013/11/03/desarrollo-web-moderno-con-middleman-i) conocimos <a href="http://middlemanapp.com/" target="_blank" title="Middleman">Middleman</a>, un generador de sitios web estáticos, que tiene un gran parecido a **Ruby on Rails** a la hora de utilizar tecnologías como **Haml**, **Sass** y **CoffeeScript**, además de gestionar los *assets* como hojas de estilos, scripts e imágenes de igual manera, lo que hace que el desarrollo de estos sitios estáticos sea mucho más dinámico y divertido.

<!-- more -->

Para instalarlo solo tenemos que ejecutar lo siguiente desde nuestra consola:

    gem install middleman

### Iniciando un nuevo proyecto
Para empezar a trabajar debemos crear el nuevo proyecto:

    middleman init nuevo_proyecto

Con este comando se generará un nuevo **esqueleto básico** para nuestro proyecto, pero si queremos crear un esqueleto un poco más curioso, podemos usar una **plantilla** pasándole al comando *init* un parámetro con el nombre de la plantilla que queremos usar como base:

    middleman init nuevo_proyecto --template=html5

Por defecto **Middleman** viene con 3 plantillas de proyectos predefinidas, que son <a target="_blank" href="http://html5boilerplate.com/">HTML5 Boilerplate</a>, <a target="_blank" href="http://smacss.com/">SMACSS</a> y <a target="_blank" href="http://html5boilerplate.com/mobile/">Mobile Boilerplate</a>, pero en su comunidad podemos encontrar <a target="_blank" href="http://directory.middlemanapp.com/#/templates/all"></a> muchos más que la gente usa y comparte y que nos va a facilitar mucho la configuración inicial.

### Configurando nuestro proyecto

**Middleman** nos permite personalizarlo de muchas maneras y para ello contamos con un fichero llamado <code>config.rb</code> en el raiz de nuestro proyecto. En este fichero podremos personalizarlo a nuestro antojo, especificando desde la manera que queremos que *compass* compile nuestros **Sass**, activar las urls amigables, especificar los directorios donde queremos que se se genere el contenido estático, *helpers* para poder usar nuestras vistas, etc.
Además, su configuración es específica para el entorno en el que nos encontremos, ya sea en **desarrollo** (*development*) o **construyendo** (*build*) nuestro proyecto, permitiéndonos alterar la configuración entre ambos.

### Trabajando en nuestro proyecto
Si miramos la estructura creada, veremos un directorio llamado <code>source</code>, donde se encuentran los archivos que usaremos para desarrollar el contenido web, es decir, nuestras vistas y vistas parciales con **Haml**, hojas de estilo con **Sass**, scripts con **CoffeeScript** y demás. Pero para que **Middleman** procese estos archivos y podamos ver el resultado debemos ejecutar primero:

    middleman server

Esto pondrá a nuestra disposición el servidor que lleva integrado al cual podremos acceder a través de la url <code>http://localhost:4567/</code>.
Ahora ya podemos empezar a trabajar haciendo uso de todas las características tan útiles que tiene y que os comentaba en el post anterior como el uso de <a href="http://middlemanapp.com/templates/" target="_blank">plantillas</a>,  <a href="http://middlemanapp.com/templates/#toc_2" target="_blank">distintos layouts para páginas</a>, <a href="http://middlemanapp.com/templates/#toc_6" target="_blank">vistas parciales</a>, <a href="http://middlemanapp.com/dynamic-pages/" target="_blank">páginas dinámicas</a>, <a href="http://middlemanapp.com/advanced/local-data/" target="_blank">datos locales</a> y muchas otras que podreis encontrar en su <a href="http://middlemanapp.com/getting-started/" target="_blank">documentación</a>.

### Generando nuestro proyecto
Una vez que queramos generar la versión final de nuestro proyecto para desplegarla en el servidor, lo podremos hacer con:

    middleman build

Esto generará una versión estática de cada fichero que tengamos en el directorio <code>source</code>, compilándolas y aplicando cualquier proceso que hayamos especificado en el fichero de configuración bajo el entorno <code>:build</code> como compresión de estilos y scripts, optimización de imágenes, etc. El resultado lo tendremos en nuestra carpeta <code>build</code> completamente listo para ser desplegado donde queramos.

### En resumen
Si estáis acostumbrados a trabajar con **Rails** y necesitáis generar una sitio estático aprovechando todas las ventajas que ya conocéis, no dudéis en probar **Middleman** porque os va a parecer simplemente genial.

Happy coding!



