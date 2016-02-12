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
		var compiled;
		try {
			compiled = this._compileFromString(str);
		} catch (e) {
			if (e.name === 'SyntaxError' && e.location) {
				var lines = str.split(/\r?\n/g);
				var line = lines[e.location.start.line - 1];
				var column = e.location.start.column;

				var len = 0;
				for (var a = 0, b = column; a < b; ++a) {
					switch (line[a]) {
						case "\t": len += 4; break;
						default: len += 1; break;
					}
				}

				e.stack = `${e.name}: ${e.message}\n`;
				e.stack += `    ${line.replace(/(\r\n|\r)/g, "\n").replace(/\t/g, "    ")}\n`;
				e.stack += `    ${(new Array(len).join(' '))}^`;
			}
			throw e;
		}

		return compiled;
	}

	_compileFromString (str) {

		var asl = Parser.parse(str);

		//console.log(require('util').inspect(asl.body, {depth:null}));

		var ast = [], treeNode = [];
		buildAST(asl.body);

		var code = [
			`"use strict";`,
			`var output = "";`,
			`class Context extends Array {
				set (context, key, val) {
					if (val === undefined) {
						val = key;
						key = context;
						context = this[this.length - 1];
					}
					if (context) {
						context[key] = val;
					}
				}
				get (context, key) {
					if (key === undefined) {
						key = context;
						for (var i = this.length - 1; i >= 0; --i) {
							if (this[i] && typeof this[i][key] !== 'undefined') {
								return this[i][key];
							}
						}
						return undefined;
					}
					return context && typeof context[key] !== 'undefined' ? context[key] : undefined;
				}
			};`,
			`var context = new Context(data || {});`,
			`var noop = function () {};`
		];
		walkAST(ast[0]);

		code.push(`return output;`);

		//console.log(`${code.join("\n")}`);

		try {
			return new Function('data', code.join(''))
		} catch (e) {
			throw new Error('Environment.compileFromString encountered a problem with compilation.');
		}

		function append (node) {
			treeNode.push(node);
		}

		function push (node) {
			append(node);

			ast.push(treeNode);
			treeNode = [];
		}

		function pop (node, expectType) {
			var t = treeNode;
			treeNode = ast.pop();
			var lastNode = treeNode[treeNode.length - 1];

			if (expectType.indexOf(lastNode.type) === -1) {
				throw new ParseError(`Expected ${expectType} and found ${lastNode.type} instead.`, node.location);
			}

			lastNode['children'] = t;
		}

		function buildAST (nodes) {
			_.each(nodes, node => {
				switch(node.type) {
					case 'TemplateMacro':
						push(node);
						break;
					case 'TemplateEndMacro':
						pop(node, ['TemplateMacro']);
						//append(node);
						break;

					case 'TemplateBlock':
						push(node);
						break;
					case 'TemplateEndBlock':
						pop(node, ['TemplateBlock']);
						//append(node);
						break;

					case 'TemplateRaw':
						push(node);
						break;
					case 'TemplateEndRaw':
						pop(node, ['TemplateRaw']);
						//append(node);
						break;

					case 'TemplateFor':
						push(node);
						break;
					case 'TemplateEndFor':
						pop(node, ['TemplateFor']);
						//append(node);
						break;

					case 'TemplateIf':
						push(node);
						break;
					case 'TemplateElseIf':
						pop(node, ['TemplateIf', 'TemplateElseIf']);
						push(node);
						break;
					case 'TemplateElse':
						pop(node, ['TemplateIf', 'TemplateElseIf']);
						push(node);
						break;
					case 'TemplateEndIf':
						pop(node, ['TemplateIf', 'TemplateElseIf', 'TemplateElse']);
						//append(node);
						break;

					case 'TemplateLiteralSyntaxError':
						throw new Parser.SyntaxError('Template literal syntax error.', '', '', node.location);
						break;
					case 'TemplateBlockSyntaxError':
						throw new Parser.SyntaxError('Template block syntax error.', '', '', node.location);
						break;

					// Skipable
					case 'TemplateComment':
						break;
					default:
						append(node);
				}
			});
			ast.push(treeNode);
		}

		function walkAST (tree, parents) {

			// FIXME Context object + lookup for value / macro + extend template with block
			// context.macro("foo")

			parents = parents || [];
			for (var i = 0, l = tree.length; i < l; ++i) {
				var node = tree[i];

				switch(node.type) {
					case 'Identifier':
						//code.push(`context.get("${node.name}")`);
						code.push(`${node.name}`);
						break;
					case 'Literal':
						code.push(JSON.stringify(node.value));
						break;
					case 'VariableDeclarator':
						// TODO try catch ? throw node.location?
						console.log(node.type, node.id);
						walkAST([node.id], [node].concat(parents));
						break;
					case 'ExpressionStatement':
						console.log(node.type, node.expression);
						walkAST([node.expression], [node].concat(parents));
						break;
					case 'MemberExpression':
						var obj, prop;
						if (node.object.type == 'Identifier') {
							obj = `"${node.object.name}"`;
						} else {
							walkAST([node.object], [node].concat(parents));
							obj = code.pop();
						}
						if (node.property.type == 'Identifier') {
							prop = `"${node.property.name}"`;
						} else {
							walkAST([node.property], [node].concat(parents));
							prop = code.pop();
						}
						if (node.object.type === 'MemberExpression') {
							code.push(`context.get(${obj}, ${prop})`);
						} else {
							code.push(`context.get(context.get(${obj}), ${prop})`);
						}
						break;
					case 'CallExpression':
						walkAST([node.callee], [node].concat(parents));
						var callee = code.pop();
						var args;
						if (node.arguments && node.arguments.length) {
							walkAST(node.arguments, [node].concat(parents));
							args = code.pop();
						}
						code.push(`(${callee} || noop)(${args || ""})`);
						break;
					case 'BinaryExpression':
						walkAST([node.left], [node].concat(parents));
						var left = code.pop();
						walkAST([node.right], [node].concat(parents));
						var right = code.pop();
						code.push(`${left} ${node.operator} ${right}`);
						break;

					case 'TemplateLiteral':
						var literal;
						if (node.value.type == 'Identifier') {
							literal = `"${node.value.name}"`;
						} else {
							walkAST([node.value], [node].concat(parents));
							literal = code.pop();
						}
						switch (node.value.type) {
							case 'Identifier':
							case 'Literal':
								code.push(`output += context.get(${literal});`);
								break;
							default:
								code.push(`output += ${literal};`);
						}
						break;
					case 'TemplateMacro':
						walkAST(node.children, [node].concat(parents));
						code.push(`__macro["${node.name.name}"] = function () { var output = "", __noop = function(){}, __macro = {}, __block = {};${code.pop()}return output;};`);
						break;
					case 'TemplateBlock':
					walkAST(node.children, [node].concat(parents));
						code.push(`__macro["${node.name.name}"] = function () { var output = "", __noop = function(){}, __macro = {}, __block = {};${code.pop()}return output;};`);
						break;
					case 'TemplateFor':
						var list;
						if (node.list.type == 'Identifier') {
							list = `context.get("${node.list.name}")`;
						} else {
							walkAST([node.list], [node].concat(parents));
							list = code.pop();
						}
						var key = node.key && node.key[0] && node.key[0].name;
						var val = node.value.name;

						var loop = `var obj = (${list} || []), keys;
var isa = obj instanceof Array || typeof obj.length === "number";
if (!isa) { keys = []; for (var k in obj) { keys.push(k); } } else { keys = (new Array(obj.length)).fill(null).map((v, i) => i); }
context.push({
	_for: { object: obj, keys: keys },
	loop: {first: true, last: keys.length == 0, index: 1, index0: 0, length: keys.length}
});
keys.forEach(k => {
	context.push({${val}: context.get("_for").object[k] ${key ? ',' + key +': k' : ''}});
`;
						code.push(loop);
						walkAST(node.children, [node].concat(parents));
						code.push(`context.pop(); context.get('loop').index++; context.get('loop').index0++; context.get('loop').first = false; context.get('loop').last = context.get('loop').index == context.get('loop').length; });`);
						break;
					case 'TemplateIf':
						walkAST([node.test], [node].concat(parents));
						var test = code.pop();
						code.push(`if (${test}) {`);
						walkAST(node.children, [node].concat(parents));
						code.push(`}`);
						break;
					case 'TemplateElseIf':
						walkAST([node.test], [node].concat(parents));
						var test = code.pop();
						code.push(`else if (${test}) {`);
						walkAST(node.children, [node].concat(parents));
						code.push(`}`);
						break;
					case 'TemplateElse':
						code.push(`else {`);
						walkAST(node.children, [node].concat(parents));
						code.push(`}`);
						break;

					case undefined:
						var c = [node];
						for (var a = i + 1; a < l && tree[a] && tree[a].type === undefined; ++a, ++i) {
							c.push(tree[a]);
						}
						code.push(`output += ${JSON.stringify(c.map(v => v).join(''))};`);
						break;

					// Skip
					case 'TemplateComment':
						break;
					default:
						throw new Error(`Unhandled AST type '${node.type}'.`);
				}

			};
		}
	}
}

module.exports = Environment;
