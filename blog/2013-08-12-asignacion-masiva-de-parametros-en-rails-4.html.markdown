---
title: Asignación masiva de parámetros en Rails 4
date: 2013-08-12
tags: code, rails
---

<small style="font-style: italic;">Post originalmente escrito para el blog de <a href=" http://blog.diacode.com/asignacion-masiva-de-parametros-en-rails-4" target="_blank">Diacode</a>, que dice así:</small>

La semana pasada fue movidita en **Diacode**. Uno de nuestros clientes en San Francisco nos propuso que le desarrollasemos un <a href="http://es.wikipedia.org/wiki/Producto_viable_m%C3%ADnimo" target="_blank">MVP</a> para una nueva idea de negocio que tenía en mente. Se trataba de un pequeño **ecommerce** donde iba a poner a la venta una serie de productos nuevos, y teníamos que hacer el diseño, logo, envío de notificaciones por correo, gestión de stock, pedidos, etc y todo esto tan solo en 3 días.
Para desarrollar algo así de rápido, poder ofrecerle resultados visibles al cliente desde el primer momento sobre la evolución de nuestro trabajo, y permitirnos reaccionar de manera ágil y flexible a los cambios que nos sugería cada vez que recibíamos feedback suyo, optamos por usar **Rails 4**, ya que además nos vendría bien para poder probar alguna de las funcionalidades nuevas con respecto a la versión anterior.

Una de las cosas que más me gusta controlar a la hora de programar es que un usuario no pueda enviar peticiones a la aplicación con datos que **no deberían ir en esa petición**, y justo en la nueva versión de Rails han añadido un mecanismo para poder controlar esto. Veamos un ejemplo muy sencillo:

<!-- more -->

### El ejemplo más sencillo ###

Supongamos que tenemos este modelo **Usuario** en nuestra aplicación:

``` ruby
# app/models/user.rb

# == Schema Information
#
# Table name: users
#
#  id                     :integer          not null, primary key
#  email                  :string(255)      default(""), not null
#  name                   :string(255)
#  is_admin               :boolean          default(false), Especifica si el usuario tiene privilegios de administrador o no
#  ...

class User < ActiveRecord::Base

  ...

end

```

Es un modelo muy sencillo, con su email, su nombre y un campo para determinar si el usuario **tiene privilegios de administrador o no**. Para permitir la creación de nuevos usuarios, podríamos presentarle al usuario un **formulario** tal que así:

``` html

<form method="post" action="/users">
  <input type="text" name="user[email]" />
  <input type="text" name="user[name]" />
  <input type="submit" />
</form>

```

Y en nuestro **controller** solo tendríamos que crear el nuevo **User** con los parámetros recibidos del formulario:

``` ruby

# app/controllers/users_controller.rb

...

def create
  @user = User.create params[:user]
end

...

```

A simple vista esto parece que puede funcionar bien, y de hecho lo hace. El usuario podría darse de alta, y gracias al esquema de nuestra base de datos, no tendría activo el campo **is_admin**, con lo que según la lógica de este ejemplo no tendría privilegios de administrador. Pero en realidad este ejemplo **no es nada seguro**, ya que un usuario un poco avispado podría colarse como administrador simplemente cambiando el formulario un poco:

``` html

<form method="post" action="/users">
  <input type="text" name="user[email]" />
  <input type="text" name="user[name]" />

  <input type="hidden" name="user[is_admin]" value="true" /> <!-- Campo añadido con el inspeccionador web del navegador -->

  <input type="submit" />
</form>

```

Una vez el usuario ha añadido ese campo, se añadiría a los atributos del nuevo **Usuario** a crear, con lo que se auto asignaría esos privelegios que no queremos que tenga de ninguna de las maneras. ¿Qué mecanismos tenemos para evitar esto?


### Atributos accesibles y atributos protegidos ###

Para evitar esto, **Rails 3** implementó un sistema para marcar los atributos de un modelo de tal manera que pudieran ser asignados de manera masiva o no. Esto se realiza a través de dos métodos, uno llamado **attr_accessible** donde se listan los atributos que **si** pueden ser asignados de manera masiva, y otro llamadao **attr_protected** que hace lo contrario, marcar atributos para evitar ser asignados de manera masiva.

``` ruby
# app/models/user.rb

# == Schema Information
#
# Table name: users
#
#  id                     :integer          not null, primary key
#  email                  :string(255)      default(""), not null
#  name                   :string(255)
#  is_admin               :boolean          default(false), Especifica si el usuario tiene privilegios de administrador o no
#  ...

class User < ActiveRecord::Base
  attr_accessible :email, :name

  ...

end

```

Ahora ya tenemos protegido a nuestro modelo de tal manera que si se le asignase de manera masiva otro parámetro que no estuviera incluido en la lista de **attr_accessible**, sería ignorado.

En un principio parece que ya está solucionado y podría ser cierto, pero este es un ejemplo muy sencillo y lo malo de usar **attr_accessible** y **attr_protected** era que la responsabilidad de que funcionase correctamente racaía directamente sobre el desarrollador y que **decidiese o se acordase** de marcar todos los **atributos importantes como accesibles**. Y reconozcámoslo, todos cometemos errores tarde o temprano, y olvidarse añadir un atributo con **attr_accesible** puede ser más común de lo que uno cree.

### Egor Homakov, su hack a GitHub y el cambio en Rails###

Uno de los ejemplos más conocidos sobre alguien que explotó esta debilidad en la seguridad de Rails, fué <a href="http://homakov.blogspot.com.es/" target="_blank" title="Egor Homakov">Egor Homakov</a>, quien analizando y haciendo conjeturas sobre **GitHub** y la estructura de su base de datos, fué capaz de añadir su clave pública al repositorio de Rails **y conseguir permisos para poder hacer commits**. Entonces se decidió hacer **attr_accessible** seguro siempre, y no permitir añadir **ningún** parámetro de manera masiva al no ser que fuera especificado de esa manera previamente.

Esto ha desatado otra polémica. **¿Dónde se debería controlar qué atributos son permitidos y qué no?** ¿En el modelo o en el controlador? Por un lado, y estando acostumbrados a ello, el sitio más lógico sería en el propio modelo, pero ¿qué pasa con esos atributos que podrían ser asignados dependiendo de un estado concreto del sistema ajeno al propio modelo? Imaginad, por ejemplo, que en nuestro caso quisiéramos que un usuario administrador pudiera asignar de manera masiva ese campo para crear otros usuarios administradores... para estos casos, lo más lógico sería que esto se hiciera en el controlador, ya que es el sitio que parece más óptimo para controlar si un usuario conectado puedo tener privilegios para hacer eso o no.

### Rails 4 y strong parameters ###

Con la llegada de la última versión, el equipo de Rails ha decido que el responsable de marcar qué atributos son permitidos para la asignación masiva tiene que ser el **controller**, prohibiendo de manera predeterminada la asignación directa de parámetros. Esto se consigue usando la gema <a href="https://github.com/rails/strong_parameters" title="Strong paramaters" target="_blank">strong_parameters</a>, la cual han añadido al propio core de Rails 4. Para usarla en nuestro ejemplo, sería muy sencillo, solo tenemos que eliminar el método **attr_accessible** de nuestro modelo:

``` ruby
# app/models/user.rb

# == Schema Information
#
# Table name: users
#
#  id                     :integer          not null, primary key
#  email                  :string(255)      default(""), not null
#  name                   :string(255)
#  is_admin               :boolean          default(false), Especifica si el usuario tiene privilegios de administrador o no
#  ...

class User < ActiveRecord::Base

  ...

end

```

Y en nuestro **controller** simplemente especificar qué parámetros son permitidos:


``` ruby

# app/controllers/users_controller.rb

...

def create
  # De esta manera tendríamos un ActiveModel::ForbiddenAttributes
  # @user = User.create(params[:user])

  # Manera correcta ahora:
  @user = User.create(user_params)
end

...

private

def user_params
  # Aquí podríamos añadir lógica para aceptar
  # unos parámetros u otros dependiendo del tipo de usuario
  params.require(:user).permit(:email, :name)
end

...

```

De esta manera, le estamos diciendo que dentro de los parámetros, y mas concretamente dentro de los que estén bajo la clave <code>:user</code>, están permitidos los que se llamen email y name. Si se le asignase cualquier otro parámetro, dependiendo de nuestra configuración, podríamos hacer que saliese por el **log** o que lanzase una **excepción**. En el caso de que nos olvidemos de usar este método, Rails nos lanzaría un <code>ActiveModel::ForbiddenAttributes</code> recordándonos que estamos asignando directamente parámetros de manera masiva, con el peligro que esto conlleva.

A mi personalmente, aunque se me ha hecho un poco raro al principio, me ha gustado esta nueva manera de enfocar la asignación de parámetros... ¿y a vosotros qué os ha parecido?

Love & boards!



