---
title: Desarrollo web moderno con Yeoman
date: 2013-02-27
tags: code, yeoman
---

Hoy en día el desarrollo web ya no consiste simplemente en crear unas vistas con HTML, añadirle unos iconos, aplicar unos estilos, y algo de JavaScript para darle más dinamismo y hacerlas más molonas. Actualmente existen gran variedad de boilerplates que nos ayudan a crear una estructura mínima inicial con la que empezar a trabajar, frameworks CSS que nos ayudan con nuestros estilos haciéndolos inteligentes y re utilizables, librerías de JavaScript que nos permiten separar la capa de la vista completamente de la lógica del servidor actuando como intermediarias entre ambas, pre compiladores que nos permiten generar código más seguro y mejor, y un larguísimo etc que puede hacer que solamente pensar en empezar un nuevo proyecto y tener que añadir todo lo necesario pueda parecer una auténtica pesadilla.

<!--more-->

### Yeoman al rescate ###

Hace unos meses descubrí <a href="http://yeoman.io/" title="Modern Workflows For Modern Webapps" target="_blank">Yeoman</a>, una herramienta que, entre otras muchas cosas, nos ayuda con esta tarea de empezar con un nuevo proyecto y añadir todo lo necesario.
Tal y como explican en su web oficial es un flujo de trabajo, un conjunto de herramientas y buenas prácticas funcionando en armonía para hacer el desarrollo web incluso mejor.

  

### ¿Qué nos aporta? ###

* Te permite crear el esqueleto de tu proyecto de manera rapidísima, permitiéndote elegir entre una serie de plantillas predefinidas como **HTML5 Bolierplate**, **Twitter Bootstrap** o creando las propias tuyas (he encontrado una plantilla para crear temas de Wordpress por ejemplo).
* Compila de manera automática **Coffeescript** y **Compass** (sass), y refresca automáticamente los cambios realizados en tu navegador gracias a **LiveReload**.
* Además de lo anterior, al construir el proyecto, puede minificar y concatenar los ficheros resultantes, optimizar tus imágenes con **OptiPNG** y **JPEGTran**.
* Contrasta tus scripts contra **JSHint** de manera automática para comprobar el uso de buenas prácticas.
* Te lanza un **servidor propio** donde poder ver los resultados de lo que estás desarrollando para que no tengas que montar tu uno propio y tener que estar arrancándolo y parándolo.
* **Sistema de control de paquetes** cojonudo. ¿Necesitas por ejemplo jQuery o Backbone? Lo puedes instalar en tu proyecto con una simple linea de comando desde tu consola, además de mantenértelos actualizados sin que tengas que preocuparte por buscar las últimas versiones.
* Te genera un entorno de pruebas para testar tus scripts usando **PhantomJS**.

### Instalación ###

Actualmente solo funciona en Mac o Linux, pero prometen que la versión de Windows vendrá pronto. Desde vuestro terminal favorito, y teniendo instalado previamente Node.js y Ruby, tenéis que lanzar la siguiente instrucción:

    $ npm install -g yo grunt-cli bower

Con esto, instalaremos básicamente tres cosas

* **Yeoman** junto con todas sus dependencias y generadores por defecto, quedando completamente listo para empezar a trabajar con él.
* **Bower** para el manejo de todas las dependencias.
* **Grunt** para testar, construir y pre visualizar nuestro proyecto.

En el próximo post veremos cómo usar Yeoman para crear nuestro primer proyecto usando el generador por defecto, instalar nuevas librerías en él, arrancar el servidor para poder ver lo que va ocurriendo mientras lo desarrollamos y cómo construir el proyecto una vez lo tengamos listo para desplegarlo.

Love & Boards!
