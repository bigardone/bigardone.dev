---
title: Peticiones HTTP de manera sencilla con Faraday
date: 2013-07-24
tags: code, rails
---

<small style="font-style: italic;">Post originalmente escrito para el blog de <a href=" http://blog.diacode.com/peticiones-http-de-manera-sencilla-con-faraday" target="_blank">Diacode</a>, que dice así:</small>

Una de las cosas que más me gusta de trabajar en **Diacode** es la diversidad y originalidad de los proyectos que estamos desarrollando. Esta semana he estado ayudando a añadir nuevas funcionalidades a uno de estos proyectos, que es una aplicación muy chula para que uno de nuestros clientes pueda gestionar todas las fotografías de sus actos públicos, eventos, convenciones y demás. No solo le permite añadir las fotografías y organizarlas en galerías, sino que además le permite introducir o modificar la información de los metadatos <a href="http://es.wikipedia.org/wiki/Exchangeable_image_file_format" target="blank" title="Exchangeable image file format">Exif</a>, etiquetar a la gente que aparece en ellas, etc.

<!-- more -->

Una de estas nuevas funcionalidades que nos ha pedido el cliente es la de poder publicar una o varias fotografías en alguna galería de imágenes de su sitio web, eligiéndola el usuario previamente. Para ello el cliente nos ha pasado la especificación de un **API** muy sencillo que ha creado específicamente para esto, que básicamente consta de dos acciones:

- Listar las galerías existentes en su sitio, con la posibilidad de poder filtrar por el título.
- Enviar la url de la imagen que queremos publicar en la galería seleccionada.

Sabiendo ya la especificación del API me puse manos a la obra, para crear un cliente sencillo con el que consumir el mismo.

### Faraday, nuestro nuevo amigo ###

Tras investigar un poco, encontré <a href="https://github.com/lostisland/faraday" target="_blank" title="Simple, but flexible HTTP client library, with support for multiple backends.">esta fantástica gema</a>, que como describe su autor, es un **cliente HTTP** sencillo pero flexible con soporte para múltiples backends. Vamos, que es una librería que nos facilita muchísimo la manera de enviar peticiones y recibir las respuestas a estas, haciendo toda la parte complicada de la comunicación completamente transparente para nosotros.

Para instalarla solo tenemos que añadirla a nuestro <code>Gemfile</code> y ejecutar el consiguiente <code>bundle install</code>:

    gem "faraday"             # Gema de Faraday
    gem "faraday_middleware"  # Gema de middlewares para Faraday

A continuación creé una nueva clase para mi cliente que es la que se va encargar de comunicarse con el API, y asi poder usarla desde los controllers que lo necesiten. Pero en vez de simplemente poneros el código de esa clase, mejor voy a ir directamente al grano y explicaros como he usado **Faraday**

#### 1. Creando la conexión ####

Lo primero que tenemos que hacer es especificar los parámetros de conexión para que la cree por nosotros:

``` ruby

conn = Faraday.new(url: 'https://url.del.api') do |faraday|
  faraday.response :logger                  # Loggea las respuestas por STDOUT
  faraday.request :json                     # Peticiones en JSON
  faraday.use Faraday::Adapter::NetHttp     # Que use el adaptador por defecto (NetHTTP)
  faraday.use FaradayMiddleware::ParseJson  # Middleware para parsear las respuestas a JSON
end


```

#### 2. Creando la petición para listar las galerías ####

Una vez tenemos nuestra conexión configurada, vamos a crear la primera petición:

``` ruby

response = conn.post do |req|                         # Especificamos que es por método POST
  req.url '/api/get-galleries'                        # Url de esta petición
  req.headers['Content-Type'] = 'application/json'    # Cabecera para especificar que es JSON

  # Creamos el cuerpo del mensaje, según la especificación del API
  request_body = {
    'api-key' => 'ClaveDelApi',
    data: {
      keyword: 'Gallery',
      page: 1,
      limit: 20
    }
  }
  req.body = request_body                             # Le asignamos el cuerpo del mensaje a la petición
end

```

Si todo va bien, lo que tendremos en <code>response</code> es la respuesta, con su **código de estado**, sus **cabeceras** y lo que nos más nos interesa, su **cuerpo** (<code>response.body</code>), con la respuesta del API, parseada a JSON automáticamente para nosotros:

    {
        "errors": [],
        "success": 1,
        "data": [{
            "id": 1,
            "title": "Gallery 1"
        }, {
            "id": 2,
            "title": "Gallery 2"
        }, {
            "id": 3,
            "title": "Gallery 3"
        }]
    }

#### 3. Creando la petición publicar una foto en una galería ####

Una vez el usuario ha seleccionado la foto que quiere publicar, y le hemos mostrado la lista de galerías disponibles gracias a la petición anterior y ha seleccionado una, vamos a mandar la petición para que sea publicada:

``` ruby
photo = Photo.find params[:photo_id]
gallery_id = params[:gallery_id]

response = conn.post do |req|                         # Especificamos que es por método POST
  req.url '/api/post-photo'                           # Url de esta petición
  req.headers['Content-Type'] = 'application/json'    # Cabecera para especificar que es JSON

  # Creamos el cuerpo del mensaje, según la especificación del API
  request_body = {
    'api-key' => 'ClaveDelApi',
    data: {
      title: photo.title,
      photo: photo.image.url(:web),
      gallery: gallery_id
    }
  }
  req.body = request_body                             # Le asignamos el cuerpo del mensaje a la petición
end

```

Igual que antes, en nuestro <code>response.body</code> podemos ver que la imagen ha sido publicada correctamente:

    {
        "errors": [],
        "success": 1,
        "data": {
            "mime": "image\/jpeg",
            "photo": "asd7as6da7s86d87as6d786asd.jpg"
        }
    }

### Gran flexibilidad ###

Ya habéis visto lo sencillo que ha sido comunicarnos con el API de nuestro cliente, pero lo mejor de todo es que **Faraday** nos permite una gran flexibilidad gracias al uso de middleware. En resumen esto no son unas que unas clases que se encargan de procesar las peticiones y las respuestas, aportándonos nueva funcionalidad completamente transparante para nosotros como **codificar las peticiones**, usar protocolos de autorización como **OAuth**, usar **adaptadores HTTP** diferentes, **parsear las respuestas** automáticamente, control de **errores**, manejar **redireccionamientos** y mucho más que podéis encontrar en el el sitio de la gema <a href="https://github.com/lostisland/faraday_middleware" target="_blank" title="Various Faraday middlewares for Faraday-based API wrappers">faraday_middleware</a>, o incluso podéis crear los vuestros propios.

Si no conocíais **Faraday** echadle un ojo y probadlo, os gustará seguro, porque os va a simplificar mucho la labor de tener que lidiar con APIS externas.






