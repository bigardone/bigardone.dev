---
title: Desplegando tu blog Octopress en GitHub Pages
date: 2013-01-24
tags: code, octopress
---

En mi [último post](/blog/2013-01-23-cambiando-de-wordpress-a-octopress) vimos cómo crear un blog de páginas estáticas con <a title="A blogging framework for hackers" href="http://octopress.org" target="_blank">Octopress</a>, configurarlo, crear posts y páginas y ver los cambios en local. Ya tienes montado tu blog, y ahora tienes que desplegarlo en algún sitio para que el mundo lo vea. Para esto, vamos a usar <a title="GitHub Pages" href="http://pages.github.com" target="_blank">GitHub Pages</a>, con el que se integra al 100% y encima es completamente gratuito, sin mencionar la fiabilidad del servicio ;)

<!--more-->

<h3>Configurando GitHub</h3>
Lo primero que tienes que hacer es acceder a tu cuenta de GitHub y crear un nuevo repositorio con el siguiente nombre:

        tu_nombre_de_usuario.github.com

La manera que tiene GitHub Pages de funcionar es la siguiente. Usa la <strong>master branch</strong> como directorio público de tu servidor web sirviendo los ficheros del repositiorio que creaste antes, y donde se encuentran el contenido estático generado. Tienes que trabajar desde la <strong>source branch</strong> y commitear el contenido generado a la <strong>master branch</strong>, para que los cambios puedan contemplarse. No te preocupes, hay una instrucción desde tu consola, que se encarga de configurar esto. Entra en ella, y desde el directorio raíz de tu blog ejecuta:

        $ rake setup_github_pages

A continuación deberás introducir otra vez el la url de tu repositorio, pero recuerda introducirla usando el siguiente formato:

        git@github.com:tu_nombre_de_usuario/tu_nombre_de_usuario.github.com.git

Ya tenemos nuestro "hosting" configurado :)
Para desplegar los cambios, solo tienes que generar el blog, y desplegarlo:

        $ rake generate
        $ rake deploy

Y en pocos segundos ya puedes ver tu blog accediendo a <strong>http://tu_nombre_de_usuario.github.com</strong>

Como último detalle, no te olvides commitear los cambios a tu <strong>source branch</strong>:

    $ git add .
    $ git commit -am 'Commit inicial'
    $ git push origin source


<h3>Usando un dominio personalizado</h3>
Para terminar de personalizarlo del todo, puedes usar un nombre de dominio personalizado para que apunte a tu nuevo blog.
Lo primero que tienes que hacer, es crear un fichero con el nombre <strong>CNAME</strong> dentro del directorio <strong>source</strong> con el nombre de tu dominio:

        $ echo 'nombre_de_tu_dominio.com' >> source/CNAME
No te olvides de volver a generar otra vez todo y desplegarlo:

    $ rake generate
    $ rake deploy
    $ git add .
    $ git commit -am 'CNAME creado para dominio personalizado'
    $ git push origin source


A continuación tienes que crear un registro A en el DNS de tu dominio que apunte a la siguiente dirección IP de GitHub Pages:

    207.97.227.245

Y trás las horas que tarde en refrescar el DNS, ya podremos acceder a nuestro blog desde <strong>nombre_de_tu_dominio.com</strong>, yeah!

Espero no haberme dejado nada importante en el tintero, de todas formas si algo de esto no te funciona, siempre puedes mirar la documentación del propio <a href="http://octopress.org/docs/" title="Octopress docs" target="_blank">Octopress</a> y la de <a href="https://help.github.com/categories/20/articles" title="GitHub Pages help" target="_blank">GitHub Pages</a>. Happy blogging!




