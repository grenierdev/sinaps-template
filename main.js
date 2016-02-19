"use strict";

var Environment = require('./lib/Environment');
var FileLoader = require('./lib/loaders/FileLoader');
var MultiFileLoader = require('./lib/loaders/MultiFileLoader');

module.exports = {
	Environment: Environment,
	FileLoader: FileLoader,
	MultiFileLoader: MultiFileLoader
}
