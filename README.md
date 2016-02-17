# Sinaps Template
Sinaps Template is a template engin similar to [Jinja2](http://jinja.pocoo.org/docs/dev/) and [Twig](http://twig.sensiolabs.org/) using [PEGjs](http://pegjs.org/) modified Javascript ES5.1 parser. So every expression is JS compatible and no surprise is awaiting you.

[![Build Status](https://travis-ci.org/sinapsio/sinaps-template.svg?branch=master)](https://travis-ci.org/sinapsio/sinaps-template)

## Install
```js
npm install --save sinaps-template
```
or
```html
<script src="sinaps-template.min.js"></script>
```

## Getting started

### Create an Environment instance
An environment instance will be your entry point for all template compilation and rendering.
```js
var env = new Environment();
```

### Compile your first string

```js
var template = env.compileString('Hello {{ world }}');
```

### Render to a string

```js
console.log(template({foo: 'World'}).output); // "Hello World"
console.log(template({foo: 'Peter'}).output); // "Hello Peter"
```
