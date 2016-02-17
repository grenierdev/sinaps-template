"use strict";

var expect = require('chai').expect;
var Environment = require('../lib/Environment');
var FileLoader = require('../lib/loaders/FileLoader');

describe(`Template Extends/Block/Import`, () => {

	var env;

	before(() => {
		env = new Environment(new FileLoader(__dirname + '/templates/', true, false));
	});

	it('can compile simple extends expression', () => {
		expect(() => {
			env.compileString('{% extends "extends.html" %}');
		}).to.not.throw();
	});

	it('can compile simple block expression', () => {
		expect(() => {
			env.compileString('{% block foo %}{% endblock %}');
		}).to.not.throw();
	});

	it('template can extends an other', () => {
		var compiled = env.compileString('{% extends "extends.html" %}');
		expect(compiled().output).to.be.equal(`Foo Bar\r\n`);
	});

	it('block can override extended template', () => {
		var compiled = env.compileString('{% extends "extends.html" %}{% block foo %}Moo{% endblock %}');
		expect(compiled().output).to.be.equal(`Moo Bar\r\n`);
	});

	it('template can import template as variable', () => {
		var compiled = env.compileString('{% import "import.html" as imported %}{{ imported.foo }} {{ imported.bar() }}');
		expect(compiled().output).to.be.equal(`Foo Bar`);
	});

});
