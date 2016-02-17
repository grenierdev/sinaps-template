"use strict";

var Loader = require('../Loader');
var path = require('path');

class WebLoader extends Loader {

	constructor (basePath, enableCache) {
		super();

		enableCache = typeof enableCache === 'undefined' ? true : !!enableCache;

		this.cached = {};
		this.basePath = path.normalize(basePath);
		this.enableCache = enableCache;
	}

	getSource (name) {
		var fullPath = path.resolve(this.basePath, path.normalize(name));

		if (this.enableCache === true && typeof this.cached[fullPath] !== 'undefined') {
			return this.cached[fullPath];
		}

		var ajax;
		if (window && window.XMLHttpRequest) {
			ajax = window.XMLHttpRequest();
		}
		else if (window && window.ActiveXObject) {
			ajax = new ActiveXObject('Microsoft.XMLHTTP');
		}

		ajax.open('GET', fullPath, false);
		ajax.send(null);

		var source;
		if (ajax.status === 200) {
			source = {
				buffer: ajax.responseText,
				path: fullPath
			};
		} else {
			source = {};
		}

		this.cached[fullPath] = source;
		return source;
	}

}
