"use strict";

var Loader = require('../Loader');
var path = require('path');
var fs = require('fs');

class FileLoader extends Loader {

	constructor (container) {
		super();

		this.container = path.normalize(container);
	}

	getSource (name) {
		var fullPath = path.resolve(this.container, path.normalize(name));

		try {
			return {
				buffer: fs.readFileSync(fullPath, 'utf-8'),
				path: fullPath
			};
		} catch (e) {}

		return false;
	}

}

module.exports = FileLoader;
