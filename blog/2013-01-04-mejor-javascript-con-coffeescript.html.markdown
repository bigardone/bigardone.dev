---
title: Mejor JavaScript con CoffeeScript
date: 2013-01-04
tags: code, coffeescript, javascript
---

Siguiendo con mi último post acerca de como ser más productivo y escribir mejores hojas de estilo con <a title="Mejores hojas de estilo con Sass" href="http://codeloveandboards.wordpress.com/2012/12/17/mejores-hojas-de-estilo-con-sass/">SASS</a>, este nuevo post no podría ir de otra cosa que no fuera acerca de <a title="CoffeeScript" href="http://coffeescript.org" target="_blank">CoffeeScript</a>, que viene a ser a JavaScript lo que es SASS a las hojas de estilo, es decir, un lenguaje sencillo que se compila en JavaScript usando una sintaxis muy sencilla y aportando nueva funcionalidad muy útil.

<!--more-->
<h3>Sintaxis</h3>
Lo que más me ha gustado desde que llevo usándolo es su sintaxis abreviada. Es como escribir JavaScript, pero omitiendo llaves, puntos y coma, paréntesis, indentación para bloques de código, etc. Lo que hace que programar sea muy rápido y directo al grano. Si estáis acostumbrados a la sintaxis de Ruby, por ejemplo, encontrareis muchas similitudes entre ambos.

```coffeescript
# script.coffee
a = [1..10]
b = 2
$ -&gt;
  for i in a
  console.log i + b
```

```coffeescript
/* script.js */
var a, b;
a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
b = 2;
$(function() {
  var i, _i, _len, _results;
  for (_i = 0, _len = a.length; _i &lt; _len; _i++) {
    i = a[_i];
    console.log(i + b);
  }
});
```

<h3>JavaScript seguro</h3>
Otra cosa que me ha gustado mucho es que el código generado es muy seguro. CoffeeScript siempre hará todo lo posible por compilar buen código JavaScript, teniendo siempre en cuenta el scope de tus scripts, previniendo colisiones de nombres, declarando automáticamente variables y demás. Si no estás acostumbrado a escribir JS seguro, no tienes que preocuparte, porque el se encarga de todo el trabajo sucio, dejándote a ti lo divertido.

<h3>Uso de clases</h3>
Otra aportación de CoffeeScript es el uso de clases, del cual carece JavaScript de manera nativa. El se encarga de crear todo el prototipado necesario por ti.

```coffeescript
# script.coffee
class SurfBoard
  constructor: (@type) -&gt;
  description: -&gt;
    console.log "This surfboard is a #{@type}"
```

```coffeescript
/* script.js */
var SurfBoard;
SurfBoard = (function() {
  function SurfBoard(type) {
    this.type = type;
  }
  SurfBoard.prototype.description = function() {
    console.log("This surfboard is a " + this.type);
  };
  return SurfBoard;
})();
```

<h3>Interpolación de cadenas</h3>
Ahora concatenar valores de variables a cadenas es mucho más sencillo con el uso de la expresión <strong>#{}</strong> en una cadena con comillas dobles, en vez de tener que hacerlo con el uso de <strong>+</strong>.

```coffeescript
# script.coffee
$ -&gt;
 name = "Ricardo"
 console.log "Hi! My name is #{name}"
```

```coffeescript
/* script-js */
$(function() {
 var name;
 name = "Ricardo";
 console.log("Hi! My name is " + name);
});
```

<h3>Expresiones condicionales</h3>
Otra característica que uso bastante es el uso de estas expresiones para expresiones de una solo linea, y consiste en pone la condición al final de la expresión usando <strong>if</strong> o <strong>unless</strong>.

```coffeescript
# script.coffee
$ -&gt;
  name = "Ricardo"
  console.log "Hi! My name is #{name}" if name == 'Ricardo'
```

```coffeescript
/* script-js */
var name;
name = "Ricardo";
if (name === "Ricardo") {
    return console.log("Hi! My name is " + name);
  }
});
```

<h3>Operadores</h3>
En CoffeeScript al usar los operadores <strong>==</strong> y <strong>!=</strong>, automáticamente los traducirá por <strong>===</strong> y por <strong>!==</strong>, evaluando así de manera más segura evitando conversiones no deseadas. También existe el operador existencial <strong>?</strong> que evalúa si algo es indefinido o nulo.

```coffeescript
# script.coffee
if quiver?
  quiver.push
  type: 'Retro twin fish'
  color: 'White'
```

```coffeescript
/* script.js */
if (typeof quiver !== "undefined" &amp;&amp; quiver !== null) {
  quiver.push({
    type: 'Retro twin fish',
    color: 'White'
  });
}
```

<h3>Bucles y comprensiones</h3>
CoffeeScript también te ayuda manejar de manera más sencilla y moderna las iteraciones en arrays, y gracias a las comprensiones de listas, se pueden hacer cosas muy potentes en una sola linea de código.

```coffeescript
# script.coffee
surfBoards = [
 name: "Longboard"
 fins: 1
,
 name: "Retro fish"
 fins: 2
,
 name: "Thruster"
 fins: 3
,
 name: "Quad"
 fins: 4
]
console.log "A #{board.name} has more than 2 fins" for board in surfBoards when board.fins &gt; 2
```

```coffeescript
/* script.js */
var board, surfBoards, _i, _len;
surfBoards = [
  {
   name: "Longboard",
   fins: 1
  }, {
   name: "Retro fish",
   fins: 2
  }, {
   name: "Thruster",
   fins: 3
  }, {
   name: "Quad",
   fins: 4
  }
];
for (_i = 0, _len = surfBoards.length; _i &lt; _len; _i++) {
  board = surfBoards[_i];
  if (board.fins &gt; 2) {
    console.log("A " + board.name + " has more than 2 fins");
  }
}
```

<h3>En resumen</h3>
La verdad es que desde el día que empecé a utilizarlo no he parado de hacerlo y cada día me gusta más. En cuanto cambias el chip y le pillas el truco a la sintaxis y a todas estas mejoras que aporta, no hay excusa para no escribir JavaScript mejor, más seguro y legible. A continuación os pongo algunos links que me han ayudado:
<ul>
	<li><a style="line-height:13px;" title="coffeescript.org" href="http://coffeescript.org" target="_blank">http://coffeescript.org</a><span style="line-height:13px;"> - Sitio oficial de CoffeeScript, donde está toda la documentación además de una consola virtual donde se puede escribir lo que se quiera en CoffeeScript y te lo compila automáticamente a JavaScript</span></li>
	<li><a title="Code School - CoffeeScript" href="http://coffeescript.codeschool.com" target="_blank">http://coffeescript.codeschool.com</a> - Tutorial muy bueno de la mano de Code School, donde aprender a base de ejemplos.</li>
	<li><a title="The Little Book on CoffeeScript" href="http://arcturo.github.com/library/coffeescript/index.html" target="_blank">The Little Book on CoffeeScript</a> - Mini libro de CoffeeScript muy sencillo y directo al grano.</li>
	<li><a title="CoffeeScript Cookbook" href="http://coffeescriptcookbook.com" target="_blank">CoffeeScript Cookbook</a> - Recetas de la comunidad para la comunidad, que dan solución a un montón de problemas comunes.</li>
	<li><a title="JS 2 Coffee" href="http://js2coffee.org" target="_blank">http://js2coffee.org</a> - Compilador online de JS a Coffee y viceversa... muy útil cuando quieres optimizar tu propio Coffee comparándolo con el que este sitio te compila.</li>
</ul>
