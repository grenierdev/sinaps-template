"use strict";

var _ = require('lodash');
var Parser = require('./Parser');

class Environment {

	constructor () {
		this.functions = {};
		this.globals = {};
	}

	setFunction (name, fn) {
		if (typeof fn !== 'function') {
			throw new Error(`Wrong parameter type for 'fn', function expected.`);
		}
		this.functions[name + ""] = fn;
	}

	setFunctions (fns) {
		_.merge(this.functions, {}, fns);
	}

	setGlobal (name, val) {
		this.globals[name + ""] = val;
	}

	setGlobals (vals) {
		_.merge(this.globals, {}, vals);
	}

	compileString (str) {

		var t = process.hrtime();
		try {
			var ast = Parser.parse(str);
		} catch (e) {
			console.error(e);
		}
		t = process.hrtime(t);
		var parsedTime = (t[0] * 1e9 + t[1]) / 1e6;

		console.log(require('util').inspect(ast, {depth:null}));

		var code = [];
		walkAST([ast]);

		console.log(code.join(''));

		var program = new Function('context', code.join(''));
		return program;

		function walkAST (tree, parents) {
			parents = parents || [];
			_.each(tree, node => {
				switch(node.type) {
					// Main program
					case 'Program':
						code.push(`var program = "", voidFn = function(){};`);
						walkAST(node.body, [node].concat(parents));
						code.push(`return program;`);
						break;

					case 'Identifier':
						code.push(node.name);
						break;
					case 'Literal':
						code.push(JSON.stringify(node.value));
						break;
					case 'VariableDeclarator':
						// TODO try catch ? throw node.location?
						walkAST([node.id], [node].concat(parents));
						break;

					case 'ExpressionStatement':
						if (parents[0].type === 'TemplateLiteral') {
							code.push(`context.`);
						}
						walkAST([node.expression], [node].concat(parents));
						break;
					case 'MemberExpression':
						walkAST([node.object], [node].concat(parents));
						code.push(`.`);
						walkAST([node.property], [node].concat(parents));
						break;
					case 'CallExpression':
						// TODO try catch ? throw node.location?
						walkAST([node.callee], [node].concat(parents));
						code.push(`(`);
						walkAST(node.arguments, [node].concat(parents));
						code.push(`)`);
						break;

					case 'TemplateLiteral':
						code.push(`program += `);
						walkAST([node.value], [node].concat(parents));
						code.push(`;`);
						break;
					case 'TemplateRaw':
						code.push(`program += ${JSON.stringify(node.value)};`);
						break;

					case 'TemplateIf':
						code.push(`if (`);
						walkAST([node.test], [node].concat(parents));
						code.push(`) {`);
						walkAST(node.consequent, [node].concat(parents));
						code.push(`}`);
						break;
					case 'TemplateIfElse':
						code.push(`if (`);
						walkAST([node.test], [node].concat(parents));
						code.push(`) {`);
						walkAST(node.consequent, [node].concat(parents));
						code.push(`}`);
						walkAST([node.alternate], [node].concat(parents));
						break;
					case 'TemplateElse':
						code.push(`else {`);
						walkAST(node.alternate, [node].concat(parents));
						code.push(`}`);
						break;

					case 'TemplateComment':
						break;
					default:
						throw new Error(`Unhandled AST type '${node.type}'.`);
				}

			});
		}
	}
}

module.exports = Environment;
