"use strict";

class Loader {

	getSource (name) {
		throw new Error('Load must extends this function.');
	}

}

module.exports = Loader;
