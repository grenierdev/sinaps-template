"use strict";

var _ = require('lodash');
var Parser = require('./Parser');

module.exports = {
	compile: (str, options) => {
		options = _.extend({}, options);

		var asl = Parser.parse(str);

		//console.log(asl);

		var ast = [], astNode = [];
		buildAST(asl.body);

		//console.log(require('util').inspect(ast, {depth:null}));

		var sourceMap = [];
		var extending = undefined;
		var code = [];
		var column = 0;
		codePush(`"use strict";`);
		codePush(`var output = "";`);
		codePush(`function Context (data) { var a = []; a.push(data || {}); a.__proto__ = Context.prototype; return a; };`);
		codePush(`Context.prototype = new Array();`);
		codePush(`Context.prototype.set = function (context, key, val) {`);
		codePush(`	if (val === undefined) {`);
		codePush(`		val = key;`);
		codePush(`		key = context;`);
		codePush(`		context = this[this.length - 1];`);
		codePush(`	}`);
		codePush(`	if (context) {`);
		codePush(`		context[key] = val;`);
		codePush(`	}`);
		codePush(`};`);
		codePush(`Context.prototype.get = function (context, key) {`);
		codePush(`	if (key === undefined && context === undefined) {`);
		codePush(`		return this[this.length - 1];`);
		codePush(`	}`);
		codePush(`	if (key === undefined) {`);
		codePush(`		key = context;`);
		codePush(`		for (var i = this.length - 1; i >= 0; --i) {`);
		codePush(`			if (this[i] && typeof this[i][key] !== 'undefined') {`);
		codePush(`				return this[i][key];`);
		codePush(`			}`);
		codePush(`		}`);
		codePush(`		return typeof key === 'string' ? undefined : key;`);
		codePush(`	}`);
		codePush(`	if (context && typeof context[key]) {`);
		codePush(`		return context[key];`);
		codePush(`	}`);
		codePush(`	return undefined;`);
		codePush(`};`);
		codePush(`Context.prototype.collapse = function () {`);
		codePush(`	var data = {};`);
		codePush(`	for (var a = 0, b = this.length; a < b; ++a) {`);
		codePush(`		for (var k in this[a]) {`);
		codePush(`			data[k] = this[a][k];`);
		codePush(`		}`);
		codePush(`	}`);
		codePush(`	return new Context(data);`);
		codePush(`};`);
		codePush(`Context.prototype.bindParents = function (func) {`);
		codePush(`	if (func.parent) {`);
		codePush(`		func.parent = this.bindParents(func.parent);`);
		codePush(`	}`);
		codePush(`	return func.bind(null, func.parent);`);
		codePush(`};`);
		codePush(`var noop = function () {};`);
		codePush(`var context = new Context(data || {});`);
		codePush(`context[0]["$$blocks"] = context[0]["$$blocks"] || {};`);
		codePush(`var options = ${JSON.stringify(options)};`);
		walkAST(ast[0]);


		if (extending === undefined) {
			codePush(`return {output: output, context: context.collapse()[0]};`);
		} else {
			codePush(`return this.getResult(${extending}, context.collapse()[0]);`);
		}

		//console.log(sourceMap);
		console.log(code.join(''));
		//return code.join('');

		var render;

		try {
			render = (new Function('data', `return function render (data) { ${code.join('')} };`))();
		}
		catch (e) {
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

		return {
			render: render,
			sourceMap: sourceMap
		}

		function codePush (c) {
			column += c.length;
			return code.push(c);
		}

		function codePop () {
			var c = code.pop();
			column -= c.length;
			return c;
		}

		function codeLocation () {
			return {
				line: 1,
				column: column
			};
		}

		function appendAST (node) {
			astNode.push(node);
		}

		function pushAST (node) {
			appendAST(node);

			ast.push(astNode);
			astNode = [];
		}

		function popAST (node, expectType) {
			var t = astNode;
			astNode = ast.pop();
			var lastNode = astNode[astNode.length - 1];

			if (expectType.indexOf(lastNode.type) === -1) {
				throw new Parser.SyntaxError(`Expected ${expectType} and found ${lastNode.type} instead.`, expectType, lastNode.type, node.location);
			}

			lastNode['children'] = t || [];
			lastNode['endLocation'] = node.location;
		}

		function buildAST (nodes) {
			_.each(nodes, node => {
				switch(node.type) {
					case 'TemplateMacro':
						pushAST(node);
						break;
					case 'TemplateEndMacro':
						popAST(node, ['TemplateMacro']);
						//append(node);
						break;

					case 'TemplateBlock':
						pushAST(node);
						break;
					case 'TemplateEndBlock':
						popAST(node, ['TemplateBlock']);
						//append(node);
						break;

					case 'TemplateRaw':
						appendAST(node);
						break;

					case 'TemplateFor':
						pushAST(node);
						break;
					case 'TemplateEndFor':
						popAST(node, ['TemplateFor']);
						//append(node);
						break;

					case 'TemplateIf':
						pushAST(node);
						break;
					case 'TemplateElseIf':
						popAST(node, ['TemplateIf', 'TemplateElseIf']);
						pushAST(node);
						break;
					case 'TemplateElse':
						popAST(node, ['TemplateIf', 'TemplateElseIf']);
						pushAST(node);
						break;
					case 'TemplateEndIf':
						popAST(node, ['TemplateIf', 'TemplateElseIf', 'TemplateElse']);
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
						appendAST(node);
				}
			});
			ast.push(astNode);
		}

		function walkAST (tree, parents) {
			tree = tree || [];

			parents = parents || [];
			for (var i = 0, l = tree.length; i < l; ++i) {
				var node = tree[i];

				switch(node.type) {

					// JS related syntax
					// NOTE Needs to fit in a single codePush
					case 'Identifier':
						//codePush(`context.get("${node.name}")`);
						codePush(`${node.name}`);
						break;
					case 'Literal':
						codePush(JSON.stringify(node.value));
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
							var key = codePop();
							walkAST([node.properties[a].value], [node].concat(parents));
							var value = codePop();

							props.push(`${key}: ${value}`);
						}
						codePush(`{${props.join(',')}}`);
						break;
					case 'ArrayExpression':
						var elements = [];
						for (var a = 0, b = node.elements.length; a < b; ++a) {
							walkAST([node.elements[a]], [node].concat(parents));
							elements.push(codePop());
						}
						codePush(`[${elements.join(',')}]`);
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
							obj = codePop();
						}
						if (node.property.type == 'Identifier') {
							prop = `"${node.property.name}"`;
						} else {
							walkAST([node.property], [node].concat(parents));
							prop = codePop();
						}
						if (node.object.type === 'MemberExpression') {
							codePush(`context.get(${obj}, ${prop})`);
						} else {
							codePush(`context.get(context.get(${obj}), ${prop})`);
						}
						break;
					case 'CallExpression':
						var callee;
						if (node.callee.type == 'Identifier') {
							callee = `(context.get("${node.callee.name}"))`;
						} else {
							walkAST([node.callee], [node].concat(parents));
							callee = `(${codePop()})`;
							if (node.callee.type === 'MemberExpression') {
								var prop;
								if (node.callee.object.type == 'Identifier') {
									prop = `(context.get("${node.callee.object.name}"))`;
								} else {
									walkAST([node.callee.object], [node].concat(parents));
									prop = codePop();
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
									args.push(codePop());
								}
							}
						}
						codePush(`${callee}(${args.join(',')})`);
						break;
					case 'BinaryExpression':
						var left;
						if (node.left.type == 'Identifier') {
							left = `context.get("${node.left.name}")`;
						} else {
							walkAST([node.left], [node].concat(parents));
							left = codePop();
						}
						var right;
						if (node.right.type == 'Identifier') {
							right = `context.get("${node.right.name}")`;
						} else {
							walkAST([node.right], [node].concat(parents));
							right = codePop();
						}
						codePush(`${left} ${node.operator} ${right}`);
						break;

					// Template related syntax
					case 'TemplateRaw':
						codePush(`output += ${JSON.stringify(node.raw)};`);
						break;
					case 'TemplateLiteral':
						var literal;
						if (node.value.type == 'Identifier') {
							literal = `"${node.value.name}"`;
						} else {
							walkAST([node.value], [node].concat(parents));
							literal = codePop();
						}
						switch (node.value.type) {
							case 'Identifier':
								codePush(`output += context.get(${literal});`);
								break;
							default:
								codePush(`output += ${literal};`);
						}
						break;
					case 'TemplateSet':
						var key;
						if (node.expression.left.type == 'Identifier') {
							key = `"${node.expression.left.name}"`;
						} else {
							walkAST([node.expression.left], [node].concat(parents));
							key = codePop();
						}
						walkAST([node.expression.right], [node].concat(parents));
						var value = codePop();

						var loc = codeLocation();
						codePush(`context.get()[${key}] ${node.expression.operator} ${value};`);
						var locEnd = codeLocation();
						sourceMap.push([node.location.start.line, node.location.start.column, node.location.end.line, node.location.end.column, loc.line, loc.column, locEnd.line, locEnd.column]);
						break;
					case 'TemplateExtend':
						walkAST([node.template], [node].concat(parents));
						extending = codePop();
						break;
					case 'TemplateImport':
						var loc = codeLocation();
						codePush(`context.set("${node.as.name}", this.getContext("${node.template.value}", {}, options));`);
						var locEnd = codeLocation();
						sourceMap.push([node.location.start.line, node.location.start.column, node.location.end.line, node.location.end.column, loc.line, loc.column, locEnd.line, locEnd.column]);
						break;
					case 'TemplateMacro':
						var args = [];
						if (node.arguments && node.arguments.length) {
							for (var a = 0, b = node.arguments.length; a < b; ++a) {
								walkAST([node.arguments[a]], [node].concat(parents));
								args.push(codePop());
							}
						}
						var loc = codeLocation();
						codePush(`context.set(context[0], "${node.name.name}", function (${args.join(',')}) { "use strict"; context.push({}); var output = ""; ${args.map(v => `context.set("${v}", ${v}); `).join('')}`);
						var locEnd = codeLocation();
						sourceMap.push([node.location.start.line, node.location.start.column, node.location.end.line, node.location.end.column, loc.line, loc.column, locEnd.line, locEnd.column]);
						walkAST(node.children, [node].concat(parents));
						loc = codeLocation();
						codePush(`context.pop(); return output; }.bind(this));`);
						locEnd = codeLocation();
						sourceMap.push([node.location.start.line, node.location.start.column, node.location.end.line, node.location.end.column, loc.line, loc.column, locEnd.line, locEnd.column]);
						break;
					case 'TemplateBlock':
						var loc = codeLocation();
						codePush(`var current = (function (context) { return function (parent) { "use strict"; context.set('parent', parent); var output = ""; `);
						var locEnd = codeLocation();
						sourceMap.push([node.location.start.line, node.location.start.column, node.location.end.line, node.location.end.column, loc.line, loc.column, locEnd.line, locEnd.column]);
						walkAST(node.children, [node].concat(parents));
						loc = codeLocation();
						codePush(`return output; }; })(context.collapse());`);
						codePush(`var parent = context.get(context.get(context[0], "$$blocks"), "${node.name.name}");`);
						codePush(`if (!parent) { context.set(context.get(context[0], "$$blocks"), "${node.name.name}", current); }`);
						codePush(`else { var p = parent; while (true) { if (p.parent) { p = p.parent; continue; } p.parent = current; break; } }`);
						if (extending === undefined) {
							codePush(`output += context.bindParents(context.get(context.get(context[0], "$$blocks"), "${node.name.name}"))();`);
						}
						locEnd = codeLocation();
						sourceMap.push([node.location.start.line, node.location.start.column, node.location.end.line, node.location.end.column, loc.line, loc.column, locEnd.line, locEnd.column]);
						break;
					case 'TemplateFor':
						var list;
						if (node.list.type == 'Identifier') {
							list = `context.get("${node.list.name}")`;
						} else {
							walkAST([node.list], [node].concat(parents));
							list = codePop();
						}
						var key = node.key && node.key[0] && node.key[0].name;
						var val = node.value.name;

						var loc = codeLocation();
						codePush(`var obj = (${list} || []), keys;`);
						codePush(`var isa = obj instanceof Array || typeof obj.length === "number";`);
						codePush(`if (!isa) { keys = []; for (var k in obj) { keys.push(k); } } else { keys = (new Array(obj.length)).fill(null).map(function (v, i) { return i; }); }`);
						codePush(`context.push({`);
						codePush(`  _for: { object: obj, keys: keys },`);
						codePush(`  loop: {first: true, last: keys.length == 0, index: 1, index0: 0, length: keys.length}`);
						codePush(`});`);
						codePush(`keys.forEach(function (k) {`);
						codePush(`  context.push({${val}: context.get("_for").object[k] ${key ? ',' + key +': k' : ''}});`);
						var locEnd = codeLocation();
						sourceMap.push([node.location.start.line, node.location.start.column, node.location.end.line, node.location.end.column, loc.line, loc.column, locEnd.line, locEnd.column]);
						walkAST(node.children, [node].concat(parents));
						loc = codeLocation();
						codePush(`  context.pop(); context.get('loop').index++; context.get('loop').index0++; context.get('loop').first = false; context.get('loop').last = context.get('loop').index == context.get('loop').length;`);
						codePush(`});`);
						locEnd = codeLocation();
						sourceMap.push([node.location.start.line, node.location.start.column, node.location.end.line, node.location.end.column, loc.line, loc.column, locEnd.line, locEnd.column]);
						break;
					case 'TemplateIf':
						var test;
						if (node.test.type == 'Identifier') {
							test = `context.get("${node.test.name}")`;
						} else {
							walkAST([node.test], [node].concat(parents));
							test = codePop();
						}
						var loc = codeLocation();
						codePush(`if (${test}) {`);
						var locEnd = codeLocation();
						sourceMap.push([node.location.start.line, node.location.start.column, node.location.end.line, node.location.end.column, loc.line, loc.column, locEnd.line, locEnd.column]);
						walkAST(node.children, [node].concat(parents));
						codePush(`}`);
						break;
					case 'TemplateElseIf':
						var test;
						if (node.test.type == 'Identifier') {
							test = `context.get("${node.test.name}")`;
						} else {
							walkAST([node.test], [node].concat(parents));
							test = codePop();
						}
						var loc = codeLocation();
						codePush(`else if (${test}) {`);
						var locEnd = codeLocation();
						sourceMap.push([node.location.start.line, node.location.start.column, node.location.end.line, node.location.end.column, loc.line, loc.column, locEnd.line, locEnd.column]);
						walkAST(node.children, [node].concat(parents));
						codePush(`}`);
						break;
					case 'TemplateElse':
						var loc = codeLocation();
						codePush(`else {`);
						var locEnd = codeLocation();
						sourceMap.push([node.location.start.line, node.location.start.column, node.location.end.line, node.location.end.column, loc.line, loc.column, locEnd.line, locEnd.column]);
						walkAST(node.children, [node].concat(parents));
						codePush(`}`);
						break;

					case undefined:
						var c = [node];
						for (var a = i + 1; a < l && tree[a] && tree[a].type === undefined; ++a, ++i) {
							c.push(tree[a]);
						}
						codePush(`output += ${JSON.stringify(c.map(v => v).join(''))};`);
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
