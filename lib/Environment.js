"use strict";

var _ = require('lodash');
var compile = require('./Compiler').compile;
var path = require('path');

class Environment {

	constructor (loader) {
		this.functions = {};
		this.globals = {
			JSON: JSON,
			Math: Math,
			String: String,
			Number: Number,
			Date: Date,

			capitalize: function (input) {
				input = input + "";
				return input.charAt(0).toUpperCase() + input.slice(1);
			}
		};
		this.loader = loader;
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

	getResult(name, data, options) {
		var compiled = this._compileNameAndCache(name, options);
		var result = compiled(_.extend({}, this.globals, data));
		return result;
	}

	render(name, data, options) {
		return this.getResult(name, data, options).output;
	}

	getContext (name, data, options) {
		return this.getResult(name, data, options).context;
	}

	_compileNameAndCache (name, options) {
		name = path.normalize(name);

		var isRelative = ['.', '..'].indexOf(name.split(path.sep)[0]) > -1;

		if (options && options.path && isRelative) {
			name = path.normalize(path.join(path.dirname(options.path), name));
		}

		var source = this.loader.getSource(name);
		if (typeof source.cached !== 'function') {
			source.cached = this.compileString(source.buffer, _.extend({path: name}, options));;
		}
		return source.cached;
	}

	renderString (str, data, options) {
		var compiled = this.compileString(str, options);
		var result = compiled(data);
		return result.output;
	}

	contextString (str, data, options) {
		var compiled = this.compileString(str, options);
		var result = compiled(data);
		return result.context;
	}

	compileString (str, options) {
		var compiled;
		try {
			compiled = compile(str, options);
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

		//console.log(compiled);

		throw new Error('Combine parser location into code to better understand where errors are coming from...');

		try {
			return (new Function('data', `return function render (data) { ${compiled} };`))().bind(this);
		} catch (e) {
			throw new Error('Environment.compileString returned a malformed function.');
		}
	}
}

module.exports = Environment;
