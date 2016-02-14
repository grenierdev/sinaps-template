"use strict";

var util = require('util');
var Environment = require('./lib/Environment');
var FileLoader = require('./lib/loaders/FileLoader');

var str = `
	{{ foo }}
	{{ goo.boo }}
	{{ goo.boo.joo }}
	{% if moo['zoo'].xoo %}
		{{ coo[23].yoo }}
		{{ coo[23].too(23) }}
	{% endif %}
	{{ {
		a: 1,
		b: 2
	}.a }}

	{% for v in list %}
		{{ loop.index0 }} / {{ loop.index }} : {{ v }} ({{ loop.first }} / {{ loop.last }})

		{% for k, v in dict %}
			{{ loop.index0 }} / {{ loop.index }} : {{ k }} = {{ v }} ({{ loop.first }} / {{ loop.last }})
		{% endfor %}
	{% endfor %}
`;

str = `
{% extends "Bleh.html" %}
{% macro foo %}
	Blehhh
{% endmacro %}

{{ foo() }}
`;

str = `

{% extends "a.html" %}

This is main.js

{% block foo %}
	{{ "main.js !".toUpperCase() }}
	{{ parent() }}
{% endblock %}

`;

//str = `
//{{ toString() }}
//{{ "Bleh".toString() }}
//{{ foo.bar.toString() }}
//{{ foo.bar['toString']() }}
//`;

var env = new Environment(new FileLoader(__dirname + '/test'));

var t = process.hrtime();
var template = env.compileString(str);
t = process.hrtime(t);
var parsedTime = (t[0] * 1e9 + t[1]) / 1e6;

t = process.hrtime();
var output = template({
	foo: 'Foo',
	goo: {
		boo: {
			joo: 'Goo.Boo.Joo'
		}
	},
	moo: {
		zoo: {
			xoo: true
		}
	},
	coo: {
		23: {
			yoo: 'Coo.23.Yoo',
			too: function (v) {
				return `Coo.23.Too ${v}`;
			}
		}
	},
	list: ['a', 'b'],
	dict: {
		a: 'Allo',
		b: 'Bonjour',
		c: 'Choulou'
	}
}).output;
t = process.hrtime(t)
var outputTime = (t[0] * 1e9 + t[1]) / 1e6;

console.log('');
console.log('');
console.log('=======================');
console.log(`Parse : ${parsedTime}ms`);
console.log(`Exec  : ${outputTime}ms`);
console.log('=======================');
console.log(output);
console.log('=======================');
