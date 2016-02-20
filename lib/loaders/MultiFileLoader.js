"use strict";

var _ = require('lodash');
var Loader = require('../Loader');
var path = require('path');
var fs = require('fs');
var chokidar = require('chokidar');

class MultiFileLoader extends Loader {

	constructor (basePaths, enableCache, watchForChange) {
		super();

		enableCache = typeof enableCache === 'undefined' ? true : !!enableCache;
		watchForChange = typeof watchForChange === 'undefined' ? false : !!watchForChange;

		this.cached = {};
		this.basePaths = _.mapValues(basePaths, p => path.normalize(p));
		this.enableCache = enableCache;
		this.watchForChange = watchForChange;
		this.watchers = [];

		if (watchForChange) {
			_.each(basePaths, path => {
				this._watchPath(path);
			});
		}
	}

	addBasePath (virtual, p) {
		p = path.normalize(p);
		this.basePaths[virtual] = p;

		if (this.watchForChange) {
			this._watchPath(p);
		}
	}

	_watchPath (path) {
		var watcher = chokidar.watch(path, {
			ignoreInitial: true,
			persistent: false
		});
		watcher.on('all', (e, fullPath) => {
			if (typeof this.cached[fullPath] !== 'undefined') {
				delete this.cached[fullPath];
			}
		});
		watcher.on('error', err => {
			// Dont buble up to node...
		});

		this.watchers.push(watcher);
	}

	getSource (name) {
		var fullPath = path.normalize(name);
		var paths = fullPath.split(path.sep);
		var virtual = paths.shift();

		if (typeof this.basePaths[virtual] == 'undefined') {
			paths.unshift(virtual);
			virtual = 'public';
		}

		fullPath = path.join(this.basePaths[virtual], paths.join(path.sep));

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

module.exports = MultiFileLoader;
