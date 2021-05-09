---
title: Simulando enumeradores en nuestros modelos
date: 2013-05-19
tags: rails, models
---

Es muy común que en nuestros modelos hagamos el uso de <strong>enumeradores</strong> para posteriormente usarlos para asignarle un valor a alguno de sus atributos como su tipo, estado, ó similar. Hace poco he visto una manera <a href="http://rails-bestpractices.com/posts/708-clever-enums-in-rails" target="_blank">muy sencilla</a> de implementar esto y me gustaría compartirla con los que no la conozcáis :)

Supongamos que tenemos en nuestra aplicación tenemos el siguiente modelo:

``` ruby
class SurfBoard < ActiveRecord::Base

  attr_accessible :tipo

end
```

Queremos que el atributo <strong>tipo</strong> defina los distintos tipos de tablas de surf que un usuario va poder seleccionar a la hora de crear una nueva instancia. Además queremos controlar que el valor de <strong>tipo</strong> esté dentro de una lista de valores que nosotros controlemos, ya que dependiendo de ese valor queremos variar la funcionalidad de algunas partes de nuestra aplicación.

<!-- more -->

Lo primero que podríamos hacer sería crear una constante con el array de los valores posibles para este atributo:

``` ruby
class SurfBoard < ActiveRecord::Base

  TIPOS = ['shortboard', 'egg', 'fish', 'funboard', 'malibu', 'gun', 'longboard']

  attr_accessible :tipo

end
```

El problema de esta forma de implementación es que cuando quieras asignar el tipo de la tabla, tienes que hacerlo "manualmente", asignando uno de los valores permitidos a mano en tu código, lo que puede dar a lugar a problemas si no se tiene cuidado a la hora de escribir, provocando datos no consistentes y un funcionamiento no deseado de la aplicación:

``` ruby
surf_board = SurfBoard.new tipo: 'fsih' # Oh my! Me bailado una letra por teclear rápido
```

Para solventar esto, podemos hacer dos cosas muy sencillas. Lo primero va a ser añadir una validación al atributo <strong>tipo</strong>, y lo segundo va a ser usar en <strong>hash</strong> en vez de un simple array para almacenar los valores permitidos:

``` ruby
class SurfBoard < ActiveRecord::Base

  TIPOS = {
    shortboard: 'shortboard',
    egg: 'egg',
    fish: 'fish',
    funboard: 'funboard',
    malibu: 'malibu',
    gun: 'gun',
    longboard: 'longboard'
  }

  attr_accessible :tipo

  validates :tipo, inclusion: {in: TIPOS.values}

end
```

De esta manera ya no vamos a poder asignar por error un valor no permitido al <strong>tipo</strong> de nuestra tabla:

``` ruby
surf_board = SurfBoard.new(tipo: SurfBoard::TIPOS[:fish])
```

Aunque este método es más seguro que el anterior, aún nos obliga a tener volver en nuestro editor a la clase <strong>SurfBoard</strong> para acordarnos de los valores permitidos y también a usar el método <code>Hash.values</code> para usarlo en validaciones, rellenar <strong>selects</strong> en nuestras vistas, etc.

Para optimizarlo aún más, vamos a mezclar ambos casos, usando en vez de un array simple, un array de constantes:


``` ruby
class SurfBoard < ActiveRecord::Base

  TIPOS = [
    TIPO_SHORTBOARD = 'shortboard',
    TIPO_EGG = 'egg',
    TIPO_FISH = 'fish',
    TIPO_FUNBOARD = 'funboard',
    TIPO_MALIBU = 'malibu',
    TIPO_GUN = 'gun',
    TIPO_LONGBOARD = 'longboard'
  ]

  attr_accessible :tipo

  validates :tipo, inclusion: {in: TIPOS}

end
```

Ahora para asignar un tipo a nuestra tabla solo tenemos que hacer refencia a la constante de su tipo:

``` ruby
surf_board = SurfBoard.new tipo: SurfBoard::TIPO_FISH
```

Además ya no tenemos que usar el método <code>Hash#values</code> y a la hora de programar si nuestro editor soporta auto completado nos listará todos los tipos para que seleccionemos uno, en vez de tener que abrir nuestra clase <strong>SurfBoard</strong> para ver que valores puede aceptar.

¿Qué os parece este approach? ¿Alguien conoce alguna otra implementación que le guste más?
