"use strict";

var _ = require('lodash');
var Parser = require('./Parser');

module.exports = {
	compile: (str, options) => {
		options = _.extend({}, options);

		var asl = Parser.parse(str);

		//console.log(asl);

		var ast = [], treeNode = [];
		buildAST(asl.body);

		var extending = undefined;
		var code = [];
		code.push(`"use strict";`);
		code.push(`var output = "";`);
		code.push(`function Context (data) { var a = []; a.push(data || {}); a.__proto__ = Context.prototype; return a; };`);
		code.push(`Context.prototype = new Array();`);
		code.push(`Context.prototype.set = function (context, key, val) {`);
		code.push(`	if (val === undefined) {`);
		code.push(`		val = key;`);
		code.push(`		key = context;`);
		code.push(`		context = this[this.length - 1];`);
		code.push(`	}`);
		code.push(`	if (context) {`);
		code.push(`		context[key] = val;`);
		code.push(`	}`);
		code.push(`};`);
		code.push(`Context.prototype.get = function (context, key) {`);
		code.push(`	if (key === undefined && context === undefined) {`);
		code.push(`		return this[this.length - 1];`);
		code.push(`	}`);
		code.push(`	if (key === undefined) {`);
		code.push(`		key = context;`);
		code.push(`		for (var i = this.length - 1; i >= 0; --i) {`);
		code.push(`			if (this[i] && typeof this[i][key] !== 'undefined') {`);
		code.push(`				return this[i][key];`);
		code.push(`			}`);
		code.push(`		}`);
		code.push(`		return typeof key === 'string' ? undefined : key;`);
		code.push(`	}`);
		code.push(`	if (context && typeof context[key]) {`);
		code.push(`		return context[key];`);
		code.push(`	}`);
		code.push(`	return undefined;`);
		code.push(`};`);
		code.push(`Context.prototype.collapse = function () {`);
		code.push(`	var data = {};`);
		code.push(`	for (var a = 0, b = this.length; a < b; ++a) {`);
		code.push(`		for (var k in this[a]) {`);
		code.push(`			data[k] = this[a][k];`);
		code.push(`		}`);
		code.push(`	}`);
		code.push(`	return new Context(data);`);
		code.push(`};`);
		code.push(`Context.prototype.bindParents = function (func) {`);
		code.push(`	if (func.parent) {`);
		code.push(`		func.parent = this.bindParents(func.parent);`);
		code.push(`	}`);
		code.push(`	return func.bind(null, func.parent);`);
		code.push(`};`);
		code.push(`var noop = function () {};`);
		code.push(`var context = new Context(data || {});`);
		code.push(`context[0]["$$blocks"] = context[0]["$$blocks"] || {};`);
		code.push(`var options = ${JSON.stringify(options)};`);
		walkAST(ast[0]);

		if (extending === undefined) {
			code.push(`return {output: output, context: context.collapse()[0]};`);
		} else {
			code.push(`return this.getResult(${extending}, context.collapse()[0]);`);
		}

		return code.join('');

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
				throw new Parser.SyntaxError(`Expected ${expectType} and found ${lastNode.type} instead.`, expectType, lastNode.type, node.location);
			}

			lastNode['children'] = t || [];
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
						append(node);
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
			tree = tree || [];

			parents = parents || [];
			for (var i = 0, l = tree.length; i < l; ++i) {
				var node = tree[i];

				switch(node.type) {

					// JS related syntax
					// NOTE Needs to fit in a single code.push
					case 'Identifier':
						//code.push(`context.get("${node.name}")`);
						code.push(`${node.name}`);
						break;
					case 'Literal':
						code.push(JSON.stringify(node.value));
						break;
					case 'VariableDeclarator':
						//walkAST([node.id], [node].concat(parents));
						console.log(node);
						throw new Error('What !');
						break;
					case 'ObjectExpression':
						var props = [];
						for (var a = 0, b = node.properties.length; a < b; ++a) {
							walkAST([node.properties[a].key], [node].concat(parents));
							var key = code.pop();
							walkAST([node.properties[a].value], [node].concat(parents));
							var value = code.pop();

							props.push(`${key}: ${value}`);
						}
						code.push(`{${props.join(',')}}`);
						break;
					case 'ArrayExpression':
						var elements = [];
						for (var a = 0, b = node.elements.length; a < b; ++a) {
							walkAST([node.elements[a]], [node].concat(parents));
							elements.push(code.pop());
						}
						code.push(`[${elements.join(',')}]`);
						break;
					//case 'ExpressionStatement':
					//	console.log(node.type, node.expression);
					//	walkAST([node.expression], [node].concat(parents));
					//	break;
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
						var callee;
						if (node.callee.type == 'Identifier') {
							callee = `(context.get("${node.callee.name}") || noop)`;
						} else {
							walkAST([node.callee], [node].concat(parents));
							callee = `(${code.pop()} || noop)`;
							if (node.callee.type === 'MemberExpression') {
								var prop;
								if (node.callee.object.type == 'Identifier') {
									prop = `(context.get("${node.callee.object.name}") || noop)`;
								} else {
									walkAST([node.callee.object], [node].concat(parents));
									prop = code.pop();
								}
								callee = `${callee}.bind(${prop})`;
							}
						}
						var args = [];
						if (node.arguments && node.arguments.length) {
							for (var a = 0, b = node.arguments.length; a < b; ++a) {
								if (node.arguments[a].type == 'Identifier') {
									args.push(`context.get("${node.arguments[a].name}")`);
								} else {
									walkAST([node.arguments[a]], [node].concat(parents));
									args.push(code.pop());
								}
							}
						}
						code.push(`${callee}(${args.join(',')})`);
						break;
					case 'BinaryExpression':
						var left;
						if (node.left.type == 'Identifier') {
							left = `context.get("${node.left.name}")`;
						} else {
							walkAST([node.left], [node].concat(parents));
							left = code.pop();
						}
						var right;
						if (node.right.type == 'Identifier') {
							right = `context.get("${node.right.name}")`;
						} else {
							walkAST([node.right], [node].concat(parents));
							right = code.pop();
						}
						code.push(`${left} ${node.operator} ${right}`);
						break;

					// Template related syntax
					case 'TemplateRaw':
						code.push(`output += ${JSON.stringify(node.raw)};`);
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
								code.push(`output += context.get(${literal});`);
								break;
							default:
								code.push(`output += ${literal};`);
						}
						break;
					case 'TemplateSet':
						var key;
						if (node.expression.left.type == 'Identifier') {
							key = `"${node.expression.left.name}"`;
						} else {
							walkAST([node.expression.left], [node].concat(parents));
							key = code.pop();
						}
						walkAST([node.expression.right], [node].concat(parents));
						var value = code.pop();

						code.push(`context.get()[${key}] ${node.expression.operator} ${value};`);
						break;
					case 'TemplateExtend':
						walkAST([node.template], [node].concat(parents));
						extending = code.pop();
						break;
					case 'TemplateImport':
						code.push(`context.set("${node.as.name}", this.getContext("${node.template.value}", {}, options));`);
						break;
					case 'TemplateMacro':
						var args = [];
						if (node.arguments && node.arguments.length) {
							for (var a = 0, b = node.arguments.length; a < b; ++a) {
								walkAST([node.arguments[a]], [node].concat(parents));
								args.push(code.pop());
							}
						}
						code.push(`context.set(context[0], "${node.name.name}", function (${args.join(',')}) { "use strict"; context.push({}); var output = ""; ${args.map(v => `context.set("${v}", ${v}); `).join('')}`);
						walkAST(node.children, [node].concat(parents));
						code.push(`context.pop(); return output; }.bind(this));`);
						break;
					case 'TemplateBlock':
						code.push(`var current = (function (context) { return function (parent) { "use strict"; context.set('parent', parent || noop); var output = ""; `);
						walkAST(node.children, [node].concat(parents));
						code.push(`return output; }; })(context.collapse());`);
						code.push(`var parent = context.get(context.get(context[0], "$$blocks"), "${node.name.name}");`);
						code.push(`if (!parent) { context.set(context.get(context[0], "$$blocks"), "${node.name.name}", current); }`);
						code.push(`else { var p = parent; while (true) { if (p.parent) { p = p.parent; continue; } p.parent = current; break; } }`);
						if (extending === undefined) {
							code.push(`output += context.bindParents(context.get(context.get(context[0], "$$blocks"), "${node.name.name}"))();`);
						}
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

						code.push(`var obj = (${list} || []), keys;`);
						code.push(`var isa = obj instanceof Array || typeof obj.length === "number";`);
						code.push(`if (!isa) { keys = []; for (var k in obj) { keys.push(k); } } else { keys = (new Array(obj.length)).fill(null).map(function (v, i) { return i; }); }`);
						code.push(`context.push({`);
						code.push(`  _for: { object: obj, keys: keys },`);
						code.push(`  loop: {first: true, last: keys.length == 0, index: 1, index0: 0, length: keys.length}`);
						code.push(`});`);
						code.push(`keys.forEach(function (k) {`);
						code.push(`  context.push({${val}: context.get("_for").object[k] ${key ? ',' + key +': k' : ''}});`);
						walkAST(node.children, [node].concat(parents));
						code.push(`  context.pop(); context.get('loop').index++; context.get('loop').index0++; context.get('loop').first = false; context.get('loop').last = context.get('loop').index == context.get('loop').length;`);
						code.push(`});`);
						break;
					case 'TemplateIf':
						var test;
						if (node.test.type == 'Identifier') {
							test = `context.get("${node.test.name}")`;
						} else {
							walkAST([node.test], [node].concat(parents));
							test = code.pop();
						}
						code.push(`if (${test}) {`);
						walkAST(node.children, [node].concat(parents));
						code.push(`}`);
						break;
					case 'TemplateElseIf':
						var test;
						if (node.test.type == 'Identifier') {
							test = `context.get("${node.test.name}")`;
						} else {
							walkAST([node.test], [node].concat(parents));
							test = code.pop();
						}
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
