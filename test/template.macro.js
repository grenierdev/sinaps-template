"use strict";

var expect = require('chai').expect;
var Environment = require('../lib/Environment');
var FileLoader = require('../lib/loaders/FileLoader');

describe(`Template Macro/Set`, () => {

	var env;

	before(() => {
		env = new Environment();
	});

	it('can compile simple set expression', () => {
		expect(() => {
			env.compileString('{% set foo = "Bar" %}');
		}).to.not.throw();
	});

	it('can compile simple macro expression', () => {
		expect(() => {
			env.compileString('{% macro foo(item, format) %}Bar{% endmacro %}');
		}).to.not.throw();
	});

	it('set variable can be referenced', () => {
		var compiled = env.compileString('{% set foo = "Bar" %}{{ foo }}');
		expect(compiled().output).to.be.equal('Bar');
	});

	it('macro can be referenced', () => {
		var compiled = env.compileString('{% macro foo %}Bar{% endmacro %}{{ foo() }}');
		expect(compiled().output).to.be.equal('Bar');
	});

	it('macro inherit context', () => {
		var compiled = env.compileString('{% macro foo %}{{ moo }}{% endmacro %}{{ foo() }}');
		expect(compiled({moo: 'Bar'}).output).to.be.equal('Bar');
	});

});
