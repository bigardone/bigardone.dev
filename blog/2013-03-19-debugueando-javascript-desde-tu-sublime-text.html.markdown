---
title: Debugueando JavaScript desde tu Sublime Text
date: 2013-03-19
tags: code, javascript, sublime text
---

Dos de las herramientas que más uso para trabajar en mi día a día son el editor <a href="http://www.sublimetext.com/">Sublime Text 2</a> y las <a href="https://developers.google.com/chrome-developer-tools/">Chrome Developer Tools</a>. **Sublime Text** poco a poco ha ido ganando puntos para ser mi editor favorito, hasta el punto de ser el único que uso debido a su velocidad, facilidad de uso y la cantidad de extensiones que ya existen y van saliendo para ayudarnos en nuestro trabajo. Así mismo las **Developer Tools** son una herramienta fundamental con la que tenemos que contar ya que nos facilita información acerca de nuestro navegador y cómo interacciona con nuestras aplicaciones, mostrando los elementos que renderizamos en las vistas, estilos, recursos que usamos, peticiones http y un laaaaargo etc además de, como no, debuguear **JavaScript**. Pero... ¿y si pudiéramos usar todo el poder del debuguer de JavaScript de las **Chrome Developer Tools** desde nuestro **Sublime Text**? Pues ahora es posible.

<!--more-->

###Aloha, Sublime Web Inspector (SWI)###
Recientemente he descubierto esta <a href="http://sokolovstas.github.com/SublimeWebInspector/">extensión para Sublime</a>, que funciona por encima del protocolo WebInspectorProtocol, permitiéndonos acceder a las funcionalidades del debuguer de Chrome.

<iframe width="420" height="315" src="http://www.youtube.com/embed/LaH_43N34Jg" frameborder="0" allowfullscreen></iframe>

###Instalación###
Su instalación es muy sencilla, solo tenéis que abrir el Package Manager, y buscar por **Sublime Web Inspector**. Una vez instalado vamos a ver su configuración desde <code>Sublime Text 2 > Preferences > Package settings > Web Inspector > Settings - Default</code>
En este fichero podemos cambiar la ruta donde está nuestro Chrome, en mi caso como uso **Chrome Canary** para desarrollar, lo cambié ahí. También podemos especificar si queremos que nuestro navegador se refresque al iniciar el debuguer, que lo haga también y elimine la caché cada vez que modifiquemos un fichero, si queremos que reemplace los cambios en tiempo real sin necesidad de refrescar el navegador... oh my board!

###Iniciando SWI###
Para lanzarlo, podemos hacerlo de dos maneras:

- Desde el **Command Palette** buscamos **Web Inspector**.
- Ó bien con el atajo de teclado **shift + command + R**.

Con cualquiera de ellas saldrá un opción que dice:

    Start Google Chrome with remote debug port 9222

Esto nos abrirá nuestro Chrome listo para debuguear por el puerto especificado.

###Comenzando a debuguear###
Una vez iniciado, si volvemos a usar el atajo de teclas **shift + command + R**, podremos seleccionar la opción para comenzar a debuguear y a partir de aquí podremos:

- Añadir o quitar **puntos de ruptura** en vuestro código fuente para poder debuguearlo paso por paso.
- Ver todos los mensajes de la **consola**.
- Es muy interactivo, ya que si pinchas en cualquier elemento que esté dentro de un recuadro, te abrirá ese fichero en esa linea o mostrará las propiedades de ese objeto, dependiendo de lo que se trate.
- En cada punto de ruptura, podremos ver toda la **pila de llamadas** y todas las **variables**.
- También podremos **evaluar expresiones** para ver su resultado.
- Uso de **LiveReload** para refrescar nuestro navegador, al no ser que modifiquemos hojas de estilos, con lo que solo estas serán refrescadas en vez de la página entera.

Como podéis ver es una pasada, y hace que Sublime Text sea todavía más completo y potente.

Love & Boards!

