"use strict";

var util = require('util');
var Parser = require('./lib/Parser');

var str = `
	{{ 32 }}
	{{ {
		type: 'Test'
	} }}
	{% if hey.come && bleh.jeez.test() %}
		{{ 42 }}
	{% endif %}
	{% for t in [1,2,3,4] %}
		{{ "Hey" }}
	{% endfor %}
	{% set t = {
		foo: "Bar"
	} %}
`;

str = `
	{% if true %}
		{{ 1 }}
	{% endif %}
	{% if true %}
		{{ 2 }}
	{% else %}
		{{ 3 }}
	{% endif %}
	{% if true %}
		{{ 4 }}
	{% else if true %}
		{{ 5 }}
	{% endif %}
	{% if true %}
		{{ 6 }}
	{% else if true %}
		{{ 7 }}
	{% else if true %}
		{{ 8 }}
	{% endif %}
`;

try {
	var t = process.hrtime();
	var parsed = Parser.parse(str);
	console.log(util.inspect(parsed, { depth: null }));
	t = process.hrtime(t);
	console.log(((t[0] * 1e9 + t[1]) / 1e6).toFixed(4) + 'ms');
} catch (e) {
	console.error(e.stack);
	console.error(e.location);
}
