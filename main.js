"use strict";

var util = require('util');
var Environment = require('./lib/Environment');

var str = `
	Foo
	{% macro foo %}
		{{ 32 }}
	{% endmacro %}

	{% block foo %}
		BLeh
	{% endblock %}

	{% for value in key %}
		Yay
	{% endfor %}

	{% if true %}
		Bleh
	{% endif %}

	{% if true %}
		Mooo
	{% else %}
		Mehh
	{% endif %}

	{% if true %}
		Mooo
	{% elseif false %}
		Mehh
	{% endif %}

	{% if true %}
		Greee
	{% elseif false %}
		Juuu
	{% else %}
		Loooo
	{% endif %}
`;

var env = new Environment();
var template = env.compileString(str);

console.log(
	template({
		foo: 'bar',
		test: {
			bar: function () { return 'foobar'; },
			foo: {
				bar: function () { return 'barfoo'; }
			}
		}
	})
);
