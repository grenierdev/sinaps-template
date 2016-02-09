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

//str = `
//	Foo
//	{{ 32 }}
//	Bar
//`;

try {
	var t = process.hrtime();
	var parsed = Parser.parse(str);
	console.log(util.inspect(parsed, { depth: null }));
	t = process.hrtime(t);
	console.log(((t[0] * 1e9 + t[1]) / 1e6).toFixed(4) + 'ms');
} catch (e) {
	if (e instanceof Parser.SyntaxError) {
		console.error(e);
	}
}
