"use strict";

var Loader = require('../Loader');
var path = require('path');
var fs = require('fs');
var chokidar = require('chokidar');

class FileLoader extends Loader {

	constructor (basePath, enableCache, watchForChange) {
		super();

		enableCache = typeof enableCache === 'undefined' ? true : !!enableCache;
		watchForChange = typeof watchForChange === 'undefined' ? false : !!watchForChange;

		this.cached = {};
		this.basePath = path.normalize(basePath);
		this.enableCache = enableCache;

		if (watchForChange) {
			this.watcher = chokidar.watch(this.basePath, {
				ignoreInitial: true,
				persistent: false
			});
			this.watcher.on('all', (e, fullPath) => {
				if (typeof this.cached[fullPath] !== 'undefined') {
					delete this.cached[fullPath];
				}
			});
			this.watcher.on('error', err => {
				// Dont buble up to node...
			});
		}
	}

	getSource (name) {
		var fullPath = path.resolve(this.basePath, path.normalize(name));

		if (this.enableCache === true && typeof this.cached[fullPath] !== 'undefined') {
			return this.cached[fullPath];
		}

		var source = {
			buffer: fs.readFileSync(fullPath, 'utf-8'),
			path: fullPath
		};

		this.cached[fullPath] = source;

		return source;
	}

}

module.exports = FileLoader;
