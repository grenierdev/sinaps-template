"use strict";

var util = require('util');
var Environment = require('./lib/Environment');

var str = `
	{{ foo }}
	{{ goo.boo }}
	{{ goo.boo.joo }}
	{% if moo['zoo'].xoo == true %}
		{{ coo[23].yoo }}
		{{ coo[23].too(23) }}
	{% endif %}

	{% for v in list %}
		{{ loop.index0 }} / {{ loop.index }} : {{ v }} ({{ loop.first }} / {{ loop.last }})

		{% for k, v in dict %}
			{{ loop.index0 }} / {{ loop.index }} : {{ k }} = {{ v }} ({{ loop.first }} / {{ loop.last }})
		{% endfor %}
	{% endfor %}
`;

var env = new Environment();

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
});
t = process.hrtime(t)
var outputTime = (t[0] * 1e9 + t[1]) / 1e6;

console.log(`Parse : ${parsedTime}ms`);
console.log(`Exec  : ${outputTime}ms`);
console.log(output);
