"use strict";

var expect = require('chai').expect;
var Environment = require('../lib/Environment');
var FileLoader = require('../lib/loaders/FileLoader');

describe(`Template For`, () => {

	var env;

	before(() => {
		env = new Environment();
	});

	it('can compile simple for expression', () => {
		expect(() => {
			env.compileString('{% for i in [1,2,3] %}{% endfor %}');
		}).to.not.throw();
	});

	it('can compile key,value for expression', () => {
		expect(() => {
			env.compileString('{% for k,v in [1,2,3] %}{% endfor %}');
		}).to.not.throw();
	});

	it('for loop in literal array', () => {
		var compiled = env.compileString('{% for v in [1,2,3] %}{{ v }}{% endfor %}');
		expect(compiled().output).to.be.equal('123');
	});

	it('for loop in literal object', () => {
		var compiled = env.compileString('{% for k,v in {a:1,b:2,c:3} %}{{ k }}{{ v }}{% endfor %}');
		expect(compiled().output).to.be.equal('a1b2c3');
	});

	it('for loop in variable', () => {
		var compiled = env.compileString('{% for v in elements %}{{ v }}{% endfor %}');
		expect(compiled({elements: [123]}).output).to.be.equal('123');
	});

	it('for has a loop variable containing meta', () => {
		var compiled = env.compileString('{% for v in [1,2,3] %}{{ loop.index0 }}{% endfor %}');
		expect(compiled().output).to.be.equal('012');
	});

});
