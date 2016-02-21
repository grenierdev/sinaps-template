"use strict";

var expect = require('chai').expect;
var Environment = require('../lib/Environment');
var FileLoader = require('../lib/loaders/FileLoader');

describe(`SourceMap`, () => {

	var env;

	before(() => {
		env = new Environment();
	});

	it('can generate source map', () => {
		var compiled = env.compileString(`{% if foo.bar() %}
	Foo
{% endif %}`);

		console.log(compiled({foo: 2}).output);

		expect('Foo').to.be.equal('Foo');
	});
});
