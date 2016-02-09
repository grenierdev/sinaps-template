"use strict";

var peg = require('pegjs');
var util = require('util');
var path = require('path');
var fs = require('fs');
var lexer = fs.readFileSync(path.join(__dirname, './lib/lexer.pegjs.txt')).toString();
var parser;

try {
	parser = `"use strict;"

module.exports = ` + peg.buildParser(lexer, {
		cache: false,
		optimize: 'speed',
		output: 'source'
	});
} catch (e) {
	throw new Error("Could not parse file : \n" + e.stack);
}

fs.writeFile(path.join(__dirname, './lib/Parser.js'), parser, err => {
	if (err) {
		throw new Error(err);
	}

	console.log('Build done.');
});
