---
title: Dos maneras de tener siempre a mano toda la información de tu aplicación mientras la desarrollas
date: 2013-02-14
tags: code, rails, logs
---

Mientras desarrollamos una aplicación es importante tener toda la información sobre lo que ocurre en ella durante cada petición que hagamos, ya sea para ver el tiempo que tarda en procesar los datos, los parámetros que le pasamos, el número de operaciones que se realizan en la base de datos y el tiempo que tarda en hacerlas, etc. Para ayudarnos a ver estos datos, Rails nos proporciona un fichero de log para nuestro entorno de desarrollo que podemos encontrar en <code>/log/development.log</code>, pero la verdad es que tener que estar mirando siempre el log puede llegar a ser un auténtico coñazo, así que aquí van dos maneras distintas y mucho más amenas de tener siempre a mano esta información.

<!--more-->

### Rails Footnotes ###
<a href="https://github.com/josevalim/rails-footnotes" target="_blank" title="Rails Footnotes en GitHub">Esta gema</a>, como su propio nombre indica, crea una serie de notas en el pie de tu aplicación donde podremos visualizar toda la información de la sesión, parámetros de la petición, cookies, la cadena de filtros, rutas, consultas a la base de datos y mucho más.

<img src="/images/blog/footnotes.png"/>

Como podéis ver en la captura, hay dos secciones en el pie, una de edición y otra de visualización, y pinchando en cada uno de los links podremos hacer los siguiente:

* Abrir directamente con vuestro editor favorito el **controlador**, las vistas **parciales**, las **hojas de estilo** y los **scripts de javascript** que se usan en la página actual.
* Te muestra todas las **variables** que son asignadas en el controlador y sus valores.
* Lo que hay almacenado en la **sesión** y las **cookies**.
* Los **parámetros** que son enviados al controlador.
* Los **filtros** y las **rutas** que tienes definidas en tu <code>routes.rb</code> para en controlador actual.
* Toda la información y configuración de tu entorno.
* Las peticiones detalladas a la **base de datos** y el tiempo que han tardado en ejecutarse.
* Tu propio log y un panel con su propio identificador para que puedas usar para depurar tu JavaScript, por ejemplo.

Su instalación es muy sencilla, solo tenéis que añadir lo siguiente a vuestro <code>Gemfile</code>

    gem 'rails-footnotes', '>= 3.7.9', :group => :development

Y a continuación lanzar el generador:

    $ rails generate rails_footnotes:install

Además de todo esto, podemos definir nuestras propias notas personalizas, configurar en que lugar de la página queremos de se muestre y muchas cosas más, así que no dudéis en echarle un ojo porque es muy útil.

### La extensión RailsPanel para Chrome ###
Con <a href="https://chrome.google.com/webstore/detail/railspanel/gjpfobpafnhjhbajcjgccbbdofdckggg" target="_blank" title="RailsPanel en Chrome Web Store">esta extensión</a> de **Chrome** podemos tener acceso a más o menos la misma información que con **Footnotes** pero sin que se tenga que incrustar esta información dentro de la estructura de las páginas de nuestra aplicación. Lo que hace es añadirnos una nueva sección en el  panel de las <a href="https://developers.google.com/chrome-developer-tools/" target="_blank" title="Chrome Developer Tools">Developer Tools</a> que capturará esta información a medida que vamos haciendo peticiones.

<img src="/images/blog/railspanel.png"/>

La información que nos proporciona no es tan extensa y detallada como **Footnotes** pero aún así nos proporciona lo siguiente:

* Una lista con cada **petición** que se realiza, con su estado, método, y tiempos que tarda. Esto me gusta porque captura todas las peticiones, incluso las que hagamos mediante **ajax**, cosa que la anterior no hace, o por lo menos no lo he visto.
* Al seleccionar una petición podemos ver el detalle de toda la información anterior, con las peticiones a la base de datos, enlaces a las vistas involucradas para poder abrirlas en tu editor pinchando en ellos e incluso posible errores que puedan ocurrir.

Para que funcione, además de instalar la extensión, debéis añadir la siguiente gema a vuestro <code>Gemfile</code>:

    group :development do
	  gem 'meta_request', '0.2.1'
	end

Y no os olvidéis seleccionar vuestro editor en la configuración de la extensión en el propio **Chrome**.

Espero que estas dos herramientas os ayuden en el día a día tanto como me ayudan a mi ;)
Love & Boards!



