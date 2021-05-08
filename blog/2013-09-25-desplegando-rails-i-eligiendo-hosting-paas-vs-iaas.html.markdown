---
title: "Desplegando Rails I: Eligiendo hosting (PaaS vs IaaS)"
date: 2013-09-25
tags: rails, deploying
---
<small style="font-style: italic;">Post originalmente escrito para el blog de <a href=" http://blog.diacode.com/desplegando-rails-i-eligiendo-hosting-paas-vs-iaa" target="_blank">Diacode</a>, que dice así:</small>

En **Diacode** nos gusta que nuestros clientes formen parte del desarrollo de los proyectos desde el primer momento y de una manera activa. Por eso siempre que podemos los desplegamos lo antes posible en un servidor accesible para ellos, y así puedan ver como evoluciona su desarrollo y colaboren con su *feedback*.

Esto nos ha llevado a probar diferentes servicios de *hosting*. No voy a meterme a detallar todos y cada uno de ellos, ni a compararlos entre ellos porque la lista de opciones es muy extensa y cada uno tiene sus cosas buenas y las no tan buenas. Lo que si que haré será escribir una serie de posts donde os detallaré las dos opciones que más nos han gustado y explicaré como desplegar una aplicación **Ruby on Rails** en cada una de ellas, siendo este el primero de esta serie de posts.

Volviendo a tema principal, después de probar diferentes opciones de servicios, particularmente nos han gustado mucho dos servicios completamente diferentes el uno del otro. 

<!-- more -->

### Dos tipos de servicio de hosting diferentes.
A la hora de elegir cómo y dónde queremos desplegar nuestras aplicaciones lo primero que tenemos que tener en cuenta es qué que queremos exactamente.
¿Queremos usar un servicio sencillo donde crear el *servidor*, la base de datos, y añadirle más recursos es tan sencillo como hacer *click* desde un panel de administración del proveedor? O por lo contrario, ¿Queremos tener control total sobre el sistema operativo, configuración del servidor, procesos que corren en segundo plano, base de datos, poder instalar software adicional, etc?
Teniendo nuestra estrategia bien clara y definida, entre la gran variedad de opciones, podemos encontrar dos tipos de servicios ganadores que se ajustan a la perfección a cada uno de los casos.

### PaaS, la plataforma como servicio.
**PaaS**, o <a href="http://es.wikipedia.org/wiki/Plataforma_como_servicio#Plataforma_como_servicio" target="_blank">Platform as a service</a>, es un tipo de **servicio en la nube** que consiste en ofrecer al cliente una plataforma donde poder **desarrollar o desplegar** su software, encargándose el proveedor de todo lo referente a los servidores, conectividad, el almacenamiento, las bases de datos y demás servicios. Es decir, nosotros como clientes solo nos tenemos que preocupar de desarrollar y desplegar nuestra aplicación, que ellos **se encargan de todo lo demás**, haciendo esta parte completamente transparente para nosotros y así centrarnos en lo que realmente sabemos hacer bien.

<a href="https://www.heroku.com/" target="_blank"><img src="/images/blog/heroku-logo.png" alt="Heroku" style="background: #fff;" /></a>

Entre las muchas opciones que hay de este tipo, probablemente las más conocida y la que nosotros usamos es **Heroku**. Algunas de las razones de las que nos han llevado a usarlo son:

- Tiene un plan gratuito, algo limitado, pero lo suficiente para empezar.
- Desplegar es tan sencillo como añadir un repositorio remoto a tu proyecto y realizar un *push* a él.
- En cualquier momento puedes añadirle más o menos recursos usando su interfaz web o desde la linea de comandos de tu consola (siempre que estés dispuesto a pagar por ello).
- Tiene gran variedad de *addons* para integrarse con otros servicios de terceros como envío de *emails*, analíticas, motores de búsqueda, etc.

### IaaS o cloud server, servidores virtuales en la nube.
**IaaS**, o <a href="http://en.wikipedia.org/wiki/Infrastructure_as_a_service#Infrastructure_as_a_service_.28IaaS.29" target="_blank">Infrastructure as a service</a> es el modelo más básico de **servicio en la nube**, donde el proveedor ofrece al cliente la máquina o **VPS** (máquina virtual), encargándose únicamente de la conectividad, almacenamiento y otros recursos referentes a tecnología de virtualización. Nosotros, como clientes, disponemos de un panel de control desde donde poder solicitar y aplicar más recursos a nuestros servidores, y tenemos control total sobre la máquina virtual, su sistema operativo, lo que que queramos instalar en cuanto a servidores y motores de bases de datos, los procesos que corren en segundo plano, copias de seguridad, etc. La desventaja ya la imagináis, que tenemos que tener un mínimo de nociones sobre administración de sistemas y esto nos puede traer más de un quebradero de cabeza.

<a href="https://www.digitalocean.com/?refcode=97511b3695c6" target="_blank"><img src="/images/blog/digital-ocean-logo.png" alt="Heroku" style="background: #fff;"/></a>

También existen diversas opciones para este tipo de servicio, pero hay uno que ha llamado recientemente nuestra atención debido a su facilidad de uso, precio y rendimiento. Su nombre es**Digital Ocean** y está pegando muy fuerte ya que:

- Su precio es muy bueno. Por 5$ al mes puedes tener un *droplet* (asi denominan sus instancias de VPS) con 512 RAM, 1 TB de transferencia y 20GB de disco duro **SSD**.
- Aunque la memoria parece poca, al tener disco duro **SSD** puedes "incrementarla" configurando a tu gusto el *swap*. Por no hablar de la velocidad de lectura y escritura.
- Todo lo relacionado con la administración de tus *droplets*, DNS, copias de seguridad, etc, se hace desde un panel de control simple, funcional y cuidadosamente bien diseñado. 
- Hacer algo bueno, bonito y barato es posible, y **Digital Ocean** lo ha demostrado.

### En resumen.
Como os comentaba al principio del post, ambos servicios son totalmente diferentes con sus cosas buenas y malas, pero ninguno es mejor o peor que el otro. Para empezar **Heroku** está muy bien, así que estad atentos a nuestro blog, ya que la semana que viene veremos cómo registrarnos, empezar a usarlo y desplegar nuestra primera aplicación en él. 

Happy coding!




