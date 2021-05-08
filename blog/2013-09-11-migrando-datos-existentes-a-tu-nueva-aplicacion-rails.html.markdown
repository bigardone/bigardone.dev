---
title: Migrando datos existentes a tu nueva aplicación Rails
date: 2013-09-11
tags: rails
---
<small style="font-style: italic;">Post originalmente escrito para el blog de <a href=" http://blog.diacode.com/migrando-datos-existentes-a-tu-nueva-aplicacion-rails" target="_blank">Diacode</a>, que dice así:</small>

Algo en lo que todo el equipo de **Diacode** coincidimos es que opinamos que el tener nuestros propios proyectos personales, o **side projects**, fuera de la propia empresa es muy importante. Estos proyectos, en los que solemos trabajar en nuestros ratos libres, son los que alimentan nuestra curiosidad, nos mueven a aprender nuevas tecnologías, mejorar en las que ya conocemos y como resultado, ser mejores profesionales. Esto es tan importante para nosotros que hasta es casi sagrado el dedicarle unas horas semanales a estos proyectos dentro de nuestra jornada laboral, siempre y cuando vayamos bien de tiempo en los proyectos de nuestros clientes (of course) y todos sepamos en qué trabaja cada uno, para poder aprender todos de todos.

En mi caso ando rehaciendo, completamente en **Rails**, una aplicación de facturación un tanto peculiar que desarrollé hace unos años usando **J2EE**. Ya tengo el desarrollo bastante avanzado, así que hace unas semanas decidí que ya era hora de migrar todos los datos de la base de datos antigua, en **MySQL**, a la nueva en **PostgreSQL**. Debido a que no solo he cambiado de tecnologías, sino que también he creado nuevos modelos, modificado algunos existentes y por motivos funcionales necesito realizar algunas acciones especiales en determinados casos, el intentar importar la **base de datos legacy** usando un **dump** directamente no era una opción válida, por eso decidí realizar esta labor usando **Rails** y tareas **Rake**.

<!-- more -->

### Conectando la base de datos *legacy*
Lo primero que tenemos que hacer es crear una conexión a la base de datos legacy. Esto se hace de manera sencilla, como si fuera una conexión más de nuestra aplicación, pero con el adaptador que necesitemos (en mi caso MySQL) y sus datos de conexión:

``` ruby
# config/database.yml

development:
  adapter: postgresql
  database: nueva_development
  host: localhost

legacy:
  adapter: mysql2
  encoding: utf8
  reconnect: true
  database: antigua
  pool: 5
  username: user
  password: pass

```

### Creando los modelos *legacy*
Teniendo la conexión configurada ya podemos empezar a crear los modelos legacy correspondientes, que luego usaremos para crear los datos nuevos. Para hacer esto tenemos que tener en cuenta un par de cosas o tres.

#### Dónde crear las clases
Para que todo funcione perfectamente a la primera podríamos crear las clases dentro del directorio <code>app/models</code>, cada uno en su propio fichero, como los modelos que ya tenemos en nuestra aplicación, pero preferí no hacerlo así, ya que estos modelos legacy solo los iba a usar para la migración de los datos y para nada más. Por eso me creé un fichero en el mismo directorio donde más tarde iba a crear la tarea **Rake**, donde metería todas las definiciones de mis modelos legacy.

``` ruby
# lib/tasks/legacy/legacy_classes.rb

class LegacyClient < ActiveRecord::Base
end

class LegacyContactPerson < ActiveRecord::Base
end

```

No hay que olvidar que para que **Rails** nos permita usar estas clases, tenemos que añadir la ruta en nuestra configuración para que las cargue:

``` ruby
# config/application.rb
...

config.autoload_paths += %W(#{config.root}/lib/tasks/legacy)

...
```

#### Especificar la conexión en nuestros modelos legacy
Ya tenemos nuestros modelos, ahora tenemos que hacer saber a **Rails** cual es la conexión que debe usar para acceder a los datos de estos. Para lograr esto, <code>ActiveRecord</code> nos facilita un método llamado <code>establish_connection</code> en el que podemos especificar que **conexión** queremos que utilice en cada modelo, y que previamente hemos declarado en nuestro <code>database.yml</code>. Así mismo podemos especificarle **el nombre de la tabla**, usando <code>set_table_name</code>

``` ruby
# lib/tasks/legacy/legacy_classes.rb

class LegacyClient < ActiveRecord::Base
  establish_connection :legacy
  set_table_name 'cliente'
end

class LegacyContactPerson < ActiveRecord::Base
  establish_connection :legacy
  set_table_name 'contacto_cliente'
end

```

#### Establecer relaciones entre nuestros modelos legacy
Debido a que las tablas de la antigua aplicación no están generadas de la misma manera que están generadas las de la nueva, ni se usa la misma convención de nombres, claves foráneas y demás, **Rails** no va a poder crear esas asociaciones por si mismo, pero de nuevo nos vuelve a ofrecer herramientas para especificarle qué clases e identificadores se usan para estas relaciones, como <code>class_name</code>, <code>foreign_key</code>, <code>primary_key</code>...

``` ruby
# lib/tasks/legacy/legacy_classes.rb

class LegacyClient < ActiveRecord::Base
  establish_connection :legacy
  set_table_name 'cliente'

  has_many :contact_people, class_name:'LegacyContactPerson', foreign_key: 'id_cliente', primary_key: 'id_cliente'

end

class LegacyContactPerson < ActiveRecord::Base
  establish_connection :legacy
  set_table_name 'contacto_cliente'

  belongs_to :client, class_name: 'LegacyClient', foreign_key: 'id_cliente', primary_key: 'id_cliente'
end

```

###Migrando los datos
Una vez ya tenemos todo configurado y nuestros modelos *legacy* bien definidos, es hora de ponernos manos a la obra y generar la tarea o tareas Rake que se se van a encargar de esto.

    $ rails g task legacy_migrate clients

Pero crear los nuevos datos vamos a tener que tener en cuenta algunas cosas de nuevo:

####Que los errores no paren tu migración
Debido a que seguramente va a ser un proceso lento, no queremos que a la mínima que salte un error se pare toda la migración, por eso vamos a capturar estos errores, mostrándonos la causa y pasando al siguiente registro a importar.

####Atributos protegidos
Al asignar todos los parámetros, vamos a querer saltarnos la protección de escritura de atributos que usemos con <code>attr_accessible</code>, para no tener que luego ir asignándolos uno a uno. Para ello he usado esta manera de <a href="http://railscasts.com/episodes/237-dynamic-attr-accessible" target="_blank" title="#237 Dynamic attr_accessible">declarar los atributos accesibles de manera dinámica</a>, de esta forma podemos hacer que **todos** los atributos se puedan asignar de manera masiva, indicándoselo de esta manera en el modelo:

    model.accessible = :all

####Desactivar el uso de los timestamps automáticos
Si nuestros modelos han sido creados con la opción de <code>timestamps</code>, para guardar la fecha de creación y modificación automáticamente, podemos hacer que **Rails** ignore la creación de estas fechas, desactivándolas usando:

    ActiveRecord::Base.record_timestamps = false

Al final de la migración no debemos olvidar volver a activarla, para que vuelva a funcionar correctamente:

    ActiveRecord::Base.record_timestamps = true

#### Ignorar las validaciones al guardar los datos nuevos
Al haber desarrollado una nueva aplicación puede que modifiquemos las validaciones de los nuevos modelos. Los datos antiguos pueden que no superen estas validaciones, por eso tenemos que asegurarnos que al guardar los nuevos modelos lo hacemos sin ejecutar estas validaciones, pasándole <code>validate: false</code> al método <code>save</code> del modelo, o simplemente <code>false</code>.

    # Se puede usar así...
    model.save(validate: false)

    # ... o también así
    model.save(false)

#### Mantener o no las mismas claves primarias
He aquí otra cuestión interesante a tener en cuenta. Si no queremos complicarnos las vida y usar los mismos valores de las claves primarias en los datos nuevos, tenemos que acordarnos de asignar el <code>id</code> del modelo nuevo, fuera de los métodos <code>new</code>, <code>create</code> o <code>attributes</code>.

    model.id = legacy_model.legacy_model_id
    model.save(false)

En mi caso, quiero saber más adelante qué modelos han sido importados previamente y cuales no, así que con una migración añadí un campo más a todas las tablas nuevas llamado <code>legacy_id</code>, donde guardo el identificador antiguo.

###En resumen
Como veis, importar o migrar los datos de una base de datos *legacy* usando **Rails** es bastante sencillo una vez se tiene configurada la conexión de la base de datos y bien mapeados nuestro modelos antiguos. A continuación os pongo un ejemplo sencillo de cómo hice para importar los clientes y sus personas de contacto:

``` ruby
# lib/tasks/legacy/legacy_migrate.rake

  desc "Migración de clientes"
  task clients: :environment do
    # Requerimos las clases de los modelos legacy
    require "#{Rails.root}/lib/tasks/legacy/legacy_classes"
    # Desactivamos los timestamps
    ActiveRecord::Base.record_timestamps = false

    # Iteramos por todos los cientes legacy
    LegacyClient.all.each do |legacy_client|
      begin
        client = Client.new
        # Permitimos que todos los atributos se puedan asignar masivamente
        client.accessible = :all
        # Asignamos todos los atributos al nuevo modelo
        client.attributes = {
          legacy_id:    legacy_client.id_cliente,
          reference:    legacy_client.ref,
          name:         legacy_client.nombre,
          tic:          legacy_client.cif,
          description:  legacy_client.notas
        }

        # Guardamos el modelo evitando validaciones
        client.save validate: false

        # Iteramos por todas las personas de contacto legacy para crear las nuevas
        legacy_client.contact_people.each do |legacy_contact_person|
          contact_person = client.contact_people.build
          contact_person.accessible = :all
          contact_person.attributes = {
            legacy_id:          legacy_contact_person.id_contacto,
            contact_type:       legacy_contact_person.id_tipo,
            name:               legacy_contact_person.nombre,
            phone:              legacy_contact_person.telefono,
            fax:                legacy_contact_person.fax,
            email:              legacy_contact_person.email,
            comments:           legacy_contact_person.notas
          }

          contact_person.save validate: false
        end
      rescue => e
        puts "Error migrando el cliente #{legacy_client.id_cliente}"
        puts e.backtrace
      end
    end

    # Volvemos a activar los timestamps
    ActiveRecord::Base.record_timestamps = true
  end

```

Espero que os sirva de ayuda algún día.

Love & boards!
