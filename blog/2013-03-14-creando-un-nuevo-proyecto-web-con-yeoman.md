---
title: Creando un nuevo proyecto web con Yeoman
date: 2013-03-14
tags: code, yeoman
---

En el pasado post [conocimos a Yeoman](/blog/2013/02/27/desarrollo-web-moderno-con-yeoman), un nuevo amigo que nos ayuda a desarrollar proyectos web de manera moderna y dinámica, poniendo a nuestra disposición una serie de de flujos de trabajo y buenas prácticas orientados no solo a optimizar el resultado final de nuestro desarrollo, sino también generando por nosotros el esqueleto del mismo, manejo de dependencias y un largo etcétera. También vimos como instalar la versión 1.0 (junto con sus dos dependencias  **Bower** y
**Grunt**), con una sola linea desde nuestra consola:

<!--more-->


    $ npm install -g yo grunt-cli bower

Teniendo ya todo instalado vamos a generar nuestro primer proyecto y para ello vamos a usar uno de los generadores de Yeoman, para que genere para nosotros todo lo que en un principio necesitaremos. Para ver la lista de generadores por defecto, solo tenemos que ejecutar lo siguiente:

    $ yo
    
    Usage: yo <generator> [arguments] [--help]
    
    The webapp generator is bundled, while others can be installed with npm install <generator-name>
    
    Officially supported generators:
    webapp angular ember backbone chromeapp chrome-extension bootstrap mocha jasmine testacular
    
    See a list of all available generators with npm search yeoman-generator
    
    Now just run yo webapp and have a great day :)

Como veis, tiene unos cuantos generadores por defecto, dependiendo de que librerías o frameworks queramos usar, pero para este ejemplo vamos a generar un nuevo proyecto con el generador por defecto **webapp** y luego añadiremos alguna dependencia más.

	$ yo webapp

Tras ejecutar esta instrucción, nos avisa de que por defecto ya incluye **HTML5 Boilerplate**, **jQuery** y **Modernizr**. Además nos pregunta si queremos añadir algunos componentes adicionales como la versión [Sass](/blog/2013-01-19-mejores-hojas-de-estilo-con-sass) de **Twitter Bootstrap** para tener ya unos buenos estilos predefinidos y **RequireJS** para la carga de nuestros scripts bajo demanda. Esto crea toda la estructura inicial de ficheros de nuestro proyecto, pero tendremos que instalar las dependencias necesarias de **Grunt** y **Bower** para realmente poder empezar a usar todo su poder:

    $ npm install && bower install

Mirando vuestra consola podréis ver todo lo que se descarga y como va resolviendo conflictos con dependencias y demás, para dejarnos todo a punto para comenzar a trabajar.

### Ver las dependencias instaladas

Para saber que dependencias estamos usando realmente en nuestro proyecto tenemos ejecutar la siguiente instrucción:

    $ bower list

Y dibujará un árbol con el nombre de cada una de ellas, su versión y las que dependen de ellas.

### Instalando y actualizando dependencias

Supongamos que queremos añadir **jQuery UI** a nuestro proyecto ya que no viene con el generador por defecto y necesitamos usar alguno de sus componentes Sería tan sencillo como, comprobar que esta dependencia existe en **Bower**:

    $ bower search jquery-ui

Si existe esa dependencia o alguna con un nombre similar nos la listaría a continuación. Vamos a instalarla con:

    $ bower install jquery-ui

Y ya tendríamos instalada la última versión y además nos actualizaría la de jQuery si no fuera compatible.
De la misma manera, para actualizar alguna dependencia ya instalada solo tenemos que ejecutar:

    $ bower update [nombre-dependencia]

### Lanzar el servidor

Para ver en tiempo real lo que estamos desarrollando y el resultado de tus estilos con **Sass** o tus scripts generados con **CoffeeScript**, tenemos que lanzar el servidor que nos viene incluido con Yeoman, ejecutando:

    $ grunt server

Además de lanzarnos el servidor que por defecto estará escuchando en el puerto **9000**, refresca nuestro navegador gracias a **LiveReload** para mostrarnos los cambios que realicemos en nuestros ficheros y contarnos que va ocurriendo en nuestro proyecto por la consola.

### Lanzar tus tests unitarios

Para lanzar los tests unitarios solo tenemos que usar:

    $ grunt test

### Construir el proyecto

Para generar la versión optimizada de nuestro proyecto y que será la que luego despleguemos, podemos hacerlo con:

    $ grunt

Esto nos creará una carpeta llamada <code>dist</code>, en la que a partir de los ficheros que vamos a ir creando durante el desarrollo en la carpeta <code>app</code>, generará todos los ficheros compilados, optimizados, minificados, comprimidos, ofuscados, etc.

### Conclusión

La verdad es que Yeoman me flipa. Toda la generación personalizable del esqueleto del proyecto, la manera que tiene que instalar dependencias y actualizarlas, el servidor, el compilar los ficheros según los vas modificando y demás hace que tenga en "una" sola herramienta lo que antes tenía que hacer usando varias. Lo he probado para un theme de WordPress que estoy desarrollando, pero solo de manera muy básica. No me atrevo a decir que tal funcionará con otro tipo de proyectos, pero gracias al nivel de personalización que le puedes dar a todas las tareas con el fichero <code>Grunt.js</code>, estoy deseando poder usarlo más a fondo y exprimirlo al máximo.

Love & Boards!



