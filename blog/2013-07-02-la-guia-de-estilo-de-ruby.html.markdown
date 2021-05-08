---
title: La Guía de Estilo de Ruby
date: 2013-07-02
tags: ruby
---

<small style="font-style: italic;">Post originalmente escrito para el blog de <a href=" http://blog.diacode.com/la-guia-de-estilo-de-ruby" target="_blank">Diacode</a>, que dice así:</small>

Tengo que reconocer que mi sentido del orden a la hora de organizar cosas como mi armario, los cajones de la cocina o el maletero de mi coche puede ser bastante peculiar y chocar con las reglas de orden básicas estipuladas por cualquier persona, o lo que se suele llamar desordenado :)

Esta conducta es completamente contraria a la manera que tengo de trabajar. Profesionalmente **me encanta organizar bien mis proyectos**, tener todo mi código bien estructurado y el uso de buenas prácticas a la hora de escribirlo. El uso de estas buenas prácticas es muy importante para mí, ya que **me ayuda a conocer mejor** el lenguaje que estoy utilizando y a la vez hace que mis **habilidades vayan mejorando** a medida que lo uso. Todos los lenguajes tienen sus guías de buenas prácticas, ya sean oficiales o no, para proporcionarnos unas pautas y ayudarnos a escribir mejor código, pero... ¿Qué pasa con **Ruby**?

<!--more-->

###Ruby Style Guide###

La semana pasada discutiendo con Javi y Victor sobre como escribir una llamada a un método con muchos parámetros, me puse a buscar sobre el tema y encontré la <a href="https://github.com/bbatsov/ruby-style-guide" target="_blank" title="A community-driven Ruby coding style guide">Ruby Style Guide</a>. Es una guía que comenzó como unas directrices internas de la empresa donde trabaja su autor, <a href="https://twitter.com/bbatsov" title="Bozhidar Batsov" target="_blank">Bozhidar Batsov</a>, quien decidió que estas pautas podrían ayudar a otros desarrolladores de la comunidad Ruby, y la hizo pública con la idea de que la comunidad colaborase y aportase sugerencias, nuevas pautas y buenas practicas.

El resultado es una guía llena de ejemplos **de lo que está bien hecho y de lo que no lo está tanto**, muy amena de leer, y que está en continuo crecimiento gracias a <a href="https://github.com/bbatsov/ruby-style-guide/graphs/contributors" target="_blank">toda esa gente</a> que está detrás aportando su granito de arena.

### RuboCop, el analizador de código de la Ruby Style Guide ###

La guía en si está muy bien, pero lo que está mejor aún es la gema que ha desarrollado su autor para ayudarnos en la tarea de aplicar esa directrices lo mejor posible. Su nombre es <a href="https://github.com/bbatsov/rubocop" target="_blank" title="An experimental Ruby code analyzer">RuboCop</a> y se trata de un asistente que analizará tu código Ruby, buscando posibles ofensas que cometas, y sugeriéndote como solventarlas para que tu código sea más optimo y mantenible por otros desarroladores.

Para instalarla solo tenemos que hacer:

    $ gem install rubocop

Una vez instalada, la manera más básica de ejecutarlo sería con:

    $ rubocop

Esto analizará todo nuestro proyecto, sacando por consola todas esas ofensas hechas contra la guía. Si no queremos que analice todo el proyecto, podemos pasarle como parámetro una lista de nombres de directorios o ficheros que queremos que analice:

    $ rubocop app spec

La cosa no acaba aquí, porque además **podemos configurar** que reglas de la guía queremos que tenga en cuenta y cuales no. Para esto solo tenemos que añadir un <code>.rubocop.yml</code> en el directorio raiz de nuestro proyecto, o incluso dentro de cada directorio que vamos a analizar, por si queremos sobrescribir algunas reglas predeterminadas para ese directorio.

También nos permite especificar los fichero que **queremos ignorar** y los que no:

    AllCops:
      Includes:
        - Rakefile
        - config.ru
      Excludes:
        - db/**
        - config/**
        - script/**

    # other configuration
    # ...

E incluso aplicarle un formato de salida distinto como **JSON**, o crear uno nuestro propio:

    $ rubocop --format json


### Automatizando RuboCop ###

Si no te apetece estar lanzando todo el rato RuboCop desde la consola, no te preocupes porque puedes encontrar **plugins** para lanzarlo desde tu editor favorito, ya uses <a href="https://github.com/pderichs/sublime_rubocop" target="_blank">Sublime Text</a>, <a href="https://github.com/ngmy/vim-rubocop" target="_blank">Vim</a> o <a href="https://github.com/bbatsov/rubocop-emacs" target="_blank">Emacs</a>.

También existe una gema para poder usarlo con <a href="https://github.com/yujinakayama/guard-rubocop">Guard</a>, y que se encargue de analizar nuestro código automáticamente cada vez que cambiemos un fichero.

En resumen, gracias a la **Ruby Style Guide** y su analizador **RuboCop** podemos ir poco a poco acostumbrándonos a usar ciertas buenas prácticas a la hora de escribir nuestro código **Ruby** que nos ayudarán a ser mejores desarrolladores y entender mejor por qué lo que antes estábamos haciendo se puede hacer de otras maneras más óptimas. Y gracias a la flexibilidad de la configuración de RuboCop, podemos ignorar aquellas pautas con las que no estemos totalmente de acuerdo, ya que al fin y al cabo, la Guía no pretende ser una imposición sino una serie de recomendaciones para ayudarnos en nuestra labor como desarrolladores Ruby.


Love & Boards!
