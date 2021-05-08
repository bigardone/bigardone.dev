---
title: Un primer vistazo a Rails 4.1
date: 2013-12-19
tags: ruby, rails
---

Este año parace que Santa Claus se ha adelantado y nos ha traido esta semana la versión *beta* de **Rails 4.1**. Esta nueva versión me ha llamado especialmente la atención ya que han incorporado dentro del *core* del propio **Rails** varias funcionalidades y elementos que normalmente suelo usar a diario trabajando, y de los cuales además ya he escrito anteriormente en este blog.

<!-- more -->

### Enumeradores para Active Record	
<a href="http://codeloveandboards.com/blog/2013/05/19/simulando-enumeradores-en-nuestros-modelos" target="_blank">Simular enumeradores</a> en los modelos es algo que hago desde que empecé a desarrollar en **Rails** para poder luego asignárselos a campos de estado o de tipo. 


```ruby
class SurfBoard < ActiveRecord::Base
  TIPOS = [
    TIPO_SHORTBOARD = 'shortboard',
    TIPO_FUNBOARD = 'funboard',
    TIPO_LONGBOARD = 'longboard'
  ]

  validates :tipo, inclusion: {in: TIPOS}

  TIPOS.each do |tipo|
    define_method "#{tipo}?" do
      self.tipo == tipo
    end
  end
end
```

Ahora ya no es necesario hacerlo de esta manera, ya que una de las nuevas mejoras que trae esta nueva versión de **Rails** es la inclusión de su propia versión de esta funcionalidad:

```ruby
class SurfBoard < ActiveRecord::Base
  enum tipo: [ :shortboard, :funboard, :longboard ]
end
```

Simplemente añadiendo el nuevo *enum*  podríamos hacer lo siguiente:

```ruby
board.tipo = :shortboard 	# Asignamos el tipo a shortboard
board.tipo					# Nos devolvería el tipo asignado
board.funboard!			# Haría un update! del modelo asignándole ese tipo
board.longboard?			# Comprobaría si el tipo es :longboard
SurfBoard.shortboard		# Scope que devolvería todos los registros con el tipo :shortboard
```

Muy útil verdad? Pero no es oro todo lo que reluce, ya que existen algunas cosas a tener en cuenta al usarlos debido a que es una versión *beta* y que seguro mejoran en la versión final:

- Están implementados con *integer*, por lo que al crearlos no demos cambiar su orden, y a que podríamos corromper los datos ya creados.
- No podemos usar los mismos símbolos para diferentes *enums* dentro del mismo modelo.
- Si queremos sobrescribir los *scopes* debemos pasarle a las condiciones de este el valor numérico en vez del símbolo.
- Todavía no soporta los métodos de *dirty tracking* para poder preguntar cual era el valor anterior del campo antes de ser modificado.

Para más información podéis visitar su [documentación](http://edgeapi.rubyonrails.org/classes/ActiveRecord/Enum.html).

### Vistas previas para Action Mailer
Hacer el diseño de las vistas de los *mailers* algo más sencillo es algo sobre lo que también he escrito en <a href="http://codeloveandboards.com/blog/2013/01/30/probando-tus-emails-desde-tu-entorno-de-desarrollo-en-ruby-on-rails/" target="_blank">otro post</a> y que siempre hago gracias a la gema <a href="https://github.com/37signals/mail_view" target="_blank" title="mail_view">mail_view</a>. Si no la conocíais de antes y sufríais diseñando vuestros emails teniendo que desarrollar la plantilla, luego enviando un email para ver el resultado y realizar cambios en la plantilla y repetir el proceso una y otra vez, vuestro calvario ha terminado, ya que han añadido **mail_view** por defecto para que podamos tener vistas previas de todos nuestros *mailers* desde nuestro navegador.

Estas vistas previas disponibles las podremos ver en:

	http://localhost:3000/rails/mailers

Y por defecto se crearán bajo la siguiente ruta:

	test/mailers/previews
	
Esta ruta la podremos configurar usando el parámetro de configuración `config.action_mailer.preview_path`.

### Spring
Esas largas esperas para lanzar todos nuestros *tests* o para lanzar tareas *rake*  y *migraciones* han llegado a su fin. Ahora el sistema de pre carga de aplicaciones <a href="https://github.com/jonleighton/spring" target="_blank">Spring</a> viene también incluido por defecto. Esto significa que nuestra aplicación siempre estará corriendo en segundo plano, evitando así tener que cargarse cada vez que queríamos ejecutar tareas que forman parte de nuestro trabajo diario, y ahorrándonos mucho tiempo que antes perdíamos teniendo que cargar la aplicación con cada comando.

Para poder aprovechar esta mejora, tendremos a nuestra disposición los comandos `bin/rake` y `bin/rails` creados automáticamente para nosotros usando los *bintstubs* de **Spring**.

### Action Pack Variants
Ahora el poder servir contenido específico para cada tipo de dispositivo que los usuarios usen para acceder a nuestra aplicación es un poco mas fácil gracias a los *Action Pack Variants*. 

Para ver lo sencillo que es, veamos el siguiente ejemplo:

```ruby
class ApplicationController < ActionController::Base
  before_action :detect_device

  private

    def detect_device
      case request.user_agent
      when /iPad/i
        request.variant = :tablet
      when /iPhone/i
        request.variant = :phone
      end
    end
end

class SurfBoardsController < ApplicationController
  def show
    @surf_board = SurfBoard params[:id]

    respond_to do |format|
      format.json
      format.html               # /app/views/surf_boards/show.html.erb
      format.html.tablet        # /app/views/surf_boards/show.html+tablet.erb
      format.html.phone{ redirect_to progress_path } 
    end
  end
end
```
Como podemos ver, lo primero que hacemos en el controller es asignar el *variant* que queremos simplemente comparando el valor de la cabecera HTTP *User-Agent* con los posibles valores que necesitemos. Gracias a esto, podremos servir diferentes vistas y realizar cierta funcionalidad dependiendo del *variant* anteriormente asignado. Pero esto no se limita solamente a dispositivos y a la cabecera *User-Agent*, ya que podríamos hacer exactamente lo mismo con los variants para, por ejemplo, contenido dependiente de subdominios específicos, variables de sesión, etc…

### Verificadores de mensajes
Con este mecanismo podremos verificar mensajes firmados previamente por nuestra aplicación usando el `secret_key_base`  de nuestra aplicación el nombre del verificador del mensaje que vamos a utilizar:

```ruby
signed_token = Rails.application.message_verifier(:remember_me).generate(token)
Rails.application.message_verifier(:remember_me).verify(signed_token) # => token
 
Rails.application.message_verifier(:remember_me).verify(tampered_token)
# lanza ActiveSupport::MessageVerifier::InvalidSignature
```

En este ejemplo generaremos un token firmado usando en verificador `:remember_me` con el que luego podremos comprobar si ese *token* es correcto al volver a recibirlo de nuevo, lanzando un error si el *token* no fuese verificado correctamente.

### Y mucho más
Esto es solo un pequeño avance de todo lo nuevo que vamos poder disfrutar en la próxima versión de **Rails 4.1**, pero hay muchas más *features* y mejoras a <a href="http://edgeguides.rubyonrails.org/4_1_release_notes.html" target="_blank">tener en cuenta</a> y que nos hará aún más divertido desarrollar con nuestro framework favorito :)

Happy coding!
