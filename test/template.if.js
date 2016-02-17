"use strict";

var expect = require('chai').expect;
var Environment = require('../lib/Environment');
var FileLoader = require('../lib/loaders/FileLoader');

describe(`Template If`, () => {

	var env;

	before(() => {
		env = new Environment();
	});

	it('can compile simple if expression', () => {
		var compiled = env.compileString('{% if true %}Foo{% endif %}');
		expect(compiled().output).to.be.equal('Foo');
	});

	it('can compile if binary expression', () => {
		var compiled = env.compileString('{% if true && true %}Foo{% endif %}');
		expect(compiled().output).to.be.equal('Foo');
	});

	it('if expression can use variable', () => {
		var compiled = env.compileString('{% if foo == "Bar" %}Bar{% endif %}');
		expect(compiled({ foo: 'Bar' }).output).to.be.equal('Bar');
	});

	it('if binary expression can use variable', () => {
		var compiled = env.compileString('{% if foo == "Bar" && true %}Bar{% endif %}');
		expect(compiled({ foo: 'Bar' }).output).to.be.equal('Bar');
	});

	it('if binary expression can use literal', () => {
		var compiled = env.compileString('{% if foo.bar && {a: true}.a %}Bar{% endif %}');
		expect(compiled({ foo: { bar: true } }).output).to.be.equal('Bar');
	});

	it('can compile simple if/else expression', () => {
		var compiled = env.compileString('{% if false %}Foo{% else %}Bar{% endif %}');
		expect(compiled().output).to.be.equal('Bar');
	});

	it('can compile simple if/else if expression', () => {
		var compiled = env.compileString('{% if false %}Foo{% elseif true %}Bar{% endif %}');
		expect(compiled().output).to.be.equal('Bar');
	});

	it('can compile simple if/else if/else expression', () => {
		var compiled = env.compileString('{% if false %}Foo{% elseif false %}Bar{% else %}Moo{% endif %}');
		expect(compiled().output).to.be.equal('Moo');
	});


});
