"use strict";

var expect = require('chai').expect;
var Environment = require('../lib/Environment');
var FileLoader = require('../lib/loaders/FileLoader');

describe(`Template literals`, () => {

	var env;

	before(() => {
		env = new Environment();
	});

	it('environment can compile string', () => {
		var compiled = env.compileString('');
		expect(compiled).to.be.a('function');
	});

	it('can compile raw string', () => {
		var compiled = env.compileString('Peter Griffin');
		expect(compiled().output).to.equal('Peter Griffin');
	});

	it('can compile literal string', () => {
		var compiled = env.compileString('{{ "Peter Griffin" }}');
		expect(compiled().output).to.equal('Peter Griffin');
	});

	it('can compile literal number', () => {
		var compiled = env.compileString('{{ 42 }}');
		expect(compiled().output).to.equal('42');
	});

	it('can compile literal boolean', () => {
		var compiled = env.compileString('{{ true }}');
		expect(compiled().output).to.equal('true');
	});

	it('can compile literal array', () => {
		var compiled = env.compileString('{{ [1,"Foo",3] }}');
		expect(compiled().output).to.equal('1,Foo,3');
	});

	it('can compile literal object', () => {
		var compiled = env.compileString('{{ {foo: "Bar", moo: 42} }}');
		expect(compiled().output).to.equal('[object Object]');
	});

	it('can compile literal variable', () => {
		var compiled = env.compileString('{{ foo }}');
		expect(compiled({ foo: 'Bar' }).output).to.equal('Bar');
	});

	it('can compile literal function', () => {
		var compiled = env.compileString('{{ foo }}');
		expect(compiled({ foo: function () { return 'Bar'; } }).output).to.equal(`function () { return 'Bar'; }`);
	});

	it('can compile variable within variable', () => {
		var compiled = env.compileString('{{ foo.bar }}');
		expect(compiled({ foo: { bar: 'Awesome'} }).output).to.equal('Awesome');
	});

	it('can access literal object member', () => {
		var compiled = env.compileString('{{ {foo: "Bar", moo: 42}.foo }}');
		expect(compiled().output).to.equal('Bar');
	});

	it('can call function', () => {
		var compiled = env.compileString('{{ foo() }}');
		expect(compiled({ foo: function () { return 'Bar'; } }).output).to.equal('Bar');
	});

	it('maintain white space', () => {
		var compiled = env.compileString(`Peter\t{{ foo }}\n\nGriffin  `);
		expect(compiled({ foo: 'Bar' }).output).to.equal(`Peter\tBar\n\nGriffin  `);
	});

	it('raw block ignore markup', () => {
		var compiled = env.compileString(`{% raw %}Foo {{ Bar }}{% endraw %}`);
		expect(compiled().output).to.equal(`Foo {{ Bar }}`);
	});

});
