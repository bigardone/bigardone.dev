---
title: Cambiando de Wordpress a Octopress
date: 2013-01-23
tags: code, octopress
---

Hace poco he descubierto <a title="A blogging framework for hackers" href="http://octopress.org" target="_blank">Octopress</a>, un framework de Jekyll para generar sitios web estáticos a partir de Ruby, SASS, plantillas HTML y ficheros escritos con markdown. En resumidas cuentas, creas un nuevo artículo en un archivo escrito con tu editor de texto favorito, y con un par de instrucciones en tu consola, te genera el post y te lo despliega en tu servidor. No he podido resistirme a dar el salto por los siguientes motivos:

<!--more-->
<ul>
  <li><span style="line-height: 13px;">Está hecho en Ruby, y así puedo practicar y aprender más.</span></li>
  <li>Tiene los plugins justos, para Twitter, Google Analytics, etc. No hay que volverse loco optimizándolo, añadiendo plugins, actualizándolos, etc.</li>
  <li>Al tratarse de páginas estáticas, no se requiere ningún procesamiento en el servidor, así que la velocidad con la que se sirven es mucho mayor que si se tratase de otro sistema como WordPress.</li>
  <li>No dependes de una base de datos, puedes tener todos tus artículos guardados donde quieras.</li>
  <li>El theme por defecto que viene es muy chulo y responsivo. Puedes instalar otros themes si quieres, pero ya estoy pensando en crear el mio propio usando Haml y Sass.</li>
  <li>Completamente compatible con <a title="GitHub Pages" href="http://pages.github.com" target="_blank">GitHub Pages</a>, con lo que te ahorras tener que pagar un hosting.</li>
  <li>Los comentarios  están implementados usando <a title="Disqus, elevating the discussion, anywhere on the web." href="http://disqus.com" target="_blank">Disqus</a>, con lo que es también independiente de tu blog.</li>
</ul>

<h3>¿Cómo lo instalo?</h3>
Lo primero de todo es preparar tu entorno, yo ya tenía instaladas todas las dependencias al estar programando en Ruby, pero <a title="Octopress setup" href="http://octopress.org/docs/setup/" target="_blank">aquí</a> puedes ver las instrucciones que tienes que seguir en caso contrario. Una vez hecho esto, vayamos al grano:
<ol>
  <li><span style="line-height: 13px;"><span style="line-height: 13px;">Clona Octopress en tu equipo:</span></span>
    
    $ git clone git://github.com/imathis/octopress.git nombre_de_tu_blog
</li>
  <li>Entra en la carpeta nombre_de_tu_blog e instala el tema por defecto:
    
    $ cd octopress
    $ rake install

</li>
</ol>
Ya está instalado. ¿Ves que fácil?
<h3>Configurando tu nuevo blog</h3>
Dentro de la carpeta nombre_de_tu_blog verás un fichero llamado <strong>_config.yml</strong> donde podrás cambiar todos los parámetros de configuración como:
<ul>
  <li><span style="line-height: 13px;">Información del blog como url, título, subtítulo, autor, método de búsqueda, descripción.</span></li>
  <li>Datos de suscripción.</li>
  <li>Otra configuración como el directorio raiz de tu blog, el formato de los percalinas, número de posts por página...</li>
  <li>Las secciones que quieres que aparezcan en la barra lateral, como los posts recientes, tus actualizaciones de Twitter, GitHub, Google Plus, y demás servicios web que configures.</li>
  <li>Datos de conexión a estos servicios web y otros como Google Analytics.</li>
</ul>
<h3>Creando un nuevo post</h3>
Crear un nuevo post es muy sencillo. Solo tienes que ejecutar la siguiente instrucción desde la consola:
    
    $ rake new_post["título"]

Esto crea un fichero dentro de <strong>source/_posts</strong> cuyo nombre será <strong>yyyy-mm-dd-título-del-post.markdown</strong>. Si lo abres, verás que ya tiene algo así codificado, que es la configuración de como Octopress debe procesar este post.

    

    ---
    layout: post
    title: "Bienvenidos a mi blog"
    date: 2013-01-22
    comments: true
    categories: [ code, love, boards ]
    ---

Aqui puedes configurar tu post indicándole qué diseño quieres que use, el título, la fecha de publicación, si quieres activar los comentarios de Disqus, y las categorías o etiquetas de este post. Hay otros parámetros de configuración que son opcionales como:
<ul>
  <li><strong>author</strong>: Por si es un blog con múltiples autores.</li>
  <li><strong>published</strong>: (true/false) Para indicar si es un borrador y no lo muestre cuando lo despliegues en tu servidor.</li>
  <li><strong>external-url</strong>: por si est un post que apunta a una url externa.</li>
</ul>
<h3>Creando una página</h3>
Crear una nueva página es igual de sencillo, sólo tenemos que tener el cuenta con que URL queremos que se acceda a ella:

    $ rake new_page[mi-pagina]
    # creates /source/mi-pagina/index.markdown
    $ rake new_page[mi-pagina/pagina.html]
    # creates /source/mi-pagina/pagina.html

Las páginas creadas también tienen su propia sección configuración:


    ---
    layout: page
    title: "Mi página"
    date: 2013-01-22
    comments: true
    sharing: true
    footer: true
    ---

Donde podremos decirle a Octopress qué diseño quieres que emplee, el título de la misma, si quieres activar los comentarios y los links para compartirla, y si quieres que aparezca o no el pie de la misma donde están incluidas al mismo tiempo las opciones de compartir y comentarios.

Para escribir el contenido tanto de los posts como de las páginas solo tienes que emplear tu editor de texto favorito, y el lenguaje de marcado que pusiste en la configuración del blog. Además te permite usar <a title="Liquid" href="https://github.com/Shopify/liquid/wiki/Liquid-for-Designers" target="_blank">Liquid</a>, y viene con unos cuantos <a title="Octopress plugins" href="http://octopress.org/docs/blogging/plugins/" target="_blank">plugins</a> para incrustar videos, código fuente, imágenes, etc.

<h3>Viendo lo que has creado</h3>
Una vez termines tu post o página tienes las siguientes instrucciones desde tu consola:
    

    $ rake generate # Genera los posts y páginas en la carpeta pública
    $ rake watch # Observa las carpetas source/ y sass/ por si hay cambios para generarlos automáticamente
    $ rake preview # Observa como la opción anterior y monta un servidor en http://localhost:4000

Yo uso la opción <strong>preview</strong> ya que puedo ir viendo los cambios en tiempo real, simplemente accediendo al servidor local y refrescando mi navegador.

Ya tienes tu nuevo blog montado y funcionando. ¿Y ahora qué? Pues ahora toca desplegarlo en GitHub Pages, pero sobre como hacer esto escribiré en mi siguiente post y desde mi nuevo blog hecho en Octopress <a title="Code, Love and Boards" href="http://codeloveandboards.com" target="_blank">http://codeloveandboards.com</a> ;)
