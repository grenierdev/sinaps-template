"use strict";

var Environment = require('./lib/Environment');
var FileLoader = require('./lib/loaders/FileLoader');
var WebLoader = require('./lib/loaders/WebLoader');

module.exports = {
	Environment: Environment,
	FileLoader: FileLoader,
	WebLoader: WebLoader
}
