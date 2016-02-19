(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":2}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
(function (global){
/**
 * @license
 * lodash 4.3.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash -d -o ./foo/lodash.js`
 * Copyright 2012-2016 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
;(function() {

  /** Used as a safe reference for `undefined` in pre-ES5 environments. */
  var undefined;

  /** Used as the semantic version number. */
  var VERSION = '4.3.0';

  /** Used to compose bitmasks for wrapper metadata. */
  var BIND_FLAG = 1,
      BIND_KEY_FLAG = 2,
      CURRY_BOUND_FLAG = 4,
      CURRY_FLAG = 8,
      CURRY_RIGHT_FLAG = 16,
      PARTIAL_FLAG = 32,
      PARTIAL_RIGHT_FLAG = 64,
      ARY_FLAG = 128,
      REARG_FLAG = 256,
      FLIP_FLAG = 512;

  /** Used to compose bitmasks for comparison styles. */
  var UNORDERED_COMPARE_FLAG = 1,
      PARTIAL_COMPARE_FLAG = 2;

  /** Used as default options for `_.truncate`. */
  var DEFAULT_TRUNC_LENGTH = 30,
      DEFAULT_TRUNC_OMISSION = '...';

  /** Used to detect hot functions by number of calls within a span of milliseconds. */
  var HOT_COUNT = 150,
      HOT_SPAN = 16;

  /** Used as the size to enable large array optimizations. */
  var LARGE_ARRAY_SIZE = 200;

  /** Used to indicate the type of lazy iteratees. */
  var LAZY_FILTER_FLAG = 1,
      LAZY_MAP_FLAG = 2,
      LAZY_WHILE_FLAG = 3;

  /** Used as the `TypeError` message for "Functions" methods. */
  var FUNC_ERROR_TEXT = 'Expected a function';

  /** Used to stand-in for `undefined` hash values. */
  var HASH_UNDEFINED = '__lodash_hash_undefined__';

  /** Used as references for various `Number` constants. */
  var INFINITY = 1 / 0,
      MAX_SAFE_INTEGER = 9007199254740991,
      MAX_INTEGER = 1.7976931348623157e+308,
      NAN = 0 / 0;

  /** Used as references for the maximum length and index of an array. */
  var MAX_ARRAY_LENGTH = 4294967295,
      MAX_ARRAY_INDEX = MAX_ARRAY_LENGTH - 1,
      HALF_MAX_ARRAY_LENGTH = MAX_ARRAY_LENGTH >>> 1;

  /** Used as the internal argument placeholder. */
  var PLACEHOLDER = '__lodash_placeholder__';

  /** `Object#toString` result references. */
  var argsTag = '[object Arguments]',
      arrayTag = '[object Array]',
      boolTag = '[object Boolean]',
      dateTag = '[object Date]',
      errorTag = '[object Error]',
      funcTag = '[object Function]',
      genTag = '[object GeneratorFunction]',
      mapTag = '[object Map]',
      numberTag = '[object Number]',
      objectTag = '[object Object]',
      regexpTag = '[object RegExp]',
      setTag = '[object Set]',
      stringTag = '[object String]',
      symbolTag = '[object Symbol]',
      weakMapTag = '[object WeakMap]',
      weakSetTag = '[object WeakSet]';

  var arrayBufferTag = '[object ArrayBuffer]',
      float32Tag = '[object Float32Array]',
      float64Tag = '[object Float64Array]',
      int8Tag = '[object Int8Array]',
      int16Tag = '[object Int16Array]',
      int32Tag = '[object Int32Array]',
      uint8Tag = '[object Uint8Array]',
      uint8ClampedTag = '[object Uint8ClampedArray]',
      uint16Tag = '[object Uint16Array]',
      uint32Tag = '[object Uint32Array]';

  /** Used to match empty string literals in compiled template source. */
  var reEmptyStringLeading = /\b__p \+= '';/g,
      reEmptyStringMiddle = /\b(__p \+=) '' \+/g,
      reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;

  /** Used to match HTML entities and HTML characters. */
  var reEscapedHtml = /&(?:amp|lt|gt|quot|#39|#96);/g,
      reUnescapedHtml = /[&<>"'`]/g,
      reHasEscapedHtml = RegExp(reEscapedHtml.source),
      reHasUnescapedHtml = RegExp(reUnescapedHtml.source);

  /** Used to match template delimiters. */
  var reEscape = /<%-([\s\S]+?)%>/g,
      reEvaluate = /<%([\s\S]+?)%>/g,
      reInterpolate = /<%=([\s\S]+?)%>/g;

  /** Used to match property names within property paths. */
  var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
      reIsPlainProp = /^\w*$/,
      rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]/g;

  /** Used to match `RegExp` [syntax characters](http://ecma-international.org/ecma-262/6.0/#sec-patterns). */
  var reRegExpChar = /[\\^$.*+?()[\]{}|]/g,
      reHasRegExpChar = RegExp(reRegExpChar.source);

  /** Used to match leading and trailing whitespace. */
  var reTrim = /^\s+|\s+$/g,
      reTrimStart = /^\s+/,
      reTrimEnd = /\s+$/;

  /** Used to match backslashes in property paths. */
  var reEscapeChar = /\\(\\)?/g;

  /** Used to match [ES template delimiters](http://ecma-international.org/ecma-262/6.0/#sec-template-literal-lexical-components). */
  var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;

  /** Used to match `RegExp` flags from their coerced string values. */
  var reFlags = /\w*$/;

  /** Used to detect hexadecimal string values. */
  var reHasHexPrefix = /^0x/i;

  /** Used to detect bad signed hexadecimal string values. */
  var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

  /** Used to detect binary string values. */
  var reIsBinary = /^0b[01]+$/i;

  /** Used to detect host constructors (Safari > 5). */
  var reIsHostCtor = /^\[object .+?Constructor\]$/;

  /** Used to detect octal string values. */
  var reIsOctal = /^0o[0-7]+$/i;

  /** Used to detect unsigned integer values. */
  var reIsUint = /^(?:0|[1-9]\d*)$/;

  /** Used to match latin-1 supplementary letters (excluding mathematical operators). */
  var reLatin1 = /[\xc0-\xd6\xd8-\xde\xdf-\xf6\xf8-\xff]/g;

  /** Used to ensure capturing order of template delimiters. */
  var reNoMatch = /($^)/;

  /** Used to match unescaped characters in compiled string literals. */
  var reUnescapedString = /['\n\r\u2028\u2029\\]/g;

  /** Used to compose unicode character classes. */
  var rsAstralRange = '\\ud800-\\udfff',
      rsComboMarksRange = '\\u0300-\\u036f\\ufe20-\\ufe23',
      rsComboSymbolsRange = '\\u20d0-\\u20f0',
      rsDingbatRange = '\\u2700-\\u27bf',
      rsLowerRange = 'a-z\\xdf-\\xf6\\xf8-\\xff',
      rsMathOpRange = '\\xac\\xb1\\xd7\\xf7',
      rsNonCharRange = '\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf',
      rsQuoteRange = '\\u2018\\u2019\\u201c\\u201d',
      rsSpaceRange = ' \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000',
      rsUpperRange = 'A-Z\\xc0-\\xd6\\xd8-\\xde',
      rsVarRange = '\\ufe0e\\ufe0f',
      rsBreakRange = rsMathOpRange + rsNonCharRange + rsQuoteRange + rsSpaceRange;

  /** Used to compose unicode capture groups. */
  var rsAstral = '[' + rsAstralRange + ']',
      rsBreak = '[' + rsBreakRange + ']',
      rsCombo = '[' + rsComboMarksRange + rsComboSymbolsRange + ']',
      rsDigits = '\\d+',
      rsDingbat = '[' + rsDingbatRange + ']',
      rsLower = '[' + rsLowerRange + ']',
      rsMisc = '[^' + rsAstralRange + rsBreakRange + rsDigits + rsDingbatRange + rsLowerRange + rsUpperRange + ']',
      rsFitz = '\\ud83c[\\udffb-\\udfff]',
      rsModifier = '(?:' + rsCombo + '|' + rsFitz + ')',
      rsNonAstral = '[^' + rsAstralRange + ']',
      rsRegional = '(?:\\ud83c[\\udde6-\\uddff]){2}',
      rsSurrPair = '[\\ud800-\\udbff][\\udc00-\\udfff]',
      rsUpper = '[' + rsUpperRange + ']',
      rsZWJ = '\\u200d';

  /** Used to compose unicode regexes. */
  var rsLowerMisc = '(?:' + rsLower + '|' + rsMisc + ')',
      rsUpperMisc = '(?:' + rsUpper + '|' + rsMisc + ')',
      reOptMod = rsModifier + '?',
      rsOptVar = '[' + rsVarRange + ']?',
      rsOptJoin = '(?:' + rsZWJ + '(?:' + [rsNonAstral, rsRegional, rsSurrPair].join('|') + ')' + rsOptVar + reOptMod + ')*',
      rsSeq = rsOptVar + reOptMod + rsOptJoin,
      rsEmoji = '(?:' + [rsDingbat, rsRegional, rsSurrPair].join('|') + ')' + rsSeq,
      rsSymbol = '(?:' + [rsNonAstral + rsCombo + '?', rsCombo, rsRegional, rsSurrPair, rsAstral].join('|') + ')';

  /**
   * Used to match [combining diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks) and
   * [combining diacritical marks for symbols](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks_for_Symbols).
   */
  var reComboMark = RegExp(rsCombo, 'g');

  /** Used to match [string symbols](https://mathiasbynens.be/notes/javascript-unicode). */
  var reComplexSymbol = RegExp(rsFitz + '(?=' + rsFitz + ')|' + rsSymbol + rsSeq, 'g');

  /** Used to detect strings with [zero-width joiners or code points from the astral planes](http://eev.ee/blog/2015/09/12/dark-corners-of-unicode/). */
  var reHasComplexSymbol = RegExp('[' + rsZWJ + rsAstralRange  + rsComboMarksRange + rsComboSymbolsRange + rsVarRange + ']');

  /** Used to match non-compound words composed of alphanumeric characters. */
  var reBasicWord = /[a-zA-Z0-9]+/g;

  /** Used to match complex or compound words. */
  var reComplexWord = RegExp([
    rsUpper + '?' + rsLower + '+(?=' + [rsBreak, rsUpper, '$'].join('|') + ')',
    rsUpperMisc + '+(?=' + [rsBreak, rsUpper + rsLowerMisc, '$'].join('|') + ')',
    rsUpper + '?' + rsLowerMisc + '+',
    rsUpper + '+',
    rsDigits,
    rsEmoji
  ].join('|'), 'g');

  /** Used to detect strings that need a more robust regexp to match words. */
  var reHasComplexWord = /[a-z][A-Z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/;

  /** Used to assign default `context` object properties. */
  var contextProps = [
    'Array', 'Buffer', 'Date', 'Error', 'Float32Array', 'Float64Array',
    'Function', 'Int8Array', 'Int16Array', 'Int32Array', 'Map', 'Math', 'Object',
    'Reflect', 'RegExp', 'Set', 'String', 'Symbol', 'TypeError', 'Uint8Array',
    'Uint8ClampedArray', 'Uint16Array', 'Uint32Array', 'WeakMap', '_',
    'clearTimeout', 'isFinite', 'parseInt', 'setTimeout'
  ];

  /** Used to make template sourceURLs easier to identify. */
  var templateCounter = -1;

  /** Used to identify `toStringTag` values of typed arrays. */
  var typedArrayTags = {};
  typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
  typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
  typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
  typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
  typedArrayTags[uint32Tag] = true;
  typedArrayTags[argsTag] = typedArrayTags[arrayTag] =
  typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
  typedArrayTags[dateTag] = typedArrayTags[errorTag] =
  typedArrayTags[funcTag] = typedArrayTags[mapTag] =
  typedArrayTags[numberTag] = typedArrayTags[objectTag] =
  typedArrayTags[regexpTag] = typedArrayTags[setTag] =
  typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;

  /** Used to identify `toStringTag` values supported by `_.clone`. */
  var cloneableTags = {};
  cloneableTags[argsTag] = cloneableTags[arrayTag] =
  cloneableTags[arrayBufferTag] = cloneableTags[boolTag] =
  cloneableTags[dateTag] = cloneableTags[float32Tag] =
  cloneableTags[float64Tag] = cloneableTags[int8Tag] =
  cloneableTags[int16Tag] = cloneableTags[int32Tag] =
  cloneableTags[mapTag] = cloneableTags[numberTag] =
  cloneableTags[objectTag] = cloneableTags[regexpTag] =
  cloneableTags[setTag] = cloneableTags[stringTag] =
  cloneableTags[symbolTag] = cloneableTags[uint8Tag] =
  cloneableTags[uint8ClampedTag] = cloneableTags[uint16Tag] =
  cloneableTags[uint32Tag] = true;
  cloneableTags[errorTag] = cloneableTags[funcTag] =
  cloneableTags[weakMapTag] = false;

  /** Used to map latin-1 supplementary letters to basic latin letters. */
  var deburredLetters = {
    '\xc0': 'A',  '\xc1': 'A', '\xc2': 'A', '\xc3': 'A', '\xc4': 'A', '\xc5': 'A',
    '\xe0': 'a',  '\xe1': 'a', '\xe2': 'a', '\xe3': 'a', '\xe4': 'a', '\xe5': 'a',
    '\xc7': 'C',  '\xe7': 'c',
    '\xd0': 'D',  '\xf0': 'd',
    '\xc8': 'E',  '\xc9': 'E', '\xca': 'E', '\xcb': 'E',
    '\xe8': 'e',  '\xe9': 'e', '\xea': 'e', '\xeb': 'e',
    '\xcC': 'I',  '\xcd': 'I', '\xce': 'I', '\xcf': 'I',
    '\xeC': 'i',  '\xed': 'i', '\xee': 'i', '\xef': 'i',
    '\xd1': 'N',  '\xf1': 'n',
    '\xd2': 'O',  '\xd3': 'O', '\xd4': 'O', '\xd5': 'O', '\xd6': 'O', '\xd8': 'O',
    '\xf2': 'o',  '\xf3': 'o', '\xf4': 'o', '\xf5': 'o', '\xf6': 'o', '\xf8': 'o',
    '\xd9': 'U',  '\xda': 'U', '\xdb': 'U', '\xdc': 'U',
    '\xf9': 'u',  '\xfa': 'u', '\xfb': 'u', '\xfc': 'u',
    '\xdd': 'Y',  '\xfd': 'y', '\xff': 'y',
    '\xc6': 'Ae', '\xe6': 'ae',
    '\xde': 'Th', '\xfe': 'th',
    '\xdf': 'ss'
  };

  /** Used to map characters to HTML entities. */
  var htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;'
  };

  /** Used to map HTML entities to characters. */
  var htmlUnescapes = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#96;': '`'
  };

  /** Used to determine if values are of the language type `Object`. */
  var objectTypes = {
    'function': true,
    'object': true
  };

  /** Used to escape characters for inclusion in compiled string literals. */
  var stringEscapes = {
    '\\': '\\',
    "'": "'",
    '\n': 'n',
    '\r': 'r',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  /** Built-in method references without a dependency on `root`. */
  var freeParseFloat = parseFloat,
      freeParseInt = parseInt;

  /** Detect free variable `exports`. */
  var freeExports = (objectTypes[typeof exports] && exports && !exports.nodeType) ? exports : null;

  /** Detect free variable `module`. */
  var freeModule = (objectTypes[typeof module] && module && !module.nodeType) ? module : null;

  /** Detect free variable `global` from Node.js. */
  var freeGlobal = checkGlobal(freeExports && freeModule && typeof global == 'object' && global);

  /** Detect free variable `self`. */
  var freeSelf = checkGlobal(objectTypes[typeof self] && self);

  /** Detect free variable `window`. */
  var freeWindow = checkGlobal(objectTypes[typeof window] && window);

  /** Detect the popular CommonJS extension `module.exports`. */
  var moduleExports = (freeModule && freeModule.exports === freeExports) ? freeExports : null;

  /** Detect `this` as the global object. */
  var thisGlobal = checkGlobal(objectTypes[typeof this] && this);

  /**
   * Used as a reference to the global object.
   *
   * The `this` value is used if it's the global object to avoid Greasemonkey's
   * restricted `window` object, otherwise the `window` object is used.
   */
  var root = freeGlobal || ((freeWindow !== (thisGlobal && thisGlobal.window)) && freeWindow) || freeSelf || thisGlobal || Function('return this')();

  /*--------------------------------------------------------------------------*/

  /**
   * Adds the key-value `pair` to `map`.
   *
   * @private
   * @param {Object} map The map to modify.
   * @param {Array} pair The key-value pair to add.
   * @returns {Object} Returns `map`.
   */
  function addMapEntry(map, pair) {
    map.set(pair[0], pair[1]);
    return map;
  }

  /**
   * Adds `value` to `set`.
   *
   * @private
   * @param {Object} set The set to modify.
   * @param {*} value The value to add.
   * @returns {Object} Returns `set`.
   */
  function addSetEntry(set, value) {
    set.add(value);
    return set;
  }

  /**
   * A faster alternative to `Function#apply`, this function invokes `func`
   * with the `this` binding of `thisArg` and the arguments of `args`.
   *
   * @private
   * @param {Function} func The function to invoke.
   * @param {*} thisArg The `this` binding of `func`.
   * @param {...*} args The arguments to invoke `func` with.
   * @returns {*} Returns the result of `func`.
   */
  function apply(func, thisArg, args) {
    var length = args.length;
    switch (length) {
      case 0: return func.call(thisArg);
      case 1: return func.call(thisArg, args[0]);
      case 2: return func.call(thisArg, args[0], args[1]);
      case 3: return func.call(thisArg, args[0], args[1], args[2]);
    }
    return func.apply(thisArg, args);
  }

  /**
   * A specialized version of `baseAggregator` for arrays.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} setter The function to set `accumulator` values.
   * @param {Function} iteratee The iteratee to transform keys.
   * @param {Object} accumulator The initial aggregated object.
   * @returns {Function} Returns `accumulator`.
   */
  function arrayAggregator(array, setter, iteratee, accumulator) {
    var index = -1,
        length = array.length;

    while (++index < length) {
      var value = array[index];
      setter(accumulator, value, iteratee(value), array);
    }
    return accumulator;
  }

  /**
   * Creates a new array concatenating `array` with `other`.
   *
   * @private
   * @param {Array} array The first array to concatenate.
   * @param {Array} other The second array to concatenate.
   * @returns {Array} Returns the new concatenated array.
   */
  function arrayConcat(array, other) {
    var index = -1,
        length = array.length,
        othIndex = -1,
        othLength = other.length,
        result = Array(length + othLength);

    while (++index < length) {
      result[index] = array[index];
    }
    while (++othIndex < othLength) {
      result[index++] = other[othIndex];
    }
    return result;
  }

  /**
   * A specialized version of `_.forEach` for arrays without support for
   * iteratee shorthands.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns `array`.
   */
  function arrayEach(array, iteratee) {
    var index = -1,
        length = array.length;

    while (++index < length) {
      if (iteratee(array[index], index, array) === false) {
        break;
      }
    }
    return array;
  }

  /**
   * A specialized version of `_.forEachRight` for arrays without support for
   * iteratee shorthands.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns `array`.
   */
  function arrayEachRight(array, iteratee) {
    var length = array.length;

    while (length--) {
      if (iteratee(array[length], length, array) === false) {
        break;
      }
    }
    return array;
  }

  /**
   * A specialized version of `_.every` for arrays without support for
   * iteratee shorthands.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} predicate The function invoked per iteration.
   * @returns {boolean} Returns `true` if all elements pass the predicate check, else `false`.
   */
  function arrayEvery(array, predicate) {
    var index = -1,
        length = array.length;

    while (++index < length) {
      if (!predicate(array[index], index, array)) {
        return false;
      }
    }
    return true;
  }

  /**
   * A specialized version of `_.filter` for arrays without support for
   * iteratee shorthands.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} predicate The function invoked per iteration.
   * @returns {Array} Returns the new filtered array.
   */
  function arrayFilter(array, predicate) {
    var index = -1,
        length = array.length,
        resIndex = -1,
        result = [];

    while (++index < length) {
      var value = array[index];
      if (predicate(value, index, array)) {
        result[++resIndex] = value;
      }
    }
    return result;
  }

  /**
   * A specialized version of `_.includes` for arrays without support for
   * specifying an index to search from.
   *
   * @private
   * @param {Array} array The array to search.
   * @param {*} target The value to search for.
   * @returns {boolean} Returns `true` if `target` is found, else `false`.
   */
  function arrayIncludes(array, value) {
    return !!array.length && baseIndexOf(array, value, 0) > -1;
  }

  /**
   * A specialized version of `_.includesWith` for arrays without support for
   * specifying an index to search from.
   *
   * @private
   * @param {Array} array The array to search.
   * @param {*} target The value to search for.
   * @param {Function} comparator The comparator invoked per element.
   * @returns {boolean} Returns `true` if `target` is found, else `false`.
   */
  function arrayIncludesWith(array, value, comparator) {
    var index = -1,
        length = array.length;

    while (++index < length) {
      if (comparator(value, array[index])) {
        return true;
      }
    }
    return false;
  }

  /**
   * A specialized version of `_.map` for arrays without support for iteratee
   * shorthands.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns the new mapped array.
   */
  function arrayMap(array, iteratee) {
    var index = -1,
        length = array.length,
        result = Array(length);

    while (++index < length) {
      result[index] = iteratee(array[index], index, array);
    }
    return result;
  }

  /**
   * Appends the elements of `values` to `array`.
   *
   * @private
   * @param {Array} array The array to modify.
   * @param {Array} values The values to append.
   * @returns {Array} Returns `array`.
   */
  function arrayPush(array, values) {
    var index = -1,
        length = values.length,
        offset = array.length;

    while (++index < length) {
      array[offset + index] = values[index];
    }
    return array;
  }

  /**
   * A specialized version of `_.reduce` for arrays without support for
   * iteratee shorthands.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @param {*} [accumulator] The initial value.
   * @param {boolean} [initAccum] Specify using the first element of `array` as the initial value.
   * @returns {*} Returns the accumulated value.
   */
  function arrayReduce(array, iteratee, accumulator, initAccum) {
    var index = -1,
        length = array.length;

    if (initAccum && length) {
      accumulator = array[++index];
    }
    while (++index < length) {
      accumulator = iteratee(accumulator, array[index], index, array);
    }
    return accumulator;
  }

  /**
   * A specialized version of `_.reduceRight` for arrays without support for
   * iteratee shorthands.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @param {*} [accumulator] The initial value.
   * @param {boolean} [initAccum] Specify using the last element of `array` as the initial value.
   * @returns {*} Returns the accumulated value.
   */
  function arrayReduceRight(array, iteratee, accumulator, initAccum) {
    var length = array.length;
    if (initAccum && length) {
      accumulator = array[--length];
    }
    while (length--) {
      accumulator = iteratee(accumulator, array[length], length, array);
    }
    return accumulator;
  }

  /**
   * A specialized version of `_.some` for arrays without support for iteratee
   * shorthands.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} predicate The function invoked per iteration.
   * @returns {boolean} Returns `true` if any element passes the predicate check, else `false`.
   */
  function arraySome(array, predicate) {
    var index = -1,
        length = array.length;

    while (++index < length) {
      if (predicate(array[index], index, array)) {
        return true;
      }
    }
    return false;
  }

  /**
   * The base implementation of methods like `_.max` and `_.min` which accepts a
   * `comparator` to determine the extremum value.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} iteratee The iteratee invoked per iteration.
   * @param {Function} comparator The comparator used to compare values.
   * @returns {*} Returns the extremum value.
   */
  function baseExtremum(array, iteratee, comparator) {
    var index = -1,
        length = array.length;

    while (++index < length) {
      var value = array[index],
          current = iteratee(value);

      if (current != null && (computed === undefined
            ? current === current
            : comparator(current, computed)
          )) {
        var computed = current,
            result = value;
      }
    }
    return result;
  }

  /**
   * The base implementation of methods like `_.find` and `_.findKey`, without
   * support for iteratee shorthands, which iterates over `collection` using
   * `eachFunc`.
   *
   * @private
   * @param {Array|Object} collection The collection to search.
   * @param {Function} predicate The function invoked per iteration.
   * @param {Function} eachFunc The function to iterate over `collection`.
   * @param {boolean} [retKey] Specify returning the key of the found element instead of the element itself.
   * @returns {*} Returns the found element or its key, else `undefined`.
   */
  function baseFind(collection, predicate, eachFunc, retKey) {
    var result;
    eachFunc(collection, function(value, key, collection) {
      if (predicate(value, key, collection)) {
        result = retKey ? key : value;
        return false;
      }
    });
    return result;
  }

  /**
   * The base implementation of `_.findIndex` and `_.findLastIndex` without
   * support for iteratee shorthands.
   *
   * @private
   * @param {Array} array The array to search.
   * @param {Function} predicate The function invoked per iteration.
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {number} Returns the index of the matched value, else `-1`.
   */
  function baseFindIndex(array, predicate, fromRight) {
    var length = array.length,
        index = fromRight ? length : -1;

    while ((fromRight ? index-- : ++index < length)) {
      if (predicate(array[index], index, array)) {
        return index;
      }
    }
    return -1;
  }

  /**
   * The base implementation of `_.indexOf` without `fromIndex` bounds checks.
   *
   * @private
   * @param {Array} array The array to search.
   * @param {*} value The value to search for.
   * @param {number} fromIndex The index to search from.
   * @returns {number} Returns the index of the matched value, else `-1`.
   */
  function baseIndexOf(array, value, fromIndex) {
    if (value !== value) {
      return indexOfNaN(array, fromIndex);
    }
    var index = fromIndex - 1,
        length = array.length;

    while (++index < length) {
      if (array[index] === value) {
        return index;
      }
    }
    return -1;
  }

  /**
   * The base implementation of `_.reduce` and `_.reduceRight`, without support
   * for iteratee shorthands, which iterates over `collection` using `eachFunc`.
   *
   * @private
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @param {*} accumulator The initial value.
   * @param {boolean} initAccum Specify using the first or last element of `collection` as the initial value.
   * @param {Function} eachFunc The function to iterate over `collection`.
   * @returns {*} Returns the accumulated value.
   */
  function baseReduce(collection, iteratee, accumulator, initAccum, eachFunc) {
    eachFunc(collection, function(value, index, collection) {
      accumulator = initAccum
        ? (initAccum = false, value)
        : iteratee(accumulator, value, index, collection);
    });
    return accumulator;
  }

  /**
   * The base implementation of `_.sortBy` which uses `comparer` to define
   * the sort order of `array` and replaces criteria objects with their
   * corresponding values.
   *
   * @private
   * @param {Array} array The array to sort.
   * @param {Function} comparer The function to define sort order.
   * @returns {Array} Returns `array`.
   */
  function baseSortBy(array, comparer) {
    var length = array.length;

    array.sort(comparer);
    while (length--) {
      array[length] = array[length].value;
    }
    return array;
  }

  /**
   * The base implementation of `_.sum` without support for iteratee shorthands.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {number} Returns the sum.
   */
  function baseSum(array, iteratee) {
    var result,
        index = -1,
        length = array.length;

    while (++index < length) {
      var current = iteratee(array[index]);
      if (current !== undefined) {
        result = result === undefined ? current : (result + current);
      }
    }
    return result;
  }

  /**
   * The base implementation of `_.times` without support for iteratee shorthands
   * or max array length checks.
   *
   * @private
   * @param {number} n The number of times to invoke `iteratee`.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns the array of results.
   */
  function baseTimes(n, iteratee) {
    var index = -1,
        result = Array(n);

    while (++index < n) {
      result[index] = iteratee(index);
    }
    return result;
  }

  /**
   * The base implementation of `_.toPairs` and `_.toPairsIn` which creates an array
   * of key-value pairs for `object` corresponding to the property names of `props`.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {Array} props The property names to get values for.
   * @returns {Object} Returns the new array of key-value pairs.
   */
  function baseToPairs(object, props) {
    return arrayMap(props, function(key) {
      return [key, object[key]];
    });
  }

  /**
   * The base implementation of `_.unary` without support for storing wrapper metadata.
   *
   * @private
   * @param {Function} func The function to cap arguments for.
   * @returns {Function} Returns the new function.
   */
  function baseUnary(func) {
    return function(value) {
      return func(value);
    };
  }

  /**
   * The base implementation of `_.values` and `_.valuesIn` which creates an
   * array of `object` property values corresponding to the property names
   * of `props`.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {Array} props The property names to get values for.
   * @returns {Object} Returns the array of property values.
   */
  function baseValues(object, props) {
    return arrayMap(props, function(key) {
      return object[key];
    });
  }

  /**
   * Used by `_.trim` and `_.trimStart` to get the index of the first string symbol
   * that is not found in the character symbols.
   *
   * @private
   * @param {Array} strSymbols The string symbols to inspect.
   * @param {Array} chrSymbols The character symbols to find.
   * @returns {number} Returns the index of the first unmatched string symbol.
   */
  function charsStartIndex(strSymbols, chrSymbols) {
    var index = -1,
        length = strSymbols.length;

    while (++index < length && baseIndexOf(chrSymbols, strSymbols[index], 0) > -1) {}
    return index;
  }

  /**
   * Used by `_.trim` and `_.trimEnd` to get the index of the last string symbol
   * that is not found in the character symbols.
   *
   * @private
   * @param {Array} strSymbols The string symbols to inspect.
   * @param {Array} chrSymbols The character symbols to find.
   * @returns {number} Returns the index of the last unmatched string symbol.
   */
  function charsEndIndex(strSymbols, chrSymbols) {
    var index = strSymbols.length;

    while (index-- && baseIndexOf(chrSymbols, strSymbols[index], 0) > -1) {}
    return index;
  }

  /**
   * Checks if `value` is a global object.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {null|Object} Returns `value` if it's a global object, else `null`.
   */
  function checkGlobal(value) {
    return (value && value.Object === Object) ? value : null;
  }

  /**
   * Compares values to sort them in ascending order.
   *
   * @private
   * @param {*} value The value to compare.
   * @param {*} other The other value to compare.
   * @returns {number} Returns the sort order indicator for `value`.
   */
  function compareAscending(value, other) {
    if (value !== other) {
      var valIsNull = value === null,
          valIsUndef = value === undefined,
          valIsReflexive = value === value;

      var othIsNull = other === null,
          othIsUndef = other === undefined,
          othIsReflexive = other === other;

      if ((value > other && !othIsNull) || !valIsReflexive ||
          (valIsNull && !othIsUndef && othIsReflexive) ||
          (valIsUndef && othIsReflexive)) {
        return 1;
      }
      if ((value < other && !valIsNull) || !othIsReflexive ||
          (othIsNull && !valIsUndef && valIsReflexive) ||
          (othIsUndef && valIsReflexive)) {
        return -1;
      }
    }
    return 0;
  }

  /**
   * Used by `_.orderBy` to compare multiple properties of a value to another
   * and stable sort them.
   *
   * If `orders` is unspecified, all values are sorted in ascending order. Otherwise,
   * specify an order of "desc" for descending or "asc" for ascending sort order
   * of corresponding values.
   *
   * @private
   * @param {Object} object The object to compare.
   * @param {Object} other The other object to compare.
   * @param {boolean[]|string[]} orders The order to sort by for each property.
   * @returns {number} Returns the sort order indicator for `object`.
   */
  function compareMultiple(object, other, orders) {
    var index = -1,
        objCriteria = object.criteria,
        othCriteria = other.criteria,
        length = objCriteria.length,
        ordersLength = orders.length;

    while (++index < length) {
      var result = compareAscending(objCriteria[index], othCriteria[index]);
      if (result) {
        if (index >= ordersLength) {
          return result;
        }
        var order = orders[index];
        return result * (order == 'desc' ? -1 : 1);
      }
    }
    // Fixes an `Array#sort` bug in the JS engine embedded in Adobe applications
    // that causes it, under certain circumstances, to provide the same value for
    // `object` and `other`. See https://github.com/jashkenas/underscore/pull/1247
    // for more details.
    //
    // This also ensures a stable sort in V8 and other engines.
    // See https://code.google.com/p/v8/issues/detail?id=90 for more details.
    return object.index - other.index;
  }

  /**
   * Used by `_.deburr` to convert latin-1 supplementary letters to basic latin letters.
   *
   * @private
   * @param {string} letter The matched letter to deburr.
   * @returns {string} Returns the deburred letter.
   */
  function deburrLetter(letter) {
    return deburredLetters[letter];
  }

  /**
   * Used by `_.escape` to convert characters to HTML entities.
   *
   * @private
   * @param {string} chr The matched character to escape.
   * @returns {string} Returns the escaped character.
   */
  function escapeHtmlChar(chr) {
    return htmlEscapes[chr];
  }

  /**
   * Used by `_.template` to escape characters for inclusion in compiled string literals.
   *
   * @private
   * @param {string} chr The matched character to escape.
   * @returns {string} Returns the escaped character.
   */
  function escapeStringChar(chr) {
    return '\\' + stringEscapes[chr];
  }

  /**
   * Gets the index at which the first occurrence of `NaN` is found in `array`.
   *
   * @private
   * @param {Array} array The array to search.
   * @param {number} fromIndex The index to search from.
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {number} Returns the index of the matched `NaN`, else `-1`.
   */
  function indexOfNaN(array, fromIndex, fromRight) {
    var length = array.length,
        index = fromIndex + (fromRight ? 0 : -1);

    while ((fromRight ? index-- : ++index < length)) {
      var other = array[index];
      if (other !== other) {
        return index;
      }
    }
    return -1;
  }

  /**
   * Checks if `value` is a host object in IE < 9.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a host object, else `false`.
   */
  function isHostObject(value) {
    // Many host objects are `Object` objects that can coerce to strings
    // despite having improperly defined `toString` methods.
    var result = false;
    if (value != null && typeof value.toString != 'function') {
      try {
        result = !!(value + '');
      } catch (e) {}
    }
    return result;
  }

  /**
   * Checks if `value` is a valid array-like index.
   *
   * @private
   * @param {*} value The value to check.
   * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
   * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
   */
  function isIndex(value, length) {
    value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
    length = length == null ? MAX_SAFE_INTEGER : length;
    return value > -1 && value % 1 == 0 && value < length;
  }

  /**
   * Converts `iterator` to an array.
   *
   * @private
   * @param {Object} iterator The iterator to convert.
   * @returns {Array} Returns the converted array.
   */
  function iteratorToArray(iterator) {
    var data,
        result = [];

    while (!(data = iterator.next()).done) {
      result.push(data.value);
    }
    return result;
  }

  /**
   * Converts `map` to an array.
   *
   * @private
   * @param {Object} map The map to convert.
   * @returns {Array} Returns the converted array.
   */
  function mapToArray(map) {
    var index = -1,
        result = Array(map.size);

    map.forEach(function(value, key) {
      result[++index] = [key, value];
    });
    return result;
  }

  /**
   * Replaces all `placeholder` elements in `array` with an internal placeholder
   * and returns an array of their indexes.
   *
   * @private
   * @param {Array} array The array to modify.
   * @param {*} placeholder The placeholder to replace.
   * @returns {Array} Returns the new array of placeholder indexes.
   */
  function replaceHolders(array, placeholder) {
    var index = -1,
        length = array.length,
        resIndex = -1,
        result = [];

    while (++index < length) {
      if (array[index] === placeholder) {
        array[index] = PLACEHOLDER;
        result[++resIndex] = index;
      }
    }
    return result;
  }

  /**
   * Converts `set` to an array.
   *
   * @private
   * @param {Object} set The set to convert.
   * @returns {Array} Returns the converted array.
   */
  function setToArray(set) {
    var index = -1,
        result = Array(set.size);

    set.forEach(function(value) {
      result[++index] = value;
    });
    return result;
  }

  /**
   * Gets the number of symbols in `string`.
   *
   * @private
   * @param {string} string The string to inspect.
   * @returns {number} Returns the string size.
   */
  function stringSize(string) {
    if (!(string && reHasComplexSymbol.test(string))) {
      return string.length;
    }
    var result = reComplexSymbol.lastIndex = 0;
    while (reComplexSymbol.test(string)) {
      result++;
    }
    return result;
  }

  /**
   * Converts `string` to an array.
   *
   * @private
   * @param {string} string The string to convert.
   * @returns {Array} Returns the converted array.
   */
  function stringToArray(string) {
    return string.match(reComplexSymbol);
  }

  /**
   * Used by `_.unescape` to convert HTML entities to characters.
   *
   * @private
   * @param {string} chr The matched character to unescape.
   * @returns {string} Returns the unescaped character.
   */
  function unescapeHtmlChar(chr) {
    return htmlUnescapes[chr];
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Create a new pristine `lodash` function using the `context` object.
   *
   * @static
   * @memberOf _
   * @category Util
   * @param {Object} [context=root] The context object.
   * @returns {Function} Returns a new `lodash` function.
   * @example
   *
   * _.mixin({ 'foo': _.constant('foo') });
   *
   * var lodash = _.runInContext();
   * lodash.mixin({ 'bar': lodash.constant('bar') });
   *
   * _.isFunction(_.foo);
   * // => true
   * _.isFunction(_.bar);
   * // => false
   *
   * lodash.isFunction(lodash.foo);
   * // => false
   * lodash.isFunction(lodash.bar);
   * // => true
   *
   * // Use `context` to mock `Date#getTime` use in `_.now`.
   * var mock = _.runInContext({
   *   'Date': function() {
   *     return { 'getTime': getTimeMock };
   *   }
   * });
   *
   * // Create a suped-up `defer` in Node.js.
   * var defer = _.runInContext({ 'setTimeout': setImmediate }).defer;
   */
  function runInContext(context) {
    context = context ? _.defaults({}, context, _.pick(root, contextProps)) : root;

    /** Built-in constructor references. */
    var Date = context.Date,
        Error = context.Error,
        Math = context.Math,
        RegExp = context.RegExp,
        TypeError = context.TypeError;

    /** Used for built-in method references. */
    var arrayProto = context.Array.prototype,
        objectProto = context.Object.prototype;

    /** Used to resolve the decompiled source of functions. */
    var funcToString = context.Function.prototype.toString;

    /** Used to check objects for own properties. */
    var hasOwnProperty = objectProto.hasOwnProperty;

    /** Used to generate unique IDs. */
    var idCounter = 0;

    /** Used to infer the `Object` constructor. */
    var objectCtorString = funcToString.call(Object);

    /**
     * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
     * of values.
     */
    var objectToString = objectProto.toString;

    /** Used to restore the original `_` reference in `_.noConflict`. */
    var oldDash = root._;

    /** Used to detect if a method is native. */
    var reIsNative = RegExp('^' +
      funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&')
      .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
    );

    /** Built-in value references. */
    var Buffer = moduleExports ? context.Buffer : undefined,
        Reflect = context.Reflect,
        Symbol = context.Symbol,
        Uint8Array = context.Uint8Array,
        clearTimeout = context.clearTimeout,
        enumerate = Reflect ? Reflect.enumerate : undefined,
        getPrototypeOf = Object.getPrototypeOf,
        getOwnPropertySymbols = Object.getOwnPropertySymbols,
        iteratorSymbol = typeof (iteratorSymbol = Symbol && Symbol.iterator) == 'symbol' ? iteratorSymbol : undefined,
        propertyIsEnumerable = objectProto.propertyIsEnumerable,
        setTimeout = context.setTimeout,
        splice = arrayProto.splice;

    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeCeil = Math.ceil,
        nativeFloor = Math.floor,
        nativeIsFinite = context.isFinite,
        nativeJoin = arrayProto.join,
        nativeKeys = Object.keys,
        nativeMax = Math.max,
        nativeMin = Math.min,
        nativeParseInt = context.parseInt,
        nativeRandom = Math.random,
        nativeReverse = arrayProto.reverse;

    /* Built-in method references that are verified to be native. */
    var Map = getNative(context, 'Map'),
        Set = getNative(context, 'Set'),
        WeakMap = getNative(context, 'WeakMap'),
        nativeCreate = getNative(Object, 'create');

    /** Used to store function metadata. */
    var metaMap = WeakMap && new WeakMap;

    /** Used to detect maps, sets, and weakmaps. */
    var mapCtorString = Map ? funcToString.call(Map) : '',
        setCtorString = Set ? funcToString.call(Set) : '',
        weakMapCtorString = WeakMap ? funcToString.call(WeakMap) : '';

    /** Used to convert symbols to primitives and strings. */
    var symbolProto = Symbol ? Symbol.prototype : undefined,
        symbolValueOf = Symbol ? symbolProto.valueOf : undefined,
        symbolToString = Symbol ? symbolProto.toString : undefined;

    /** Used to lookup unminified function names. */
    var realNames = {};

    /*------------------------------------------------------------------------*/

    /**
     * Creates a `lodash` object which wraps `value` to enable implicit method
     * chaining. Methods that operate on and return arrays, collections, and
     * functions can be chained together. Methods that retrieve a single value or
     * may return a primitive value will automatically end the chain sequence and
     * return the unwrapped value. Otherwise, the value must be unwrapped with
     * `_#value`.
     *
     * Explicit chaining, which must be unwrapped with `_#value` in all cases,
     * may be enabled using `_.chain`.
     *
     * The execution of chained methods is lazy, that is, it's deferred until
     * `_#value` is implicitly or explicitly called.
     *
     * Lazy evaluation allows several methods to support shortcut fusion. Shortcut
     * fusion is an optimization to merge iteratee calls; this avoids the creation
     * of intermediate arrays and can greatly reduce the number of iteratee executions.
     * Sections of a chain sequence qualify for shortcut fusion if the section is
     * applied to an array of at least two hundred elements and any iteratees
     * accept only one argument. The heuristic for whether a section qualifies
     * for shortcut fusion is subject to change.
     *
     * Chaining is supported in custom builds as long as the `_#value` method is
     * directly or indirectly included in the build.
     *
     * In addition to lodash methods, wrappers have `Array` and `String` methods.
     *
     * The wrapper `Array` methods are:
     * `concat`, `join`, `pop`, `push`, `shift`, `sort`, `splice`, and `unshift`
     *
     * The wrapper `String` methods are:
     * `replace` and `split`
     *
     * The wrapper methods that support shortcut fusion are:
     * `at`, `compact`, `drop`, `dropRight`, `dropWhile`, `filter`, `find`,
     * `findLast`, `head`, `initial`, `last`, `map`, `reject`, `reverse`, `slice`,
     * `tail`, `take`, `takeRight`, `takeRightWhile`, `takeWhile`, and `toArray`
     *
     * The chainable wrapper methods are:
     * `after`, `ary`, `assign`, `assignIn`, `assignInWith`, `assignWith`,
     * `at`, `before`, `bind`, `bindAll`, `bindKey`, `chain`, `chunk`, `commit`,
     * `compact`, `concat`, `conforms`, `constant`, `countBy`, `create`, `curry`,
     * `debounce`, `defaults`, `defaultsDeep`, `defer`, `delay`, `difference`,
     * `differenceBy`, `differenceWith`, `drop`, `dropRight`, `dropRightWhile`,
     * `dropWhile`, `fill`, `filter`, `flatten`, `flattenDeep`, `flip`, `flow`,
     * `flowRight`, `fromPairs`, `functions`, `functionsIn`, `groupBy`, `initial`,
     * `intersection`, `intersectionBy`, `intersectionWith`, `invert`, `invertBy`,
     * `invokeMap`, `iteratee`, `keyBy`, `keys`, `keysIn`, `map`, `mapKeys`,
     * `mapValues`, `matches`, `matchesProperty`, `memoize`, `merge`, `mergeWith`,
     * `method`, `methodOf`, `mixin`, `negate`, `nthArg`, `omit`, `omitBy`, `once`,
     * `orderBy`, `over`, `overArgs`, `overEvery`, `overSome`, `partial`,
     * `partialRight`, `partition`, `pick`, `pickBy`, `plant`, `property`,
     * `propertyOf`, `pull`, `pullAll`, `pullAllBy`, `pullAt`, `push`, `range`,
     * `rangeRight`, `rearg`, `reject`, `remove`, `rest`, `reverse`, `sampleSize`,
     * `set`, `setWith`, `shuffle`, `slice`, `sort`, `sortBy`, `splice`, `spread`,
     * `tail`, `take`, `takeRight`, `takeRightWhile`, `takeWhile`, `tap`, `throttle`,
     * `thru`, `toArray`, `toPairs`, `toPairsIn`, `toPath`, `toPlainObject`,
     * `transform`, `unary`, `union`, `unionBy`, `unionWith`, `uniq`, `uniqBy`,
     * `uniqWith`, `unset`, `unshift`, `unzip`, `unzipWith`, `values`, `valuesIn`,
     * `without`, `wrap`, `xor`, `xorBy`, `xorWith`, `zip`, `zipObject`,
     * `zipObjectDeep`, and `zipWith`
     *
     * The wrapper methods that are **not** chainable by default are:
     * `add`, `attempt`, `camelCase`, `capitalize`, `ceil`, `clamp`, `clone`,
     * `cloneDeep`, `cloneDeepWith`, `cloneWith`, `deburr`, `endsWith`, `eq`,
     * `escape`, `escapeRegExp`, `every`, `find`, `findIndex`, `findKey`,
     * `findLast`, `findLastIndex`, `findLastKey`, `floor`, `forEach`, `forEachRight`,
     * `forIn`, `forInRight`, `forOwn`, `forOwnRight`, `get`, `gt`, `gte`, `has`,
     * `hasIn`, `head`, `identity`, `includes`, `indexOf`, `inRange`, `invoke`,
     * `isArguments`, `isArray`, `isArrayLike`, `isArrayLikeObject`, `isBoolean`,
     * `isDate`, `isElement`, `isEmpty`, `isEqual`, `isEqualWith`, `isError`,
     * `isFinite`, `isFunction`, `isInteger`, `isLength`, `isMatch`, `isMatchWith`,
     * `isNaN`, `isNative`, `isNil`, `isNull`, `isNumber`, `isObject`, `isObjectLike`,
     * `isPlainObject`, `isRegExp`, `isSafeInteger`, `isString`, `isUndefined`,
     * `isTypedArray`, `join`, `kebabCase`, `last`, `lastIndexOf`, `lowerCase`,
     * `lowerFirst`, `lt`, `lte`, `max`, `maxBy`, `mean`, `min`, `minBy`,
     * `noConflict`, `noop`, `now`, `pad`, `padEnd`, `padStart`, `parseInt`,
     * `pop`, `random`, `reduce`, `reduceRight`, `repeat`, `result`, `round`,
     * `runInContext`, `sample`, `shift`, `size`, `snakeCase`, `some`, `sortedIndex`,
     * `sortedIndexBy`, `sortedLastIndex`, `sortedLastIndexBy`, `startCase`,
     * `startsWith`, `subtract`, `sum`, `sumBy`, `template`, `times`, `toLower`,
     * `toInteger`, `toLength`, `toNumber`, `toSafeInteger`, `toString`, `toUpper`,
     * `trim`, `trimEnd`, `trimStart`, `truncate`, `unescape`, `uniqueId`,
     * `upperCase`, `upperFirst`, `value`, and `words`
     *
     * @name _
     * @constructor
     * @category Seq
     * @param {*} value The value to wrap in a `lodash` instance.
     * @returns {Object} Returns the new `lodash` wrapper instance.
     * @example
     *
     * function square(n) {
     *   return n * n;
     * }
     *
     * var wrapped = _([1, 2, 3]);
     *
     * // Returns an unwrapped value.
     * wrapped.reduce(_.add);
     * // => 6
     *
     * // Returns a wrapped value.
     * var squares = wrapped.map(square);
     *
     * _.isArray(squares);
     * // => false
     *
     * _.isArray(squares.value());
     * // => true
     */
    function lodash(value) {
      if (isObjectLike(value) && !isArray(value) && !(value instanceof LazyWrapper)) {
        if (value instanceof LodashWrapper) {
          return value;
        }
        if (hasOwnProperty.call(value, '__wrapped__')) {
          return wrapperClone(value);
        }
      }
      return new LodashWrapper(value);
    }

    /**
     * The function whose prototype all chaining wrappers inherit from.
     *
     * @private
     */
    function baseLodash() {
      // No operation performed.
    }

    /**
     * The base constructor for creating `lodash` wrapper objects.
     *
     * @private
     * @param {*} value The value to wrap.
     * @param {boolean} [chainAll] Enable chaining for all wrapper methods.
     */
    function LodashWrapper(value, chainAll) {
      this.__wrapped__ = value;
      this.__actions__ = [];
      this.__chain__ = !!chainAll;
      this.__index__ = 0;
      this.__values__ = undefined;
    }

    /**
     * By default, the template delimiters used by lodash are like those in
     * embedded Ruby (ERB). Change the following template settings to use
     * alternative delimiters.
     *
     * @static
     * @memberOf _
     * @type Object
     */
    lodash.templateSettings = {

      /**
       * Used to detect `data` property values to be HTML-escaped.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'escape': reEscape,

      /**
       * Used to detect code to be evaluated.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'evaluate': reEvaluate,

      /**
       * Used to detect `data` property values to inject.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'interpolate': reInterpolate,

      /**
       * Used to reference the data object in the template text.
       *
       * @memberOf _.templateSettings
       * @type string
       */
      'variable': '',

      /**
       * Used to import variables into the compiled template.
       *
       * @memberOf _.templateSettings
       * @type Object
       */
      'imports': {

        /**
         * A reference to the `lodash` function.
         *
         * @memberOf _.templateSettings.imports
         * @type Function
         */
        '_': lodash
      }
    };

    /*------------------------------------------------------------------------*/

    /**
     * Creates a lazy wrapper object which wraps `value` to enable lazy evaluation.
     *
     * @private
     * @param {*} value The value to wrap.
     */
    function LazyWrapper(value) {
      this.__wrapped__ = value;
      this.__actions__ = [];
      this.__dir__ = 1;
      this.__filtered__ = false;
      this.__iteratees__ = [];
      this.__takeCount__ = MAX_ARRAY_LENGTH;
      this.__views__ = [];
    }

    /**
     * Creates a clone of the lazy wrapper object.
     *
     * @private
     * @name clone
     * @memberOf LazyWrapper
     * @returns {Object} Returns the cloned `LazyWrapper` object.
     */
    function lazyClone() {
      var result = new LazyWrapper(this.__wrapped__);
      result.__actions__ = copyArray(this.__actions__);
      result.__dir__ = this.__dir__;
      result.__filtered__ = this.__filtered__;
      result.__iteratees__ = copyArray(this.__iteratees__);
      result.__takeCount__ = this.__takeCount__;
      result.__views__ = copyArray(this.__views__);
      return result;
    }

    /**
     * Reverses the direction of lazy iteration.
     *
     * @private
     * @name reverse
     * @memberOf LazyWrapper
     * @returns {Object} Returns the new reversed `LazyWrapper` object.
     */
    function lazyReverse() {
      if (this.__filtered__) {
        var result = new LazyWrapper(this);
        result.__dir__ = -1;
        result.__filtered__ = true;
      } else {
        result = this.clone();
        result.__dir__ *= -1;
      }
      return result;
    }

    /**
     * Extracts the unwrapped value from its lazy wrapper.
     *
     * @private
     * @name value
     * @memberOf LazyWrapper
     * @returns {*} Returns the unwrapped value.
     */
    function lazyValue() {
      var array = this.__wrapped__.value(),
          dir = this.__dir__,
          isArr = isArray(array),
          isRight = dir < 0,
          arrLength = isArr ? array.length : 0,
          view = getView(0, arrLength, this.__views__),
          start = view.start,
          end = view.end,
          length = end - start,
          index = isRight ? end : (start - 1),
          iteratees = this.__iteratees__,
          iterLength = iteratees.length,
          resIndex = 0,
          takeCount = nativeMin(length, this.__takeCount__);

      if (!isArr || arrLength < LARGE_ARRAY_SIZE || (arrLength == length && takeCount == length)) {
        return baseWrapperValue(array, this.__actions__);
      }
      var result = [];

      outer:
      while (length-- && resIndex < takeCount) {
        index += dir;

        var iterIndex = -1,
            value = array[index];

        while (++iterIndex < iterLength) {
          var data = iteratees[iterIndex],
              iteratee = data.iteratee,
              type = data.type,
              computed = iteratee(value);

          if (type == LAZY_MAP_FLAG) {
            value = computed;
          } else if (!computed) {
            if (type == LAZY_FILTER_FLAG) {
              continue outer;
            } else {
              break outer;
            }
          }
        }
        result[resIndex++] = value;
      }
      return result;
    }

    /*------------------------------------------------------------------------*/

    /**
     * Creates an hash object.
     *
     * @private
     * @returns {Object} Returns the new hash object.
     */
    function Hash() {}

    /**
     * Removes `key` and its value from the hash.
     *
     * @private
     * @param {Object} hash The hash to modify.
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */
    function hashDelete(hash, key) {
      return hashHas(hash, key) && delete hash[key];
    }

    /**
     * Gets the hash value for `key`.
     *
     * @private
     * @param {Object} hash The hash to query.
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */
    function hashGet(hash, key) {
      if (nativeCreate) {
        var result = hash[key];
        return result === HASH_UNDEFINED ? undefined : result;
      }
      return hasOwnProperty.call(hash, key) ? hash[key] : undefined;
    }

    /**
     * Checks if a hash value for `key` exists.
     *
     * @private
     * @param {Object} hash The hash to query.
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function hashHas(hash, key) {
      return nativeCreate ? hash[key] !== undefined : hasOwnProperty.call(hash, key);
    }

    /**
     * Sets the hash `key` to `value`.
     *
     * @private
     * @param {Object} hash The hash to modify.
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     */
    function hashSet(hash, key, value) {
      hash[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
    }

    /*------------------------------------------------------------------------*/

    /**
     * Creates a map cache object to store key-value pairs.
     *
     * @private
     * @param {Array} [values] The values to cache.
     */
    function MapCache(values) {
      var index = -1,
          length = values ? values.length : 0;

      this.clear();
      while (++index < length) {
        var entry = values[index];
        this.set(entry[0], entry[1]);
      }
    }

    /**
     * Removes all key-value entries from the map.
     *
     * @private
     * @name clear
     * @memberOf MapCache
     */
    function mapClear() {
      this.__data__ = { 'hash': new Hash, 'map': Map ? new Map : [], 'string': new Hash };
    }

    /**
     * Removes `key` and its value from the map.
     *
     * @private
     * @name delete
     * @memberOf MapCache
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */
    function mapDelete(key) {
      var data = this.__data__;
      if (isKeyable(key)) {
        return hashDelete(typeof key == 'string' ? data.string : data.hash, key);
      }
      return Map ? data.map['delete'](key) : assocDelete(data.map, key);
    }

    /**
     * Gets the map value for `key`.
     *
     * @private
     * @name get
     * @memberOf MapCache
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */
    function mapGet(key) {
      var data = this.__data__;
      if (isKeyable(key)) {
        return hashGet(typeof key == 'string' ? data.string : data.hash, key);
      }
      return Map ? data.map.get(key) : assocGet(data.map, key);
    }

    /**
     * Checks if a map value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf MapCache
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function mapHas(key) {
      var data = this.__data__;
      if (isKeyable(key)) {
        return hashHas(typeof key == 'string' ? data.string : data.hash, key);
      }
      return Map ? data.map.has(key) : assocHas(data.map, key);
    }

    /**
     * Sets the map `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf MapCache
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the map cache object.
     */
    function mapSet(key, value) {
      var data = this.__data__;
      if (isKeyable(key)) {
        hashSet(typeof key == 'string' ? data.string : data.hash, key, value);
      } else if (Map) {
        data.map.set(key, value);
      } else {
        assocSet(data.map, key, value);
      }
      return this;
    }

    /*------------------------------------------------------------------------*/

    /**
     *
     * Creates a set cache object to store unique values.
     *
     * @private
     * @param {Array} [values] The values to cache.
     */
    function SetCache(values) {
      var index = -1,
          length = values ? values.length : 0;

      this.__data__ = new MapCache;
      while (++index < length) {
        this.push(values[index]);
      }
    }

    /**
     * Checks if `value` is in `cache`.
     *
     * @private
     * @param {Object} cache The set cache to search.
     * @param {*} value The value to search for.
     * @returns {number} Returns `true` if `value` is found, else `false`.
     */
    function cacheHas(cache, value) {
      var map = cache.__data__;
      if (isKeyable(value)) {
        var data = map.__data__,
            hash = typeof value == 'string' ? data.string : data.hash;

        return hash[value] === HASH_UNDEFINED;
      }
      return map.has(value);
    }

    /**
     * Adds `value` to the set cache.
     *
     * @private
     * @name push
     * @memberOf SetCache
     * @param {*} value The value to cache.
     */
    function cachePush(value) {
      var map = this.__data__;
      if (isKeyable(value)) {
        var data = map.__data__,
            hash = typeof value == 'string' ? data.string : data.hash;

        hash[value] = HASH_UNDEFINED;
      }
      else {
        map.set(value, HASH_UNDEFINED);
      }
    }

    /*------------------------------------------------------------------------*/

    /**
     * Creates a stack cache object to store key-value pairs.
     *
     * @private
     * @param {Array} [values] The values to cache.
     */
    function Stack(values) {
      var index = -1,
          length = values ? values.length : 0;

      this.clear();
      while (++index < length) {
        var entry = values[index];
        this.set(entry[0], entry[1]);
      }
    }

    /**
     * Removes all key-value entries from the stack.
     *
     * @private
     * @name clear
     * @memberOf Stack
     */
    function stackClear() {
      this.__data__ = { 'array': [], 'map': null };
    }

    /**
     * Removes `key` and its value from the stack.
     *
     * @private
     * @name delete
     * @memberOf Stack
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */
    function stackDelete(key) {
      var data = this.__data__,
          array = data.array;

      return array ? assocDelete(array, key) : data.map['delete'](key);
    }

    /**
     * Gets the stack value for `key`.
     *
     * @private
     * @name get
     * @memberOf Stack
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */
    function stackGet(key) {
      var data = this.__data__,
          array = data.array;

      return array ? assocGet(array, key) : data.map.get(key);
    }

    /**
     * Checks if a stack value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf Stack
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function stackHas(key) {
      var data = this.__data__,
          array = data.array;

      return array ? assocHas(array, key) : data.map.has(key);
    }

    /**
     * Sets the stack `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf Stack
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the stack cache object.
     */
    function stackSet(key, value) {
      var data = this.__data__,
          array = data.array;

      if (array) {
        if (array.length < (LARGE_ARRAY_SIZE - 1)) {
          assocSet(array, key, value);
        } else {
          data.array = null;
          data.map = new MapCache(array);
        }
      }
      var map = data.map;
      if (map) {
        map.set(key, value);
      }
      return this;
    }

    /*------------------------------------------------------------------------*/

    /**
     * Removes `key` and its value from the associative array.
     *
     * @private
     * @param {Array} array The array to query.
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */
    function assocDelete(array, key) {
      var index = assocIndexOf(array, key);
      if (index < 0) {
        return false;
      }
      var lastIndex = array.length - 1;
      if (index == lastIndex) {
        array.pop();
      } else {
        splice.call(array, index, 1);
      }
      return true;
    }

    /**
     * Gets the associative array value for `key`.
     *
     * @private
     * @param {Array} array The array to query.
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */
    function assocGet(array, key) {
      var index = assocIndexOf(array, key);
      return index < 0 ? undefined : array[index][1];
    }

    /**
     * Checks if an associative array value for `key` exists.
     *
     * @private
     * @param {Array} array The array to query.
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function assocHas(array, key) {
      return assocIndexOf(array, key) > -1;
    }

    /**
     * Gets the index at which the first occurrence of `key` is found in `array`
     * of key-value pairs.
     *
     * @private
     * @param {Array} array The array to search.
     * @param {*} key The key to search for.
     * @returns {number} Returns the index of the matched value, else `-1`.
     */
    function assocIndexOf(array, key) {
      var length = array.length;
      while (length--) {
        if (eq(array[length][0], key)) {
          return length;
        }
      }
      return -1;
    }

    /**
     * Sets the associative array `key` to `value`.
     *
     * @private
     * @param {Array} array The array to modify.
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     */
    function assocSet(array, key, value) {
      var index = assocIndexOf(array, key);
      if (index < 0) {
        array.push([key, value]);
      } else {
        array[index][1] = value;
      }
    }

    /*------------------------------------------------------------------------*/

    /**
     * Used by `_.defaults` to customize its `_.assignIn` use.
     *
     * @private
     * @param {*} objValue The destination value.
     * @param {*} srcValue The source value.
     * @param {string} key The key of the property to assign.
     * @param {Object} object The parent object of `objValue`.
     * @returns {*} Returns the value to assign.
     */
    function assignInDefaults(objValue, srcValue, key, object) {
      if (objValue === undefined ||
          (eq(objValue, objectProto[key]) && !hasOwnProperty.call(object, key))) {
        return srcValue;
      }
      return objValue;
    }

    /**
     * This function is like `assignValue` except that it doesn't assign `undefined` values.
     *
     * @private
     * @param {Object} object The object to modify.
     * @param {string} key The key of the property to assign.
     * @param {*} value The value to assign.
     */
    function assignMergeValue(object, key, value) {
      if ((value !== undefined && !eq(object[key], value)) ||
          (typeof key == 'number' && value === undefined && !(key in object))) {
        object[key] = value;
      }
    }

    /**
     * Assigns `value` to `key` of `object` if the existing value is not equivalent
     * using [`SameValueZero`](http://ecma-international.org/ecma-262/6.0/#sec-samevaluezero)
     * for equality comparisons.
     *
     * @private
     * @param {Object} object The object to modify.
     * @param {string} key The key of the property to assign.
     * @param {*} value The value to assign.
     */
    function assignValue(object, key, value) {
      var objValue = object[key];
      if ((!eq(objValue, value) ||
            (eq(objValue, objectProto[key]) && !hasOwnProperty.call(object, key))) ||
          (value === undefined && !(key in object))) {
        object[key] = value;
      }
    }

    /**
     * Aggregates elements of `collection` on `accumulator` with keys transformed
     * by `iteratee` and values set by `setter`.
     *
     * @private
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} setter The function to set `accumulator` values.
     * @param {Function} iteratee The iteratee to transform keys.
     * @param {Object} accumulator The initial aggregated object.
     * @returns {Function} Returns `accumulator`.
     */
    function baseAggregator(collection, setter, iteratee, accumulator) {
      baseEach(collection, function(value, key, collection) {
        setter(accumulator, value, iteratee(value), collection);
      });
      return accumulator;
    }

    /**
     * The base implementation of `_.assign` without support for multiple sources
     * or `customizer` functions.
     *
     * @private
     * @param {Object} object The destination object.
     * @param {Object} source The source object.
     * @returns {Object} Returns `object`.
     */
    function baseAssign(object, source) {
      return object && copyObject(source, keys(source), object);
    }

    /**
     * The base implementation of `_.at` without support for individual paths.
     *
     * @private
     * @param {Object} object The object to iterate over.
     * @param {string[]} paths The property paths of elements to pick.
     * @returns {Array} Returns the new array of picked elements.
     */
    function baseAt(object, paths) {
      var index = -1,
          isNil = object == null,
          length = paths.length,
          result = Array(length);

      while (++index < length) {
        result[index] = isNil ? undefined : get(object, paths[index]);
      }
      return result;
    }

    /**
     * The base implementation of `_.clamp` which doesn't coerce arguments to numbers.
     *
     * @private
     * @param {number} number The number to clamp.
     * @param {number} [lower] The lower bound.
     * @param {number} upper The upper bound.
     * @returns {number} Returns the clamped number.
     */
    function baseClamp(number, lower, upper) {
      if (number === number) {
        if (upper !== undefined) {
          number = number <= upper ? number : upper;
        }
        if (lower !== undefined) {
          number = number >= lower ? number : lower;
        }
      }
      return number;
    }

    /**
     * The base implementation of `_.clone` and `_.cloneDeep` which tracks
     * traversed objects.
     *
     * @private
     * @param {*} value The value to clone.
     * @param {boolean} [isDeep] Specify a deep clone.
     * @param {Function} [customizer] The function to customize cloning.
     * @param {string} [key] The key of `value`.
     * @param {Object} [object] The parent object of `value`.
     * @param {Object} [stack] Tracks traversed objects and their clone counterparts.
     * @returns {*} Returns the cloned value.
     */
    function baseClone(value, isDeep, customizer, key, object, stack) {
      var result;
      if (customizer) {
        result = object ? customizer(value, key, object, stack) : customizer(value);
      }
      if (result !== undefined) {
        return result;
      }
      if (!isObject(value)) {
        return value;
      }
      var isArr = isArray(value);
      if (isArr) {
        result = initCloneArray(value);
        if (!isDeep) {
          return copyArray(value, result);
        }
      } else {
        var tag = getTag(value),
            isFunc = tag == funcTag || tag == genTag;

        if (isBuffer(value)) {
          return cloneBuffer(value, isDeep);
        }
        if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
          if (isHostObject(value)) {
            return object ? value : {};
          }
          result = initCloneObject(isFunc ? {} : value);
          if (!isDeep) {
            return copySymbols(value, baseAssign(result, value));
          }
        } else {
          return cloneableTags[tag]
            ? initCloneByTag(value, tag, isDeep)
            : (object ? value : {});
        }
      }
      // Check for circular references and return its corresponding clone.
      stack || (stack = new Stack);
      var stacked = stack.get(value);
      if (stacked) {
        return stacked;
      }
      stack.set(value, result);

      // Recursively populate clone (susceptible to call stack limits).
      (isArr ? arrayEach : baseForOwn)(value, function(subValue, key) {
        assignValue(result, key, baseClone(subValue, isDeep, customizer, key, value, stack));
      });
      return isArr ? result : copySymbols(value, result);
    }

    /**
     * The base implementation of `_.conforms` which doesn't clone `source`.
     *
     * @private
     * @param {Object} source The object of property predicates to conform to.
     * @returns {Function} Returns the new function.
     */
    function baseConforms(source) {
      var props = keys(source),
          length = props.length;

      return function(object) {
        if (object == null) {
          return !length;
        }
        var index = length;
        while (index--) {
          var key = props[index],
              predicate = source[key],
              value = object[key];

          if ((value === undefined && !(key in Object(object))) || !predicate(value)) {
            return false;
          }
        }
        return true;
      };
    }

    /**
     * The base implementation of `_.create` without support for assigning
     * properties to the created object.
     *
     * @private
     * @param {Object} prototype The object to inherit from.
     * @returns {Object} Returns the new object.
     */
    var baseCreate = (function() {
      function object() {}
      return function(prototype) {
        if (isObject(prototype)) {
          object.prototype = prototype;
          var result = new object;
          object.prototype = undefined;
        }
        return result || {};
      };
    }());

    /**
     * The base implementation of `_.delay` and `_.defer` which accepts an array
     * of `func` arguments.
     *
     * @private
     * @param {Function} func The function to delay.
     * @param {number} wait The number of milliseconds to delay invocation.
     * @param {Object} args The arguments to provide to `func`.
     * @returns {number} Returns the timer id.
     */
    function baseDelay(func, wait, args) {
      if (typeof func != 'function') {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      return setTimeout(function() { func.apply(undefined, args); }, wait);
    }

    /**
     * The base implementation of methods like `_.difference` without support for
     * excluding multiple arrays or iteratee shorthands.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {Array} values The values to exclude.
     * @param {Function} [iteratee] The iteratee invoked per element.
     * @param {Function} [comparator] The comparator invoked per element.
     * @returns {Array} Returns the new array of filtered values.
     */
    function baseDifference(array, values, iteratee, comparator) {
      var index = -1,
          includes = arrayIncludes,
          isCommon = true,
          length = array.length,
          result = [],
          valuesLength = values.length;

      if (!length) {
        return result;
      }
      if (iteratee) {
        values = arrayMap(values, baseUnary(iteratee));
      }
      if (comparator) {
        includes = arrayIncludesWith;
        isCommon = false;
      }
      else if (values.length >= LARGE_ARRAY_SIZE) {
        includes = cacheHas;
        isCommon = false;
        values = new SetCache(values);
      }
      outer:
      while (++index < length) {
        var value = array[index],
            computed = iteratee ? iteratee(value) : value;

        if (isCommon && computed === computed) {
          var valuesIndex = valuesLength;
          while (valuesIndex--) {
            if (values[valuesIndex] === computed) {
              continue outer;
            }
          }
          result.push(value);
        }
        else if (!includes(values, computed, comparator)) {
          result.push(value);
        }
      }
      return result;
    }

    /**
     * The base implementation of `_.forEach` without support for iteratee shorthands.
     *
     * @private
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Array|Object} Returns `collection`.
     */
    var baseEach = createBaseEach(baseForOwn);

    /**
     * The base implementation of `_.forEachRight` without support for iteratee shorthands.
     *
     * @private
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Array|Object} Returns `collection`.
     */
    var baseEachRight = createBaseEach(baseForOwnRight, true);

    /**
     * The base implementation of `_.every` without support for iteratee shorthands.
     *
     * @private
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} predicate The function invoked per iteration.
     * @returns {boolean} Returns `true` if all elements pass the predicate check, else `false`
     */
    function baseEvery(collection, predicate) {
      var result = true;
      baseEach(collection, function(value, index, collection) {
        result = !!predicate(value, index, collection);
        return result;
      });
      return result;
    }

    /**
     * The base implementation of `_.fill` without an iteratee call guard.
     *
     * @private
     * @param {Array} array The array to fill.
     * @param {*} value The value to fill `array` with.
     * @param {number} [start=0] The start position.
     * @param {number} [end=array.length] The end position.
     * @returns {Array} Returns `array`.
     */
    function baseFill(array, value, start, end) {
      var length = array.length;

      start = toInteger(start);
      if (start < 0) {
        start = -start > length ? 0 : (length + start);
      }
      end = (end === undefined || end > length) ? length : toInteger(end);
      if (end < 0) {
        end += length;
      }
      end = start > end ? 0 : toLength(end);
      while (start < end) {
        array[start++] = value;
      }
      return array;
    }

    /**
     * The base implementation of `_.filter` without support for iteratee shorthands.
     *
     * @private
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} predicate The function invoked per iteration.
     * @returns {Array} Returns the new filtered array.
     */
    function baseFilter(collection, predicate) {
      var result = [];
      baseEach(collection, function(value, index, collection) {
        if (predicate(value, index, collection)) {
          result.push(value);
        }
      });
      return result;
    }

    /**
     * The base implementation of `_.flatten` with support for restricting flattening.
     *
     * @private
     * @param {Array} array The array to flatten.
     * @param {boolean} [isDeep] Specify a deep flatten.
     * @param {boolean} [isStrict] Restrict flattening to arrays-like objects.
     * @param {Array} [result=[]] The initial result value.
     * @returns {Array} Returns the new flattened array.
     */
    function baseFlatten(array, isDeep, isStrict, result) {
      result || (result = []);

      var index = -1,
          length = array.length;

      while (++index < length) {
        var value = array[index];
        if (isArrayLikeObject(value) &&
            (isStrict || isArray(value) || isArguments(value))) {
          if (isDeep) {
            // Recursively flatten arrays (susceptible to call stack limits).
            baseFlatten(value, isDeep, isStrict, result);
          } else {
            arrayPush(result, value);
          }
        } else if (!isStrict) {
          result[result.length] = value;
        }
      }
      return result;
    }

    /**
     * The base implementation of `baseForIn` and `baseForOwn` which iterates
     * over `object` properties returned by `keysFunc` invoking `iteratee` for
     * each property. Iteratee functions may exit iteration early by explicitly
     * returning `false`.
     *
     * @private
     * @param {Object} object The object to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @param {Function} keysFunc The function to get the keys of `object`.
     * @returns {Object} Returns `object`.
     */
    var baseFor = createBaseFor();

    /**
     * This function is like `baseFor` except that it iterates over properties
     * in the opposite order.
     *
     * @private
     * @param {Object} object The object to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @param {Function} keysFunc The function to get the keys of `object`.
     * @returns {Object} Returns `object`.
     */
    var baseForRight = createBaseFor(true);

    /**
     * The base implementation of `_.forIn` without support for iteratee shorthands.
     *
     * @private
     * @param {Object} object The object to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Object} Returns `object`.
     */
    function baseForIn(object, iteratee) {
      return object == null ? object : baseFor(object, iteratee, keysIn);
    }

    /**
     * The base implementation of `_.forOwn` without support for iteratee shorthands.
     *
     * @private
     * @param {Object} object The object to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Object} Returns `object`.
     */
    function baseForOwn(object, iteratee) {
      return object && baseFor(object, iteratee, keys);
    }

    /**
     * The base implementation of `_.forOwnRight` without support for iteratee shorthands.
     *
     * @private
     * @param {Object} object The object to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Object} Returns `object`.
     */
    function baseForOwnRight(object, iteratee) {
      return object && baseForRight(object, iteratee, keys);
    }

    /**
     * The base implementation of `_.functions` which creates an array of
     * `object` function property names filtered from `props`.
     *
     * @private
     * @param {Object} object The object to inspect.
     * @param {Array} props The property names to filter.
     * @returns {Array} Returns the new array of filtered property names.
     */
    function baseFunctions(object, props) {
      return arrayFilter(props, function(key) {
        return isFunction(object[key]);
      });
    }

    /**
     * The base implementation of `_.get` without support for default values.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {Array|string} path The path of the property to get.
     * @returns {*} Returns the resolved value.
     */
    function baseGet(object, path) {
      path = isKey(path, object) ? [path + ''] : baseToPath(path);

      var index = 0,
          length = path.length;

      while (object != null && index < length) {
        object = object[path[index++]];
      }
      return (index && index == length) ? object : undefined;
    }

    /**
     * The base implementation of `_.has` without support for deep paths.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {Array|string} key The key to check.
     * @returns {boolean} Returns `true` if `key` exists, else `false`.
     */
    function baseHas(object, key) {
      // Avoid a bug in IE 10-11 where objects with a [[Prototype]] of `null`,
      // that are composed entirely of index properties, return `false` for
      // `hasOwnProperty` checks of them.
      return hasOwnProperty.call(object, key) ||
        (typeof object == 'object' && key in object && getPrototypeOf(object) === null);
    }

    /**
     * The base implementation of `_.hasIn` without support for deep paths.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {Array|string} key The key to check.
     * @returns {boolean} Returns `true` if `key` exists, else `false`.
     */
    function baseHasIn(object, key) {
      return key in Object(object);
    }

    /**
     * The base implementation of `_.inRange` which doesn't coerce arguments to numbers.
     *
     * @private
     * @param {number} number The number to check.
     * @param {number} start The start of the range.
     * @param {number} end The end of the range.
     * @returns {boolean} Returns `true` if `number` is in the range, else `false`.
     */
    function baseInRange(number, start, end) {
      return number >= nativeMin(start, end) && number < nativeMax(start, end);
    }

    /**
     * The base implementation of methods like `_.intersection`, without support
     * for iteratee shorthands, that accepts an array of arrays to inspect.
     *
     * @private
     * @param {Array} arrays The arrays to inspect.
     * @param {Function} [iteratee] The iteratee invoked per element.
     * @param {Function} [comparator] The comparator invoked per element.
     * @returns {Array} Returns the new array of shared values.
     */
    function baseIntersection(arrays, iteratee, comparator) {
      var includes = comparator ? arrayIncludesWith : arrayIncludes,
          othLength = arrays.length,
          othIndex = othLength,
          caches = Array(othLength),
          result = [];

      while (othIndex--) {
        var array = arrays[othIndex];
        if (othIndex && iteratee) {
          array = arrayMap(array, baseUnary(iteratee));
        }
        caches[othIndex] = !comparator && (iteratee || array.length >= 120)
          ? new SetCache(othIndex && array)
          : undefined;
      }
      array = arrays[0];

      var index = -1,
          length = array.length,
          seen = caches[0];

      outer:
      while (++index < length) {
        var value = array[index],
            computed = iteratee ? iteratee(value) : value;

        if (!(seen ? cacheHas(seen, computed) : includes(result, computed, comparator))) {
          var othIndex = othLength;
          while (--othIndex) {
            var cache = caches[othIndex];
            if (!(cache ? cacheHas(cache, computed) : includes(arrays[othIndex], computed, comparator))) {
              continue outer;
            }
          }
          if (seen) {
            seen.push(computed);
          }
          result.push(value);
        }
      }
      return result;
    }

    /**
     * The base implementation of `_.invert` and `_.invertBy` which inverts
     * `object` with values transformed by `iteratee` and set by `setter`.
     *
     * @private
     * @param {Object} object The object to iterate over.
     * @param {Function} setter The function to set `accumulator` values.
     * @param {Function} iteratee The iteratee to transform values.
     * @param {Object} accumulator The initial inverted object.
     * @returns {Function} Returns `accumulator`.
     */
    function baseInverter(object, setter, iteratee, accumulator) {
      baseForOwn(object, function(value, key, object) {
        setter(accumulator, iteratee(value), key, object);
      });
      return accumulator;
    }

    /**
     * The base implementation of `_.invoke` without support for individual
     * method arguments.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {Array|string} path The path of the method to invoke.
     * @param {Array} args The arguments to invoke the method with.
     * @returns {*} Returns the result of the invoked method.
     */
    function baseInvoke(object, path, args) {
      if (!isKey(path, object)) {
        path = baseToPath(path);
        object = parent(object, path);
        path = last(path);
      }
      var func = object == null ? object : object[path];
      return func == null ? undefined : apply(func, object, args);
    }

    /**
     * The base implementation of `_.isEqual` which supports partial comparisons
     * and tracks traversed objects.
     *
     * @private
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @param {Function} [customizer] The function to customize comparisons.
     * @param {boolean} [bitmask] The bitmask of comparison flags.
     *  The bitmask may be composed of the following flags:
     *     1 - Unordered comparison
     *     2 - Partial comparison
     * @param {Object} [stack] Tracks traversed `value` and `other` objects.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     */
    function baseIsEqual(value, other, customizer, bitmask, stack) {
      if (value === other) {
        return true;
      }
      if (value == null || other == null || (!isObject(value) && !isObjectLike(other))) {
        return value !== value && other !== other;
      }
      return baseIsEqualDeep(value, other, baseIsEqual, customizer, bitmask, stack);
    }

    /**
     * A specialized version of `baseIsEqual` for arrays and objects which performs
     * deep comparisons and tracks traversed objects enabling objects with circular
     * references to be compared.
     *
     * @private
     * @param {Object} object The object to compare.
     * @param {Object} other The other object to compare.
     * @param {Function} equalFunc The function to determine equivalents of values.
     * @param {Function} [customizer] The function to customize comparisons.
     * @param {number} [bitmask] The bitmask of comparison flags. See `baseIsEqual` for more details.
     * @param {Object} [stack] Tracks traversed `object` and `other` objects.
     * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
     */
    function baseIsEqualDeep(object, other, equalFunc, customizer, bitmask, stack) {
      var objIsArr = isArray(object),
          othIsArr = isArray(other),
          objTag = arrayTag,
          othTag = arrayTag;

      if (!objIsArr) {
        objTag = getTag(object);
        if (objTag == argsTag) {
          objTag = objectTag;
        } else if (objTag != objectTag) {
          objIsArr = isTypedArray(object);
        }
      }
      if (!othIsArr) {
        othTag = getTag(other);
        if (othTag == argsTag) {
          othTag = objectTag;
        } else if (othTag != objectTag) {
          othIsArr = isTypedArray(other);
        }
      }
      var objIsObj = objTag == objectTag && !isHostObject(object),
          othIsObj = othTag == objectTag && !isHostObject(other),
          isSameTag = objTag == othTag;

      if (isSameTag && !(objIsArr || objIsObj)) {
        return equalByTag(object, other, objTag, equalFunc, customizer, bitmask);
      }
      var isPartial = bitmask & PARTIAL_COMPARE_FLAG;
      if (!isPartial) {
        var objIsWrapped = objIsObj && hasOwnProperty.call(object, '__wrapped__'),
            othIsWrapped = othIsObj && hasOwnProperty.call(other, '__wrapped__');

        if (objIsWrapped || othIsWrapped) {
          return equalFunc(objIsWrapped ? object.value() : object, othIsWrapped ? other.value() : other, customizer, bitmask, stack);
        }
      }
      if (!isSameTag) {
        return false;
      }
      stack || (stack = new Stack);
      return (objIsArr ? equalArrays : equalObjects)(object, other, equalFunc, customizer, bitmask, stack);
    }

    /**
     * The base implementation of `_.isMatch` without support for iteratee shorthands.
     *
     * @private
     * @param {Object} object The object to inspect.
     * @param {Object} source The object of property values to match.
     * @param {Array} matchData The property names, values, and compare flags to match.
     * @param {Function} [customizer] The function to customize comparisons.
     * @returns {boolean} Returns `true` if `object` is a match, else `false`.
     */
    function baseIsMatch(object, source, matchData, customizer) {
      var index = matchData.length,
          length = index,
          noCustomizer = !customizer;

      if (object == null) {
        return !length;
      }
      object = Object(object);
      while (index--) {
        var data = matchData[index];
        if ((noCustomizer && data[2])
              ? data[1] !== object[data[0]]
              : !(data[0] in object)
            ) {
          return false;
        }
      }
      while (++index < length) {
        data = matchData[index];
        var key = data[0],
            objValue = object[key],
            srcValue = data[1];

        if (noCustomizer && data[2]) {
          if (objValue === undefined && !(key in object)) {
            return false;
          }
        } else {
          var stack = new Stack,
              result = customizer ? customizer(objValue, srcValue, key, object, source, stack) : undefined;

          if (!(result === undefined
                ? baseIsEqual(srcValue, objValue, customizer, UNORDERED_COMPARE_FLAG | PARTIAL_COMPARE_FLAG, stack)
                : result
              )) {
            return false;
          }
        }
      }
      return true;
    }

    /**
     * The base implementation of `_.iteratee`.
     *
     * @private
     * @param {*} [value=_.identity] The value to convert to an iteratee.
     * @returns {Function} Returns the iteratee.
     */
    function baseIteratee(value) {
      var type = typeof value;
      if (type == 'function') {
        return value;
      }
      if (value == null) {
        return identity;
      }
      if (type == 'object') {
        return isArray(value)
          ? baseMatchesProperty(value[0], value[1])
          : baseMatches(value);
      }
      return property(value);
    }

    /**
     * The base implementation of `_.keys` which doesn't skip the constructor
     * property of prototypes or treat sparse arrays as dense.
     *
     * @private
     * @type Function
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names.
     */
    function baseKeys(object) {
      return nativeKeys(Object(object));
    }

    /**
     * The base implementation of `_.keysIn` which doesn't skip the constructor
     * property of prototypes or treat sparse arrays as dense.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names.
     */
    function baseKeysIn(object) {
      object = object == null ? object : Object(object);

      var result = [];
      for (var key in object) {
        result.push(key);
      }
      return result;
    }

    // Fallback for IE < 9 with es6-shim.
    if (enumerate && !propertyIsEnumerable.call({ 'valueOf': 1 }, 'valueOf')) {
      baseKeysIn = function(object) {
        return iteratorToArray(enumerate(object));
      };
    }

    /**
     * The base implementation of `_.map` without support for iteratee shorthands.
     *
     * @private
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Array} Returns the new mapped array.
     */
    function baseMap(collection, iteratee) {
      var index = -1,
          result = isArrayLike(collection) ? Array(collection.length) : [];

      baseEach(collection, function(value, key, collection) {
        result[++index] = iteratee(value, key, collection);
      });
      return result;
    }

    /**
     * The base implementation of `_.matches` which doesn't clone `source`.
     *
     * @private
     * @param {Object} source The object of property values to match.
     * @returns {Function} Returns the new function.
     */
    function baseMatches(source) {
      var matchData = getMatchData(source);
      if (matchData.length == 1 && matchData[0][2]) {
        var key = matchData[0][0],
            value = matchData[0][1];

        return function(object) {
          if (object == null) {
            return false;
          }
          return object[key] === value &&
            (value !== undefined || (key in Object(object)));
        };
      }
      return function(object) {
        return object === source || baseIsMatch(object, source, matchData);
      };
    }

    /**
     * The base implementation of `_.matchesProperty` which doesn't clone `srcValue`.
     *
     * @private
     * @param {string} path The path of the property to get.
     * @param {*} srcValue The value to match.
     * @returns {Function} Returns the new function.
     */
    function baseMatchesProperty(path, srcValue) {
      return function(object) {
        var objValue = get(object, path);
        return (objValue === undefined && objValue === srcValue)
          ? hasIn(object, path)
          : baseIsEqual(srcValue, objValue, undefined, UNORDERED_COMPARE_FLAG | PARTIAL_COMPARE_FLAG);
      };
    }

    /**
     * The base implementation of `_.merge` without support for multiple sources.
     *
     * @private
     * @param {Object} object The destination object.
     * @param {Object} source The source object.
     * @param {number} srcIndex The index of `source`.
     * @param {Function} [customizer] The function to customize merged values.
     * @param {Object} [stack] Tracks traversed source values and their merged counterparts.
     */
    function baseMerge(object, source, srcIndex, customizer, stack) {
      if (object === source) {
        return;
      }
      var props = (isArray(source) || isTypedArray(source)) ? undefined : keysIn(source);
      arrayEach(props || source, function(srcValue, key) {
        if (props) {
          key = srcValue;
          srcValue = source[key];
        }
        if (isObject(srcValue)) {
          stack || (stack = new Stack);
          baseMergeDeep(object, source, key, srcIndex, baseMerge, customizer, stack);
        }
        else {
          var newValue = customizer ? customizer(object[key], srcValue, (key + ''), object, source, stack) : undefined;
          if (newValue === undefined) {
            newValue = srcValue;
          }
          assignMergeValue(object, key, newValue);
        }
      });
    }

    /**
     * A specialized version of `baseMerge` for arrays and objects which performs
     * deep merges and tracks traversed objects enabling objects with circular
     * references to be merged.
     *
     * @private
     * @param {Object} object The destination object.
     * @param {Object} source The source object.
     * @param {string} key The key of the value to merge.
     * @param {number} srcIndex The index of `source`.
     * @param {Function} mergeFunc The function to merge values.
     * @param {Function} [customizer] The function to customize assigned values.
     * @param {Object} [stack] Tracks traversed source values and their merged counterparts.
     */
    function baseMergeDeep(object, source, key, srcIndex, mergeFunc, customizer, stack) {
      var objValue = object[key],
          srcValue = source[key],
          stacked = stack.get(srcValue);

      if (stacked) {
        assignMergeValue(object, key, stacked);
        return;
      }
      var newValue = customizer ? customizer(objValue, srcValue, (key + ''), object, source, stack) : undefined,
          isCommon = newValue === undefined;

      if (isCommon) {
        newValue = srcValue;
        if (isArray(srcValue) || isTypedArray(srcValue)) {
          if (isArray(objValue)) {
            newValue = srcIndex ? copyArray(objValue) : objValue;
          }
          else if (isArrayLikeObject(objValue)) {
            newValue = copyArray(objValue);
          }
          else {
            isCommon = false;
            newValue = baseClone(srcValue);
          }
        }
        else if (isPlainObject(srcValue) || isArguments(srcValue)) {
          if (isArguments(objValue)) {
            newValue = toPlainObject(objValue);
          }
          else if (!isObject(objValue) || (srcIndex && isFunction(objValue))) {
            isCommon = false;
            newValue = baseClone(srcValue);
          }
          else {
            newValue = srcIndex ? baseClone(objValue) : objValue;
          }
        }
        else {
          isCommon = false;
        }
      }
      stack.set(srcValue, newValue);

      if (isCommon) {
        // Recursively merge objects and arrays (susceptible to call stack limits).
        mergeFunc(newValue, srcValue, srcIndex, customizer, stack);
      }
      assignMergeValue(object, key, newValue);
    }

    /**
     * The base implementation of `_.orderBy` without param guards.
     *
     * @private
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function[]|Object[]|string[]} iteratees The iteratees to sort by.
     * @param {string[]} orders The sort orders of `iteratees`.
     * @returns {Array} Returns the new sorted array.
     */
    function baseOrderBy(collection, iteratees, orders) {
      var index = -1,
          toIteratee = getIteratee();

      iteratees = arrayMap(iteratees.length ? iteratees : Array(1), function(iteratee) {
        return toIteratee(iteratee);
      });

      var result = baseMap(collection, function(value, key, collection) {
        var criteria = arrayMap(iteratees, function(iteratee) {
          return iteratee(value);
        });
        return { 'criteria': criteria, 'index': ++index, 'value': value };
      });

      return baseSortBy(result, function(object, other) {
        return compareMultiple(object, other, orders);
      });
    }

    /**
     * The base implementation of `_.pick` without support for individual
     * property names.
     *
     * @private
     * @param {Object} object The source object.
     * @param {string[]} props The property names to pick.
     * @returns {Object} Returns the new object.
     */
    function basePick(object, props) {
      object = Object(object);
      return arrayReduce(props, function(result, key) {
        if (key in object) {
          result[key] = object[key];
        }
        return result;
      }, {});
    }

    /**
     * The base implementation of  `_.pickBy` without support for iteratee shorthands.
     *
     * @private
     * @param {Object} object The source object.
     * @param {Function} predicate The function invoked per property.
     * @returns {Object} Returns the new object.
     */
    function basePickBy(object, predicate) {
      var result = {};
      baseForIn(object, function(value, key) {
        if (predicate(value, key)) {
          result[key] = value;
        }
      });
      return result;
    }

    /**
     * The base implementation of `_.property` without support for deep paths.
     *
     * @private
     * @param {string} key The key of the property to get.
     * @returns {Function} Returns the new function.
     */
    function baseProperty(key) {
      return function(object) {
        return object == null ? undefined : object[key];
      };
    }

    /**
     * A specialized version of `baseProperty` which supports deep paths.
     *
     * @private
     * @param {Array|string} path The path of the property to get.
     * @returns {Function} Returns the new function.
     */
    function basePropertyDeep(path) {
      return function(object) {
        return baseGet(object, path);
      };
    }

    /**
     * The base implementation of `_.pullAll`.
     *
     * @private
     * @param {Array} array The array to modify.
     * @param {Array} values The values to remove.
     * @returns {Array} Returns `array`.
     */
    function basePullAll(array, values) {
      return basePullAllBy(array, values);
    }

    /**
     * The base implementation of `_.pullAllBy` without support for iteratee
     * shorthands.
     *
     * @private
     * @param {Array} array The array to modify.
     * @param {Array} values The values to remove.
     * @param {Function} [iteratee] The iteratee invoked per element.
     * @returns {Array} Returns `array`.
     */
    function basePullAllBy(array, values, iteratee) {
      var index = -1,
          length = values.length,
          seen = array;

      if (iteratee) {
        seen = arrayMap(array, function(value) { return iteratee(value); });
      }
      while (++index < length) {
        var fromIndex = 0,
            value = values[index],
            computed = iteratee ? iteratee(value) : value;

        while ((fromIndex = baseIndexOf(seen, computed, fromIndex)) > -1) {
          if (seen !== array) {
            splice.call(seen, fromIndex, 1);
          }
          splice.call(array, fromIndex, 1);
        }
      }
      return array;
    }

    /**
     * The base implementation of `_.pullAt` without support for individual
     * indexes or capturing the removed elements.
     *
     * @private
     * @param {Array} array The array to modify.
     * @param {number[]} indexes The indexes of elements to remove.
     * @returns {Array} Returns `array`.
     */
    function basePullAt(array, indexes) {
      var length = array ? indexes.length : 0,
          lastIndex = length - 1;

      while (length--) {
        var index = indexes[length];
        if (lastIndex == length || index != previous) {
          var previous = index;
          if (isIndex(index)) {
            splice.call(array, index, 1);
          }
          else if (!isKey(index, array)) {
            var path = baseToPath(index),
                object = parent(array, path);

            if (object != null) {
              delete object[last(path)];
            }
          }
          else {
            delete array[index];
          }
        }
      }
      return array;
    }

    /**
     * The base implementation of `_.random` without support for returning
     * floating-point numbers.
     *
     * @private
     * @param {number} lower The lower bound.
     * @param {number} upper The upper bound.
     * @returns {number} Returns the random number.
     */
    function baseRandom(lower, upper) {
      return lower + nativeFloor(nativeRandom() * (upper - lower + 1));
    }

    /**
     * The base implementation of `_.range` and `_.rangeRight` which doesn't
     * coerce arguments to numbers.
     *
     * @private
     * @param {number} start The start of the range.
     * @param {number} end The end of the range.
     * @param {number} step The value to increment or decrement by.
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {Array} Returns the new array of numbers.
     */
    function baseRange(start, end, step, fromRight) {
      var index = -1,
          length = nativeMax(nativeCeil((end - start) / (step || 1)), 0),
          result = Array(length);

      while (length--) {
        result[fromRight ? length : ++index] = start;
        start += step;
      }
      return result;
    }

    /**
     * The base implementation of `_.set`.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {Array|string} path The path of the property to set.
     * @param {*} value The value to set.
     * @param {Function} [customizer] The function to customize path creation.
     * @returns {Object} Returns `object`.
     */
    function baseSet(object, path, value, customizer) {
      path = isKey(path, object) ? [path + ''] : baseToPath(path);

      var index = -1,
          length = path.length,
          lastIndex = length - 1,
          nested = object;

      while (nested != null && ++index < length) {
        var key = path[index];
        if (isObject(nested)) {
          var newValue = value;
          if (index != lastIndex) {
            var objValue = nested[key];
            newValue = customizer ? customizer(objValue, key, nested) : undefined;
            if (newValue === undefined) {
              newValue = objValue == null ? (isIndex(path[index + 1]) ? [] : {}) : objValue;
            }
          }
          assignValue(nested, key, newValue);
        }
        nested = nested[key];
      }
      return object;
    }

    /**
     * The base implementation of `setData` without support for hot loop detection.
     *
     * @private
     * @param {Function} func The function to associate metadata with.
     * @param {*} data The metadata.
     * @returns {Function} Returns `func`.
     */
    var baseSetData = !metaMap ? identity : function(func, data) {
      metaMap.set(func, data);
      return func;
    };

    /**
     * The base implementation of `_.slice` without an iteratee call guard.
     *
     * @private
     * @param {Array} array The array to slice.
     * @param {number} [start=0] The start position.
     * @param {number} [end=array.length] The end position.
     * @returns {Array} Returns the slice of `array`.
     */
    function baseSlice(array, start, end) {
      var index = -1,
          length = array.length;

      if (start < 0) {
        start = -start > length ? 0 : (length + start);
      }
      end = end > length ? length : end;
      if (end < 0) {
        end += length;
      }
      length = start > end ? 0 : ((end - start) >>> 0);
      start >>>= 0;

      var result = Array(length);
      while (++index < length) {
        result[index] = array[index + start];
      }
      return result;
    }

    /**
     * The base implementation of `_.some` without support for iteratee shorthands.
     *
     * @private
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} predicate The function invoked per iteration.
     * @returns {boolean} Returns `true` if any element passes the predicate check, else `false`.
     */
    function baseSome(collection, predicate) {
      var result;

      baseEach(collection, function(value, index, collection) {
        result = predicate(value, index, collection);
        return !result;
      });
      return !!result;
    }

    /**
     * The base implementation of `_.sortedIndex` and `_.sortedLastIndex` which
     * performs a binary search of `array` to determine the index at which `value`
     * should be inserted into `array` in order to maintain its sort order.
     *
     * @private
     * @param {Array} array The sorted array to inspect.
     * @param {*} value The value to evaluate.
     * @param {boolean} [retHighest] Specify returning the highest qualified index.
     * @returns {number} Returns the index at which `value` should be inserted
     *  into `array`.
     */
    function baseSortedIndex(array, value, retHighest) {
      var low = 0,
          high = array ? array.length : low;

      if (typeof value == 'number' && value === value && high <= HALF_MAX_ARRAY_LENGTH) {
        while (low < high) {
          var mid = (low + high) >>> 1,
              computed = array[mid];

          if ((retHighest ? (computed <= value) : (computed < value)) && computed !== null) {
            low = mid + 1;
          } else {
            high = mid;
          }
        }
        return high;
      }
      return baseSortedIndexBy(array, value, identity, retHighest);
    }

    /**
     * The base implementation of `_.sortedIndexBy` and `_.sortedLastIndexBy`
     * which invokes `iteratee` for `value` and each element of `array` to compute
     * their sort ranking. The iteratee is invoked with one argument; (value).
     *
     * @private
     * @param {Array} array The sorted array to inspect.
     * @param {*} value The value to evaluate.
     * @param {Function} iteratee The iteratee invoked per element.
     * @param {boolean} [retHighest] Specify returning the highest qualified index.
     * @returns {number} Returns the index at which `value` should be inserted into `array`.
     */
    function baseSortedIndexBy(array, value, iteratee, retHighest) {
      value = iteratee(value);

      var low = 0,
          high = array ? array.length : 0,
          valIsNaN = value !== value,
          valIsNull = value === null,
          valIsUndef = value === undefined;

      while (low < high) {
        var mid = nativeFloor((low + high) / 2),
            computed = iteratee(array[mid]),
            isDef = computed !== undefined,
            isReflexive = computed === computed;

        if (valIsNaN) {
          var setLow = isReflexive || retHighest;
        } else if (valIsNull) {
          setLow = isReflexive && isDef && (retHighest || computed != null);
        } else if (valIsUndef) {
          setLow = isReflexive && (retHighest || isDef);
        } else if (computed == null) {
          setLow = false;
        } else {
          setLow = retHighest ? (computed <= value) : (computed < value);
        }
        if (setLow) {
          low = mid + 1;
        } else {
          high = mid;
        }
      }
      return nativeMin(high, MAX_ARRAY_INDEX);
    }

    /**
     * The base implementation of `_.sortedUniq`.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @returns {Array} Returns the new duplicate free array.
     */
    function baseSortedUniq(array) {
      return baseSortedUniqBy(array);
    }

    /**
     * The base implementation of `_.sortedUniqBy` without support for iteratee
     * shorthands.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {Function} [iteratee] The iteratee invoked per element.
     * @returns {Array} Returns the new duplicate free array.
     */
    function baseSortedUniqBy(array, iteratee) {
      var index = 0,
          length = array.length,
          value = array[0],
          computed = iteratee ? iteratee(value) : value,
          seen = computed,
          resIndex = 0,
          result = [value];

      while (++index < length) {
        value = array[index],
        computed = iteratee ? iteratee(value) : value;

        if (!eq(computed, seen)) {
          seen = computed;
          result[++resIndex] = value;
        }
      }
      return result;
    }

    /**
     * The base implementation of `_.toPath` which only converts `value` to a
     * path if it's not one.
     *
     * @private
     * @param {*} value The value to process.
     * @returns {Array} Returns the property path array.
     */
    function baseToPath(value) {
      return isArray(value) ? value : stringToPath(value);
    }

    /**
     * The base implementation of `_.uniqBy` without support for iteratee shorthands.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {Function} [iteratee] The iteratee invoked per element.
     * @param {Function} [comparator] The comparator invoked per element.
     * @returns {Array} Returns the new duplicate free array.
     */
    function baseUniq(array, iteratee, comparator) {
      var index = -1,
          includes = arrayIncludes,
          length = array.length,
          isCommon = true,
          result = [],
          seen = result;

      if (comparator) {
        isCommon = false;
        includes = arrayIncludesWith;
      }
      else if (length >= LARGE_ARRAY_SIZE) {
        var set = iteratee ? null : createSet(array);
        if (set) {
          return setToArray(set);
        }
        isCommon = false;
        includes = cacheHas;
        seen = new SetCache;
      }
      else {
        seen = iteratee ? [] : result;
      }
      outer:
      while (++index < length) {
        var value = array[index],
            computed = iteratee ? iteratee(value) : value;

        if (isCommon && computed === computed) {
          var seenIndex = seen.length;
          while (seenIndex--) {
            if (seen[seenIndex] === computed) {
              continue outer;
            }
          }
          if (iteratee) {
            seen.push(computed);
          }
          result.push(value);
        }
        else if (!includes(seen, computed, comparator)) {
          if (seen !== result) {
            seen.push(computed);
          }
          result.push(value);
        }
      }
      return result;
    }

    /**
     * The base implementation of `_.unset`.
     *
     * @private
     * @param {Object} object The object to modify.
     * @param {Array|string} path The path of the property to unset.
     * @returns {boolean} Returns `true` if the property is deleted, else `false`.
     */
    function baseUnset(object, path) {
      path = isKey(path, object) ? [path + ''] : baseToPath(path);
      object = parent(object, path);
      var key = last(path);
      return (object != null && has(object, key)) ? delete object[key] : true;
    }

    /**
     * The base implementation of methods like `_.dropWhile` and `_.takeWhile`
     * without support for iteratee shorthands.
     *
     * @private
     * @param {Array} array The array to query.
     * @param {Function} predicate The function invoked per iteration.
     * @param {boolean} [isDrop] Specify dropping elements instead of taking them.
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {Array} Returns the slice of `array`.
     */
    function baseWhile(array, predicate, isDrop, fromRight) {
      var length = array.length,
          index = fromRight ? length : -1;

      while ((fromRight ? index-- : ++index < length) &&
        predicate(array[index], index, array)) {}

      return isDrop
        ? baseSlice(array, (fromRight ? 0 : index), (fromRight ? index + 1 : length))
        : baseSlice(array, (fromRight ? index + 1 : 0), (fromRight ? length : index));
    }

    /**
     * The base implementation of `wrapperValue` which returns the result of
     * performing a sequence of actions on the unwrapped `value`, where each
     * successive action is supplied the return value of the previous.
     *
     * @private
     * @param {*} value The unwrapped value.
     * @param {Array} actions Actions to perform to resolve the unwrapped value.
     * @returns {*} Returns the resolved value.
     */
    function baseWrapperValue(value, actions) {
      var result = value;
      if (result instanceof LazyWrapper) {
        result = result.value();
      }
      return arrayReduce(actions, function(result, action) {
        return action.func.apply(action.thisArg, arrayPush([result], action.args));
      }, result);
    }

    /**
     * The base implementation of methods like `_.xor`, without support for
     * iteratee shorthands, that accepts an array of arrays to inspect.
     *
     * @private
     * @param {Array} arrays The arrays to inspect.
     * @param {Function} [iteratee] The iteratee invoked per element.
     * @param {Function} [comparator] The comparator invoked per element.
     * @returns {Array} Returns the new array of values.
     */
    function baseXor(arrays, iteratee, comparator) {
      var index = -1,
          length = arrays.length;

      while (++index < length) {
        var result = result
          ? arrayPush(
              baseDifference(result, arrays[index], iteratee, comparator),
              baseDifference(arrays[index], result, iteratee, comparator)
            )
          : arrays[index];
      }
      return (result && result.length) ? baseUniq(result, iteratee, comparator) : [];
    }

    /**
     * This base implementation of `_.zipObject` which assigns values using `assignFunc`.
     *
     * @private
     * @param {Array} props The property names.
     * @param {Array} values The property values.
     * @param {Function} assignFunc The function to assign values.
     * @returns {Object} Returns the new object.
     */
    function baseZipObject(props, values, assignFunc) {
      var index = -1,
          length = props.length,
          valsLength = values.length,
          result = {};

      while (++index < length) {
        assignFunc(result, props[index], index < valsLength ? values[index] : undefined);
      }
      return result;
    }

    /**
     * Creates a clone of  `buffer`.
     *
     * @private
     * @param {Buffer} buffer The buffer to clone.
     * @param {boolean} [isDeep] Specify a deep clone.
     * @returns {Buffer} Returns the cloned buffer.
     */
    function cloneBuffer(buffer, isDeep) {
      if (isDeep) {
        return buffer.slice();
      }
      var Ctor = buffer.constructor,
          result = new Ctor(buffer.length);

      buffer.copy(result);
      return result;
    }

    /**
     * Creates a clone of `arrayBuffer`.
     *
     * @private
     * @param {ArrayBuffer} arrayBuffer The array buffer to clone.
     * @returns {ArrayBuffer} Returns the cloned array buffer.
     */
    function cloneArrayBuffer(arrayBuffer) {
      var Ctor = arrayBuffer.constructor,
          result = new Ctor(arrayBuffer.byteLength),
          view = new Uint8Array(result);

      view.set(new Uint8Array(arrayBuffer));
      return result;
    }

    /**
     * Creates a clone of `map`.
     *
     * @private
     * @param {Object} map The map to clone.
     * @returns {Object} Returns the cloned map.
     */
    function cloneMap(map) {
      var Ctor = map.constructor;
      return arrayReduce(mapToArray(map), addMapEntry, new Ctor);
    }

    /**
     * Creates a clone of `regexp`.
     *
     * @private
     * @param {Object} regexp The regexp to clone.
     * @returns {Object} Returns the cloned regexp.
     */
    function cloneRegExp(regexp) {
      var Ctor = regexp.constructor,
          result = new Ctor(regexp.source, reFlags.exec(regexp));

      result.lastIndex = regexp.lastIndex;
      return result;
    }

    /**
     * Creates a clone of `set`.
     *
     * @private
     * @param {Object} set The set to clone.
     * @returns {Object} Returns the cloned set.
     */
    function cloneSet(set) {
      var Ctor = set.constructor;
      return arrayReduce(setToArray(set), addSetEntry, new Ctor);
    }

    /**
     * Creates a clone of the `symbol` object.
     *
     * @private
     * @param {Object} symbol The symbol object to clone.
     * @returns {Object} Returns the cloned symbol object.
     */
    function cloneSymbol(symbol) {
      return Symbol ? Object(symbolValueOf.call(symbol)) : {};
    }

    /**
     * Creates a clone of `typedArray`.
     *
     * @private
     * @param {Object} typedArray The typed array to clone.
     * @param {boolean} [isDeep] Specify a deep clone.
     * @returns {Object} Returns the cloned typed array.
     */
    function cloneTypedArray(typedArray, isDeep) {
      var buffer = typedArray.buffer,
          Ctor = typedArray.constructor;

      return new Ctor(isDeep ? cloneArrayBuffer(buffer) : buffer, typedArray.byteOffset, typedArray.length);
    }

    /**
     * Creates an array that is the composition of partially applied arguments,
     * placeholders, and provided arguments into a single array of arguments.
     *
     * @private
     * @param {Array|Object} args The provided arguments.
     * @param {Array} partials The arguments to prepend to those provided.
     * @param {Array} holders The `partials` placeholder indexes.
     * @returns {Array} Returns the new array of composed arguments.
     */
    function composeArgs(args, partials, holders) {
      var holdersLength = holders.length,
          argsIndex = -1,
          argsLength = nativeMax(args.length - holdersLength, 0),
          leftIndex = -1,
          leftLength = partials.length,
          result = Array(leftLength + argsLength);

      while (++leftIndex < leftLength) {
        result[leftIndex] = partials[leftIndex];
      }
      while (++argsIndex < holdersLength) {
        result[holders[argsIndex]] = args[argsIndex];
      }
      while (argsLength--) {
        result[leftIndex++] = args[argsIndex++];
      }
      return result;
    }

    /**
     * This function is like `composeArgs` except that the arguments composition
     * is tailored for `_.partialRight`.
     *
     * @private
     * @param {Array|Object} args The provided arguments.
     * @param {Array} partials The arguments to append to those provided.
     * @param {Array} holders The `partials` placeholder indexes.
     * @returns {Array} Returns the new array of composed arguments.
     */
    function composeArgsRight(args, partials, holders) {
      var holdersIndex = -1,
          holdersLength = holders.length,
          argsIndex = -1,
          argsLength = nativeMax(args.length - holdersLength, 0),
          rightIndex = -1,
          rightLength = partials.length,
          result = Array(argsLength + rightLength);

      while (++argsIndex < argsLength) {
        result[argsIndex] = args[argsIndex];
      }
      var offset = argsIndex;
      while (++rightIndex < rightLength) {
        result[offset + rightIndex] = partials[rightIndex];
      }
      while (++holdersIndex < holdersLength) {
        result[offset + holders[holdersIndex]] = args[argsIndex++];
      }
      return result;
    }

    /**
     * Copies the values of `source` to `array`.
     *
     * @private
     * @param {Array} source The array to copy values from.
     * @param {Array} [array=[]] The array to copy values to.
     * @returns {Array} Returns `array`.
     */
    function copyArray(source, array) {
      var index = -1,
          length = source.length;

      array || (array = Array(length));
      while (++index < length) {
        array[index] = source[index];
      }
      return array;
    }

    /**
     * Copies properties of `source` to `object`.
     *
     * @private
     * @param {Object} source The object to copy properties from.
     * @param {Array} props The property names to copy.
     * @param {Object} [object={}] The object to copy properties to.
     * @returns {Object} Returns `object`.
     */
    function copyObject(source, props, object) {
      return copyObjectWith(source, props, object);
    }

    /**
     * This function is like `copyObject` except that it accepts a function to
     * customize copied values.
     *
     * @private
     * @param {Object} source The object to copy properties from.
     * @param {Array} props The property names to copy.
     * @param {Object} [object={}] The object to copy properties to.
     * @param {Function} [customizer] The function to customize copied values.
     * @returns {Object} Returns `object`.
     */
    function copyObjectWith(source, props, object, customizer) {
      object || (object = {});

      var index = -1,
          length = props.length;

      while (++index < length) {
        var key = props[index],
            newValue = customizer ? customizer(object[key], source[key], key, object, source) : source[key];

        assignValue(object, key, newValue);
      }
      return object;
    }

    /**
     * Copies own symbol properties of `source` to `object`.
     *
     * @private
     * @param {Object} source The object to copy symbols from.
     * @param {Object} [object={}] The object to copy symbols to.
     * @returns {Object} Returns `object`.
     */
    function copySymbols(source, object) {
      return copyObject(source, getSymbols(source), object);
    }

    /**
     * Creates a function like `_.groupBy`.
     *
     * @private
     * @param {Function} setter The function to set accumulator values.
     * @param {Function} [initializer] The accumulator object initializer.
     * @returns {Function} Returns the new aggregator function.
     */
    function createAggregator(setter, initializer) {
      return function(collection, iteratee) {
        var func = isArray(collection) ? arrayAggregator : baseAggregator,
            accumulator = initializer ? initializer() : {};

        return func(collection, setter, getIteratee(iteratee), accumulator);
      };
    }

    /**
     * Creates a function like `_.assign`.
     *
     * @private
     * @param {Function} assigner The function to assign values.
     * @returns {Function} Returns the new assigner function.
     */
    function createAssigner(assigner) {
      return rest(function(object, sources) {
        var index = -1,
            length = sources.length,
            customizer = length > 1 ? sources[length - 1] : undefined,
            guard = length > 2 ? sources[2] : undefined;

        customizer = typeof customizer == 'function' ? (length--, customizer) : undefined;
        if (guard && isIterateeCall(sources[0], sources[1], guard)) {
          customizer = length < 3 ? undefined : customizer;
          length = 1;
        }
        object = Object(object);
        while (++index < length) {
          var source = sources[index];
          if (source) {
            assigner(object, source, index, customizer);
          }
        }
        return object;
      });
    }

    /**
     * Creates a `baseEach` or `baseEachRight` function.
     *
     * @private
     * @param {Function} eachFunc The function to iterate over a collection.
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {Function} Returns the new base function.
     */
    function createBaseEach(eachFunc, fromRight) {
      return function(collection, iteratee) {
        if (collection == null) {
          return collection;
        }
        if (!isArrayLike(collection)) {
          return eachFunc(collection, iteratee);
        }
        var length = collection.length,
            index = fromRight ? length : -1,
            iterable = Object(collection);

        while ((fromRight ? index-- : ++index < length)) {
          if (iteratee(iterable[index], index, iterable) === false) {
            break;
          }
        }
        return collection;
      };
    }

    /**
     * Creates a base function for methods like `_.forIn`.
     *
     * @private
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {Function} Returns the new base function.
     */
    function createBaseFor(fromRight) {
      return function(object, iteratee, keysFunc) {
        var index = -1,
            iterable = Object(object),
            props = keysFunc(object),
            length = props.length;

        while (length--) {
          var key = props[fromRight ? length : ++index];
          if (iteratee(iterable[key], key, iterable) === false) {
            break;
          }
        }
        return object;
      };
    }

    /**
     * Creates a function that wraps `func` to invoke it with the optional `this`
     * binding of `thisArg`.
     *
     * @private
     * @param {Function} func The function to wrap.
     * @param {number} bitmask The bitmask of wrapper flags. See `createWrapper` for more details.
     * @param {*} [thisArg] The `this` binding of `func`.
     * @returns {Function} Returns the new wrapped function.
     */
    function createBaseWrapper(func, bitmask, thisArg) {
      var isBind = bitmask & BIND_FLAG,
          Ctor = createCtorWrapper(func);

      function wrapper() {
        var fn = (this && this !== root && this instanceof wrapper) ? Ctor : func;
        return fn.apply(isBind ? thisArg : this, arguments);
      }
      return wrapper;
    }

    /**
     * Creates a function like `_.lowerFirst`.
     *
     * @private
     * @param {string} methodName The name of the `String` case method to use.
     * @returns {Function} Returns the new function.
     */
    function createCaseFirst(methodName) {
      return function(string) {
        string = toString(string);

        var strSymbols = reHasComplexSymbol.test(string) ? stringToArray(string) : undefined,
            chr = strSymbols ? strSymbols[0] : string.charAt(0),
            trailing = strSymbols ? strSymbols.slice(1).join('') : string.slice(1);

        return chr[methodName]() + trailing;
      };
    }

    /**
     * Creates a function like `_.camelCase`.
     *
     * @private
     * @param {Function} callback The function to combine each word.
     * @returns {Function} Returns the new compounder function.
     */
    function createCompounder(callback) {
      return function(string) {
        return arrayReduce(words(deburr(string)), callback, '');
      };
    }

    /**
     * Creates a function that produces an instance of `Ctor` regardless of
     * whether it was invoked as part of a `new` expression or by `call` or `apply`.
     *
     * @private
     * @param {Function} Ctor The constructor to wrap.
     * @returns {Function} Returns the new wrapped function.
     */
    function createCtorWrapper(Ctor) {
      return function() {
        // Use a `switch` statement to work with class constructors.
        // See http://ecma-international.org/ecma-262/6.0/#sec-ecmascript-function-objects-call-thisargument-argumentslist
        // for more details.
        var args = arguments;
        switch (args.length) {
          case 0: return new Ctor;
          case 1: return new Ctor(args[0]);
          case 2: return new Ctor(args[0], args[1]);
          case 3: return new Ctor(args[0], args[1], args[2]);
          case 4: return new Ctor(args[0], args[1], args[2], args[3]);
          case 5: return new Ctor(args[0], args[1], args[2], args[3], args[4]);
          case 6: return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5]);
          case 7: return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
        }
        var thisBinding = baseCreate(Ctor.prototype),
            result = Ctor.apply(thisBinding, args);

        // Mimic the constructor's `return` behavior.
        // See https://es5.github.io/#x13.2.2 for more details.
        return isObject(result) ? result : thisBinding;
      };
    }

    /**
     * Creates a function that wraps `func` to enable currying.
     *
     * @private
     * @param {Function} func The function to wrap.
     * @param {number} bitmask The bitmask of wrapper flags. See `createWrapper` for more details.
     * @param {number} arity The arity of `func`.
     * @returns {Function} Returns the new wrapped function.
     */
    function createCurryWrapper(func, bitmask, arity) {
      var Ctor = createCtorWrapper(func);

      function wrapper() {
        var length = arguments.length,
            index = length,
            args = Array(length),
            fn = (this && this !== root && this instanceof wrapper) ? Ctor : func,
            placeholder = lodash.placeholder || wrapper.placeholder;

        while (index--) {
          args[index] = arguments[index];
        }
        var holders = (length < 3 && args[0] !== placeholder && args[length - 1] !== placeholder)
          ? []
          : replaceHolders(args, placeholder);

        length -= holders.length;
        return length < arity
          ? createRecurryWrapper(func, bitmask, createHybridWrapper, placeholder, undefined, args, holders, undefined, undefined, arity - length)
          : apply(fn, this, args);
      }
      return wrapper;
    }

    /**
     * Creates a `_.flow` or `_.flowRight` function.
     *
     * @private
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {Function} Returns the new flow function.
     */
    function createFlow(fromRight) {
      return rest(function(funcs) {
        funcs = baseFlatten(funcs);

        var length = funcs.length,
            index = length,
            prereq = LodashWrapper.prototype.thru;

        if (fromRight) {
          funcs.reverse();
        }
        while (index--) {
          var func = funcs[index];
          if (typeof func != 'function') {
            throw new TypeError(FUNC_ERROR_TEXT);
          }
          if (prereq && !wrapper && getFuncName(func) == 'wrapper') {
            var wrapper = new LodashWrapper([], true);
          }
        }
        index = wrapper ? index : length;
        while (++index < length) {
          func = funcs[index];

          var funcName = getFuncName(func),
              data = funcName == 'wrapper' ? getData(func) : undefined;

          if (data && isLaziable(data[0]) && data[1] == (ARY_FLAG | CURRY_FLAG | PARTIAL_FLAG | REARG_FLAG) && !data[4].length && data[9] == 1) {
            wrapper = wrapper[getFuncName(data[0])].apply(wrapper, data[3]);
          } else {
            wrapper = (func.length == 1 && isLaziable(func)) ? wrapper[funcName]() : wrapper.thru(func);
          }
        }
        return function() {
          var args = arguments,
              value = args[0];

          if (wrapper && args.length == 1 && isArray(value) && value.length >= LARGE_ARRAY_SIZE) {
            return wrapper.plant(value).value();
          }
          var index = 0,
              result = length ? funcs[index].apply(this, args) : value;

          while (++index < length) {
            result = funcs[index].call(this, result);
          }
          return result;
        };
      });
    }

    /**
     * Creates a function that wraps `func` to invoke it with optional `this`
     * binding of `thisArg`, partial application, and currying.
     *
     * @private
     * @param {Function|string} func The function or method name to wrap.
     * @param {number} bitmask The bitmask of wrapper flags. See `createWrapper` for more details.
     * @param {*} [thisArg] The `this` binding of `func`.
     * @param {Array} [partials] The arguments to prepend to those provided to the new function.
     * @param {Array} [holders] The `partials` placeholder indexes.
     * @param {Array} [partialsRight] The arguments to append to those provided to the new function.
     * @param {Array} [holdersRight] The `partialsRight` placeholder indexes.
     * @param {Array} [argPos] The argument positions of the new function.
     * @param {number} [ary] The arity cap of `func`.
     * @param {number} [arity] The arity of `func`.
     * @returns {Function} Returns the new wrapped function.
     */
    function createHybridWrapper(func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary, arity) {
      var isAry = bitmask & ARY_FLAG,
          isBind = bitmask & BIND_FLAG,
          isBindKey = bitmask & BIND_KEY_FLAG,
          isCurry = bitmask & CURRY_FLAG,
          isCurryRight = bitmask & CURRY_RIGHT_FLAG,
          isFlip = bitmask & FLIP_FLAG,
          Ctor = isBindKey ? undefined : createCtorWrapper(func);

      function wrapper() {
        var length = arguments.length,
            index = length,
            args = Array(length);

        while (index--) {
          args[index] = arguments[index];
        }
        if (partials) {
          args = composeArgs(args, partials, holders);
        }
        if (partialsRight) {
          args = composeArgsRight(args, partialsRight, holdersRight);
        }
        if (isCurry || isCurryRight) {
          var placeholder = lodash.placeholder || wrapper.placeholder,
              argsHolders = replaceHolders(args, placeholder);

          length -= argsHolders.length;
          if (length < arity) {
            return createRecurryWrapper(func, bitmask, createHybridWrapper, placeholder, thisArg, args, argsHolders, argPos, ary, arity - length);
          }
        }
        var thisBinding = isBind ? thisArg : this,
            fn = isBindKey ? thisBinding[func] : func;

        if (argPos) {
          args = reorder(args, argPos);
        } else if (isFlip && args.length > 1) {
          args.reverse();
        }
        if (isAry && ary < args.length) {
          args.length = ary;
        }
        if (this && this !== root && this instanceof wrapper) {
          fn = Ctor || createCtorWrapper(fn);
        }
        return fn.apply(thisBinding, args);
      }
      return wrapper;
    }

    /**
     * Creates a function like `_.invertBy`.
     *
     * @private
     * @param {Function} setter The function to set accumulator values.
     * @param {Function} toIteratee The function to resolve iteratees.
     * @returns {Function} Returns the new inverter function.
     */
    function createInverter(setter, toIteratee) {
      return function(object, iteratee) {
        return baseInverter(object, setter, toIteratee(iteratee), {});
      };
    }

    /**
     * Creates a function like `_.over`.
     *
     * @private
     * @param {Function} arrayFunc The function to iterate over iteratees.
     * @returns {Function} Returns the new invoker function.
     */
    function createOver(arrayFunc) {
      return rest(function(iteratees) {
        iteratees = arrayMap(baseFlatten(iteratees), getIteratee());
        return rest(function(args) {
          var thisArg = this;
          return arrayFunc(iteratees, function(iteratee) {
            return apply(iteratee, thisArg, args);
          });
        });
      });
    }

    /**
     * Creates the padding for `string` based on `length`. The `chars` string
     * is truncated if the number of characters exceeds `length`.
     *
     * @private
     * @param {string} string The string to create padding for.
     * @param {number} [length=0] The padding length.
     * @param {string} [chars=' '] The string used as padding.
     * @returns {string} Returns the padding for `string`.
     */
    function createPadding(string, length, chars) {
      length = toInteger(length);

      var strLength = stringSize(string);
      if (!length || strLength >= length) {
        return '';
      }
      var padLength = length - strLength;
      chars = chars === undefined ? ' ' : (chars + '');

      var result = repeat(chars, nativeCeil(padLength / stringSize(chars)));
      return reHasComplexSymbol.test(chars)
        ? stringToArray(result).slice(0, padLength).join('')
        : result.slice(0, padLength);
    }

    /**
     * Creates a function that wraps `func` to invoke it with the optional `this`
     * binding of `thisArg` and the `partials` prepended to those provided to
     * the wrapper.
     *
     * @private
     * @param {Function} func The function to wrap.
     * @param {number} bitmask The bitmask of wrapper flags. See `createWrapper` for more details.
     * @param {*} thisArg The `this` binding of `func`.
     * @param {Array} partials The arguments to prepend to those provided to the new function.
     * @returns {Function} Returns the new wrapped function.
     */
    function createPartialWrapper(func, bitmask, thisArg, partials) {
      var isBind = bitmask & BIND_FLAG,
          Ctor = createCtorWrapper(func);

      function wrapper() {
        var argsIndex = -1,
            argsLength = arguments.length,
            leftIndex = -1,
            leftLength = partials.length,
            args = Array(leftLength + argsLength),
            fn = (this && this !== root && this instanceof wrapper) ? Ctor : func;

        while (++leftIndex < leftLength) {
          args[leftIndex] = partials[leftIndex];
        }
        while (argsLength--) {
          args[leftIndex++] = arguments[++argsIndex];
        }
        return apply(fn, isBind ? thisArg : this, args);
      }
      return wrapper;
    }

    /**
     * Creates a `_.range` or `_.rangeRight` function.
     *
     * @private
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {Function} Returns the new range function.
     */
    function createRange(fromRight) {
      return function(start, end, step) {
        if (step && typeof step != 'number' && isIterateeCall(start, end, step)) {
          end = step = undefined;
        }
        // Ensure the sign of `-0` is preserved.
        start = toNumber(start);
        start = start === start ? start : 0;
        if (end === undefined) {
          end = start;
          start = 0;
        } else {
          end = toNumber(end) || 0;
        }
        step = step === undefined ? (start < end ? 1 : -1) : (toNumber(step) || 0);
        return baseRange(start, end, step, fromRight);
      };
    }

    /**
     * Creates a function that wraps `func` to continue currying.
     *
     * @private
     * @param {Function} func The function to wrap.
     * @param {number} bitmask The bitmask of wrapper flags. See `createWrapper` for more details.
     * @param {Function} wrapFunc The function to create the `func` wrapper.
     * @param {*} placeholder The placeholder to replace.
     * @param {*} [thisArg] The `this` binding of `func`.
     * @param {Array} [partials] The arguments to prepend to those provided to the new function.
     * @param {Array} [holders] The `partials` placeholder indexes.
     * @param {Array} [argPos] The argument positions of the new function.
     * @param {number} [ary] The arity cap of `func`.
     * @param {number} [arity] The arity of `func`.
     * @returns {Function} Returns the new wrapped function.
     */
    function createRecurryWrapper(func, bitmask, wrapFunc, placeholder, thisArg, partials, holders, argPos, ary, arity) {
      var isCurry = bitmask & CURRY_FLAG,
          newArgPos = argPos ? copyArray(argPos) : undefined,
          newsHolders = isCurry ? holders : undefined,
          newHoldersRight = isCurry ? undefined : holders,
          newPartials = isCurry ? partials : undefined,
          newPartialsRight = isCurry ? undefined : partials;

      bitmask |= (isCurry ? PARTIAL_FLAG : PARTIAL_RIGHT_FLAG);
      bitmask &= ~(isCurry ? PARTIAL_RIGHT_FLAG : PARTIAL_FLAG);

      if (!(bitmask & CURRY_BOUND_FLAG)) {
        bitmask &= ~(BIND_FLAG | BIND_KEY_FLAG);
      }
      var newData = [func, bitmask, thisArg, newPartials, newsHolders, newPartialsRight, newHoldersRight, newArgPos, ary, arity],
          result = wrapFunc.apply(undefined, newData);

      if (isLaziable(func)) {
        setData(result, newData);
      }
      result.placeholder = placeholder;
      return result;
    }

    /**
     * Creates a function like `_.round`.
     *
     * @private
     * @param {string} methodName The name of the `Math` method to use when rounding.
     * @returns {Function} Returns the new round function.
     */
    function createRound(methodName) {
      var func = Math[methodName];
      return function(number, precision) {
        number = toNumber(number);
        precision = toInteger(precision);
        if (precision) {
          // Shift with exponential notation to avoid floating-point issues.
          // See [MDN](https://mdn.io/round#Examples) for more details.
          var pair = (toString(number) + 'e').split('e'),
              value = func(pair[0] + 'e' + (+pair[1] + precision));

          pair = (toString(value) + 'e').split('e');
          return +(pair[0] + 'e' + (+pair[1] - precision));
        }
        return func(number);
      };
    }

    /**
     * Creates a set of `values`.
     *
     * @private
     * @param {Array} values The values to add to the set.
     * @returns {Object} Returns the new set.
     */
    var createSet = !(Set && new Set([1, 2]).size === 2) ? noop : function(values) {
      return new Set(values);
    };

    /**
     * Creates a function that either curries or invokes `func` with optional
     * `this` binding and partially applied arguments.
     *
     * @private
     * @param {Function|string} func The function or method name to wrap.
     * @param {number} bitmask The bitmask of wrapper flags.
     *  The bitmask may be composed of the following flags:
     *     1 - `_.bind`
     *     2 - `_.bindKey`
     *     4 - `_.curry` or `_.curryRight` of a bound function
     *     8 - `_.curry`
     *    16 - `_.curryRight`
     *    32 - `_.partial`
     *    64 - `_.partialRight`
     *   128 - `_.rearg`
     *   256 - `_.ary`
     * @param {*} [thisArg] The `this` binding of `func`.
     * @param {Array} [partials] The arguments to be partially applied.
     * @param {Array} [holders] The `partials` placeholder indexes.
     * @param {Array} [argPos] The argument positions of the new function.
     * @param {number} [ary] The arity cap of `func`.
     * @param {number} [arity] The arity of `func`.
     * @returns {Function} Returns the new wrapped function.
     */
    function createWrapper(func, bitmask, thisArg, partials, holders, argPos, ary, arity) {
      var isBindKey = bitmask & BIND_KEY_FLAG;
      if (!isBindKey && typeof func != 'function') {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      var length = partials ? partials.length : 0;
      if (!length) {
        bitmask &= ~(PARTIAL_FLAG | PARTIAL_RIGHT_FLAG);
        partials = holders = undefined;
      }
      ary = ary === undefined ? ary : nativeMax(toInteger(ary), 0);
      arity = arity === undefined ? arity : toInteger(arity);
      length -= holders ? holders.length : 0;

      if (bitmask & PARTIAL_RIGHT_FLAG) {
        var partialsRight = partials,
            holdersRight = holders;

        partials = holders = undefined;
      }
      var data = isBindKey ? undefined : getData(func),
          newData = [func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary, arity];

      if (data) {
        mergeData(newData, data);
      }
      func = newData[0];
      bitmask = newData[1];
      thisArg = newData[2];
      partials = newData[3];
      holders = newData[4];
      arity = newData[9] = newData[9] == null
        ? (isBindKey ? 0 : func.length)
        : nativeMax(newData[9] - length, 0);

      if (!arity && bitmask & (CURRY_FLAG | CURRY_RIGHT_FLAG)) {
        bitmask &= ~(CURRY_FLAG | CURRY_RIGHT_FLAG);
      }
      if (!bitmask || bitmask == BIND_FLAG) {
        var result = createBaseWrapper(func, bitmask, thisArg);
      } else if (bitmask == CURRY_FLAG || bitmask == CURRY_RIGHT_FLAG) {
        result = createCurryWrapper(func, bitmask, arity);
      } else if ((bitmask == PARTIAL_FLAG || bitmask == (BIND_FLAG | PARTIAL_FLAG)) && !holders.length) {
        result = createPartialWrapper(func, bitmask, thisArg, partials);
      } else {
        result = createHybridWrapper.apply(undefined, newData);
      }
      var setter = data ? baseSetData : setData;
      return setter(result, newData);
    }

    /**
     * A specialized version of `baseIsEqualDeep` for arrays with support for
     * partial deep comparisons.
     *
     * @private
     * @param {Array} array The array to compare.
     * @param {Array} other The other array to compare.
     * @param {Function} equalFunc The function to determine equivalents of values.
     * @param {Function} [customizer] The function to customize comparisons.
     * @param {number} [bitmask] The bitmask of comparison flags. See `baseIsEqual` for more details.
     * @param {Object} [stack] Tracks traversed `array` and `other` objects.
     * @returns {boolean} Returns `true` if the arrays are equivalent, else `false`.
     */
    function equalArrays(array, other, equalFunc, customizer, bitmask, stack) {
      var index = -1,
          isPartial = bitmask & PARTIAL_COMPARE_FLAG,
          isUnordered = bitmask & UNORDERED_COMPARE_FLAG,
          arrLength = array.length,
          othLength = other.length;

      if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
        return false;
      }
      // Assume cyclic values are equal.
      var stacked = stack.get(array);
      if (stacked) {
        return stacked == other;
      }
      var result = true;
      stack.set(array, other);

      // Ignore non-index properties.
      while (++index < arrLength) {
        var arrValue = array[index],
            othValue = other[index];

        if (customizer) {
          var compared = isPartial
            ? customizer(othValue, arrValue, index, other, array, stack)
            : customizer(arrValue, othValue, index, array, other, stack);
        }
        if (compared !== undefined) {
          if (compared) {
            continue;
          }
          result = false;
          break;
        }
        // Recursively compare arrays (susceptible to call stack limits).
        if (isUnordered) {
          if (!arraySome(other, function(othValue) {
                return arrValue === othValue || equalFunc(arrValue, othValue, customizer, bitmask, stack);
              })) {
            result = false;
            break;
          }
        } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, customizer, bitmask, stack))) {
          result = false;
          break;
        }
      }
      stack['delete'](array);
      return result;
    }

    /**
     * A specialized version of `baseIsEqualDeep` for comparing objects of
     * the same `toStringTag`.
     *
     * **Note:** This function only supports comparing values with tags of
     * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
     *
     * @private
     * @param {Object} object The object to compare.
     * @param {Object} other The other object to compare.
     * @param {string} tag The `toStringTag` of the objects to compare.
     * @param {Function} equalFunc The function to determine equivalents of values.
     * @param {Function} [customizer] The function to customize comparisons.
     * @param {number} [bitmask] The bitmask of comparison flags. See `baseIsEqual` for more details.
     * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
     */
    function equalByTag(object, other, tag, equalFunc, customizer, bitmask) {
      switch (tag) {
        case arrayBufferTag:
          if ((object.byteLength != other.byteLength) ||
              !equalFunc(new Uint8Array(object), new Uint8Array(other))) {
            return false;
          }
          return true;

        case boolTag:
        case dateTag:
          // Coerce dates and booleans to numbers, dates to milliseconds and booleans
          // to `1` or `0` treating invalid dates coerced to `NaN` as not equal.
          return +object == +other;

        case errorTag:
          return object.name == other.name && object.message == other.message;

        case numberTag:
          // Treat `NaN` vs. `NaN` as equal.
          return (object != +object) ? other != +other : object == +other;

        case regexpTag:
        case stringTag:
          // Coerce regexes to strings and treat strings primitives and string
          // objects as equal. See https://es5.github.io/#x15.10.6.4 for more details.
          return object == (other + '');

        case mapTag:
          var convert = mapToArray;

        case setTag:
          var isPartial = bitmask & PARTIAL_COMPARE_FLAG;
          convert || (convert = setToArray);

          // Recursively compare objects (susceptible to call stack limits).
          return (isPartial || object.size == other.size) &&
            equalFunc(convert(object), convert(other), customizer, bitmask | UNORDERED_COMPARE_FLAG);

        case symbolTag:
          return !!Symbol && (symbolValueOf.call(object) == symbolValueOf.call(other));
      }
      return false;
    }

    /**
     * A specialized version of `baseIsEqualDeep` for objects with support for
     * partial deep comparisons.
     *
     * @private
     * @param {Object} object The object to compare.
     * @param {Object} other The other object to compare.
     * @param {Function} equalFunc The function to determine equivalents of values.
     * @param {Function} [customizer] The function to customize comparisons.
     * @param {number} [bitmask] The bitmask of comparison flags. See `baseIsEqual` for more details.
     * @param {Object} [stack] Tracks traversed `object` and `other` objects.
     * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
     */
    function equalObjects(object, other, equalFunc, customizer, bitmask, stack) {
      var isPartial = bitmask & PARTIAL_COMPARE_FLAG,
          objProps = keys(object),
          objLength = objProps.length,
          othProps = keys(other),
          othLength = othProps.length;

      if (objLength != othLength && !isPartial) {
        return false;
      }
      var index = objLength;
      while (index--) {
        var key = objProps[index];
        if (!(isPartial ? key in other : baseHas(other, key))) {
          return false;
        }
      }
      // Assume cyclic values are equal.
      var stacked = stack.get(object);
      if (stacked) {
        return stacked == other;
      }
      var result = true;
      stack.set(object, other);

      var skipCtor = isPartial;
      while (++index < objLength) {
        key = objProps[index];
        var objValue = object[key],
            othValue = other[key];

        if (customizer) {
          var compared = isPartial
            ? customizer(othValue, objValue, key, other, object, stack)
            : customizer(objValue, othValue, key, object, other, stack);
        }
        // Recursively compare objects (susceptible to call stack limits).
        if (!(compared === undefined
              ? (objValue === othValue || equalFunc(objValue, othValue, customizer, bitmask, stack))
              : compared
            )) {
          result = false;
          break;
        }
        skipCtor || (skipCtor = key == 'constructor');
      }
      if (result && !skipCtor) {
        var objCtor = object.constructor,
            othCtor = other.constructor;

        // Non `Object` object instances with different constructors are not equal.
        if (objCtor != othCtor &&
            ('constructor' in object && 'constructor' in other) &&
            !(typeof objCtor == 'function' && objCtor instanceof objCtor &&
              typeof othCtor == 'function' && othCtor instanceof othCtor)) {
          result = false;
        }
      }
      stack['delete'](object);
      return result;
    }

    /**
     * Gets metadata for `func`.
     *
     * @private
     * @param {Function} func The function to query.
     * @returns {*} Returns the metadata for `func`.
     */
    var getData = !metaMap ? noop : function(func) {
      return metaMap.get(func);
    };

    /**
     * Gets the name of `func`.
     *
     * @private
     * @param {Function} func The function to query.
     * @returns {string} Returns the function name.
     */
    function getFuncName(func) {
      var result = (func.name + ''),
          array = realNames[result],
          length = hasOwnProperty.call(realNames, result) ? array.length : 0;

      while (length--) {
        var data = array[length],
            otherFunc = data.func;
        if (otherFunc == null || otherFunc == func) {
          return data.name;
        }
      }
      return result;
    }

    /**
     * Gets the appropriate "iteratee" function. If the `_.iteratee` method is
     * customized this function returns the custom method, otherwise it returns
     * `baseIteratee`. If arguments are provided the chosen function is invoked
     * with them and its result is returned.
     *
     * @private
     * @param {*} [value] The value to convert to an iteratee.
     * @param {number} [arity] The arity of the created iteratee.
     * @returns {Function} Returns the chosen function or its result.
     */
    function getIteratee() {
      var result = lodash.iteratee || iteratee;
      result = result === iteratee ? baseIteratee : result;
      return arguments.length ? result(arguments[0], arguments[1]) : result;
    }

    /**
     * Gets the "length" property value of `object`.
     *
     * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
     * that affects Safari on at least iOS 8.1-8.3 ARM64.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {*} Returns the "length" value.
     */
    var getLength = baseProperty('length');

    /**
     * Gets the property names, values, and compare flags of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the match data of `object`.
     */
    function getMatchData(object) {
      var result = toPairs(object),
          length = result.length;

      while (length--) {
        result[length][2] = isStrictComparable(result[length][1]);
      }
      return result;
    }

    /**
     * Gets the native function at `key` of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {string} key The key of the method to get.
     * @returns {*} Returns the function if it's native, else `undefined`.
     */
    function getNative(object, key) {
      var value = object == null ? undefined : object[key];
      return isNative(value) ? value : undefined;
    }

    /**
     * Creates an array of the own symbol properties of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of symbols.
     */
    var getSymbols = getOwnPropertySymbols || function() {
      return [];
    };

    /**
     * Gets the `toStringTag` of `value`.
     *
     * @private
     * @param {*} value The value to query.
     * @returns {string} Returns the `toStringTag`.
     */
    function getTag(value) {
      return objectToString.call(value);
    }

    // Fallback for IE 11 providing `toStringTag` values for maps, sets, and weakmaps.
    if ((Map && getTag(new Map) != mapTag) ||
        (Set && getTag(new Set) != setTag) ||
        (WeakMap && getTag(new WeakMap) != weakMapTag)) {
      getTag = function(value) {
        var result = objectToString.call(value),
            Ctor = result == objectTag ? value.constructor : null,
            ctorString = typeof Ctor == 'function' ? funcToString.call(Ctor) : '';

        if (ctorString) {
          switch (ctorString) {
            case mapCtorString: return mapTag;
            case setCtorString: return setTag;
            case weakMapCtorString: return weakMapTag;
          }
        }
        return result;
      };
    }

    /**
     * Gets the view, applying any `transforms` to the `start` and `end` positions.
     *
     * @private
     * @param {number} start The start of the view.
     * @param {number} end The end of the view.
     * @param {Array} transforms The transformations to apply to the view.
     * @returns {Object} Returns an object containing the `start` and `end`
     *  positions of the view.
     */
    function getView(start, end, transforms) {
      var index = -1,
          length = transforms.length;

      while (++index < length) {
        var data = transforms[index],
            size = data.size;

        switch (data.type) {
          case 'drop':      start += size; break;
          case 'dropRight': end -= size; break;
          case 'take':      end = nativeMin(end, start + size); break;
          case 'takeRight': start = nativeMax(start, end - size); break;
        }
      }
      return { 'start': start, 'end': end };
    }

    /**
     * Checks if `path` exists on `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {Array|string} path The path to check.
     * @param {Function} hasFunc The function to check properties.
     * @returns {boolean} Returns `true` if `path` exists, else `false`.
     */
    function hasPath(object, path, hasFunc) {
      if (object == null) {
        return false;
      }
      var result = hasFunc(object, path);
      if (!result && !isKey(path)) {
        path = baseToPath(path);
        object = parent(object, path);
        if (object != null) {
          path = last(path);
          result = hasFunc(object, path);
        }
      }
      var length = object ? object.length : undefined;
      return result || (
        !!length && isLength(length) && isIndex(path, length) &&
        (isArray(object) || isString(object) || isArguments(object))
      );
    }

    /**
     * Initializes an array clone.
     *
     * @private
     * @param {Array} array The array to clone.
     * @returns {Array} Returns the initialized clone.
     */
    function initCloneArray(array) {
      var length = array.length,
          result = array.constructor(length);

      // Add properties assigned by `RegExp#exec`.
      if (length && typeof array[0] == 'string' && hasOwnProperty.call(array, 'index')) {
        result.index = array.index;
        result.input = array.input;
      }
      return result;
    }

    /**
     * Initializes an object clone.
     *
     * @private
     * @param {Object} object The object to clone.
     * @returns {Object} Returns the initialized clone.
     */
    function initCloneObject(object) {
      if (isPrototype(object)) {
        return {};
      }
      var Ctor = object.constructor;
      return baseCreate(isFunction(Ctor) ? Ctor.prototype : undefined);
    }

    /**
     * Initializes an object clone based on its `toStringTag`.
     *
     * **Note:** This function only supports cloning values with tags of
     * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
     *
     * @private
     * @param {Object} object The object to clone.
     * @param {string} tag The `toStringTag` of the object to clone.
     * @param {boolean} [isDeep] Specify a deep clone.
     * @returns {Object} Returns the initialized clone.
     */
    function initCloneByTag(object, tag, isDeep) {
      var Ctor = object.constructor;
      switch (tag) {
        case arrayBufferTag:
          return cloneArrayBuffer(object);

        case boolTag:
        case dateTag:
          return new Ctor(+object);

        case float32Tag: case float64Tag:
        case int8Tag: case int16Tag: case int32Tag:
        case uint8Tag: case uint8ClampedTag: case uint16Tag: case uint32Tag:
          return cloneTypedArray(object, isDeep);

        case mapTag:
          return cloneMap(object);

        case numberTag:
        case stringTag:
          return new Ctor(object);

        case regexpTag:
          return cloneRegExp(object);

        case setTag:
          return cloneSet(object);

        case symbolTag:
          return cloneSymbol(object);
      }
    }

    /**
     * Creates an array of index keys for `object` values of arrays,
     * `arguments` objects, and strings, otherwise `null` is returned.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array|null} Returns index keys, else `null`.
     */
    function indexKeys(object) {
      var length = object ? object.length : undefined;
      if (isLength(length) &&
          (isArray(object) || isString(object) || isArguments(object))) {
        return baseTimes(length, String);
      }
      return null;
    }

    /**
     * Checks if the given arguments are from an iteratee call.
     *
     * @private
     * @param {*} value The potential iteratee value argument.
     * @param {*} index The potential iteratee index or key argument.
     * @param {*} object The potential iteratee object argument.
     * @returns {boolean} Returns `true` if the arguments are from an iteratee call, else `false`.
     */
    function isIterateeCall(value, index, object) {
      if (!isObject(object)) {
        return false;
      }
      var type = typeof index;
      if (type == 'number'
          ? (isArrayLike(object) && isIndex(index, object.length))
          : (type == 'string' && index in object)) {
        return eq(object[index], value);
      }
      return false;
    }

    /**
     * Checks if `value` is a property name and not a property path.
     *
     * @private
     * @param {*} value The value to check.
     * @param {Object} [object] The object to query keys on.
     * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
     */
    function isKey(value, object) {
      if (typeof value == 'number') {
        return true;
      }
      return !isArray(value) &&
        (reIsPlainProp.test(value) || !reIsDeepProp.test(value) ||
          (object != null && value in Object(object)));
    }

    /**
     * Checks if `value` is suitable for use as unique object key.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
     */
    function isKeyable(value) {
      var type = typeof value;
      return type == 'number' || type == 'boolean' ||
        (type == 'string' && value !== '__proto__') || value == null;
    }

    /**
     * Checks if `func` has a lazy counterpart.
     *
     * @private
     * @param {Function} func The function to check.
     * @returns {boolean} Returns `true` if `func` has a lazy counterpart, else `false`.
     */
    function isLaziable(func) {
      var funcName = getFuncName(func),
          other = lodash[funcName];

      if (typeof other != 'function' || !(funcName in LazyWrapper.prototype)) {
        return false;
      }
      if (func === other) {
        return true;
      }
      var data = getData(other);
      return !!data && func === data[0];
    }

    /**
     * Checks if `value` is likely a prototype object.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
     */
    function isPrototype(value) {
      var Ctor = value && value.constructor,
          proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto;

      return value === proto;
    }

    /**
     * Checks if `value` is suitable for strict equality comparisons, i.e. `===`.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` if suitable for strict
     *  equality comparisons, else `false`.
     */
    function isStrictComparable(value) {
      return value === value && !isObject(value);
    }

    /**
     * Merges the function metadata of `source` into `data`.
     *
     * Merging metadata reduces the number of wrappers used to invoke a function.
     * This is possible because methods like `_.bind`, `_.curry`, and `_.partial`
     * may be applied regardless of execution order. Methods like `_.ary` and `_.rearg`
     * modify function arguments, making the order in which they are executed important,
     * preventing the merging of metadata. However, we make an exception for a safe
     * combined case where curried functions have `_.ary` and or `_.rearg` applied.
     *
     * @private
     * @param {Array} data The destination metadata.
     * @param {Array} source The source metadata.
     * @returns {Array} Returns `data`.
     */
    function mergeData(data, source) {
      var bitmask = data[1],
          srcBitmask = source[1],
          newBitmask = bitmask | srcBitmask,
          isCommon = newBitmask < (BIND_FLAG | BIND_KEY_FLAG | ARY_FLAG);

      var isCombo =
        (srcBitmask == ARY_FLAG && (bitmask == CURRY_FLAG)) ||
        (srcBitmask == ARY_FLAG && (bitmask == REARG_FLAG) && (data[7].length <= source[8])) ||
        (srcBitmask == (ARY_FLAG | REARG_FLAG) && (source[7].length <= source[8]) && (bitmask == CURRY_FLAG));

      // Exit early if metadata can't be merged.
      if (!(isCommon || isCombo)) {
        return data;
      }
      // Use source `thisArg` if available.
      if (srcBitmask & BIND_FLAG) {
        data[2] = source[2];
        // Set when currying a bound function.
        newBitmask |= (bitmask & BIND_FLAG) ? 0 : CURRY_BOUND_FLAG;
      }
      // Compose partial arguments.
      var value = source[3];
      if (value) {
        var partials = data[3];
        data[3] = partials ? composeArgs(partials, value, source[4]) : copyArray(value);
        data[4] = partials ? replaceHolders(data[3], PLACEHOLDER) : copyArray(source[4]);
      }
      // Compose partial right arguments.
      value = source[5];
      if (value) {
        partials = data[5];
        data[5] = partials ? composeArgsRight(partials, value, source[6]) : copyArray(value);
        data[6] = partials ? replaceHolders(data[5], PLACEHOLDER) : copyArray(source[6]);
      }
      // Use source `argPos` if available.
      value = source[7];
      if (value) {
        data[7] = copyArray(value);
      }
      // Use source `ary` if it's smaller.
      if (srcBitmask & ARY_FLAG) {
        data[8] = data[8] == null ? source[8] : nativeMin(data[8], source[8]);
      }
      // Use source `arity` if one is not provided.
      if (data[9] == null) {
        data[9] = source[9];
      }
      // Use source `func` and merge bitmasks.
      data[0] = source[0];
      data[1] = newBitmask;

      return data;
    }

    /**
     * Used by `_.defaultsDeep` to customize its `_.merge` use.
     *
     * @private
     * @param {*} objValue The destination value.
     * @param {*} srcValue The source value.
     * @param {string} key The key of the property to merge.
     * @param {Object} object The parent object of `objValue`.
     * @param {Object} source The parent object of `srcValue`.
     * @param {Object} [stack] Tracks traversed source values and their merged counterparts.
     * @returns {*} Returns the value to assign.
     */
    function mergeDefaults(objValue, srcValue, key, object, source, stack) {
      if (isObject(objValue) && isObject(srcValue)) {
        stack.set(srcValue, objValue);
        baseMerge(objValue, srcValue, undefined, mergeDefaults, stack);
      }
      return objValue;
    }

    /**
     * Gets the parent value at `path` of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {Array} path The path to get the parent value of.
     * @returns {*} Returns the parent value.
     */
    function parent(object, path) {
      return path.length == 1 ? object : get(object, baseSlice(path, 0, -1));
    }

    /**
     * Reorder `array` according to the specified indexes where the element at
     * the first index is assigned as the first element, the element at
     * the second index is assigned as the second element, and so on.
     *
     * @private
     * @param {Array} array The array to reorder.
     * @param {Array} indexes The arranged array indexes.
     * @returns {Array} Returns `array`.
     */
    function reorder(array, indexes) {
      var arrLength = array.length,
          length = nativeMin(indexes.length, arrLength),
          oldArray = copyArray(array);

      while (length--) {
        var index = indexes[length];
        array[length] = isIndex(index, arrLength) ? oldArray[index] : undefined;
      }
      return array;
    }

    /**
     * Sets metadata for `func`.
     *
     * **Note:** If this function becomes hot, i.e. is invoked a lot in a short
     * period of time, it will trip its breaker and transition to an identity function
     * to avoid garbage collection pauses in V8. See [V8 issue 2070](https://code.google.com/p/v8/issues/detail?id=2070)
     * for more details.
     *
     * @private
     * @param {Function} func The function to associate metadata with.
     * @param {*} data The metadata.
     * @returns {Function} Returns `func`.
     */
    var setData = (function() {
      var count = 0,
          lastCalled = 0;

      return function(key, value) {
        var stamp = now(),
            remaining = HOT_SPAN - (stamp - lastCalled);

        lastCalled = stamp;
        if (remaining > 0) {
          if (++count >= HOT_COUNT) {
            return key;
          }
        } else {
          count = 0;
        }
        return baseSetData(key, value);
      };
    }());

    /**
     * Converts `string` to a property path array.
     *
     * @private
     * @param {string} string The string to convert.
     * @returns {Array} Returns the property path array.
     */
    function stringToPath(string) {
      var result = [];
      toString(string).replace(rePropName, function(match, number, quote, string) {
        result.push(quote ? string.replace(reEscapeChar, '$1') : (number || match));
      });
      return result;
    }

    /**
     * Converts `value` to an array-like object if it's not one.
     *
     * @private
     * @param {*} value The value to process.
     * @returns {Array} Returns the array-like object.
     */
    function toArrayLikeObject(value) {
      return isArrayLikeObject(value) ? value : [];
    }

    /**
     * Converts `value` to a function if it's not one.
     *
     * @private
     * @param {*} value The value to process.
     * @returns {Function} Returns the function.
     */
    function toFunction(value) {
      return typeof value == 'function' ? value : identity;
    }

    /**
     * Creates a clone of `wrapper`.
     *
     * @private
     * @param {Object} wrapper The wrapper to clone.
     * @returns {Object} Returns the cloned wrapper.
     */
    function wrapperClone(wrapper) {
      if (wrapper instanceof LazyWrapper) {
        return wrapper.clone();
      }
      var result = new LodashWrapper(wrapper.__wrapped__, wrapper.__chain__);
      result.__actions__ = copyArray(wrapper.__actions__);
      result.__index__  = wrapper.__index__;
      result.__values__ = wrapper.__values__;
      return result;
    }

    /*------------------------------------------------------------------------*/

    /**
     * Creates an array of elements split into groups the length of `size`.
     * If `array` can't be split evenly, the final chunk will be the remaining
     * elements.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to process.
     * @param {number} [size=0] The length of each chunk.
     * @returns {Array} Returns the new array containing chunks.
     * @example
     *
     * _.chunk(['a', 'b', 'c', 'd'], 2);
     * // => [['a', 'b'], ['c', 'd']]
     *
     * _.chunk(['a', 'b', 'c', 'd'], 3);
     * // => [['a', 'b', 'c'], ['d']]
     */
    function chunk(array, size) {
      size = nativeMax(toInteger(size), 0);

      var length = array ? array.length : 0;
      if (!length || size < 1) {
        return [];
      }
      var index = 0,
          resIndex = -1,
          result = Array(nativeCeil(length / size));

      while (index < length) {
        result[++resIndex] = baseSlice(array, index, (index += size));
      }
      return result;
    }

    /**
     * Creates an array with all falsey values removed. The values `false`, `null`,
     * `0`, `""`, `undefined`, and `NaN` are falsey.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to compact.
     * @returns {Array} Returns the new array of filtered values.
     * @example
     *
     * _.compact([0, 1, false, 2, '', 3]);
     * // => [1, 2, 3]
     */
    function compact(array) {
      var index = -1,
          length = array ? array.length : 0,
          resIndex = -1,
          result = [];

      while (++index < length) {
        var value = array[index];
        if (value) {
          result[++resIndex] = value;
        }
      }
      return result;
    }

    /**
     * Creates a new array concatenating `array` with any additional arrays
     * and/or values.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to concatenate.
     * @param {...*} [values] The values to concatenate.
     * @returns {Array} Returns the new concatenated array.
     * @example
     *
     * var array = [1];
     * var other = _.concat(array, 2, [3], [[4]]);
     *
     * console.log(other);
     * // => [1, 2, 3, [4]]
     *
     * console.log(array);
     * // => [1]
     */
    var concat = rest(function(array, values) {
      if (!isArray(array)) {
        array = array == null ? [] : [Object(array)];
      }
      values = baseFlatten(values);
      return arrayConcat(array, values);
    });

    /**
     * Creates an array of unique `array` values not included in the other
     * given arrays using [`SameValueZero`](http://ecma-international.org/ecma-262/6.0/#sec-samevaluezero)
     * for equality comparisons.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to inspect.
     * @param {...Array} [values] The values to exclude.
     * @returns {Array} Returns the new array of filtered values.
     * @example
     *
     * _.difference([3, 2, 1], [4, 2]);
     * // => [3, 1]
     */
    var difference = rest(function(array, values) {
      return isArrayLikeObject(array)
        ? baseDifference(array, baseFlatten(values, false, true))
        : [];
    });

    /**
     * This method is like `_.difference` except that it accepts `iteratee` which
     * is invoked for each element of `array` and `values` to generate the criterion
     * by which uniqueness is computed. The iteratee is invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to inspect.
     * @param {...Array} [values] The values to exclude.
     * @param {Function|Object|string} [iteratee=_.identity] The iteratee invoked per element.
     * @returns {Array} Returns the new array of filtered values.
     * @example
     *
     * _.differenceBy([3.1, 2.2, 1.3], [4.4, 2.5], Math.floor);
     * // => [3.1, 1.3]
     *
     * // The `_.property` iteratee shorthand.
     * _.differenceBy([{ 'x': 2 }, { 'x': 1 }], [{ 'x': 1 }], 'x');
     * // => [{ 'x': 2 }]
     */
    var differenceBy = rest(function(array, values) {
      var iteratee = last(values);
      if (isArrayLikeObject(iteratee)) {
        iteratee = undefined;
      }
      return isArrayLikeObject(array)
        ? baseDifference(array, baseFlatten(values, false, true), getIteratee(iteratee))
        : [];
    });

    /**
     * This method is like `_.difference` except that it accepts `comparator`
     * which is invoked to compare elements of `array` to `values`. The comparator
     * is invoked with two arguments: (arrVal, othVal).
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to inspect.
     * @param {...Array} [values] The values to exclude.
     * @param {Function} [comparator] The comparator invoked per element.
     * @returns {Array} Returns the new array of filtered values.
     * @example
     *
     * var objects = [{ 'x': 1, 'y': 2 }, { 'x': 2, 'y': 1 }];
     *
     * _.differenceWith(objects, [{ 'x': 1, 'y': 2 }], _.isEqual);
     * // => [{ 'x': 2, 'y': 1 }]
     */
    var differenceWith = rest(function(array, values) {
      var comparator = last(values);
      if (isArrayLikeObject(comparator)) {
        comparator = undefined;
      }
      return isArrayLikeObject(array)
        ? baseDifference(array, baseFlatten(values, false, true), undefined, comparator)
        : [];
    });

    /**
     * Creates a slice of `array` with `n` elements dropped from the beginning.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to query.
     * @param {number} [n=1] The number of elements to drop.
     * @param- {Object} [guard] Enables use as an iteratee for functions like `_.map`.
     * @returns {Array} Returns the slice of `array`.
     * @example
     *
     * _.drop([1, 2, 3]);
     * // => [2, 3]
     *
     * _.drop([1, 2, 3], 2);
     * // => [3]
     *
     * _.drop([1, 2, 3], 5);
     * // => []
     *
     * _.drop([1, 2, 3], 0);
     * // => [1, 2, 3]
     */
    function drop(array, n, guard) {
      var length = array ? array.length : 0;
      if (!length) {
        return [];
      }
      n = (guard || n === undefined) ? 1 : toInteger(n);
      return baseSlice(array, n < 0 ? 0 : n, length);
    }

    /**
     * Creates a slice of `array` with `n` elements dropped from the end.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to query.
     * @param {number} [n=1] The number of elements to drop.
     * @param- {Object} [guard] Enables use as an iteratee for functions like `_.map`.
     * @returns {Array} Returns the slice of `array`.
     * @example
     *
     * _.dropRight([1, 2, 3]);
     * // => [1, 2]
     *
     * _.dropRight([1, 2, 3], 2);
     * // => [1]
     *
     * _.dropRight([1, 2, 3], 5);
     * // => []
     *
     * _.dropRight([1, 2, 3], 0);
     * // => [1, 2, 3]
     */
    function dropRight(array, n, guard) {
      var length = array ? array.length : 0;
      if (!length) {
        return [];
      }
      n = (guard || n === undefined) ? 1 : toInteger(n);
      n = length - n;
      return baseSlice(array, 0, n < 0 ? 0 : n);
    }

    /**
     * Creates a slice of `array` excluding elements dropped from the end.
     * Elements are dropped until `predicate` returns falsey. The predicate is
     * invoked with three arguments: (value, index, array).
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to query.
     * @param {Function|Object|string} [predicate=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the slice of `array`.
     * @example
     *
     * var users = [
     *   { 'user': 'barney',  'active': true },
     *   { 'user': 'fred',    'active': false },
     *   { 'user': 'pebbles', 'active': false }
     * ];
     *
     * _.dropRightWhile(users, function(o) { return !o.active; });
     * // => objects for ['barney']
     *
     * // The `_.matches` iteratee shorthand.
     * _.dropRightWhile(users, { 'user': 'pebbles', 'active': false });
     * // => objects for ['barney', 'fred']
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.dropRightWhile(users, ['active', false]);
     * // => objects for ['barney']
     *
     * // The `_.property` iteratee shorthand.
     * _.dropRightWhile(users, 'active');
     * // => objects for ['barney', 'fred', 'pebbles']
     */
    function dropRightWhile(array, predicate) {
      return (array && array.length)
        ? baseWhile(array, getIteratee(predicate, 3), true, true)
        : [];
    }

    /**
     * Creates a slice of `array` excluding elements dropped from the beginning.
     * Elements are dropped until `predicate` returns falsey. The predicate is
     * invoked with three arguments: (value, index, array).
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to query.
     * @param {Function|Object|string} [predicate=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the slice of `array`.
     * @example
     *
     * var users = [
     *   { 'user': 'barney',  'active': false },
     *   { 'user': 'fred',    'active': false },
     *   { 'user': 'pebbles', 'active': true }
     * ];
     *
     * _.dropWhile(users, function(o) { return !o.active; });
     * // => objects for ['pebbles']
     *
     * // The `_.matches` iteratee shorthand.
     * _.dropWhile(users, { 'user': 'barney', 'active': false });
     * // => objects for ['fred', 'pebbles']
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.dropWhile(users, ['active', false]);
     * // => objects for ['pebbles']
     *
     * // The `_.property` iteratee shorthand.
     * _.dropWhile(users, 'active');
     * // => objects for ['barney', 'fred', 'pebbles']
     */
    function dropWhile(array, predicate) {
      return (array && array.length)
        ? baseWhile(array, getIteratee(predicate, 3), true)
        : [];
    }

    /**
     * Fills elements of `array` with `value` from `start` up to, but not
     * including, `end`.
     *
     * **Note:** This method mutates `array`.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to fill.
     * @param {*} value The value to fill `array` with.
     * @param {number} [start=0] The start position.
     * @param {number} [end=array.length] The end position.
     * @returns {Array} Returns `array`.
     * @example
     *
     * var array = [1, 2, 3];
     *
     * _.fill(array, 'a');
     * console.log(array);
     * // => ['a', 'a', 'a']
     *
     * _.fill(Array(3), 2);
     * // => [2, 2, 2]
     *
     * _.fill([4, 6, 8, 10], '*', 1, 3);
     * // => [4, '*', '*', 10]
     */
    function fill(array, value, start, end) {
      var length = array ? array.length : 0;
      if (!length) {
        return [];
      }
      if (start && typeof start != 'number' && isIterateeCall(array, value, start)) {
        start = 0;
        end = length;
      }
      return baseFill(array, value, start, end);
    }

    /**
     * This method is like `_.find` except that it returns the index of the first
     * element `predicate` returns truthy for instead of the element itself.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to search.
     * @param {Function|Object|string} [predicate=_.identity] The function invoked per iteration.
     * @returns {number} Returns the index of the found element, else `-1`.
     * @example
     *
     * var users = [
     *   { 'user': 'barney',  'active': false },
     *   { 'user': 'fred',    'active': false },
     *   { 'user': 'pebbles', 'active': true }
     * ];
     *
     * _.findIndex(users, function(o) { return o.user == 'barney'; });
     * // => 0
     *
     * // The `_.matches` iteratee shorthand.
     * _.findIndex(users, { 'user': 'fred', 'active': false });
     * // => 1
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.findIndex(users, ['active', false]);
     * // => 0
     *
     * // The `_.property` iteratee shorthand.
     * _.findIndex(users, 'active');
     * // => 2
     */
    function findIndex(array, predicate) {
      return (array && array.length)
        ? baseFindIndex(array, getIteratee(predicate, 3))
        : -1;
    }

    /**
     * This method is like `_.findIndex` except that it iterates over elements
     * of `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to search.
     * @param {Function|Object|string} [predicate=_.identity] The function invoked per iteration.
     * @returns {number} Returns the index of the found element, else `-1`.
     * @example
     *
     * var users = [
     *   { 'user': 'barney',  'active': true },
     *   { 'user': 'fred',    'active': false },
     *   { 'user': 'pebbles', 'active': false }
     * ];
     *
     * _.findLastIndex(users, function(o) { return o.user == 'pebbles'; });
     * // => 2
     *
     * // The `_.matches` iteratee shorthand.
     * _.findLastIndex(users, { 'user': 'barney', 'active': true });
     * // => 0
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.findLastIndex(users, ['active', false]);
     * // => 2
     *
     * // The `_.property` iteratee shorthand.
     * _.findLastIndex(users, 'active');
     * // => 0
     */
    function findLastIndex(array, predicate) {
      return (array && array.length)
        ? baseFindIndex(array, getIteratee(predicate, 3), true)
        : -1;
    }

    /**
     * Flattens `array` a single level.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to flatten.
     * @returns {Array} Returns the new flattened array.
     * @example
     *
     * _.flatten([1, [2, 3, [4]]]);
     * // => [1, 2, 3, [4]]
     */
    function flatten(array) {
      var length = array ? array.length : 0;
      return length ? baseFlatten(array) : [];
    }

    /**
     * This method is like `_.flatten` except that it recursively flattens `array`.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to recursively flatten.
     * @returns {Array} Returns the new flattened array.
     * @example
     *
     * _.flattenDeep([1, [2, 3, [4]]]);
     * // => [1, 2, 3, 4]
     */
    function flattenDeep(array) {
      var length = array ? array.length : 0;
      return length ? baseFlatten(array, true) : [];
    }

    /**
     * The inverse of `_.toPairs`; this method returns an object composed
     * from key-value `pairs`.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} pairs The key-value pairs.
     * @returns {Object} Returns the new object.
     * @example
     *
     * _.fromPairs([['fred', 30], ['barney', 40]]);
     * // => { 'fred': 30, 'barney': 40 }
     */
    function fromPairs(pairs) {
      var index = -1,
          length = pairs ? pairs.length : 0,
          result = {};

      while (++index < length) {
        var pair = pairs[index];
        result[pair[0]] = pair[1];
      }
      return result;
    }

    /**
     * Gets the first element of `array`.
     *
     * @static
     * @memberOf _
     * @alias first
     * @category Array
     * @param {Array} array The array to query.
     * @returns {*} Returns the first element of `array`.
     * @example
     *
     * _.head([1, 2, 3]);
     * // => 1
     *
     * _.head([]);
     * // => undefined
     */
    function head(array) {
      return array ? array[0] : undefined;
    }

    /**
     * Gets the index at which the first occurrence of `value` is found in `array`
     * using [`SameValueZero`](http://ecma-international.org/ecma-262/6.0/#sec-samevaluezero)
     * for equality comparisons. If `fromIndex` is negative, it's used as the offset
     * from the end of `array`.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to search.
     * @param {*} value The value to search for.
     * @param {number} [fromIndex=0] The index to search from.
     * @returns {number} Returns the index of the matched value, else `-1`.
     * @example
     *
     * _.indexOf([1, 2, 1, 2], 2);
     * // => 1
     *
     * // Search from the `fromIndex`.
     * _.indexOf([1, 2, 1, 2], 2, 2);
     * // => 3
     */
    function indexOf(array, value, fromIndex) {
      var length = array ? array.length : 0;
      if (!length) {
        return -1;
      }
      fromIndex = toInteger(fromIndex);
      if (fromIndex < 0) {
        fromIndex = nativeMax(length + fromIndex, 0);
      }
      return baseIndexOf(array, value, fromIndex);
    }

    /**
     * Gets all but the last element of `array`.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to query.
     * @returns {Array} Returns the slice of `array`.
     * @example
     *
     * _.initial([1, 2, 3]);
     * // => [1, 2]
     */
    function initial(array) {
      return dropRight(array, 1);
    }

    /**
     * Creates an array of unique values that are included in all given arrays
     * using [`SameValueZero`](http://ecma-international.org/ecma-262/6.0/#sec-samevaluezero)
     * for equality comparisons.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {...Array} [arrays] The arrays to inspect.
     * @returns {Array} Returns the new array of shared values.
     * @example
     *
     * _.intersection([2, 1], [4, 2], [1, 2]);
     * // => [2]
     */
    var intersection = rest(function(arrays) {
      var mapped = arrayMap(arrays, toArrayLikeObject);
      return (mapped.length && mapped[0] === arrays[0])
        ? baseIntersection(mapped)
        : [];
    });

    /**
     * This method is like `_.intersection` except that it accepts `iteratee`
     * which is invoked for each element of each `arrays` to generate the criterion
     * by which uniqueness is computed. The iteratee is invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {...Array} [arrays] The arrays to inspect.
     * @param {Function|Object|string} [iteratee=_.identity] The iteratee invoked per element.
     * @returns {Array} Returns the new array of shared values.
     * @example
     *
     * _.intersectionBy([2.1, 1.2], [4.3, 2.4], Math.floor);
     * // => [2.1]
     *
     * // The `_.property` iteratee shorthand.
     * _.intersectionBy([{ 'x': 1 }], [{ 'x': 2 }, { 'x': 1 }], 'x');
     * // => [{ 'x': 1 }]
     */
    var intersectionBy = rest(function(arrays) {
      var iteratee = last(arrays),
          mapped = arrayMap(arrays, toArrayLikeObject);

      if (iteratee === last(mapped)) {
        iteratee = undefined;
      } else {
        mapped.pop();
      }
      return (mapped.length && mapped[0] === arrays[0])
        ? baseIntersection(mapped, getIteratee(iteratee))
        : [];
    });

    /**
     * This method is like `_.intersection` except that it accepts `comparator`
     * which is invoked to compare elements of `arrays`. The comparator is invoked
     * with two arguments: (arrVal, othVal).
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {...Array} [arrays] The arrays to inspect.
     * @param {Function} [comparator] The comparator invoked per element.
     * @returns {Array} Returns the new array of shared values.
     * @example
     *
     * var objects = [{ 'x': 1, 'y': 2 }, { 'x': 2, 'y': 1 }];
     * var others = [{ 'x': 1, 'y': 1 }, { 'x': 1, 'y': 2 }];
     *
     * _.intersectionWith(objects, others, _.isEqual);
     * // => [{ 'x': 1, 'y': 2 }]
     */
    var intersectionWith = rest(function(arrays) {
      var comparator = last(arrays),
          mapped = arrayMap(arrays, toArrayLikeObject);

      if (comparator === last(mapped)) {
        comparator = undefined;
      } else {
        mapped.pop();
      }
      return (mapped.length && mapped[0] === arrays[0])
        ? baseIntersection(mapped, undefined, comparator)
        : [];
    });

    /**
     * Converts all elements in `array` into a string separated by `separator`.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to convert.
     * @param {string} [separator=','] The element separator.
     * @returns {string} Returns the joined string.
     * @example
     *
     * _.join(['a', 'b', 'c'], '~');
     * // => 'a~b~c'
     */
    function join(array, separator) {
      return array ? nativeJoin.call(array, separator) : '';
    }

    /**
     * Gets the last element of `array`.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to query.
     * @returns {*} Returns the last element of `array`.
     * @example
     *
     * _.last([1, 2, 3]);
     * // => 3
     */
    function last(array) {
      var length = array ? array.length : 0;
      return length ? array[length - 1] : undefined;
    }

    /**
     * This method is like `_.indexOf` except that it iterates over elements of
     * `array` from right to left.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to search.
     * @param {*} value The value to search for.
     * @param {number} [fromIndex=array.length-1] The index to search from.
     * @returns {number} Returns the index of the matched value, else `-1`.
     * @example
     *
     * _.lastIndexOf([1, 2, 1, 2], 2);
     * // => 3
     *
     * // Search from the `fromIndex`.
     * _.lastIndexOf([1, 2, 1, 2], 2, 2);
     * // => 1
     */
    function lastIndexOf(array, value, fromIndex) {
      var length = array ? array.length : 0;
      if (!length) {
        return -1;
      }
      var index = length;
      if (fromIndex !== undefined) {
        index = toInteger(fromIndex);
        index = (index < 0 ? nativeMax(length + index, 0) : nativeMin(index, length - 1)) + 1;
      }
      if (value !== value) {
        return indexOfNaN(array, index, true);
      }
      while (index--) {
        if (array[index] === value) {
          return index;
        }
      }
      return -1;
    }

    /**
     * Removes all given values from `array` using
     * [`SameValueZero`](http://ecma-international.org/ecma-262/6.0/#sec-samevaluezero)
     * for equality comparisons.
     *
     * **Note:** Unlike `_.without`, this method mutates `array`.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to modify.
     * @param {...*} [values] The values to remove.
     * @returns {Array} Returns `array`.
     * @example
     *
     * var array = [1, 2, 3, 1, 2, 3];
     *
     * _.pull(array, 2, 3);
     * console.log(array);
     * // => [1, 1]
     */
    var pull = rest(pullAll);

    /**
     * This method is like `_.pull` except that it accepts an array of values to remove.
     *
     * **Note:** Unlike `_.difference`, this method mutates `array`.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to modify.
     * @param {Array} values The values to remove.
     * @returns {Array} Returns `array`.
     * @example
     *
     * var array = [1, 2, 3, 1, 2, 3];
     *
     * _.pullAll(array, [2, 3]);
     * console.log(array);
     * // => [1, 1]
     */
    function pullAll(array, values) {
      return (array && array.length && values && values.length)
        ? basePullAll(array, values)
        : array;
    }

    /**
     * This method is like `_.pullAll` except that it accepts `iteratee` which is
     * invoked for each element of `array` and `values` to generate the criterion
     * by which uniqueness is computed. The iteratee is invoked with one argument: (value).
     *
     * **Note:** Unlike `_.differenceBy`, this method mutates `array`.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to modify.
     * @param {Array} values The values to remove.
     * @param {Function|Object|string} [iteratee=_.identity] The iteratee invoked per element.
     * @returns {Array} Returns `array`.
     * @example
     *
     * var array = [{ 'x': 1 }, { 'x': 2 }, { 'x': 3 }, { 'x': 1 }];
     *
     * _.pullAllBy(array, [{ 'x': 1 }, { 'x': 3 }], 'x');
     * console.log(array);
     * // => [{ 'x': 2 }]
     */
    function pullAllBy(array, values, iteratee) {
      return (array && array.length && values && values.length)
        ? basePullAllBy(array, values, getIteratee(iteratee))
        : array;
    }

    /**
     * Removes elements from `array` corresponding to `indexes` and returns an
     * array of removed elements.
     *
     * **Note:** Unlike `_.at`, this method mutates `array`.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to modify.
     * @param {...(number|number[])} [indexes] The indexes of elements to remove,
     *  specified individually or in arrays.
     * @returns {Array} Returns the new array of removed elements.
     * @example
     *
     * var array = [5, 10, 15, 20];
     * var evens = _.pullAt(array, 1, 3);
     *
     * console.log(array);
     * // => [5, 15]
     *
     * console.log(evens);
     * // => [10, 20]
     */
    var pullAt = rest(function(array, indexes) {
      indexes = arrayMap(baseFlatten(indexes), String);

      var result = baseAt(array, indexes);
      basePullAt(array, indexes.sort(compareAscending));
      return result;
    });

    /**
     * Removes all elements from `array` that `predicate` returns truthy for
     * and returns an array of the removed elements. The predicate is invoked with
     * three arguments: (value, index, array).
     *
     * **Note:** Unlike `_.filter`, this method mutates `array`.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to modify.
     * @param {Function|Object|string} [predicate=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the new array of removed elements.
     * @example
     *
     * var array = [1, 2, 3, 4];
     * var evens = _.remove(array, function(n) {
     *   return n % 2 == 0;
     * });
     *
     * console.log(array);
     * // => [1, 3]
     *
     * console.log(evens);
     * // => [2, 4]
     */
    function remove(array, predicate) {
      var result = [];
      if (!(array && array.length)) {
        return result;
      }
      var index = -1,
          indexes = [],
          length = array.length;

      predicate = getIteratee(predicate, 3);
      while (++index < length) {
        var value = array[index];
        if (predicate(value, index, array)) {
          result.push(value);
          indexes.push(index);
        }
      }
      basePullAt(array, indexes);
      return result;
    }

    /**
     * Reverses `array` so that the first element becomes the last, the second
     * element becomes the second to last, and so on.
     *
     * **Note:** This method mutates `array` and is based on
     * [`Array#reverse`](https://mdn.io/Array/reverse).
     *
     * @static
     * @memberOf _
     * @category Array
     * @returns {Array} Returns `array`.
     * @example
     *
     * var array = [1, 2, 3];
     *
     * _.reverse(array);
     * // => [3, 2, 1]
     *
     * console.log(array);
     * // => [3, 2, 1]
     */
    function reverse(array) {
      return array ? nativeReverse.call(array) : array;
    }

    /**
     * Creates a slice of `array` from `start` up to, but not including, `end`.
     *
     * **Note:** This method is used instead of [`Array#slice`](https://mdn.io/Array/slice)
     * to ensure dense arrays are returned.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to slice.
     * @param {number} [start=0] The start position.
     * @param {number} [end=array.length] The end position.
     * @returns {Array} Returns the slice of `array`.
     */
    function slice(array, start, end) {
      var length = array ? array.length : 0;
      if (!length) {
        return [];
      }
      if (end && typeof end != 'number' && isIterateeCall(array, start, end)) {
        start = 0;
        end = length;
      }
      else {
        start = start == null ? 0 : toInteger(start);
        end = end === undefined ? length : toInteger(end);
      }
      return baseSlice(array, start, end);
    }

    /**
     * Uses a binary search to determine the lowest index at which `value` should
     * be inserted into `array` in order to maintain its sort order.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The sorted array to inspect.
     * @param {*} value The value to evaluate.
     * @returns {number} Returns the index at which `value` should be inserted into `array`.
     * @example
     *
     * _.sortedIndex([30, 50], 40);
     * // => 1
     *
     * _.sortedIndex([4, 5], 4);
     * // => 0
     */
    function sortedIndex(array, value) {
      return baseSortedIndex(array, value);
    }

    /**
     * This method is like `_.sortedIndex` except that it accepts `iteratee`
     * which is invoked for `value` and each element of `array` to compute their
     * sort ranking. The iteratee is invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The sorted array to inspect.
     * @param {*} value The value to evaluate.
     * @param {Function|Object|string} [iteratee=_.identity] The iteratee invoked per element.
     * @returns {number} Returns the index at which `value` should be inserted into `array`.
     * @example
     *
     * var dict = { 'thirty': 30, 'forty': 40, 'fifty': 50 };
     *
     * _.sortedIndexBy(['thirty', 'fifty'], 'forty', _.propertyOf(dict));
     * // => 1
     *
     * // The `_.property` iteratee shorthand.
     * _.sortedIndexBy([{ 'x': 4 }, { 'x': 5 }], { 'x': 4 }, 'x');
     * // => 0
     */
    function sortedIndexBy(array, value, iteratee) {
      return baseSortedIndexBy(array, value, getIteratee(iteratee));
    }

    /**
     * This method is like `_.indexOf` except that it performs a binary
     * search on a sorted `array`.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to search.
     * @param {*} value The value to search for.
     * @returns {number} Returns the index of the matched value, else `-1`.
     * @example
     *
     * _.sortedIndexOf([1, 1, 2, 2], 2);
     * // => 2
     */
    function sortedIndexOf(array, value) {
      var length = array ? array.length : 0;
      if (length) {
        var index = baseSortedIndex(array, value);
        if (index < length && eq(array[index], value)) {
          return index;
        }
      }
      return -1;
    }

    /**
     * This method is like `_.sortedIndex` except that it returns the highest
     * index at which `value` should be inserted into `array` in order to
     * maintain its sort order.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The sorted array to inspect.
     * @param {*} value The value to evaluate.
     * @returns {number} Returns the index at which `value` should be inserted into `array`.
     * @example
     *
     * _.sortedLastIndex([4, 5], 4);
     * // => 1
     */
    function sortedLastIndex(array, value) {
      return baseSortedIndex(array, value, true);
    }

    /**
     * This method is like `_.sortedLastIndex` except that it accepts `iteratee`
     * which is invoked for `value` and each element of `array` to compute their
     * sort ranking. The iteratee is invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The sorted array to inspect.
     * @param {*} value The value to evaluate.
     * @param {Function|Object|string} [iteratee=_.identity] The iteratee invoked per element.
     * @returns {number} Returns the index at which `value` should be inserted into `array`.
     * @example
     *
     * // The `_.property` iteratee shorthand.
     * _.sortedLastIndexBy([{ 'x': 4 }, { 'x': 5 }], { 'x': 4 }, 'x');
     * // => 1
     */
    function sortedLastIndexBy(array, value, iteratee) {
      return baseSortedIndexBy(array, value, getIteratee(iteratee), true);
    }

    /**
     * This method is like `_.lastIndexOf` except that it performs a binary
     * search on a sorted `array`.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to search.
     * @param {*} value The value to search for.
     * @returns {number} Returns the index of the matched value, else `-1`.
     * @example
     *
     * _.sortedLastIndexOf([1, 1, 2, 2], 2);
     * // => 3
     */
    function sortedLastIndexOf(array, value) {
      var length = array ? array.length : 0;
      if (length) {
        var index = baseSortedIndex(array, value, true) - 1;
        if (eq(array[index], value)) {
          return index;
        }
      }
      return -1;
    }

    /**
     * This method is like `_.uniq` except that it's designed and optimized
     * for sorted arrays.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to inspect.
     * @returns {Array} Returns the new duplicate free array.
     * @example
     *
     * _.sortedUniq([1, 1, 2]);
     * // => [1, 2]
     */
    function sortedUniq(array) {
      return (array && array.length)
        ? baseSortedUniq(array)
        : [];
    }

    /**
     * This method is like `_.uniqBy` except that it's designed and optimized
     * for sorted arrays.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to inspect.
     * @param {Function} [iteratee] The iteratee invoked per element.
     * @returns {Array} Returns the new duplicate free array.
     * @example
     *
     * _.sortedUniqBy([1.1, 1.2, 2.3, 2.4], Math.floor);
     * // => [1.1, 2.3]
     */
    function sortedUniqBy(array, iteratee) {
      return (array && array.length)
        ? baseSortedUniqBy(array, getIteratee(iteratee))
        : [];
    }

    /**
     * Gets all but the first element of `array`.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to query.
     * @returns {Array} Returns the slice of `array`.
     * @example
     *
     * _.tail([1, 2, 3]);
     * // => [2, 3]
     */
    function tail(array) {
      return drop(array, 1);
    }

    /**
     * Creates a slice of `array` with `n` elements taken from the beginning.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to query.
     * @param {number} [n=1] The number of elements to take.
     * @param- {Object} [guard] Enables use as an iteratee for functions like `_.map`.
     * @returns {Array} Returns the slice of `array`.
     * @example
     *
     * _.take([1, 2, 3]);
     * // => [1]
     *
     * _.take([1, 2, 3], 2);
     * // => [1, 2]
     *
     * _.take([1, 2, 3], 5);
     * // => [1, 2, 3]
     *
     * _.take([1, 2, 3], 0);
     * // => []
     */
    function take(array, n, guard) {
      if (!(array && array.length)) {
        return [];
      }
      n = (guard || n === undefined) ? 1 : toInteger(n);
      return baseSlice(array, 0, n < 0 ? 0 : n);
    }

    /**
     * Creates a slice of `array` with `n` elements taken from the end.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to query.
     * @param {number} [n=1] The number of elements to take.
     * @param- {Object} [guard] Enables use as an iteratee for functions like `_.map`.
     * @returns {Array} Returns the slice of `array`.
     * @example
     *
     * _.takeRight([1, 2, 3]);
     * // => [3]
     *
     * _.takeRight([1, 2, 3], 2);
     * // => [2, 3]
     *
     * _.takeRight([1, 2, 3], 5);
     * // => [1, 2, 3]
     *
     * _.takeRight([1, 2, 3], 0);
     * // => []
     */
    function takeRight(array, n, guard) {
      var length = array ? array.length : 0;
      if (!length) {
        return [];
      }
      n = (guard || n === undefined) ? 1 : toInteger(n);
      n = length - n;
      return baseSlice(array, n < 0 ? 0 : n, length);
    }

    /**
     * Creates a slice of `array` with elements taken from the end. Elements are
     * taken until `predicate` returns falsey. The predicate is invoked with three
     * arguments: (value, index, array).
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to query.
     * @param {Function|Object|string} [predicate=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the slice of `array`.
     * @example
     *
     * var users = [
     *   { 'user': 'barney',  'active': true },
     *   { 'user': 'fred',    'active': false },
     *   { 'user': 'pebbles', 'active': false }
     * ];
     *
     * _.takeRightWhile(users, function(o) { return !o.active; });
     * // => objects for ['fred', 'pebbles']
     *
     * // The `_.matches` iteratee shorthand.
     * _.takeRightWhile(users, { 'user': 'pebbles', 'active': false });
     * // => objects for ['pebbles']
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.takeRightWhile(users, ['active', false]);
     * // => objects for ['fred', 'pebbles']
     *
     * // The `_.property` iteratee shorthand.
     * _.takeRightWhile(users, 'active');
     * // => []
     */
    function takeRightWhile(array, predicate) {
      return (array && array.length)
        ? baseWhile(array, getIteratee(predicate, 3), false, true)
        : [];
    }

    /**
     * Creates a slice of `array` with elements taken from the beginning. Elements
     * are taken until `predicate` returns falsey. The predicate is invoked with
     * three arguments: (value, index, array).
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to query.
     * @param {Function|Object|string} [predicate=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the slice of `array`.
     * @example
     *
     * var users = [
     *   { 'user': 'barney',  'active': false },
     *   { 'user': 'fred',    'active': false},
     *   { 'user': 'pebbles', 'active': true }
     * ];
     *
     * _.takeWhile(users, function(o) { return !o.active; });
     * // => objects for ['barney', 'fred']
     *
     * // The `_.matches` iteratee shorthand.
     * _.takeWhile(users, { 'user': 'barney', 'active': false });
     * // => objects for ['barney']
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.takeWhile(users, ['active', false]);
     * // => objects for ['barney', 'fred']
     *
     * // The `_.property` iteratee shorthand.
     * _.takeWhile(users, 'active');
     * // => []
     */
    function takeWhile(array, predicate) {
      return (array && array.length)
        ? baseWhile(array, getIteratee(predicate, 3))
        : [];
    }

    /**
     * Creates an array of unique values, in order, from all given arrays using
     * [`SameValueZero`](http://ecma-international.org/ecma-262/6.0/#sec-samevaluezero)
     * for equality comparisons.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {...Array} [arrays] The arrays to inspect.
     * @returns {Array} Returns the new array of combined values.
     * @example
     *
     * _.union([2, 1], [4, 2], [1, 2]);
     * // => [2, 1, 4]
     */
    var union = rest(function(arrays) {
      return baseUniq(baseFlatten(arrays, false, true));
    });

    /**
     * This method is like `_.union` except that it accepts `iteratee` which is
     * invoked for each element of each `arrays` to generate the criterion by which
     * uniqueness is computed. The iteratee is invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {...Array} [arrays] The arrays to inspect.
     * @param {Function|Object|string} [iteratee=_.identity] The iteratee invoked per element.
     * @returns {Array} Returns the new array of combined values.
     * @example
     *
     * _.unionBy([2.1, 1.2], [4.3, 2.4], Math.floor);
     * // => [2.1, 1.2, 4.3]
     *
     * // The `_.property` iteratee shorthand.
     * _.unionBy([{ 'x': 1 }], [{ 'x': 2 }, { 'x': 1 }], 'x');
     * // => [{ 'x': 1 }, { 'x': 2 }]
     */
    var unionBy = rest(function(arrays) {
      var iteratee = last(arrays);
      if (isArrayLikeObject(iteratee)) {
        iteratee = undefined;
      }
      return baseUniq(baseFlatten(arrays, false, true), getIteratee(iteratee));
    });

    /**
     * This method is like `_.union` except that it accepts `comparator` which
     * is invoked to compare elements of `arrays`. The comparator is invoked
     * with two arguments: (arrVal, othVal).
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {...Array} [arrays] The arrays to inspect.
     * @param {Function} [comparator] The comparator invoked per element.
     * @returns {Array} Returns the new array of combined values.
     * @example
     *
     * var objects = [{ 'x': 1, 'y': 2 }, { 'x': 2, 'y': 1 }];
     * var others = [{ 'x': 1, 'y': 1 }, { 'x': 1, 'y': 2 }];
     *
     * _.unionWith(objects, others, _.isEqual);
     * // => [{ 'x': 1, 'y': 2 }, { 'x': 2, 'y': 1 }, { 'x': 1, 'y': 1 }]
     */
    var unionWith = rest(function(arrays) {
      var comparator = last(arrays);
      if (isArrayLikeObject(comparator)) {
        comparator = undefined;
      }
      return baseUniq(baseFlatten(arrays, false, true), undefined, comparator);
    });

    /**
     * Creates a duplicate-free version of an array, using
     * [`SameValueZero`](http://ecma-international.org/ecma-262/6.0/#sec-samevaluezero)
     * for equality comparisons, in which only the first occurrence of each element
     * is kept.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to inspect.
     * @returns {Array} Returns the new duplicate free array.
     * @example
     *
     * _.uniq([2, 1, 2]);
     * // => [2, 1]
     */
    function uniq(array) {
      return (array && array.length)
        ? baseUniq(array)
        : [];
    }

    /**
     * This method is like `_.uniq` except that it accepts `iteratee` which is
     * invoked for each element in `array` to generate the criterion by which
     * uniqueness is computed. The iteratee is invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to inspect.
     * @param {Function|Object|string} [iteratee=_.identity] The iteratee invoked per element.
     * @returns {Array} Returns the new duplicate free array.
     * @example
     *
     * _.uniqBy([2.1, 1.2, 2.3], Math.floor);
     * // => [2.1, 1.2]
     *
     * // The `_.property` iteratee shorthand.
     * _.uniqBy([{ 'x': 1 }, { 'x': 2 }, { 'x': 1 }], 'x');
     * // => [{ 'x': 1 }, { 'x': 2 }]
     */
    function uniqBy(array, iteratee) {
      return (array && array.length)
        ? baseUniq(array, getIteratee(iteratee))
        : [];
    }

    /**
     * This method is like `_.uniq` except that it accepts `comparator` which
     * is invoked to compare elements of `array`. The comparator is invoked with
     * two arguments: (arrVal, othVal).
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to inspect.
     * @param {Function} [comparator] The comparator invoked per element.
     * @returns {Array} Returns the new duplicate free array.
     * @example
     *
     * var objects = [{ 'x': 1, 'y': 2 }, { 'x': 2, 'y': 1 },  { 'x': 1, 'y': 2 }];
     *
     * _.uniqWith(objects, _.isEqual);
     * // => [{ 'x': 1, 'y': 2 }, { 'x': 2, 'y': 1 }]
     */
    function uniqWith(array, comparator) {
      return (array && array.length)
        ? baseUniq(array, undefined, comparator)
        : [];
    }

    /**
     * This method is like `_.zip` except that it accepts an array of grouped
     * elements and creates an array regrouping the elements to their pre-zip
     * configuration.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array of grouped elements to process.
     * @returns {Array} Returns the new array of regrouped elements.
     * @example
     *
     * var zipped = _.zip(['fred', 'barney'], [30, 40], [true, false]);
     * // => [['fred', 30, true], ['barney', 40, false]]
     *
     * _.unzip(zipped);
     * // => [['fred', 'barney'], [30, 40], [true, false]]
     */
    function unzip(array) {
      if (!(array && array.length)) {
        return [];
      }
      var length = 0;
      array = arrayFilter(array, function(group) {
        if (isArrayLikeObject(group)) {
          length = nativeMax(group.length, length);
          return true;
        }
      });
      return baseTimes(length, function(index) {
        return arrayMap(array, baseProperty(index));
      });
    }

    /**
     * This method is like `_.unzip` except that it accepts `iteratee` to specify
     * how regrouped values should be combined. The iteratee is invoked with the
     * elements of each group: (...group).
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array of grouped elements to process.
     * @param {Function} [iteratee=_.identity] The function to combine regrouped values.
     * @returns {Array} Returns the new array of regrouped elements.
     * @example
     *
     * var zipped = _.zip([1, 2], [10, 20], [100, 200]);
     * // => [[1, 10, 100], [2, 20, 200]]
     *
     * _.unzipWith(zipped, _.add);
     * // => [3, 30, 300]
     */
    function unzipWith(array, iteratee) {
      if (!(array && array.length)) {
        return [];
      }
      var result = unzip(array);
      if (iteratee == null) {
        return result;
      }
      return arrayMap(result, function(group) {
        return apply(iteratee, undefined, group);
      });
    }

    /**
     * Creates an array excluding all given values using
     * [`SameValueZero`](http://ecma-international.org/ecma-262/6.0/#sec-samevaluezero)
     * for equality comparisons.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} array The array to filter.
     * @param {...*} [values] The values to exclude.
     * @returns {Array} Returns the new array of filtered values.
     * @example
     *
     * _.without([1, 2, 1, 3], 1, 2);
     * // => [3]
     */
    var without = rest(function(array, values) {
      return isArrayLikeObject(array)
        ? baseDifference(array, values)
        : [];
    });

    /**
     * Creates an array of unique values that is the [symmetric difference](https://en.wikipedia.org/wiki/Symmetric_difference)
     * of the given arrays.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {...Array} [arrays] The arrays to inspect.
     * @returns {Array} Returns the new array of values.
     * @example
     *
     * _.xor([2, 1], [4, 2]);
     * // => [1, 4]
     */
    var xor = rest(function(arrays) {
      return baseXor(arrayFilter(arrays, isArrayLikeObject));
    });

    /**
     * This method is like `_.xor` except that it accepts `iteratee` which is
     * invoked for each element of each `arrays` to generate the criterion by which
     * uniqueness is computed. The iteratee is invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {...Array} [arrays] The arrays to inspect.
     * @param {Function|Object|string} [iteratee=_.identity] The iteratee invoked per element.
     * @returns {Array} Returns the new array of values.
     * @example
     *
     * _.xorBy([2.1, 1.2], [4.3, 2.4], Math.floor);
     * // => [1.2, 4.3]
     *
     * // The `_.property` iteratee shorthand.
     * _.xorBy([{ 'x': 1 }], [{ 'x': 2 }, { 'x': 1 }], 'x');
     * // => [{ 'x': 2 }]
     */
    var xorBy = rest(function(arrays) {
      var iteratee = last(arrays);
      if (isArrayLikeObject(iteratee)) {
        iteratee = undefined;
      }
      return baseXor(arrayFilter(arrays, isArrayLikeObject), getIteratee(iteratee));
    });

    /**
     * This method is like `_.xor` except that it accepts `comparator` which is
     * invoked to compare elements of `arrays`. The comparator is invoked with
     * two arguments: (arrVal, othVal).
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {...Array} [arrays] The arrays to inspect.
     * @param {Function} [comparator] The comparator invoked per element.
     * @returns {Array} Returns the new array of values.
     * @example
     *
     * var objects = [{ 'x': 1, 'y': 2 }, { 'x': 2, 'y': 1 }];
     * var others = [{ 'x': 1, 'y': 1 }, { 'x': 1, 'y': 2 }];
     *
     * _.xorWith(objects, others, _.isEqual);
     * // => [{ 'x': 2, 'y': 1 }, { 'x': 1, 'y': 1 }]
     */
    var xorWith = rest(function(arrays) {
      var comparator = last(arrays);
      if (isArrayLikeObject(comparator)) {
        comparator = undefined;
      }
      return baseXor(arrayFilter(arrays, isArrayLikeObject), undefined, comparator);
    });

    /**
     * Creates an array of grouped elements, the first of which contains the first
     * elements of the given arrays, the second of which contains the second elements
     * of the given arrays, and so on.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {...Array} [arrays] The arrays to process.
     * @returns {Array} Returns the new array of grouped elements.
     * @example
     *
     * _.zip(['fred', 'barney'], [30, 40], [true, false]);
     * // => [['fred', 30, true], ['barney', 40, false]]
     */
    var zip = rest(unzip);

    /**
     * This method is like `_.fromPairs` except that it accepts two arrays,
     * one of property names and one of corresponding values.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} [props=[]] The property names.
     * @param {Array} [values=[]] The property values.
     * @returns {Object} Returns the new object.
     * @example
     *
     * _.zipObject(['a', 'b'], [1, 2]);
     * // => { 'a': 1, 'b': 2 }
     */
    function zipObject(props, values) {
      return baseZipObject(props || [], values || [], assignValue);
    }

    /**
     * This method is like `_.zipObject` except that it supports property paths.
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {Array} [props=[]] The property names.
     * @param {Array} [values=[]] The property values.
     * @returns {Object} Returns the new object.
     * @example
     *
     * _.zipObjectDeep(['a.b[0].c', 'a.b[1].d'], [1, 2]);
     * // => { 'a': { 'b': [{ 'c': 1 }, { 'd': 2 }] } }
     */
    function zipObjectDeep(props, values) {
      return baseZipObject(props || [], values || [], baseSet);
    }

    /**
     * This method is like `_.zip` except that it accepts `iteratee` to specify
     * how grouped values should be combined. The iteratee is invoked with the
     * elements of each group: (...group).
     *
     * @static
     * @memberOf _
     * @category Array
     * @param {...Array} [arrays] The arrays to process.
     * @param {Function} [iteratee=_.identity] The function to combine grouped values.
     * @returns {Array} Returns the new array of grouped elements.
     * @example
     *
     * _.zipWith([1, 2], [10, 20], [100, 200], function(a, b, c) {
     *   return a + b + c;
     * });
     * // => [111, 222]
     */
    var zipWith = rest(function(arrays) {
      var length = arrays.length,
          iteratee = length > 1 ? arrays[length - 1] : undefined;

      iteratee = typeof iteratee == 'function' ? (arrays.pop(), iteratee) : undefined;
      return unzipWith(arrays, iteratee);
    });

    /*------------------------------------------------------------------------*/

    /**
     * Creates a `lodash` object that wraps `value` with explicit method chaining enabled.
     * The result of such method chaining must be unwrapped with `_#value`.
     *
     * @static
     * @memberOf _
     * @category Seq
     * @param {*} value The value to wrap.
     * @returns {Object} Returns the new `lodash` wrapper instance.
     * @example
     *
     * var users = [
     *   { 'user': 'barney',  'age': 36 },
     *   { 'user': 'fred',    'age': 40 },
     *   { 'user': 'pebbles', 'age': 1 }
     * ];
     *
     * var youngest = _
     *   .chain(users)
     *   .sortBy('age')
     *   .map(function(o) {
     *     return o.user + ' is ' + o.age;
     *   })
     *   .head()
     *   .value();
     * // => 'pebbles is 1'
     */
    function chain(value) {
      var result = lodash(value);
      result.__chain__ = true;
      return result;
    }

    /**
     * This method invokes `interceptor` and returns `value`. The interceptor
     * is invoked with one argument; (value). The purpose of this method is to
     * "tap into" a method chain in order to modify intermediate results.
     *
     * @static
     * @memberOf _
     * @category Seq
     * @param {*} value The value to provide to `interceptor`.
     * @param {Function} interceptor The function to invoke.
     * @returns {*} Returns `value`.
     * @example
     *
     * _([1, 2, 3])
     *  .tap(function(array) {
     *    // Mutate input array.
     *    array.pop();
     *  })
     *  .reverse()
     *  .value();
     * // => [2, 1]
     */
    function tap(value, interceptor) {
      interceptor(value);
      return value;
    }

    /**
     * This method is like `_.tap` except that it returns the result of `interceptor`.
     * The purpose of this method is to "pass thru" values replacing intermediate
     * results in a method chain.
     *
     * @static
     * @memberOf _
     * @category Seq
     * @param {*} value The value to provide to `interceptor`.
     * @param {Function} interceptor The function to invoke.
     * @returns {*} Returns the result of `interceptor`.
     * @example
     *
     * _('  abc  ')
     *  .chain()
     *  .trim()
     *  .thru(function(value) {
     *    return [value];
     *  })
     *  .value();
     * // => ['abc']
     */
    function thru(value, interceptor) {
      return interceptor(value);
    }

    /**
     * This method is the wrapper version of `_.at`.
     *
     * @name at
     * @memberOf _
     * @category Seq
     * @param {...(string|string[])} [paths] The property paths of elements to pick,
     *  specified individually or in arrays.
     * @returns {Object} Returns the new `lodash` wrapper instance.
     * @example
     *
     * var object = { 'a': [{ 'b': { 'c': 3 } }, 4] };
     *
     * _(object).at(['a[0].b.c', 'a[1]']).value();
     * // => [3, 4]
     *
     * _(['a', 'b', 'c']).at(0, 2).value();
     * // => ['a', 'c']
     */
    var wrapperAt = rest(function(paths) {
      paths = baseFlatten(paths);
      var length = paths.length,
          start = length ? paths[0] : 0,
          value = this.__wrapped__,
          interceptor = function(object) { return baseAt(object, paths); };

      if (length > 1 || this.__actions__.length || !(value instanceof LazyWrapper) || !isIndex(start)) {
        return this.thru(interceptor);
      }
      value = value.slice(start, +start + (length ? 1 : 0));
      value.__actions__.push({ 'func': thru, 'args': [interceptor], 'thisArg': undefined });
      return new LodashWrapper(value, this.__chain__).thru(function(array) {
        if (length && !array.length) {
          array.push(undefined);
        }
        return array;
      });
    });

    /**
     * Enables explicit method chaining on the wrapper object.
     *
     * @name chain
     * @memberOf _
     * @category Seq
     * @returns {Object} Returns the new `lodash` wrapper instance.
     * @example
     *
     * var users = [
     *   { 'user': 'barney', 'age': 36 },
     *   { 'user': 'fred',   'age': 40 }
     * ];
     *
     * // A sequence without explicit chaining.
     * _(users).head();
     * // => { 'user': 'barney', 'age': 36 }
     *
     * // A sequence with explicit chaining.
     * _(users)
     *   .chain()
     *   .head()
     *   .pick('user')
     *   .value();
     * // => { 'user': 'barney' }
     */
    function wrapperChain() {
      return chain(this);
    }

    /**
     * Executes the chained sequence and returns the wrapped result.
     *
     * @name commit
     * @memberOf _
     * @category Seq
     * @returns {Object} Returns the new `lodash` wrapper instance.
     * @example
     *
     * var array = [1, 2];
     * var wrapped = _(array).push(3);
     *
     * console.log(array);
     * // => [1, 2]
     *
     * wrapped = wrapped.commit();
     * console.log(array);
     * // => [1, 2, 3]
     *
     * wrapped.last();
     * // => 3
     *
     * console.log(array);
     * // => [1, 2, 3]
     */
    function wrapperCommit() {
      return new LodashWrapper(this.value(), this.__chain__);
    }

    /**
     * This method is the wrapper version of `_.flatMap`.
     *
     * @name flatMap
     * @memberOf _
     * @category Seq
     * @param {Function|Object|string} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Object} Returns the new `lodash` wrapper instance.
     * @example
     *
     * function duplicate(n) {
     *   return [n, n];
     * }
     *
     * _([1, 2]).flatMap(duplicate).value();
     * // => [1, 1, 2, 2]
     */
    function wrapperFlatMap(iteratee) {
      return this.map(iteratee).flatten();
    }

    /**
     * Gets the next value on a wrapped object following the
     * [iterator protocol](https://mdn.io/iteration_protocols#iterator).
     *
     * @name next
     * @memberOf _
     * @category Seq
     * @returns {Object} Returns the next iterator value.
     * @example
     *
     * var wrapped = _([1, 2]);
     *
     * wrapped.next();
     * // => { 'done': false, 'value': 1 }
     *
     * wrapped.next();
     * // => { 'done': false, 'value': 2 }
     *
     * wrapped.next();
     * // => { 'done': true, 'value': undefined }
     */
    function wrapperNext() {
      if (this.__values__ === undefined) {
        this.__values__ = toArray(this.value());
      }
      var done = this.__index__ >= this.__values__.length,
          value = done ? undefined : this.__values__[this.__index__++];

      return { 'done': done, 'value': value };
    }

    /**
     * Enables the wrapper to be iterable.
     *
     * @name Symbol.iterator
     * @memberOf _
     * @category Seq
     * @returns {Object} Returns the wrapper object.
     * @example
     *
     * var wrapped = _([1, 2]);
     *
     * wrapped[Symbol.iterator]() === wrapped;
     * // => true
     *
     * Array.from(wrapped);
     * // => [1, 2]
     */
    function wrapperToIterator() {
      return this;
    }

    /**
     * Creates a clone of the chained sequence planting `value` as the wrapped value.
     *
     * @name plant
     * @memberOf _
     * @category Seq
     * @param {*} value The value to plant.
     * @returns {Object} Returns the new `lodash` wrapper instance.
     * @example
     *
     * function square(n) {
     *   return n * n;
     * }
     *
     * var wrapped = _([1, 2]).map(square);
     * var other = wrapped.plant([3, 4]);
     *
     * other.value();
     * // => [9, 16]
     *
     * wrapped.value();
     * // => [1, 4]
     */
    function wrapperPlant(value) {
      var result,
          parent = this;

      while (parent instanceof baseLodash) {
        var clone = wrapperClone(parent);
        clone.__index__ = 0;
        clone.__values__ = undefined;
        if (result) {
          previous.__wrapped__ = clone;
        } else {
          result = clone;
        }
        var previous = clone;
        parent = parent.__wrapped__;
      }
      previous.__wrapped__ = value;
      return result;
    }

    /**
     * This method is the wrapper version of `_.reverse`.
     *
     * **Note:** This method mutates the wrapped array.
     *
     * @name reverse
     * @memberOf _
     * @category Seq
     * @returns {Object} Returns the new `lodash` wrapper instance.
     * @example
     *
     * var array = [1, 2, 3];
     *
     * _(array).reverse().value()
     * // => [3, 2, 1]
     *
     * console.log(array);
     * // => [3, 2, 1]
     */
    function wrapperReverse() {
      var value = this.__wrapped__;
      if (value instanceof LazyWrapper) {
        var wrapped = value;
        if (this.__actions__.length) {
          wrapped = new LazyWrapper(this);
        }
        wrapped = wrapped.reverse();
        wrapped.__actions__.push({ 'func': thru, 'args': [reverse], 'thisArg': undefined });
        return new LodashWrapper(wrapped, this.__chain__);
      }
      return this.thru(reverse);
    }

    /**
     * Executes the chained sequence to extract the unwrapped value.
     *
     * @name value
     * @memberOf _
     * @alias toJSON, valueOf
     * @category Seq
     * @returns {*} Returns the resolved unwrapped value.
     * @example
     *
     * _([1, 2, 3]).value();
     * // => [1, 2, 3]
     */
    function wrapperValue() {
      return baseWrapperValue(this.__wrapped__, this.__actions__);
    }

    /*------------------------------------------------------------------------*/

    /**
     * Creates an object composed of keys generated from the results of running
     * each element of `collection` through `iteratee`. The corresponding value
     * of each key is the number of times the key was returned by `iteratee`.
     * The iteratee is invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function|Object|string} [iteratee=_.identity] The iteratee to transform keys.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * _.countBy([6.1, 4.2, 6.3], Math.floor);
     * // => { '4': 1, '6': 2 }
     *
     * _.countBy(['one', 'two', 'three'], 'length');
     * // => { '3': 2, '5': 1 }
     */
    var countBy = createAggregator(function(result, value, key) {
      hasOwnProperty.call(result, key) ? ++result[key] : (result[key] = 1);
    });

    /**
     * Checks if `predicate` returns truthy for **all** elements of `collection`.
     * Iteration is stopped once `predicate` returns falsey. The predicate is
     * invoked with three arguments: (value, index|key, collection).
     *
     * @static
     * @memberOf _
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function|Object|string} [predicate=_.identity] The function invoked per iteration.
     * @param- {Object} [guard] Enables use as an iteratee for functions like `_.map`.
     * @returns {boolean} Returns `true` if all elements pass the predicate check, else `false`.
     * @example
     *
     * _.every([true, 1, null, 'yes'], Boolean);
     * // => false
     *
     * var users = [
     *   { 'user': 'barney', 'active': false },
     *   { 'user': 'fred',   'active': false }
     * ];
     *
     * // The `_.matches` iteratee shorthand.
     * _.every(users, { 'user': 'barney', 'active': false });
     * // => false
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.every(users, ['active', false]);
     * // => true
     *
     * // The `_.property` iteratee shorthand.
     * _.every(users, 'active');
     * // => false
     */
    function every(collection, predicate, guard) {
      var func = isArray(collection) ? arrayEvery : baseEvery;
      if (guard && isIterateeCall(collection, predicate, guard)) {
        predicate = undefined;
      }
      return func(collection, getIteratee(predicate, 3));
    }

    /**
     * Iterates over elements of `collection`, returning an array of all elements
     * `predicate` returns truthy for. The predicate is invoked with three arguments:
     * (value, index|key, collection).
     *
     * @static
     * @memberOf _
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function|Object|string} [predicate=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the new filtered array.
     * @example
     *
     * var users = [
     *   { 'user': 'barney', 'age': 36, 'active': true },
     *   { 'user': 'fred',   'age': 40, 'active': false }
     * ];
     *
     * _.filter(users, function(o) { return !o.active; });
     * // => objects for ['fred']
     *
     * // The `_.matches` iteratee shorthand.
     * _.filter(users, { 'age': 36, 'active': true });
     * // => objects for ['barney']
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.filter(users, ['active', false]);
     * // => objects for ['fred']
     *
     * // The `_.property` iteratee shorthand.
     * _.filter(users, 'active');
     * // => objects for ['barney']
     */
    function filter(collection, predicate) {
      var func = isArray(collection) ? arrayFilter : baseFilter;
      return func(collection, getIteratee(predicate, 3));
    }

    /**
     * Iterates over elements of `collection`, returning the first element
     * `predicate` returns truthy for. The predicate is invoked with three arguments:
     * (value, index|key, collection).
     *
     * @static
     * @memberOf _
     * @category Collection
     * @param {Array|Object} collection The collection to search.
     * @param {Function|Object|string} [predicate=_.identity] The function invoked per iteration.
     * @returns {*} Returns the matched element, else `undefined`.
     * @example
     *
     * var users = [
     *   { 'user': 'barney',  'age': 36, 'active': true },
     *   { 'user': 'fred',    'age': 40, 'active': false },
     *   { 'user': 'pebbles', 'age': 1,  'active': true }
     * ];
     *
     * _.find(users, function(o) { return o.age < 40; });
     * // => object for 'barney'
     *
     * // The `_.matches` iteratee shorthand.
     * _.find(users, { 'age': 1, 'active': true });
     * // => object for 'pebbles'
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.find(users, ['active', false]);
     * // => object for 'fred'
     *
     * // The `_.property` iteratee shorthand.
     * _.find(users, 'active');
     * // => object for 'barney'
     */
    function find(collection, predicate) {
      predicate = getIteratee(predicate, 3);
      if (isArray(collection)) {
        var index = baseFindIndex(collection, predicate);
        return index > -1 ? collection[index] : undefined;
      }
      return baseFind(collection, predicate, baseEach);
    }

    /**
     * This method is like `_.find` except that it iterates over elements of
     * `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @category Collection
     * @param {Array|Object} collection The collection to search.
     * @param {Function|Object|string} [predicate=_.identity] The function invoked per iteration.
     * @returns {*} Returns the matched element, else `undefined`.
     * @example
     *
     * _.findLast([1, 2, 3, 4], function(n) {
     *   return n % 2 == 1;
     * });
     * // => 3
     */
    function findLast(collection, predicate) {
      predicate = getIteratee(predicate, 3);
      if (isArray(collection)) {
        var index = baseFindIndex(collection, predicate, true);
        return index > -1 ? collection[index] : undefined;
      }
      return baseFind(collection, predicate, baseEachRight);
    }

    /**
     * Creates an array of flattened values by running each element in `collection`
     * through `iteratee` and concating its result to the other mapped values.
     * The iteratee is invoked with three arguments: (value, index|key, collection).
     *
     * @static
     * @memberOf _
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function|Object|string} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the new flattened array.
     * @example
     *
     * function duplicate(n) {
     *   return [n, n];
     * }
     *
     * _.flatMap([1, 2], duplicate);
     * // => [1, 1, 2, 2]
     */
    function flatMap(collection, iteratee) {
      return baseFlatten(map(collection, iteratee));
    }

    /**
     * Iterates over elements of `collection` invoking `iteratee` for each element.
     * The iteratee is invoked with three arguments: (value, index|key, collection).
     * Iteratee functions may exit iteration early by explicitly returning `false`.
     *
     * **Note:** As with other "Collections" methods, objects with a "length" property
     * are iterated like arrays. To avoid this behavior use `_.forIn` or `_.forOwn`
     * for object iteration.
     *
     * @static
     * @memberOf _
     * @alias each
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Array|Object} Returns `collection`.
     * @example
     *
     * _([1, 2]).forEach(function(value) {
     *   console.log(value);
     * });
     * // => logs `1` then `2`
     *
     * _.forEach({ 'a': 1, 'b': 2 }, function(value, key) {
     *   console.log(key);
     * });
     * // => logs 'a' then 'b' (iteration order is not guaranteed)
     */
    function forEach(collection, iteratee) {
      return (typeof iteratee == 'function' && isArray(collection))
        ? arrayEach(collection, iteratee)
        : baseEach(collection, toFunction(iteratee));
    }

    /**
     * This method is like `_.forEach` except that it iterates over elements of
     * `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @alias eachRight
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Array|Object} Returns `collection`.
     * @example
     *
     * _.forEachRight([1, 2], function(value) {
     *   console.log(value);
     * });
     * // => logs `2` then `1`
     */
    function forEachRight(collection, iteratee) {
      return (typeof iteratee == 'function' && isArray(collection))
        ? arrayEachRight(collection, iteratee)
        : baseEachRight(collection, toFunction(iteratee));
    }

    /**
     * Creates an object composed of keys generated from the results of running
     * each element of `collection` through `iteratee`. The corresponding value
     * of each key is an array of elements responsible for generating the key.
     * The iteratee is invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function|Object|string} [iteratee=_.identity] The iteratee to transform keys.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * _.groupBy([6.1, 4.2, 6.3], Math.floor);
     * // => { '4': [4.2], '6': [6.1, 6.3] }
     *
     * // The `_.property` iteratee shorthand.
     * _.groupBy(['one', 'two', 'three'], 'length');
     * // => { '3': ['one', 'two'], '5': ['three'] }
     */
    var groupBy = createAggregator(function(result, value, key) {
      if (hasOwnProperty.call(result, key)) {
        result[key].push(value);
      } else {
        result[key] = [value];
      }
    });

    /**
     * Checks if `value` is in `collection`. If `collection` is a string it's checked
     * for a substring of `value`, otherwise [`SameValueZero`](http://ecma-international.org/ecma-262/6.0/#sec-samevaluezero)
     * is used for equality comparisons. If `fromIndex` is negative, it's used as
     * the offset from the end of `collection`.
     *
     * @static
     * @memberOf _
     * @category Collection
     * @param {Array|Object|string} collection The collection to search.
     * @param {*} value The value to search for.
     * @param {number} [fromIndex=0] The index to search from.
     * @param- {Object} [guard] Enables use as an iteratee for functions like `_.reduce`.
     * @returns {boolean} Returns `true` if `value` is found, else `false`.
     * @example
     *
     * _.includes([1, 2, 3], 1);
     * // => true
     *
     * _.includes([1, 2, 3], 1, 2);
     * // => false
     *
     * _.includes({ 'user': 'fred', 'age': 40 }, 'fred');
     * // => true
     *
     * _.includes('pebbles', 'eb');
     * // => true
     */
    function includes(collection, value, fromIndex, guard) {
      collection = isArrayLike(collection) ? collection : values(collection);
      fromIndex = (fromIndex && !guard) ? toInteger(fromIndex) : 0;

      var length = collection.length;
      if (fromIndex < 0) {
        fromIndex = nativeMax(length + fromIndex, 0);
      }
      return isString(collection)
        ? (fromIndex <= length && collection.indexOf(value, fromIndex) > -1)
        : (!!length && baseIndexOf(collection, value, fromIndex) > -1);
    }

    /**
     * Invokes the method at `path` of each element in `collection`, returning
     * an array of the results of each invoked method. Any additional arguments
     * are provided to each invoked method. If `methodName` is a function it's
     * invoked for, and `this` bound to, each element in `collection`.
     *
     * @static
     * @memberOf _
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Array|Function|string} path The path of the method to invoke or
     *  the function invoked per iteration.
     * @param {...*} [args] The arguments to invoke each method with.
     * @returns {Array} Returns the array of results.
     * @example
     *
     * _.invokeMap([[5, 1, 7], [3, 2, 1]], 'sort');
     * // => [[1, 5, 7], [1, 2, 3]]
     *
     * _.invokeMap([123, 456], String.prototype.split, '');
     * // => [['1', '2', '3'], ['4', '5', '6']]
     */
    var invokeMap = rest(function(collection, path, args) {
      var index = -1,
          isFunc = typeof path == 'function',
          isProp = isKey(path),
          result = isArrayLike(collection) ? Array(collection.length) : [];

      baseEach(collection, function(value) {
        var func = isFunc ? path : ((isProp && value != null) ? value[path] : undefined);
        result[++index] = func ? apply(func, value, args) : baseInvoke(value, path, args);
      });
      return result;
    });

    /**
     * Creates an object composed of keys generated from the results of running
     * each element of `collection` through `iteratee`. The corresponding value
     * of each key is the last element responsible for generating the key. The
     * iteratee is invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function|Object|string} [iteratee=_.identity] The iteratee to transform keys.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * var array = [
     *   { 'dir': 'left', 'code': 97 },
     *   { 'dir': 'right', 'code': 100 }
     * ];
     *
     * _.keyBy(array, function(o) {
     *   return String.fromCharCode(o.code);
     * });
     * // => { 'a': { 'dir': 'left', 'code': 97 }, 'd': { 'dir': 'right', 'code': 100 } }
     *
     * _.keyBy(array, 'dir');
     * // => { 'left': { 'dir': 'left', 'code': 97 }, 'right': { 'dir': 'right', 'code': 100 } }
     */
    var keyBy = createAggregator(function(result, value, key) {
      result[key] = value;
    });

    /**
     * Creates an array of values by running each element in `collection` through
     * `iteratee`. The iteratee is invoked with three arguments:
     * (value, index|key, collection).
     *
     * Many lodash methods are guarded to work as iteratees for methods like
     * `_.every`, `_.filter`, `_.map`, `_.mapValues`, `_.reject`, and `_.some`.
     *
     * The guarded methods are:
     * `ary`, `curry`, `curryRight`, `drop`, `dropRight`, `every`, `fill`,
     * `invert`, `parseInt`, `random`, `range`, `rangeRight`, `slice`, `some`,
     * `sortBy`, `take`, `takeRight`, `template`, `trim`, `trimEnd`, `trimStart`,
     * and `words`
     *
     * @static
     * @memberOf _
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function|Object|string} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the new mapped array.
     * @example
     *
     * function square(n) {
     *   return n * n;
     * }
     *
     * _.map([4, 8], square);
     * // => [16, 64]
     *
     * _.map({ 'a': 4, 'b': 8 }, square);
     * // => [16, 64] (iteration order is not guaranteed)
     *
     * var users = [
     *   { 'user': 'barney' },
     *   { 'user': 'fred' }
     * ];
     *
     * // The `_.property` iteratee shorthand.
     * _.map(users, 'user');
     * // => ['barney', 'fred']
     */
    function map(collection, iteratee) {
      var func = isArray(collection) ? arrayMap : baseMap;
      return func(collection, getIteratee(iteratee, 3));
    }

    /**
     * This method is like `_.sortBy` except that it allows specifying the sort
     * orders of the iteratees to sort by. If `orders` is unspecified, all values
     * are sorted in ascending order. Otherwise, specify an order of "desc" for
     * descending or "asc" for ascending sort order of corresponding values.
     *
     * @static
     * @memberOf _
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function[]|Object[]|string[]} [iteratees=[_.identity]] The iteratees to sort by.
     * @param {string[]} [orders] The sort orders of `iteratees`.
     * @param- {Object} [guard] Enables use as an iteratee for functions like `_.reduce`.
     * @returns {Array} Returns the new sorted array.
     * @example
     *
     * var users = [
     *   { 'user': 'fred',   'age': 48 },
     *   { 'user': 'barney', 'age': 34 },
     *   { 'user': 'fred',   'age': 42 },
     *   { 'user': 'barney', 'age': 36 }
     * ];
     *
     * // Sort by `user` in ascending order and by `age` in descending order.
     * _.orderBy(users, ['user', 'age'], ['asc', 'desc']);
     * // => objects for [['barney', 36], ['barney', 34], ['fred', 48], ['fred', 42]]
     */
    function orderBy(collection, iteratees, orders, guard) {
      if (collection == null) {
        return [];
      }
      if (!isArray(iteratees)) {
        iteratees = iteratees == null ? [] : [iteratees];
      }
      orders = guard ? undefined : orders;
      if (!isArray(orders)) {
        orders = orders == null ? [] : [orders];
      }
      return baseOrderBy(collection, iteratees, orders);
    }

    /**
     * Creates an array of elements split into two groups, the first of which
     * contains elements `predicate` returns truthy for, the second of which
     * contains elements `predicate` returns falsey for. The predicate is
     * invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function|Object|string} [predicate=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the array of grouped elements.
     * @example
     *
     * var users = [
     *   { 'user': 'barney',  'age': 36, 'active': false },
     *   { 'user': 'fred',    'age': 40, 'active': true },
     *   { 'user': 'pebbles', 'age': 1,  'active': false }
     * ];
     *
     * _.partition(users, function(o) { return o.active; });
     * // => objects for [['fred'], ['barney', 'pebbles']]
     *
     * // The `_.matches` iteratee shorthand.
     * _.partition(users, { 'age': 1, 'active': false });
     * // => objects for [['pebbles'], ['barney', 'fred']]
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.partition(users, ['active', false]);
     * // => objects for [['barney', 'pebbles'], ['fred']]
     *
     * // The `_.property` iteratee shorthand.
     * _.partition(users, 'active');
     * // => objects for [['fred'], ['barney', 'pebbles']]
     */
    var partition = createAggregator(function(result, value, key) {
      result[key ? 0 : 1].push(value);
    }, function() { return [[], []]; });

    /**
     * Reduces `collection` to a value which is the accumulated result of running
     * each element in `collection` through `iteratee`, where each successive
     * invocation is supplied the return value of the previous. If `accumulator`
     * is not given the first element of `collection` is used as the initial
     * value. The iteratee is invoked with four arguments:
     * (accumulator, value, index|key, collection).
     *
     * Many lodash methods are guarded to work as iteratees for methods like
     * `_.reduce`, `_.reduceRight`, and `_.transform`.
     *
     * The guarded methods are:
     * `assign`, `defaults`, `defaultsDeep`, `includes`, `merge`, `orderBy`,
     * and `sortBy`
     *
     * @static
     * @memberOf _
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @param {*} [accumulator] The initial value.
     * @returns {*} Returns the accumulated value.
     * @example
     *
     * _.reduce([1, 2], function(sum, n) {
     *   return sum + n;
     * }, 0);
     * // => 3
     *
     * _.reduce({ 'a': 1, 'b': 2, 'c': 1 }, function(result, value, key) {
     *   (result[value] || (result[value] = [])).push(key);
     *   return result;
     * }, {});
     * // => { '1': ['a', 'c'], '2': ['b'] } (iteration order is not guaranteed)
     */
    function reduce(collection, iteratee, accumulator) {
      var func = isArray(collection) ? arrayReduce : baseReduce,
          initAccum = arguments.length < 3;

      return func(collection, getIteratee(iteratee, 4), accumulator, initAccum, baseEach);
    }

    /**
     * This method is like `_.reduce` except that it iterates over elements of
     * `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @param {*} [accumulator] The initial value.
     * @returns {*} Returns the accumulated value.
     * @example
     *
     * var array = [[0, 1], [2, 3], [4, 5]];
     *
     * _.reduceRight(array, function(flattened, other) {
     *   return flattened.concat(other);
     * }, []);
     * // => [4, 5, 2, 3, 0, 1]
     */
    function reduceRight(collection, iteratee, accumulator) {
      var func = isArray(collection) ? arrayReduceRight : baseReduce,
          initAccum = arguments.length < 3;

      return func(collection, getIteratee(iteratee, 4), accumulator, initAccum, baseEachRight);
    }

    /**
     * The opposite of `_.filter`; this method returns the elements of `collection`
     * that `predicate` does **not** return truthy for.
     *
     * @static
     * @memberOf _
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function|Object|string} [predicate=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the new filtered array.
     * @example
     *
     * var users = [
     *   { 'user': 'barney', 'age': 36, 'active': false },
     *   { 'user': 'fred',   'age': 40, 'active': true }
     * ];
     *
     * _.reject(users, function(o) { return !o.active; });
     * // => objects for ['fred']
     *
     * // The `_.matches` iteratee shorthand.
     * _.reject(users, { 'age': 40, 'active': true });
     * // => objects for ['barney']
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.reject(users, ['active', false]);
     * // => objects for ['fred']
     *
     * // The `_.property` iteratee shorthand.
     * _.reject(users, 'active');
     * // => objects for ['barney']
     */
    function reject(collection, predicate) {
      var func = isArray(collection) ? arrayFilter : baseFilter;
      predicate = getIteratee(predicate, 3);
      return func(collection, function(value, index, collection) {
        return !predicate(value, index, collection);
      });
    }

    /**
     * Gets a random element from `collection`.
     *
     * @static
     * @memberOf _
     * @category Collection
     * @param {Array|Object} collection The collection to sample.
     * @returns {*} Returns the random element.
     * @example
     *
     * _.sample([1, 2, 3, 4]);
     * // => 2
     */
    function sample(collection) {
      var array = isArrayLike(collection) ? collection : values(collection),
          length = array.length;

      return length > 0 ? array[baseRandom(0, length - 1)] : undefined;
    }

    /**
     * Gets `n` random elements at unique keys from `collection` up to the
     * size of `collection`.
     *
     * @static
     * @memberOf _
     * @category Collection
     * @param {Array|Object} collection The collection to sample.
     * @param {number} [n=0] The number of elements to sample.
     * @returns {Array} Returns the random elements.
     * @example
     *
     * _.sampleSize([1, 2, 3], 2);
     * // => [3, 1]
     *
     * _.sampleSize([1, 2, 3], 4);
     * // => [2, 3, 1]
     */
    function sampleSize(collection, n) {
      var index = -1,
          result = toArray(collection),
          length = result.length,
          lastIndex = length - 1;

      n = baseClamp(toInteger(n), 0, length);
      while (++index < n) {
        var rand = baseRandom(index, lastIndex),
            value = result[rand];

        result[rand] = result[index];
        result[index] = value;
      }
      result.length = n;
      return result;
    }

    /**
     * Creates an array of shuffled values, using a version of the
     * [Fisher-Yates shuffle](https://en.wikipedia.org/wiki/Fisher-Yates_shuffle).
     *
     * @static
     * @memberOf _
     * @category Collection
     * @param {Array|Object} collection The collection to shuffle.
     * @returns {Array} Returns the new shuffled array.
     * @example
     *
     * _.shuffle([1, 2, 3, 4]);
     * // => [4, 1, 3, 2]
     */
    function shuffle(collection) {
      return sampleSize(collection, MAX_ARRAY_LENGTH);
    }

    /**
     * Gets the size of `collection` by returning its length for array-like
     * values or the number of own enumerable properties for objects.
     *
     * @static
     * @memberOf _
     * @category Collection
     * @param {Array|Object} collection The collection to inspect.
     * @returns {number} Returns the collection size.
     * @example
     *
     * _.size([1, 2, 3]);
     * // => 3
     *
     * _.size({ 'a': 1, 'b': 2 });
     * // => 2
     *
     * _.size('pebbles');
     * // => 7
     */
    function size(collection) {
      if (collection == null) {
        return 0;
      }
      if (isArrayLike(collection)) {
        var result = collection.length;
        return (result && isString(collection)) ? stringSize(collection) : result;
      }
      return keys(collection).length;
    }

    /**
     * Checks if `predicate` returns truthy for **any** element of `collection`.
     * Iteration is stopped once `predicate` returns truthy. The predicate is
     * invoked with three arguments: (value, index|key, collection).
     *
     * @static
     * @memberOf _
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function|Object|string} [predicate=_.identity] The function invoked per iteration.
     * @param- {Object} [guard] Enables use as an iteratee for functions like `_.map`.
     * @returns {boolean} Returns `true` if any element passes the predicate check, else `false`.
     * @example
     *
     * _.some([null, 0, 'yes', false], Boolean);
     * // => true
     *
     * var users = [
     *   { 'user': 'barney', 'active': true },
     *   { 'user': 'fred',   'active': false }
     * ];
     *
     * // The `_.matches` iteratee shorthand.
     * _.some(users, { 'user': 'barney', 'active': false });
     * // => false
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.some(users, ['active', false]);
     * // => true
     *
     * // The `_.property` iteratee shorthand.
     * _.some(users, 'active');
     * // => true
     */
    function some(collection, predicate, guard) {
      var func = isArray(collection) ? arraySome : baseSome;
      if (guard && isIterateeCall(collection, predicate, guard)) {
        predicate = undefined;
      }
      return func(collection, getIteratee(predicate, 3));
    }

    /**
     * Creates an array of elements, sorted in ascending order by the results of
     * running each element in a collection through each iteratee. This method
     * performs a stable sort, that is, it preserves the original sort order of
     * equal elements. The iteratees are invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {...(Function|Function[]|Object|Object[]|string|string[])} [iteratees=[_.identity]]
     *  The iteratees to sort by, specified individually or in arrays.
     * @returns {Array} Returns the new sorted array.
     * @example
     *
     * var users = [
     *   { 'user': 'fred',   'age': 48 },
     *   { 'user': 'barney', 'age': 36 },
     *   { 'user': 'fred',   'age': 42 },
     *   { 'user': 'barney', 'age': 34 }
     * ];
     *
     * _.sortBy(users, function(o) { return o.user; });
     * // => objects for [['barney', 36], ['barney', 34], ['fred', 48], ['fred', 42]]
     *
     * _.sortBy(users, ['user', 'age']);
     * // => objects for [['barney', 34], ['barney', 36], ['fred', 42], ['fred', 48]]
     *
     * _.sortBy(users, 'user', function(o) {
     *   return Math.floor(o.age / 10);
     * });
     * // => objects for [['barney', 36], ['barney', 34], ['fred', 48], ['fred', 42]]
     */
    var sortBy = rest(function(collection, iteratees) {
      if (collection == null) {
        return [];
      }
      var length = iteratees.length;
      if (length > 1 && isIterateeCall(collection, iteratees[0], iteratees[1])) {
        iteratees = [];
      } else if (length > 2 && isIterateeCall(iteratees[0], iteratees[1], iteratees[2])) {
        iteratees.length = 1;
      }
      return baseOrderBy(collection, baseFlatten(iteratees), []);
    });

    /*------------------------------------------------------------------------*/

    /**
     * Gets the timestamp of the number of milliseconds that have elapsed since
     * the Unix epoch (1 January 1970 00:00:00 UTC).
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Date
     * @returns {number} Returns the timestamp.
     * @example
     *
     * _.defer(function(stamp) {
     *   console.log(_.now() - stamp);
     * }, _.now());
     * // => logs the number of milliseconds it took for the deferred function to be invoked
     */
    var now = Date.now;

    /*------------------------------------------------------------------------*/

    /**
     * The opposite of `_.before`; this method creates a function that invokes
     * `func` once it's called `n` or more times.
     *
     * @static
     * @memberOf _
     * @category Function
     * @param {number} n The number of calls before `func` is invoked.
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new restricted function.
     * @example
     *
     * var saves = ['profile', 'settings'];
     *
     * var done = _.after(saves.length, function() {
     *   console.log('done saving!');
     * });
     *
     * _.forEach(saves, function(type) {
     *   asyncSave({ 'type': type, 'complete': done });
     * });
     * // => logs 'done saving!' after the two async saves have completed
     */
    function after(n, func) {
      if (typeof func != 'function') {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      n = toInteger(n);
      return function() {
        if (--n < 1) {
          return func.apply(this, arguments);
        }
      };
    }

    /**
     * Creates a function that accepts up to `n` arguments, ignoring any
     * additional arguments.
     *
     * @static
     * @memberOf _
     * @category Function
     * @param {Function} func The function to cap arguments for.
     * @param {number} [n=func.length] The arity cap.
     * @param- {Object} [guard] Enables use as an iteratee for functions like `_.map`.
     * @returns {Function} Returns the new function.
     * @example
     *
     * _.map(['6', '8', '10'], _.ary(parseInt, 1));
     * // => [6, 8, 10]
     */
    function ary(func, n, guard) {
      n = guard ? undefined : n;
      n = (func && n == null) ? func.length : n;
      return createWrapper(func, ARY_FLAG, undefined, undefined, undefined, undefined, n);
    }

    /**
     * Creates a function that invokes `func`, with the `this` binding and arguments
     * of the created function, while it's called less than `n` times. Subsequent
     * calls to the created function return the result of the last `func` invocation.
     *
     * @static
     * @memberOf _
     * @category Function
     * @param {number} n The number of calls at which `func` is no longer invoked.
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new restricted function.
     * @example
     *
     * jQuery(element).on('click', _.before(5, addContactToList));
     * // => allows adding up to 4 contacts to the list
     */
    function before(n, func) {
      var result;
      if (typeof func != 'function') {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      n = toInteger(n);
      return function() {
        if (--n > 0) {
          result = func.apply(this, arguments);
        }
        if (n <= 1) {
          func = undefined;
        }
        return result;
      };
    }

    /**
     * Creates a function that invokes `func` with the `this` binding of `thisArg`
     * and prepends any additional `_.bind` arguments to those provided to the
     * bound function.
     *
     * The `_.bind.placeholder` value, which defaults to `_` in monolithic builds,
     * may be used as a placeholder for partially applied arguments.
     *
     * **Note:** Unlike native `Function#bind` this method doesn't set the "length"
     * property of bound functions.
     *
     * @static
     * @memberOf _
     * @category Function
     * @param {Function} func The function to bind.
     * @param {*} thisArg The `this` binding of `func`.
     * @param {...*} [partials] The arguments to be partially applied.
     * @returns {Function} Returns the new bound function.
     * @example
     *
     * var greet = function(greeting, punctuation) {
     *   return greeting + ' ' + this.user + punctuation;
     * };
     *
     * var object = { 'user': 'fred' };
     *
     * var bound = _.bind(greet, object, 'hi');
     * bound('!');
     * // => 'hi fred!'
     *
     * // Bound with placeholders.
     * var bound = _.bind(greet, object, _, '!');
     * bound('hi');
     * // => 'hi fred!'
     */
    var bind = rest(function(func, thisArg, partials) {
      var bitmask = BIND_FLAG;
      if (partials.length) {
        var placeholder = lodash.placeholder || bind.placeholder,
            holders = replaceHolders(partials, placeholder);

        bitmask |= PARTIAL_FLAG;
      }
      return createWrapper(func, bitmask, thisArg, partials, holders);
    });

    /**
     * Creates a function that invokes the method at `object[key]` and prepends
     * any additional `_.bindKey` arguments to those provided to the bound function.
     *
     * This method differs from `_.bind` by allowing bound functions to reference
     * methods that may be redefined or don't yet exist.
     * See [Peter Michaux's article](http://peter.michaux.ca/articles/lazy-function-definition-pattern)
     * for more details.
     *
     * The `_.bindKey.placeholder` value, which defaults to `_` in monolithic
     * builds, may be used as a placeholder for partially applied arguments.
     *
     * @static
     * @memberOf _
     * @category Function
     * @param {Object} object The object to invoke the method on.
     * @param {string} key The key of the method.
     * @param {...*} [partials] The arguments to be partially applied.
     * @returns {Function} Returns the new bound function.
     * @example
     *
     * var object = {
     *   'user': 'fred',
     *   'greet': function(greeting, punctuation) {
     *     return greeting + ' ' + this.user + punctuation;
     *   }
     * };
     *
     * var bound = _.bindKey(object, 'greet', 'hi');
     * bound('!');
     * // => 'hi fred!'
     *
     * object.greet = function(greeting, punctuation) {
     *   return greeting + 'ya ' + this.user + punctuation;
     * };
     *
     * bound('!');
     * // => 'hiya fred!'
     *
     * // Bound with placeholders.
     * var bound = _.bindKey(object, 'greet', _, '!');
     * bound('hi');
     * // => 'hiya fred!'
     */
    var bindKey = rest(function(object, key, partials) {
      var bitmask = BIND_FLAG | BIND_KEY_FLAG;
      if (partials.length) {
        var placeholder = lodash.placeholder || bindKey.placeholder,
            holders = replaceHolders(partials, placeholder);

        bitmask |= PARTIAL_FLAG;
      }
      return createWrapper(key, bitmask, object, partials, holders);
    });

    /**
     * Creates a function that accepts arguments of `func` and either invokes
     * `func` returning its result, if at least `arity` number of arguments have
     * been provided, or returns a function that accepts the remaining `func`
     * arguments, and so on. The arity of `func` may be specified if `func.length`
     * is not sufficient.
     *
     * The `_.curry.placeholder` value, which defaults to `_` in monolithic builds,
     * may be used as a placeholder for provided arguments.
     *
     * **Note:** This method doesn't set the "length" property of curried functions.
     *
     * @static
     * @memberOf _
     * @category Function
     * @param {Function} func The function to curry.
     * @param {number} [arity=func.length] The arity of `func`.
     * @param- {Object} [guard] Enables use as an iteratee for functions like `_.map`.
     * @returns {Function} Returns the new curried function.
     * @example
     *
     * var abc = function(a, b, c) {
     *   return [a, b, c];
     * };
     *
     * var curried = _.curry(abc);
     *
     * curried(1)(2)(3);
     * // => [1, 2, 3]
     *
     * curried(1, 2)(3);
     * // => [1, 2, 3]
     *
     * curried(1, 2, 3);
     * // => [1, 2, 3]
     *
     * // Curried with placeholders.
     * curried(1)(_, 3)(2);
     * // => [1, 2, 3]
     */
    function curry(func, arity, guard) {
      arity = guard ? undefined : arity;
      var result = createWrapper(func, CURRY_FLAG, undefined, undefined, undefined, undefined, undefined, arity);
      result.placeholder = lodash.placeholder || curry.placeholder;
      return result;
    }

    /**
     * This method is like `_.curry` except that arguments are applied to `func`
     * in the manner of `_.partialRight` instead of `_.partial`.
     *
     * The `_.curryRight.placeholder` value, which defaults to `_` in monolithic
     * builds, may be used as a placeholder for provided arguments.
     *
     * **Note:** This method doesn't set the "length" property of curried functions.
     *
     * @static
     * @memberOf _
     * @category Function
     * @param {Function} func The function to curry.
     * @param {number} [arity=func.length] The arity of `func`.
     * @param- {Object} [guard] Enables use as an iteratee for functions like `_.map`.
     * @returns {Function} Returns the new curried function.
     * @example
     *
     * var abc = function(a, b, c) {
     *   return [a, b, c];
     * };
     *
     * var curried = _.curryRight(abc);
     *
     * curried(3)(2)(1);
     * // => [1, 2, 3]
     *
     * curried(2, 3)(1);
     * // => [1, 2, 3]
     *
     * curried(1, 2, 3);
     * // => [1, 2, 3]
     *
     * // Curried with placeholders.
     * curried(3)(1, _)(2);
     * // => [1, 2, 3]
     */
    function curryRight(func, arity, guard) {
      arity = guard ? undefined : arity;
      var result = createWrapper(func, CURRY_RIGHT_FLAG, undefined, undefined, undefined, undefined, undefined, arity);
      result.placeholder = lodash.placeholder || curryRight.placeholder;
      return result;
    }

    /**
     * Creates a debounced function that delays invoking `func` until after `wait`
     * milliseconds have elapsed since the last time the debounced function was
     * invoked. The debounced function comes with a `cancel` method to cancel
     * delayed `func` invocations and a `flush` method to immediately invoke them.
     * Provide an options object to indicate whether `func` should be invoked on
     * the leading and/or trailing edge of the `wait` timeout. The `func` is invoked
     * with the last arguments provided to the debounced function. Subsequent calls
     * to the debounced function return the result of the last `func` invocation.
     *
     * **Note:** If `leading` and `trailing` options are `true`, `func` is invoked
     * on the trailing edge of the timeout only if the debounced function is
     * invoked more than once during the `wait` timeout.
     *
     * See [David Corbacho's article](http://drupalmotion.com/article/debounce-and-throttle-visual-explanation)
     * for details over the differences between `_.debounce` and `_.throttle`.
     *
     * @static
     * @memberOf _
     * @category Function
     * @param {Function} func The function to debounce.
     * @param {number} [wait=0] The number of milliseconds to delay.
     * @param {Object} [options] The options object.
     * @param {boolean} [options.leading=false] Specify invoking on the leading
     *  edge of the timeout.
     * @param {number} [options.maxWait] The maximum time `func` is allowed to be
     *  delayed before it's invoked.
     * @param {boolean} [options.trailing=true] Specify invoking on the trailing
     *  edge of the timeout.
     * @returns {Function} Returns the new debounced function.
     * @example
     *
     * // Avoid costly calculations while the window size is in flux.
     * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
     *
     * // Invoke `sendMail` when clicked, debouncing subsequent calls.
     * jQuery(element).on('click', _.debounce(sendMail, 300, {
     *   'leading': true,
     *   'trailing': false
     * }));
     *
     * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
     * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
     * var source = new EventSource('/stream');
     * jQuery(source).on('message', debounced);
     *
     * // Cancel the trailing debounced invocation.
     * jQuery(window).on('popstate', debounced.cancel);
     */
    function debounce(func, wait, options) {
      var args,
          maxTimeoutId,
          result,
          stamp,
          thisArg,
          timeoutId,
          trailingCall,
          lastCalled = 0,
          leading = false,
          maxWait = false,
          trailing = true;

      if (typeof func != 'function') {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      wait = toNumber(wait) || 0;
      if (isObject(options)) {
        leading = !!options.leading;
        maxWait = 'maxWait' in options && nativeMax(toNumber(options.maxWait) || 0, wait);
        trailing = 'trailing' in options ? !!options.trailing : trailing;
      }

      function cancel() {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (maxTimeoutId) {
          clearTimeout(maxTimeoutId);
        }
        lastCalled = 0;
        args = maxTimeoutId = thisArg = timeoutId = trailingCall = undefined;
      }

      function complete(isCalled, id) {
        if (id) {
          clearTimeout(id);
        }
        maxTimeoutId = timeoutId = trailingCall = undefined;
        if (isCalled) {
          lastCalled = now();
          result = func.apply(thisArg, args);
          if (!timeoutId && !maxTimeoutId) {
            args = thisArg = undefined;
          }
        }
      }

      function delayed() {
        var remaining = wait - (now() - stamp);
        if (remaining <= 0 || remaining > wait) {
          complete(trailingCall, maxTimeoutId);
        } else {
          timeoutId = setTimeout(delayed, remaining);
        }
      }

      function flush() {
        if ((timeoutId && trailingCall) || (maxTimeoutId && trailing)) {
          result = func.apply(thisArg, args);
        }
        cancel();
        return result;
      }

      function maxDelayed() {
        complete(trailing, timeoutId);
      }

      function debounced() {
        args = arguments;
        stamp = now();
        thisArg = this;
        trailingCall = trailing && (timeoutId || !leading);

        if (maxWait === false) {
          var leadingCall = leading && !timeoutId;
        } else {
          if (!lastCalled && !maxTimeoutId && !leading) {
            lastCalled = stamp;
          }
          var remaining = maxWait - (stamp - lastCalled),
              isCalled = remaining <= 0 || remaining > maxWait;

          if (isCalled) {
            if (maxTimeoutId) {
              maxTimeoutId = clearTimeout(maxTimeoutId);
            }
            lastCalled = stamp;
            result = func.apply(thisArg, args);
          }
          else if (!maxTimeoutId) {
            maxTimeoutId = setTimeout(maxDelayed, remaining);
          }
        }
        if (isCalled && timeoutId) {
          timeoutId = clearTimeout(timeoutId);
        }
        else if (!timeoutId && wait !== maxWait) {
          timeoutId = setTimeout(delayed, wait);
        }
        if (leadingCall) {
          isCalled = true;
          result = func.apply(thisArg, args);
        }
        if (isCalled && !timeoutId && !maxTimeoutId) {
          args = thisArg = undefined;
        }
        return result;
      }
      debounced.cancel = cancel;
      debounced.flush = flush;
      return debounced;
    }

    /**
     * Defers invoking the `func` until the current call stack has cleared. Any
     * additional arguments are provided to `func` when it's invoked.
     *
     * @static
     * @memberOf _
     * @category Function
     * @param {Function} func The function to defer.
     * @param {...*} [args] The arguments to invoke `func` with.
     * @returns {number} Returns the timer id.
     * @example
     *
     * _.defer(function(text) {
     *   console.log(text);
     * }, 'deferred');
     * // => logs 'deferred' after one or more milliseconds
     */
    var defer = rest(function(func, args) {
      return baseDelay(func, 1, args);
    });

    /**
     * Invokes `func` after `wait` milliseconds. Any additional arguments are
     * provided to `func` when it's invoked.
     *
     * @static
     * @memberOf _
     * @category Function
     * @param {Function} func The function to delay.
     * @param {number} wait The number of milliseconds to delay invocation.
     * @param {...*} [args] The arguments to invoke `func` with.
     * @returns {number} Returns the timer id.
     * @example
     *
     * _.delay(function(text) {
     *   console.log(text);
     * }, 1000, 'later');
     * // => logs 'later' after one second
     */
    var delay = rest(function(func, wait, args) {
      return baseDelay(func, toNumber(wait) || 0, args);
    });

    /**
     * Creates a function that invokes `func` with arguments reversed.
     *
     * @static
     * @memberOf _
     * @category Function
     * @param {Function} func The function to flip arguments for.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var flipped = _.flip(function() {
     *   return _.toArray(arguments);
     * });
     *
     * flipped('a', 'b', 'c', 'd');
     * // => ['d', 'c', 'b', 'a']
     */
    function flip(func) {
      return createWrapper(func, FLIP_FLAG);
    }

    /**
     * Creates a function that memoizes the result of `func`. If `resolver` is
     * provided it determines the cache key for storing the result based on the
     * arguments provided to the memoized function. By default, the first argument
     * provided to the memoized function is used as the map cache key. The `func`
     * is invoked with the `this` binding of the memoized function.
     *
     * **Note:** The cache is exposed as the `cache` property on the memoized
     * function. Its creation may be customized by replacing the `_.memoize.Cache`
     * constructor with one whose instances implement the [`Map`](http://ecma-international.org/ecma-262/6.0/#sec-properties-of-the-map-prototype-object)
     * method interface of `delete`, `get`, `has`, and `set`.
     *
     * @static
     * @memberOf _
     * @category Function
     * @param {Function} func The function to have its output memoized.
     * @param {Function} [resolver] The function to resolve the cache key.
     * @returns {Function} Returns the new memoizing function.
     * @example
     *
     * var object = { 'a': 1, 'b': 2 };
     * var other = { 'c': 3, 'd': 4 };
     *
     * var values = _.memoize(_.values);
     * values(object);
     * // => [1, 2]
     *
     * values(other);
     * // => [3, 4]
     *
     * object.a = 2;
     * values(object);
     * // => [1, 2]
     *
     * // Modify the result cache.
     * values.cache.set(object, ['a', 'b']);
     * values(object);
     * // => ['a', 'b']
     *
     * // Replace `_.memoize.Cache`.
     * _.memoize.Cache = WeakMap;
     */
    function memoize(func, resolver) {
      if (typeof func != 'function' || (resolver && typeof resolver != 'function')) {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      var memoized = function() {
        var args = arguments,
            key = resolver ? resolver.apply(this, args) : args[0],
            cache = memoized.cache;

        if (cache.has(key)) {
          return cache.get(key);
        }
        var result = func.apply(this, args);
        memoized.cache = cache.set(key, result);
        return result;
      };
      memoized.cache = new memoize.Cache;
      return memoized;
    }

    /**
     * Creates a function that negates the result of the predicate `func`. The
     * `func` predicate is invoked with the `this` binding and arguments of the
     * created function.
     *
     * @static
     * @memberOf _
     * @category Function
     * @param {Function} predicate The predicate to negate.
     * @returns {Function} Returns the new function.
     * @example
     *
     * function isEven(n) {
     *   return n % 2 == 0;
     * }
     *
     * _.filter([1, 2, 3, 4, 5, 6], _.negate(isEven));
     * // => [1, 3, 5]
     */
    function negate(predicate) {
      if (typeof predicate != 'function') {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      return function() {
        return !predicate.apply(this, arguments);
      };
    }

    /**
     * Creates a function that is restricted to invoking `func` once. Repeat calls
     * to the function return the value of the first invocation. The `func` is
     * invoked with the `this` binding and arguments of the created function.
     *
     * @static
     * @memberOf _
     * @category Function
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new restricted function.
     * @example
     *
     * var initialize = _.once(createApplication);
     * initialize();
     * initialize();
     * // `initialize` invokes `createApplication` once
     */
    function once(func) {
      return before(2, func);
    }

    /**
     * Creates a function that invokes `func` with arguments transformed by
     * corresponding `transforms`.
     *
     * @static
     * @memberOf _
     * @category Function
     * @param {Function} func The function to wrap.
     * @param {...(Function|Function[])} [transforms] The functions to transform
     * arguments, specified individually or in arrays.
     * @returns {Function} Returns the new function.
     * @example
     *
     * function doubled(n) {
     *   return n * 2;
     * }
     *
     * function square(n) {
     *   return n * n;
     * }
     *
     * var func = _.overArgs(function(x, y) {
     *   return [x, y];
     * }, square, doubled);
     *
     * func(9, 3);
     * // => [81, 6]
     *
     * func(10, 5);
     * // => [100, 10]
     */
    var overArgs = rest(function(func, transforms) {
      transforms = arrayMap(baseFlatten(transforms), getIteratee());

      var funcsLength = transforms.length;
      return rest(function(args) {
        var index = -1,
            length = nativeMin(args.length, funcsLength);

        while (++index < length) {
          args[index] = transforms[index].call(this, args[index]);
        }
        return apply(func, this, args);
      });
    });

    /**
     * Creates a function that invokes `func` with `partial` arguments prepended
     * to those provided to the new function. This method is like `_.bind` except
     * it does **not** alter the `this` binding.
     *
     * The `_.partial.placeholder` value, which defaults to `_` in monolithic
     * builds, may be used as a placeholder for partially applied arguments.
     *
     * **Note:** This method doesn't set the "length" property of partially
     * applied functions.
     *
     * @static
     * @memberOf _
     * @category Function
     * @param {Function} func The function to partially apply arguments to.
     * @param {...*} [partials] The arguments to be partially applied.
     * @returns {Function} Returns the new partially applied function.
     * @example
     *
     * var greet = function(greeting, name) {
     *   return greeting + ' ' + name;
     * };
     *
     * var sayHelloTo = _.partial(greet, 'hello');
     * sayHelloTo('fred');
     * // => 'hello fred'
     *
     * // Partially applied with placeholders.
     * var greetFred = _.partial(greet, _, 'fred');
     * greetFred('hi');
     * // => 'hi fred'
     */
    var partial = rest(function(func, partials) {
      var placeholder = lodash.placeholder || partial.placeholder,
          holders = replaceHolders(partials, placeholder);

      return createWrapper(func, PARTIAL_FLAG, undefined, partials, holders);
    });

    /**
     * This method is like `_.partial` except that partially applied arguments
     * are appended to those provided to the new function.
     *
     * The `_.partialRight.placeholder` value, which defaults to `_` in monolithic
     * builds, may be used as a placeholder for partially applied arguments.
     *
     * **Note:** This method doesn't set the "length" property of partially
     * applied functions.
     *
     * @static
     * @memberOf _
     * @category Function
     * @param {Function} func The function to partially apply arguments to.
     * @param {...*} [partials] The arguments to be partially applied.
     * @returns {Function} Returns the new partially applied function.
     * @example
     *
     * var greet = function(greeting, name) {
     *   return greeting + ' ' + name;
     * };
     *
     * var greetFred = _.partialRight(greet, 'fred');
     * greetFred('hi');
     * // => 'hi fred'
     *
     * // Partially applied with placeholders.
     * var sayHelloTo = _.partialRight(greet, 'hello', _);
     * sayHelloTo('fred');
     * // => 'hello fred'
     */
    var partialRight = rest(function(func, partials) {
      var placeholder = lodash.placeholder || partialRight.placeholder,
          holders = replaceHolders(partials, placeholder);

      return createWrapper(func, PARTIAL_RIGHT_FLAG, undefined, partials, holders);
    });

    /**
     * Creates a function that invokes `func` with arguments arranged according
     * to the specified indexes where the argument value at the first index is
     * provided as the first argument, the argument value at the second index is
     * provided as the second argument, and so on.
     *
     * @static
     * @memberOf _
     * @category Function
     * @param {Function} func The function to rearrange arguments for.
     * @param {...(number|number[])} indexes The arranged argument indexes,
     *  specified individually or in arrays.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var rearged = _.rearg(function(a, b, c) {
     *   return [a, b, c];
     * }, 2, 0, 1);
     *
     * rearged('b', 'c', 'a')
     * // => ['a', 'b', 'c']
     */
    var rearg = rest(function(func, indexes) {
      return createWrapper(func, REARG_FLAG, undefined, undefined, undefined, baseFlatten(indexes));
    });

    /**
     * Creates a function that invokes `func` with the `this` binding of the
     * created function and arguments from `start` and beyond provided as an array.
     *
     * **Note:** This method is based on the [rest parameter](https://mdn.io/rest_parameters).
     *
     * @static
     * @memberOf _
     * @category Function
     * @param {Function} func The function to apply a rest parameter to.
     * @param {number} [start=func.length-1] The start position of the rest parameter.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var say = _.rest(function(what, names) {
     *   return what + ' ' + _.initial(names).join(', ') +
     *     (_.size(names) > 1 ? ', & ' : '') + _.last(names);
     * });
     *
     * say('hello', 'fred', 'barney', 'pebbles');
     * // => 'hello fred, barney, & pebbles'
     */
    function rest(func, start) {
      if (typeof func != 'function') {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      start = nativeMax(start === undefined ? (func.length - 1) : toInteger(start), 0);
      return function() {
        var args = arguments,
            index = -1,
            length = nativeMax(args.length - start, 0),
            array = Array(length);

        while (++index < length) {
          array[index] = args[start + index];
        }
        switch (start) {
          case 0: return func.call(this, array);
          case 1: return func.call(this, args[0], array);
          case 2: return func.call(this, args[0], args[1], array);
        }
        var otherArgs = Array(start + 1);
        index = -1;
        while (++index < start) {
          otherArgs[index] = args[index];
        }
        otherArgs[start] = array;
        return apply(func, this, otherArgs);
      };
    }

    /**
     * Creates a function that invokes `func` with the `this` binding of the created
     * function and an array of arguments much like [`Function#apply`](https://es5.github.io/#x15.3.4.3).
     *
     * **Note:** This method is based on the [spread operator](https://mdn.io/spread_operator).
     *
     * @static
     * @memberOf _
     * @category Function
     * @param {Function} func The function to spread arguments over.
     * @param {number} [start=0] The start position of the spread.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var say = _.spread(function(who, what) {
     *   return who + ' says ' + what;
     * });
     *
     * say(['fred', 'hello']);
     * // => 'fred says hello'
     *
     * var numbers = Promise.all([
     *   Promise.resolve(40),
     *   Promise.resolve(36)
     * ]);
     *
     * numbers.then(_.spread(function(x, y) {
     *   return x + y;
     * }));
     * // => a Promise of 76
     */
    function spread(func, start) {
      if (typeof func != 'function') {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      start = start === undefined ? 0 : nativeMax(toInteger(start), 0);
      return rest(function(args) {
        var array = args[start],
            otherArgs = args.slice(0, start);

        if (array) {
          arrayPush(otherArgs, array);
        }
        return apply(func, this, otherArgs);
      });
    }

    /**
     * Creates a throttled function that only invokes `func` at most once per
     * every `wait` milliseconds. The throttled function comes with a `cancel`
     * method to cancel delayed `func` invocations and a `flush` method to
     * immediately invoke them. Provide an options object to indicate whether
     * `func` should be invoked on the leading and/or trailing edge of the `wait`
     * timeout. The `func` is invoked with the last arguments provided to the
     * throttled function. Subsequent calls to the throttled function return the
     * result of the last `func` invocation.
     *
     * **Note:** If `leading` and `trailing` options are `true`, `func` is invoked
     * on the trailing edge of the timeout only if the throttled function is
     * invoked more than once during the `wait` timeout.
     *
     * See [David Corbacho's article](http://drupalmotion.com/article/debounce-and-throttle-visual-explanation)
     * for details over the differences between `_.throttle` and `_.debounce`.
     *
     * @static
     * @memberOf _
     * @category Function
     * @param {Function} func The function to throttle.
     * @param {number} [wait=0] The number of milliseconds to throttle invocations to.
     * @param {Object} [options] The options object.
     * @param {boolean} [options.leading=true] Specify invoking on the leading
     *  edge of the timeout.
     * @param {boolean} [options.trailing=true] Specify invoking on the trailing
     *  edge of the timeout.
     * @returns {Function} Returns the new throttled function.
     * @example
     *
     * // Avoid excessively updating the position while scrolling.
     * jQuery(window).on('scroll', _.throttle(updatePosition, 100));
     *
     * // Invoke `renewToken` when the click event is fired, but not more than once every 5 minutes.
     * var throttled = _.throttle(renewToken, 300000, { 'trailing': false });
     * jQuery(element).on('click', throttled);
     *
     * // Cancel the trailing throttled invocation.
     * jQuery(window).on('popstate', throttled.cancel);
     */
    function throttle(func, wait, options) {
      var leading = true,
          trailing = true;

      if (typeof func != 'function') {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      if (isObject(options)) {
        leading = 'leading' in options ? !!options.leading : leading;
        trailing = 'trailing' in options ? !!options.trailing : trailing;
      }
      return debounce(func, wait, { 'leading': leading, 'maxWait': wait, 'trailing': trailing });
    }

    /**
     * Creates a function that accepts up to one argument, ignoring any
     * additional arguments.
     *
     * @static
     * @memberOf _
     * @category Function
     * @param {Function} func The function to cap arguments for.
     * @returns {Function} Returns the new function.
     * @example
     *
     * _.map(['6', '8', '10'], _.unary(parseInt));
     * // => [6, 8, 10]
     */
    function unary(func) {
      return ary(func, 1);
    }

    /**
     * Creates a function that provides `value` to the wrapper function as its
     * first argument. Any additional arguments provided to the function are
     * appended to those provided to the wrapper function. The wrapper is invoked
     * with the `this` binding of the created function.
     *
     * @static
     * @memberOf _
     * @category Function
     * @param {*} value The value to wrap.
     * @param {Function} wrapper The wrapper function.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var p = _.wrap(_.escape, function(func, text) {
     *   return '<p>' + func(text) + '</p>';
     * });
     *
     * p('fred, barney, & pebbles');
     * // => '<p>fred, barney, &amp; pebbles</p>'
     */
    function wrap(value, wrapper) {
      wrapper = wrapper == null ? identity : wrapper;
      return partial(wrapper, value);
    }

    /*------------------------------------------------------------------------*/

    /**
     * Creates a shallow clone of `value`.
     *
     * **Note:** This method is loosely based on the
     * [structured clone algorithm](https://mdn.io/Structured_clone_algorithm)
     * and supports cloning arrays, array buffers, booleans, date objects, maps,
     * numbers, `Object` objects, regexes, sets, strings, symbols, and typed
     * arrays. The own enumerable properties of `arguments` objects are cloned
     * as plain objects. An empty object is returned for uncloneable values such
     * as error objects, functions, DOM nodes, and WeakMaps.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to clone.
     * @returns {*} Returns the cloned value.
     * @example
     *
     * var objects = [{ 'a': 1 }, { 'b': 2 }];
     *
     * var shallow = _.clone(objects);
     * console.log(shallow[0] === objects[0]);
     * // => true
     */
    function clone(value) {
      return baseClone(value);
    }

    /**
     * This method is like `_.clone` except that it accepts `customizer` which
     * is invoked to produce the cloned value. If `customizer` returns `undefined`
     * cloning is handled by the method instead. The `customizer` is invoked with
     * up to four arguments; (value [, index|key, object, stack]).
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to clone.
     * @param {Function} [customizer] The function to customize cloning.
     * @returns {*} Returns the cloned value.
     * @example
     *
     * function customizer(value) {
     *   if (_.isElement(value)) {
     *     return value.cloneNode(false);
     *   }
     * }
     *
     * var el = _.cloneWith(document.body, customizer);
     *
     * console.log(el === document.body);
     * // => false
     * console.log(el.nodeName);
     * // => 'BODY'
     * console.log(el.childNodes.length);
     * // => 0
     */
    function cloneWith(value, customizer) {
      return baseClone(value, false, customizer);
    }

    /**
     * This method is like `_.clone` except that it recursively clones `value`.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to recursively clone.
     * @returns {*} Returns the deep cloned value.
     * @example
     *
     * var objects = [{ 'a': 1 }, { 'b': 2 }];
     *
     * var deep = _.cloneDeep(objects);
     * console.log(deep[0] === objects[0]);
     * // => false
     */
    function cloneDeep(value) {
      return baseClone(value, true);
    }

    /**
     * This method is like `_.cloneWith` except that it recursively clones `value`.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to recursively clone.
     * @param {Function} [customizer] The function to customize cloning.
     * @returns {*} Returns the deep cloned value.
     * @example
     *
     * function customizer(value) {
     *   if (_.isElement(value)) {
     *     return value.cloneNode(true);
     *   }
     * }
     *
     * var el = _.cloneDeepWith(document.body, customizer);
     *
     * console.log(el === document.body);
     * // => false
     * console.log(el.nodeName);
     * // => 'BODY'
     * console.log(el.childNodes.length);
     * // => 20
     */
    function cloneDeepWith(value, customizer) {
      return baseClone(value, true, customizer);
    }

    /**
     * Performs a [`SameValueZero`](http://ecma-international.org/ecma-262/6.0/#sec-samevaluezero)
     * comparison between two values to determine if they are equivalent.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     * @example
     *
     * var object = { 'user': 'fred' };
     * var other = { 'user': 'fred' };
     *
     * _.eq(object, object);
     * // => true
     *
     * _.eq(object, other);
     * // => false
     *
     * _.eq('a', 'a');
     * // => true
     *
     * _.eq('a', Object('a'));
     * // => false
     *
     * _.eq(NaN, NaN);
     * // => true
     */
    function eq(value, other) {
      return value === other || (value !== value && other !== other);
    }

    /**
     * Checks if `value` is greater than `other`.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @returns {boolean} Returns `true` if `value` is greater than `other`, else `false`.
     * @example
     *
     * _.gt(3, 1);
     * // => true
     *
     * _.gt(3, 3);
     * // => false
     *
     * _.gt(1, 3);
     * // => false
     */
    function gt(value, other) {
      return value > other;
    }

    /**
     * Checks if `value` is greater than or equal to `other`.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @returns {boolean} Returns `true` if `value` is greater than or equal to `other`, else `false`.
     * @example
     *
     * _.gte(3, 1);
     * // => true
     *
     * _.gte(3, 3);
     * // => true
     *
     * _.gte(1, 3);
     * // => false
     */
    function gte(value, other) {
      return value >= other;
    }

    /**
     * Checks if `value` is likely an `arguments` object.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
     * @example
     *
     * _.isArguments(function() { return arguments; }());
     * // => true
     *
     * _.isArguments([1, 2, 3]);
     * // => false
     */
    function isArguments(value) {
      // Safari 8.1 incorrectly makes `arguments.callee` enumerable in strict mode.
      return isArrayLikeObject(value) && hasOwnProperty.call(value, 'callee') &&
        (!propertyIsEnumerable.call(value, 'callee') || objectToString.call(value) == argsTag);
    }

    /**
     * Checks if `value` is classified as an `Array` object.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
     * @example
     *
     * _.isArray([1, 2, 3]);
     * // => true
     *
     * _.isArray(document.body.children);
     * // => false
     *
     * _.isArray('abc');
     * // => false
     *
     * _.isArray(_.noop);
     * // => false
     */
    var isArray = Array.isArray;

    /**
     * Checks if `value` is classified as an `ArrayBuffer` object.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
     * @example
     *
     * _.isArrayBuffer(new ArrayBuffer(2));
     * // => true
     *
     * _.isArrayBuffer(new Array(2));
     * // => false
     */
    function isArrayBuffer(value) {
      return isObjectLike(value) && objectToString.call(value) == arrayBufferTag;
    }

    /**
     * Checks if `value` is array-like. A value is considered array-like if it's
     * not a function and has a `value.length` that's an integer greater than or
     * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
     * @example
     *
     * _.isArrayLike([1, 2, 3]);
     * // => true
     *
     * _.isArrayLike(document.body.children);
     * // => true
     *
     * _.isArrayLike('abc');
     * // => true
     *
     * _.isArrayLike(_.noop);
     * // => false
     */
    function isArrayLike(value) {
      return value != null &&
        !(typeof value == 'function' && isFunction(value)) && isLength(getLength(value));
    }

    /**
     * This method is like `_.isArrayLike` except that it also checks if `value`
     * is an object.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an array-like object, else `false`.
     * @example
     *
     * _.isArrayLikeObject([1, 2, 3]);
     * // => true
     *
     * _.isArrayLikeObject(document.body.children);
     * // => true
     *
     * _.isArrayLikeObject('abc');
     * // => false
     *
     * _.isArrayLikeObject(_.noop);
     * // => false
     */
    function isArrayLikeObject(value) {
      return isObjectLike(value) && isArrayLike(value);
    }

    /**
     * Checks if `value` is classified as a boolean primitive or object.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
     * @example
     *
     * _.isBoolean(false);
     * // => true
     *
     * _.isBoolean(null);
     * // => false
     */
    function isBoolean(value) {
      return value === true || value === false ||
        (isObjectLike(value) && objectToString.call(value) == boolTag);
    }

    /**
     * Checks if `value` is a buffer.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
     * @example
     *
     * _.isBuffer(new Buffer(2));
     * // => true
     *
     * _.isBuffer(new Uint8Array(2));
     * // => false
     */
    var isBuffer = !Buffer ? constant(false) : function(value) {
      return value instanceof Buffer;
    };

    /**
     * Checks if `value` is classified as a `Date` object.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
     * @example
     *
     * _.isDate(new Date);
     * // => true
     *
     * _.isDate('Mon April 23 2012');
     * // => false
     */
    function isDate(value) {
      return isObjectLike(value) && objectToString.call(value) == dateTag;
    }

    /**
     * Checks if `value` is likely a DOM element.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a DOM element, else `false`.
     * @example
     *
     * _.isElement(document.body);
     * // => true
     *
     * _.isElement('<body>');
     * // => false
     */
    function isElement(value) {
      return !!value && value.nodeType === 1 && isObjectLike(value) && !isPlainObject(value);
    }

    /**
     * Checks if `value` is empty. A value is considered empty unless it's an
     * `arguments` object, array, string, or jQuery-like collection with a length
     * greater than `0` or an object with own enumerable properties.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {Array|Object|string} value The value to inspect.
     * @returns {boolean} Returns `true` if `value` is empty, else `false`.
     * @example
     *
     * _.isEmpty(null);
     * // => true
     *
     * _.isEmpty(true);
     * // => true
     *
     * _.isEmpty(1);
     * // => true
     *
     * _.isEmpty([1, 2, 3]);
     * // => false
     *
     * _.isEmpty({ 'a': 1 });
     * // => false
     */
    function isEmpty(value) {
      if (isArrayLike(value) &&
          (isArray(value) || isString(value) || isFunction(value.splice) || isArguments(value))) {
        return !value.length;
      }
      for (var key in value) {
        if (hasOwnProperty.call(value, key)) {
          return false;
        }
      }
      return true;
    }

    /**
     * Performs a deep comparison between two values to determine if they are
     * equivalent.
     *
     * **Note:** This method supports comparing arrays, array buffers, booleans,
     * date objects, error objects, maps, numbers, `Object` objects, regexes,
     * sets, strings, symbols, and typed arrays. `Object` objects are compared
     * by their own, not inherited, enumerable properties. Functions and DOM
     * nodes are **not** supported.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     * @example
     *
     * var object = { 'user': 'fred' };
     * var other = { 'user': 'fred' };
     *
     * _.isEqual(object, other);
     * // => true
     *
     * object === other;
     * // => false
     */
    function isEqual(value, other) {
      return baseIsEqual(value, other);
    }

    /**
     * This method is like `_.isEqual` except that it accepts `customizer` which is
     * invoked to compare values. If `customizer` returns `undefined` comparisons are
     * handled by the method instead. The `customizer` is invoked with up to six arguments:
     * (objValue, othValue [, index|key, object, other, stack]).
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @param {Function} [customizer] The function to customize comparisons.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     * @example
     *
     * function isGreeting(value) {
     *   return /^h(?:i|ello)$/.test(value);
     * }
     *
     * function customizer(objValue, othValue) {
     *   if (isGreeting(objValue) && isGreeting(othValue)) {
     *     return true;
     *   }
     * }
     *
     * var array = ['hello', 'goodbye'];
     * var other = ['hi', 'goodbye'];
     *
     * _.isEqualWith(array, other, customizer);
     * // => true
     */
    function isEqualWith(value, other, customizer) {
      customizer = typeof customizer == 'function' ? customizer : undefined;
      var result = customizer ? customizer(value, other) : undefined;
      return result === undefined ? baseIsEqual(value, other, customizer) : !!result;
    }

    /**
     * Checks if `value` is an `Error`, `EvalError`, `RangeError`, `ReferenceError`,
     * `SyntaxError`, `TypeError`, or `URIError` object.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an error object, else `false`.
     * @example
     *
     * _.isError(new Error);
     * // => true
     *
     * _.isError(Error);
     * // => false
     */
    function isError(value) {
      return isObjectLike(value) &&
        typeof value.message == 'string' && objectToString.call(value) == errorTag;
    }

    /**
     * Checks if `value` is a finite primitive number.
     *
     * **Note:** This method is based on [`Number.isFinite`](https://mdn.io/Number/isFinite).
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a finite number, else `false`.
     * @example
     *
     * _.isFinite(3);
     * // => true
     *
     * _.isFinite(Number.MAX_VALUE);
     * // => true
     *
     * _.isFinite(3.14);
     * // => true
     *
     * _.isFinite(Infinity);
     * // => false
     */
    function isFinite(value) {
      return typeof value == 'number' && nativeIsFinite(value);
    }

    /**
     * Checks if `value` is classified as a `Function` object.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
     * @example
     *
     * _.isFunction(_);
     * // => true
     *
     * _.isFunction(/abc/);
     * // => false
     */
    function isFunction(value) {
      // The use of `Object#toString` avoids issues with the `typeof` operator
      // in Safari 8 which returns 'object' for typed array constructors, and
      // PhantomJS 1.9 which returns 'function' for `NodeList` instances.
      var tag = isObject(value) ? objectToString.call(value) : '';
      return tag == funcTag || tag == genTag;
    }

    /**
     * Checks if `value` is an integer.
     *
     * **Note:** This method is based on [`Number.isInteger`](https://mdn.io/Number/isInteger).
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an integer, else `false`.
     * @example
     *
     * _.isInteger(3);
     * // => true
     *
     * _.isInteger(Number.MIN_VALUE);
     * // => false
     *
     * _.isInteger(Infinity);
     * // => false
     *
     * _.isInteger('3');
     * // => false
     */
    function isInteger(value) {
      return typeof value == 'number' && value == toInteger(value);
    }

    /**
     * Checks if `value` is a valid array-like length.
     *
     * **Note:** This function is loosely based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
     * @example
     *
     * _.isLength(3);
     * // => true
     *
     * _.isLength(Number.MIN_VALUE);
     * // => false
     *
     * _.isLength(Infinity);
     * // => false
     *
     * _.isLength('3');
     * // => false
     */
    function isLength(value) {
      return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
    }

    /**
     * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
     * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an object, else `false`.
     * @example
     *
     * _.isObject({});
     * // => true
     *
     * _.isObject([1, 2, 3]);
     * // => true
     *
     * _.isObject(_.noop);
     * // => true
     *
     * _.isObject(null);
     * // => false
     */
    function isObject(value) {
      var type = typeof value;
      return !!value && (type == 'object' || type == 'function');
    }

    /**
     * Checks if `value` is object-like. A value is object-like if it's not `null`
     * and has a `typeof` result of "object".
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
     * @example
     *
     * _.isObjectLike({});
     * // => true
     *
     * _.isObjectLike([1, 2, 3]);
     * // => true
     *
     * _.isObjectLike(_.noop);
     * // => false
     *
     * _.isObjectLike(null);
     * // => false
     */
    function isObjectLike(value) {
      return !!value && typeof value == 'object';
    }

    /**
     * Checks if `value` is classified as a `Map` object.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
     * @example
     *
     * _.isMap(new Map);
     * // => true
     *
     * _.isMap(new WeakMap);
     * // => false
     */
    function isMap(value) {
      return isObjectLike(value) && getTag(value) == mapTag;
    }

    /**
     * Performs a deep comparison between `object` and `source` to determine if
     * `object` contains equivalent property values.
     *
     * **Note:** This method supports comparing the same values as `_.isEqual`.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {Object} object The object to inspect.
     * @param {Object} source The object of property values to match.
     * @returns {boolean} Returns `true` if `object` is a match, else `false`.
     * @example
     *
     * var object = { 'user': 'fred', 'age': 40 };
     *
     * _.isMatch(object, { 'age': 40 });
     * // => true
     *
     * _.isMatch(object, { 'age': 36 });
     * // => false
     */
    function isMatch(object, source) {
      return object === source || baseIsMatch(object, source, getMatchData(source));
    }

    /**
     * This method is like `_.isMatch` except that it accepts `customizer` which
     * is invoked to compare values. If `customizer` returns `undefined` comparisons
     * are handled by the method instead. The `customizer` is invoked with five
     * arguments: (objValue, srcValue, index|key, object, source).
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {Object} object The object to inspect.
     * @param {Object} source The object of property values to match.
     * @param {Function} [customizer] The function to customize comparisons.
     * @returns {boolean} Returns `true` if `object` is a match, else `false`.
     * @example
     *
     * function isGreeting(value) {
     *   return /^h(?:i|ello)$/.test(value);
     * }
     *
     * function customizer(objValue, srcValue) {
     *   if (isGreeting(objValue) && isGreeting(srcValue)) {
     *     return true;
     *   }
     * }
     *
     * var object = { 'greeting': 'hello' };
     * var source = { 'greeting': 'hi' };
     *
     * _.isMatchWith(object, source, customizer);
     * // => true
     */
    function isMatchWith(object, source, customizer) {
      customizer = typeof customizer == 'function' ? customizer : undefined;
      return baseIsMatch(object, source, getMatchData(source), customizer);
    }

    /**
     * Checks if `value` is `NaN`.
     *
     * **Note:** This method is not the same as [`isNaN`](https://es5.github.io/#x15.1.2.4)
     * which returns `true` for `undefined` and other non-numeric values.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is `NaN`, else `false`.
     * @example
     *
     * _.isNaN(NaN);
     * // => true
     *
     * _.isNaN(new Number(NaN));
     * // => true
     *
     * isNaN(undefined);
     * // => true
     *
     * _.isNaN(undefined);
     * // => false
     */
    function isNaN(value) {
      // An `NaN` primitive is the only value that is not equal to itself.
      // Perform the `toStringTag` check first to avoid errors with some ActiveX objects in IE.
      return isNumber(value) && value != +value;
    }

    /**
     * Checks if `value` is a native function.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
     * @example
     *
     * _.isNative(Array.prototype.push);
     * // => true
     *
     * _.isNative(_);
     * // => false
     */
    function isNative(value) {
      if (value == null) {
        return false;
      }
      if (isFunction(value)) {
        return reIsNative.test(funcToString.call(value));
      }
      return isObjectLike(value) &&
        (isHostObject(value) ? reIsNative : reIsHostCtor).test(value);
    }

    /**
     * Checks if `value` is `null`.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is `null`, else `false`.
     * @example
     *
     * _.isNull(null);
     * // => true
     *
     * _.isNull(void 0);
     * // => false
     */
    function isNull(value) {
      return value === null;
    }

    /**
     * Checks if `value` is `null` or `undefined`.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is nullish, else `false`.
     * @example
     *
     * _.isNil(null);
     * // => true
     *
     * _.isNil(void 0);
     * // => true
     *
     * _.isNil(NaN);
     * // => false
     */
    function isNil(value) {
      return value == null;
    }

    /**
     * Checks if `value` is classified as a `Number` primitive or object.
     *
     * **Note:** To exclude `Infinity`, `-Infinity`, and `NaN`, which are classified
     * as numbers, use the `_.isFinite` method.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
     * @example
     *
     * _.isNumber(3);
     * // => true
     *
     * _.isNumber(Number.MIN_VALUE);
     * // => true
     *
     * _.isNumber(Infinity);
     * // => true
     *
     * _.isNumber('3');
     * // => false
     */
    function isNumber(value) {
      return typeof value == 'number' ||
        (isObjectLike(value) && objectToString.call(value) == numberTag);
    }

    /**
     * Checks if `value` is a plain object, that is, an object created by the
     * `Object` constructor or one with a `[[Prototype]]` of `null`.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     * }
     *
     * _.isPlainObject(new Foo);
     * // => false
     *
     * _.isPlainObject([1, 2, 3]);
     * // => false
     *
     * _.isPlainObject({ 'x': 0, 'y': 0 });
     * // => true
     *
     * _.isPlainObject(Object.create(null));
     * // => true
     */
    function isPlainObject(value) {
      if (!isObjectLike(value) || objectToString.call(value) != objectTag || isHostObject(value)) {
        return false;
      }
      var proto = objectProto;
      if (typeof value.constructor == 'function') {
        proto = getPrototypeOf(value);
      }
      if (proto === null) {
        return true;
      }
      var Ctor = proto.constructor;
      return (typeof Ctor == 'function' &&
        Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString);
    }

    /**
     * Checks if `value` is classified as a `RegExp` object.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
     * @example
     *
     * _.isRegExp(/abc/);
     * // => true
     *
     * _.isRegExp('/abc/');
     * // => false
     */
    function isRegExp(value) {
      return isObject(value) && objectToString.call(value) == regexpTag;
    }

    /**
     * Checks if `value` is a safe integer. An integer is safe if it's an IEEE-754
     * double precision number which isn't the result of a rounded unsafe integer.
     *
     * **Note:** This method is based on [`Number.isSafeInteger`](https://mdn.io/Number/isSafeInteger).
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a safe integer, else `false`.
     * @example
     *
     * _.isSafeInteger(3);
     * // => true
     *
     * _.isSafeInteger(Number.MIN_VALUE);
     * // => false
     *
     * _.isSafeInteger(Infinity);
     * // => false
     *
     * _.isSafeInteger('3');
     * // => false
     */
    function isSafeInteger(value) {
      return isInteger(value) && value >= -MAX_SAFE_INTEGER && value <= MAX_SAFE_INTEGER;
    }

    /**
     * Checks if `value` is classified as a `Set` object.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
     * @example
     *
     * _.isSet(new Set);
     * // => true
     *
     * _.isSet(new WeakSet);
     * // => false
     */
    function isSet(value) {
      return isObjectLike(value) && getTag(value) == setTag;
    }

    /**
     * Checks if `value` is classified as a `String` primitive or object.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
     * @example
     *
     * _.isString('abc');
     * // => true
     *
     * _.isString(1);
     * // => false
     */
    function isString(value) {
      return typeof value == 'string' ||
        (!isArray(value) && isObjectLike(value) && objectToString.call(value) == stringTag);
    }

    /**
     * Checks if `value` is classified as a `Symbol` primitive or object.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
     * @example
     *
     * _.isSymbol(Symbol.iterator);
     * // => true
     *
     * _.isSymbol('abc');
     * // => false
     */
    function isSymbol(value) {
      return typeof value == 'symbol' ||
        (isObjectLike(value) && objectToString.call(value) == symbolTag);
    }

    /**
     * Checks if `value` is classified as a typed array.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
     * @example
     *
     * _.isTypedArray(new Uint8Array);
     * // => true
     *
     * _.isTypedArray([]);
     * // => false
     */
    function isTypedArray(value) {
      return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[objectToString.call(value)];
    }

    /**
     * Checks if `value` is `undefined`.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is `undefined`, else `false`.
     * @example
     *
     * _.isUndefined(void 0);
     * // => true
     *
     * _.isUndefined(null);
     * // => false
     */
    function isUndefined(value) {
      return value === undefined;
    }

    /**
     * Checks if `value` is classified as a `WeakMap` object.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
     * @example
     *
     * _.isWeakMap(new WeakMap);
     * // => true
     *
     * _.isWeakMap(new Map);
     * // => false
     */
    function isWeakMap(value) {
      return isObjectLike(value) && getTag(value) == weakMapTag;
    }

    /**
     * Checks if `value` is classified as a `WeakSet` object.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
     * @example
     *
     * _.isWeakSet(new WeakSet);
     * // => true
     *
     * _.isWeakSet(new Set);
     * // => false
     */
    function isWeakSet(value) {
      return isObjectLike(value) && objectToString.call(value) == weakSetTag;
    }

    /**
     * Checks if `value` is less than `other`.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @returns {boolean} Returns `true` if `value` is less than `other`, else `false`.
     * @example
     *
     * _.lt(1, 3);
     * // => true
     *
     * _.lt(3, 3);
     * // => false
     *
     * _.lt(3, 1);
     * // => false
     */
    function lt(value, other) {
      return value < other;
    }

    /**
     * Checks if `value` is less than or equal to `other`.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @returns {boolean} Returns `true` if `value` is less than or equal to `other`, else `false`.
     * @example
     *
     * _.lte(1, 3);
     * // => true
     *
     * _.lte(3, 3);
     * // => true
     *
     * _.lte(3, 1);
     * // => false
     */
    function lte(value, other) {
      return value <= other;
    }

    /**
     * Converts `value` to an array.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {Array} Returns the converted array.
     * @example
     *
     * _.toArray({ 'a': 1, 'b': 2 });
     * // => [1, 2]
     *
     * _.toArray('abc');
     * // => ['a', 'b', 'c']
     *
     * _.toArray(1);
     * // => []
     *
     * _.toArray(null);
     * // => []
     */
    function toArray(value) {
      if (!value) {
        return [];
      }
      if (isArrayLike(value)) {
        return isString(value) ? stringToArray(value) : copyArray(value);
      }
      if (iteratorSymbol && value[iteratorSymbol]) {
        return iteratorToArray(value[iteratorSymbol]());
      }
      var tag = getTag(value),
          func = tag == mapTag ? mapToArray : (tag == setTag ? setToArray : values);

      return func(value);
    }

    /**
     * Converts `value` to an integer.
     *
     * **Note:** This function is loosely based on [`ToInteger`](http://www.ecma-international.org/ecma-262/6.0/#sec-tointeger).
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {number} Returns the converted integer.
     * @example
     *
     * _.toInteger(3);
     * // => 3
     *
     * _.toInteger(Number.MIN_VALUE);
     * // => 0
     *
     * _.toInteger(Infinity);
     * // => 1.7976931348623157e+308
     *
     * _.toInteger('3');
     * // => 3
     */
    function toInteger(value) {
      if (!value) {
        return value === 0 ? value : 0;
      }
      value = toNumber(value);
      if (value === INFINITY || value === -INFINITY) {
        var sign = (value < 0 ? -1 : 1);
        return sign * MAX_INTEGER;
      }
      var remainder = value % 1;
      return value === value ? (remainder ? value - remainder : value) : 0;
    }

    /**
     * Converts `value` to an integer suitable for use as the length of an
     * array-like object.
     *
     * **Note:** This method is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {number} Returns the converted integer.
     * @example
     *
     * _.toLength(3);
     * // => 3
     *
     * _.toLength(Number.MIN_VALUE);
     * // => 0
     *
     * _.toLength(Infinity);
     * // => 4294967295
     *
     * _.toLength('3');
     * // => 3
     */
    function toLength(value) {
      return value ? baseClamp(toInteger(value), 0, MAX_ARRAY_LENGTH) : 0;
    }

    /**
     * Converts `value` to a number.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to process.
     * @returns {number} Returns the number.
     * @example
     *
     * _.toNumber(3);
     * // => 3
     *
     * _.toNumber(Number.MIN_VALUE);
     * // => 5e-324
     *
     * _.toNumber(Infinity);
     * // => Infinity
     *
     * _.toNumber('3');
     * // => 3
     */
    function toNumber(value) {
      if (isObject(value)) {
        var other = isFunction(value.valueOf) ? value.valueOf() : value;
        value = isObject(other) ? (other + '') : other;
      }
      if (typeof value != 'string') {
        return value === 0 ? value : +value;
      }
      value = value.replace(reTrim, '');
      var isBinary = reIsBinary.test(value);
      return (isBinary || reIsOctal.test(value))
        ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
        : (reIsBadHex.test(value) ? NAN : +value);
    }

    /**
     * Converts `value` to a plain object flattening inherited enumerable
     * properties of `value` to own properties of the plain object.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {Object} Returns the converted plain object.
     * @example
     *
     * function Foo() {
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.assign({ 'a': 1 }, new Foo);
     * // => { 'a': 1, 'b': 2 }
     *
     * _.assign({ 'a': 1 }, _.toPlainObject(new Foo));
     * // => { 'a': 1, 'b': 2, 'c': 3 }
     */
    function toPlainObject(value) {
      return copyObject(value, keysIn(value));
    }

    /**
     * Converts `value` to a safe integer. A safe integer can be compared and
     * represented correctly.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {number} Returns the converted integer.
     * @example
     *
     * _.toSafeInteger(3);
     * // => 3
     *
     * _.toSafeInteger(Number.MIN_VALUE);
     * // => 0
     *
     * _.toSafeInteger(Infinity);
     * // => 9007199254740991
     *
     * _.toSafeInteger('3');
     * // => 3
     */
    function toSafeInteger(value) {
      return baseClamp(toInteger(value), -MAX_SAFE_INTEGER, MAX_SAFE_INTEGER);
    }

    /**
     * Converts `value` to a string if it's not one. An empty string is returned
     * for `null` and `undefined` values. The sign of `-0` is preserved.
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to process.
     * @returns {string} Returns the string.
     * @example
     *
     * _.toString(null);
     * // => ''
     *
     * _.toString(-0);
     * // => '-0'
     *
     * _.toString([1, 2, 3]);
     * // => '1,2,3'
     */
    function toString(value) {
      // Exit early for strings to avoid a performance hit in some environments.
      if (typeof value == 'string') {
        return value;
      }
      if (value == null) {
        return '';
      }
      if (isSymbol(value)) {
        return Symbol ? symbolToString.call(value) : '';
      }
      var result = (value + '');
      return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
    }

    /*------------------------------------------------------------------------*/

    /**
     * Assigns own enumerable properties of source objects to the destination
     * object. Source objects are applied from left to right. Subsequent sources
     * overwrite property assignments of previous sources.
     *
     * **Note:** This method mutates `object` and is loosely based on
     * [`Object.assign`](https://mdn.io/Object/assign).
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The destination object.
     * @param {...Object} [sources] The source objects.
     * @returns {Object} Returns `object`.
     * @example
     *
     * function Foo() {
     *   this.c = 3;
     * }
     *
     * function Bar() {
     *   this.e = 5;
     * }
     *
     * Foo.prototype.d = 4;
     * Bar.prototype.f = 6;
     *
     * _.assign({ 'a': 1 }, new Foo, new Bar);
     * // => { 'a': 1, 'c': 3, 'e': 5 }
     */
    var assign = createAssigner(function(object, source) {
      copyObject(source, keys(source), object);
    });

    /**
     * This method is like `_.assign` except that it iterates over own and
     * inherited source properties.
     *
     * **Note:** This method mutates `object`.
     *
     * @static
     * @memberOf _
     * @alias extend
     * @category Object
     * @param {Object} object The destination object.
     * @param {...Object} [sources] The source objects.
     * @returns {Object} Returns `object`.
     * @example
     *
     * function Foo() {
     *   this.b = 2;
     * }
     *
     * function Bar() {
     *   this.d = 4;
     * }
     *
     * Foo.prototype.c = 3;
     * Bar.prototype.e = 5;
     *
     * _.assignIn({ 'a': 1 }, new Foo, new Bar);
     * // => { 'a': 1, 'b': 2, 'c': 3, 'd': 4, 'e': 5 }
     */
    var assignIn = createAssigner(function(object, source) {
      copyObject(source, keysIn(source), object);
    });

    /**
     * This method is like `_.assignIn` except that it accepts `customizer` which
     * is invoked to produce the assigned values. If `customizer` returns `undefined`
     * assignment is handled by the method instead. The `customizer` is invoked
     * with five arguments: (objValue, srcValue, key, object, source).
     *
     * **Note:** This method mutates `object`.
     *
     * @static
     * @memberOf _
     * @alias extendWith
     * @category Object
     * @param {Object} object The destination object.
     * @param {...Object} sources The source objects.
     * @param {Function} [customizer] The function to customize assigned values.
     * @returns {Object} Returns `object`.
     * @example
     *
     * function customizer(objValue, srcValue) {
     *   return _.isUndefined(objValue) ? srcValue : objValue;
     * }
     *
     * var defaults = _.partialRight(_.assignInWith, customizer);
     *
     * defaults({ 'a': 1 }, { 'b': 2 }, { 'a': 3 });
     * // => { 'a': 1, 'b': 2 }
     */
    var assignInWith = createAssigner(function(object, source, srcIndex, customizer) {
      copyObjectWith(source, keysIn(source), object, customizer);
    });

    /**
     * This method is like `_.assign` except that it accepts `customizer` which
     * is invoked to produce the assigned values. If `customizer` returns `undefined`
     * assignment is handled by the method instead. The `customizer` is invoked
     * with five arguments: (objValue, srcValue, key, object, source).
     *
     * **Note:** This method mutates `object`.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The destination object.
     * @param {...Object} sources The source objects.
     * @param {Function} [customizer] The function to customize assigned values.
     * @returns {Object} Returns `object`.
     * @example
     *
     * function customizer(objValue, srcValue) {
     *   return _.isUndefined(objValue) ? srcValue : objValue;
     * }
     *
     * var defaults = _.partialRight(_.assignWith, customizer);
     *
     * defaults({ 'a': 1 }, { 'b': 2 }, { 'a': 3 });
     * // => { 'a': 1, 'b': 2 }
     */
    var assignWith = createAssigner(function(object, source, srcIndex, customizer) {
      copyObjectWith(source, keys(source), object, customizer);
    });

    /**
     * Creates an array of values corresponding to `paths` of `object`.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to iterate over.
     * @param {...(string|string[])} [paths] The property paths of elements to pick,
     *  specified individually or in arrays.
     * @returns {Array} Returns the new array of picked elements.
     * @example
     *
     * var object = { 'a': [{ 'b': { 'c': 3 } }, 4] };
     *
     * _.at(object, ['a[0].b.c', 'a[1]']);
     * // => [3, 4]
     *
     * _.at(['a', 'b', 'c'], 0, 2);
     * // => ['a', 'c']
     */
    var at = rest(function(object, paths) {
      return baseAt(object, baseFlatten(paths));
    });

    /**
     * Creates an object that inherits from the `prototype` object. If a `properties`
     * object is given its own enumerable properties are assigned to the created object.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} prototype The object to inherit from.
     * @param {Object} [properties] The properties to assign to the object.
     * @returns {Object} Returns the new object.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * function Circle() {
     *   Shape.call(this);
     * }
     *
     * Circle.prototype = _.create(Shape.prototype, {
     *   'constructor': Circle
     * });
     *
     * var circle = new Circle;
     * circle instanceof Circle;
     * // => true
     *
     * circle instanceof Shape;
     * // => true
     */
    function create(prototype, properties) {
      var result = baseCreate(prototype);
      return properties ? baseAssign(result, properties) : result;
    }

    /**
     * Assigns own and inherited enumerable properties of source objects to the
     * destination object for all destination properties that resolve to `undefined`.
     * Source objects are applied from left to right. Once a property is set,
     * additional values of the same property are ignored.
     *
     * **Note:** This method mutates `object`.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The destination object.
     * @param {...Object} [sources] The source objects.
     * @returns {Object} Returns `object`.
     * @example
     *
     * _.defaults({ 'user': 'barney' }, { 'age': 36 }, { 'user': 'fred' });
     * // => { 'user': 'barney', 'age': 36 }
     */
    var defaults = rest(function(args) {
      args.push(undefined, assignInDefaults);
      return apply(assignInWith, undefined, args);
    });

    /**
     * This method is like `_.defaults` except that it recursively assigns
     * default properties.
     *
     * **Note:** This method mutates `object`.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The destination object.
     * @param {...Object} [sources] The source objects.
     * @returns {Object} Returns `object`.
     * @example
     *
     * _.defaultsDeep({ 'user': { 'name': 'barney' } }, { 'user': { 'name': 'fred', 'age': 36 } });
     * // => { 'user': { 'name': 'barney', 'age': 36 } }
     *
     */
    var defaultsDeep = rest(function(args) {
      args.push(undefined, mergeDefaults);
      return apply(mergeWith, undefined, args);
    });

    /**
     * This method is like `_.find` except that it returns the key of the first
     * element `predicate` returns truthy for instead of the element itself.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to search.
     * @param {Function|Object|string} [predicate=_.identity] The function invoked per iteration.
     * @returns {string|undefined} Returns the key of the matched element, else `undefined`.
     * @example
     *
     * var users = {
     *   'barney':  { 'age': 36, 'active': true },
     *   'fred':    { 'age': 40, 'active': false },
     *   'pebbles': { 'age': 1,  'active': true }
     * };
     *
     * _.findKey(users, function(o) { return o.age < 40; });
     * // => 'barney' (iteration order is not guaranteed)
     *
     * // The `_.matches` iteratee shorthand.
     * _.findKey(users, { 'age': 1, 'active': true });
     * // => 'pebbles'
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.findKey(users, ['active', false]);
     * // => 'fred'
     *
     * // The `_.property` iteratee shorthand.
     * _.findKey(users, 'active');
     * // => 'barney'
     */
    function findKey(object, predicate) {
      return baseFind(object, getIteratee(predicate, 3), baseForOwn, true);
    }

    /**
     * This method is like `_.findKey` except that it iterates over elements of
     * a collection in the opposite order.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to search.
     * @param {Function|Object|string} [predicate=_.identity] The function invoked per iteration.
     * @returns {string|undefined} Returns the key of the matched element, else `undefined`.
     * @example
     *
     * var users = {
     *   'barney':  { 'age': 36, 'active': true },
     *   'fred':    { 'age': 40, 'active': false },
     *   'pebbles': { 'age': 1,  'active': true }
     * };
     *
     * _.findLastKey(users, function(o) { return o.age < 40; });
     * // => returns 'pebbles' assuming `_.findKey` returns 'barney'
     *
     * // The `_.matches` iteratee shorthand.
     * _.findLastKey(users, { 'age': 36, 'active': true });
     * // => 'barney'
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.findLastKey(users, ['active', false]);
     * // => 'fred'
     *
     * // The `_.property` iteratee shorthand.
     * _.findLastKey(users, 'active');
     * // => 'pebbles'
     */
    function findLastKey(object, predicate) {
      return baseFind(object, getIteratee(predicate, 3), baseForOwnRight, true);
    }

    /**
     * Iterates over own and inherited enumerable properties of an object invoking
     * `iteratee` for each property. The iteratee is invoked with three arguments:
     * (value, key, object). Iteratee functions may exit iteration early by explicitly
     * returning `false`.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Object} Returns `object`.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.forIn(new Foo, function(value, key) {
     *   console.log(key);
     * });
     * // => logs 'a', 'b', then 'c' (iteration order is not guaranteed)
     */
    function forIn(object, iteratee) {
      return object == null ? object : baseFor(object, toFunction(iteratee), keysIn);
    }

    /**
     * This method is like `_.forIn` except that it iterates over properties of
     * `object` in the opposite order.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Object} Returns `object`.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.forInRight(new Foo, function(value, key) {
     *   console.log(key);
     * });
     * // => logs 'c', 'b', then 'a' assuming `_.forIn` logs 'a', 'b', then 'c'
     */
    function forInRight(object, iteratee) {
      return object == null ? object : baseForRight(object, toFunction(iteratee), keysIn);
    }

    /**
     * Iterates over own enumerable properties of an object invoking `iteratee`
     * for each property. The iteratee is invoked with three arguments:
     * (value, key, object). Iteratee functions may exit iteration early by
     * explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Object} Returns `object`.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.forOwn(new Foo, function(value, key) {
     *   console.log(key);
     * });
     * // => logs 'a' then 'b' (iteration order is not guaranteed)
     */
    function forOwn(object, iteratee) {
      return object && baseForOwn(object, toFunction(iteratee));
    }

    /**
     * This method is like `_.forOwn` except that it iterates over properties of
     * `object` in the opposite order.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Object} Returns `object`.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.forOwnRight(new Foo, function(value, key) {
     *   console.log(key);
     * });
     * // => logs 'b' then 'a' assuming `_.forOwn` logs 'a' then 'b'
     */
    function forOwnRight(object, iteratee) {
      return object && baseForOwnRight(object, toFunction(iteratee));
    }

    /**
     * Creates an array of function property names from own enumerable properties
     * of `object`.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns the new array of property names.
     * @example
     *
     * function Foo() {
     *   this.a = _.constant('a');
     *   this.b = _.constant('b');
     * }
     *
     * Foo.prototype.c = _.constant('c');
     *
     * _.functions(new Foo);
     * // => ['a', 'b']
     */
    function functions(object) {
      return object == null ? [] : baseFunctions(object, keys(object));
    }

    /**
     * Creates an array of function property names from own and inherited
     * enumerable properties of `object`.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns the new array of property names.
     * @example
     *
     * function Foo() {
     *   this.a = _.constant('a');
     *   this.b = _.constant('b');
     * }
     *
     * Foo.prototype.c = _.constant('c');
     *
     * _.functionsIn(new Foo);
     * // => ['a', 'b', 'c']
     */
    function functionsIn(object) {
      return object == null ? [] : baseFunctions(object, keysIn(object));
    }

    /**
     * Gets the value at `path` of `object`. If the resolved value is
     * `undefined` the `defaultValue` is used in its place.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @param {Array|string} path The path of the property to get.
     * @param {*} [defaultValue] The value returned if the resolved value is `undefined`.
     * @returns {*} Returns the resolved value.
     * @example
     *
     * var object = { 'a': [{ 'b': { 'c': 3 } }] };
     *
     * _.get(object, 'a[0].b.c');
     * // => 3
     *
     * _.get(object, ['a', '0', 'b', 'c']);
     * // => 3
     *
     * _.get(object, 'a.b.c', 'default');
     * // => 'default'
     */
    function get(object, path, defaultValue) {
      var result = object == null ? undefined : baseGet(object, path);
      return result === undefined ? defaultValue : result;
    }

    /**
     * Checks if `path` is a direct property of `object`.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @param {Array|string} path The path to check.
     * @returns {boolean} Returns `true` if `path` exists, else `false`.
     * @example
     *
     * var object = { 'a': { 'b': { 'c': 3 } } };
     * var other = _.create({ 'a': _.create({ 'b': _.create({ 'c': 3 }) }) });
     *
     * _.has(object, 'a');
     * // => true
     *
     * _.has(object, 'a.b.c');
     * // => true
     *
     * _.has(object, ['a', 'b', 'c']);
     * // => true
     *
     * _.has(other, 'a');
     * // => false
     */
    function has(object, path) {
      return hasPath(object, path, baseHas);
    }

    /**
     * Checks if `path` is a direct or inherited property of `object`.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @param {Array|string} path The path to check.
     * @returns {boolean} Returns `true` if `path` exists, else `false`.
     * @example
     *
     * var object = _.create({ 'a': _.create({ 'b': _.create({ 'c': 3 }) }) });
     *
     * _.hasIn(object, 'a');
     * // => true
     *
     * _.hasIn(object, 'a.b.c');
     * // => true
     *
     * _.hasIn(object, ['a', 'b', 'c']);
     * // => true
     *
     * _.hasIn(object, 'b');
     * // => false
     */
    function hasIn(object, path) {
      return hasPath(object, path, baseHasIn);
    }

    /**
     * Creates an object composed of the inverted keys and values of `object`.
     * If `object` contains duplicate values, subsequent values overwrite property
     * assignments of previous values.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to invert.
     * @returns {Object} Returns the new inverted object.
     * @example
     *
     * var object = { 'a': 1, 'b': 2, 'c': 1 };
     *
     * _.invert(object);
     * // => { '1': 'c', '2': 'b' }
     */
    var invert = createInverter(function(result, value, key) {
      result[value] = key;
    }, constant(identity));

    /**
     * This method is like `_.invert` except that the inverted object is generated
     * from the results of running each element of `object` through `iteratee`.
     * The corresponding inverted value of each inverted key is an array of keys
     * responsible for generating the inverted value. The iteratee is invoked
     * with one argument: (value).
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to invert.
     * @param {Function|Object|string} [iteratee=_.identity] The iteratee invoked per element.
     * @returns {Object} Returns the new inverted object.
     * @example
     *
     * var object = { 'a': 1, 'b': 2, 'c': 1 };
     *
     * _.invertBy(object);
     * // => { '1': ['a', 'c'], '2': ['b'] }
     *
     * _.invertBy(object, function(value) {
     *   return 'group' + value;
     * });
     * // => { 'group1': ['a', 'c'], 'group2': ['b'] }
     */
    var invertBy = createInverter(function(result, value, key) {
      if (hasOwnProperty.call(result, value)) {
        result[value].push(key);
      } else {
        result[value] = [key];
      }
    }, getIteratee);

    /**
     * Invokes the method at `path` of `object`.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @param {Array|string} path The path of the method to invoke.
     * @param {...*} [args] The arguments to invoke the method with.
     * @returns {*} Returns the result of the invoked method.
     * @example
     *
     * var object = { 'a': [{ 'b': { 'c': [1, 2, 3, 4] } }] };
     *
     * _.invoke(object, 'a[0].b.c.slice', 1, 3);
     * // => [2, 3]
     */
    var invoke = rest(baseInvoke);

    /**
     * Creates an array of the own enumerable property names of `object`.
     *
     * **Note:** Non-object values are coerced to objects. See the
     * [ES spec](http://ecma-international.org/ecma-262/6.0/#sec-object.keys)
     * for more details.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.keys(new Foo);
     * // => ['a', 'b'] (iteration order is not guaranteed)
     *
     * _.keys('hi');
     * // => ['0', '1']
     */
    function keys(object) {
      var isProto = isPrototype(object);
      if (!(isProto || isArrayLike(object))) {
        return baseKeys(object);
      }
      var indexes = indexKeys(object),
          skipIndexes = !!indexes,
          result = indexes || [],
          length = result.length;

      for (var key in object) {
        if (baseHas(object, key) &&
            !(skipIndexes && (key == 'length' || isIndex(key, length))) &&
            !(isProto && key == 'constructor')) {
          result.push(key);
        }
      }
      return result;
    }

    /**
     * Creates an array of the own and inherited enumerable property names of `object`.
     *
     * **Note:** Non-object values are coerced to objects.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.keysIn(new Foo);
     * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
     */
    function keysIn(object) {
      var index = -1,
          isProto = isPrototype(object),
          props = baseKeysIn(object),
          propsLength = props.length,
          indexes = indexKeys(object),
          skipIndexes = !!indexes,
          result = indexes || [],
          length = result.length;

      while (++index < propsLength) {
        var key = props[index];
        if (!(skipIndexes && (key == 'length' || isIndex(key, length))) &&
            !(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
          result.push(key);
        }
      }
      return result;
    }

    /**
     * The opposite of `_.mapValues`; this method creates an object with the
     * same values as `object` and keys generated by running each own enumerable
     * property of `object` through `iteratee`.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to iterate over.
     * @param {Function|Object|string} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Object} Returns the new mapped object.
     * @example
     *
     * _.mapKeys({ 'a': 1, 'b': 2 }, function(value, key) {
     *   return key + value;
     * });
     * // => { 'a1': 1, 'b2': 2 }
     */
    function mapKeys(object, iteratee) {
      var result = {};
      iteratee = getIteratee(iteratee, 3);

      baseForOwn(object, function(value, key, object) {
        result[iteratee(value, key, object)] = value;
      });
      return result;
    }

    /**
     * Creates an object with the same keys as `object` and values generated by
     * running each own enumerable property of `object` through `iteratee`. The
     * iteratee function is invoked with three arguments: (value, key, object).
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to iterate over.
     * @param {Function|Object|string} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Object} Returns the new mapped object.
     * @example
     *
     * var users = {
     *   'fred':    { 'user': 'fred',    'age': 40 },
     *   'pebbles': { 'user': 'pebbles', 'age': 1 }
     * };
     *
     * _.mapValues(users, function(o) { return o.age; });
     * // => { 'fred': 40, 'pebbles': 1 } (iteration order is not guaranteed)
     *
     * // The `_.property` iteratee shorthand.
     * _.mapValues(users, 'age');
     * // => { 'fred': 40, 'pebbles': 1 } (iteration order is not guaranteed)
     */
    function mapValues(object, iteratee) {
      var result = {};
      iteratee = getIteratee(iteratee, 3);

      baseForOwn(object, function(value, key, object) {
        result[key] = iteratee(value, key, object);
      });
      return result;
    }

    /**
     * Recursively merges own and inherited enumerable properties of source
     * objects into the destination object, skipping source properties that resolve
     * to `undefined`. Array and plain object properties are merged recursively.
     * Other objects and value types are overridden by assignment. Source objects
     * are applied from left to right. Subsequent sources overwrite property
     * assignments of previous sources.
     *
     * **Note:** This method mutates `object`.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The destination object.
     * @param {...Object} [sources] The source objects.
     * @returns {Object} Returns `object`.
     * @example
     *
     * var users = {
     *   'data': [{ 'user': 'barney' }, { 'user': 'fred' }]
     * };
     *
     * var ages = {
     *   'data': [{ 'age': 36 }, { 'age': 40 }]
     * };
     *
     * _.merge(users, ages);
     * // => { 'data': [{ 'user': 'barney', 'age': 36 }, { 'user': 'fred', 'age': 40 }] }
     */
    var merge = createAssigner(function(object, source, srcIndex) {
      baseMerge(object, source, srcIndex);
    });

    /**
     * This method is like `_.merge` except that it accepts `customizer` which
     * is invoked to produce the merged values of the destination and source
     * properties. If `customizer` returns `undefined` merging is handled by the
     * method instead. The `customizer` is invoked with seven arguments:
     * (objValue, srcValue, key, object, source, stack).
     *
     * **Note:** This method mutates `object`.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The destination object.
     * @param {...Object} sources The source objects.
     * @param {Function} customizer The function to customize assigned values.
     * @returns {Object} Returns `object`.
     * @example
     *
     * function customizer(objValue, srcValue) {
     *   if (_.isArray(objValue)) {
     *     return objValue.concat(srcValue);
     *   }
     * }
     *
     * var object = {
     *   'fruits': ['apple'],
     *   'vegetables': ['beet']
     * };
     *
     * var other = {
     *   'fruits': ['banana'],
     *   'vegetables': ['carrot']
     * };
     *
     * _.mergeWith(object, other, customizer);
     * // => { 'fruits': ['apple', 'banana'], 'vegetables': ['beet', 'carrot'] }
     */
    var mergeWith = createAssigner(function(object, source, srcIndex, customizer) {
      baseMerge(object, source, srcIndex, customizer);
    });

    /**
     * The opposite of `_.pick`; this method creates an object composed of the
     * own and inherited enumerable properties of `object` that are not omitted.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The source object.
     * @param {...(string|string[])} [props] The property names to omit, specified
     *  individually or in arrays..
     * @returns {Object} Returns the new object.
     * @example
     *
     * var object = { 'a': 1, 'b': '2', 'c': 3 };
     *
     * _.omit(object, ['a', 'c']);
     * // => { 'b': '2' }
     */
    var omit = rest(function(object, props) {
      if (object == null) {
        return {};
      }
      props = arrayMap(baseFlatten(props), String);
      return basePick(object, baseDifference(keysIn(object), props));
    });

    /**
     * The opposite of `_.pickBy`; this method creates an object composed of the
     * own and inherited enumerable properties of `object` that `predicate`
     * doesn't return truthy for.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The source object.
     * @param {Function|Object|string} [predicate=_.identity] The function invoked per property.
     * @returns {Object} Returns the new object.
     * @example
     *
     * var object = { 'a': 1, 'b': '2', 'c': 3 };
     *
     * _.omitBy(object, _.isNumber);
     * // => { 'b': '2' }
     */
    function omitBy(object, predicate) {
      predicate = getIteratee(predicate, 2);
      return basePickBy(object, function(value, key) {
        return !predicate(value, key);
      });
    }

    /**
     * Creates an object composed of the picked `object` properties.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The source object.
     * @param {...(string|string[])} [props] The property names to pick, specified
     *  individually or in arrays.
     * @returns {Object} Returns the new object.
     * @example
     *
     * var object = { 'a': 1, 'b': '2', 'c': 3 };
     *
     * _.pick(object, ['a', 'c']);
     * // => { 'a': 1, 'c': 3 }
     */
    var pick = rest(function(object, props) {
      return object == null ? {} : basePick(object, baseFlatten(props));
    });

    /**
     * Creates an object composed of the `object` properties `predicate` returns
     * truthy for. The predicate is invoked with two arguments: (value, key).
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The source object.
     * @param {Function|Object|string} [predicate=_.identity] The function invoked per property.
     * @returns {Object} Returns the new object.
     * @example
     *
     * var object = { 'a': 1, 'b': '2', 'c': 3 };
     *
     * _.pickBy(object, _.isNumber);
     * // => { 'a': 1, 'c': 3 }
     */
    function pickBy(object, predicate) {
      return object == null ? {} : basePickBy(object, getIteratee(predicate, 2));
    }

    /**
     * This method is like `_.get` except that if the resolved value is a function
     * it's invoked with the `this` binding of its parent object and its result
     * is returned.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @param {Array|string} path The path of the property to resolve.
     * @param {*} [defaultValue] The value returned if the resolved value is `undefined`.
     * @returns {*} Returns the resolved value.
     * @example
     *
     * var object = { 'a': [{ 'b': { 'c1': 3, 'c2': _.constant(4) } }] };
     *
     * _.result(object, 'a[0].b.c1');
     * // => 3
     *
     * _.result(object, 'a[0].b.c2');
     * // => 4
     *
     * _.result(object, 'a[0].b.c3', 'default');
     * // => 'default'
     *
     * _.result(object, 'a[0].b.c3', _.constant('default'));
     * // => 'default'
     */
    function result(object, path, defaultValue) {
      if (!isKey(path, object)) {
        path = baseToPath(path);
        var result = get(object, path);
        object = parent(object, path);
      } else {
        result = object == null ? undefined : object[path];
      }
      if (result === undefined) {
        result = defaultValue;
      }
      return isFunction(result) ? result.call(object) : result;
    }

    /**
     * Sets the value at `path` of `object`. If a portion of `path` doesn't exist
     * it's created. Arrays are created for missing index properties while objects
     * are created for all other missing properties. Use `_.setWith` to customize
     * `path` creation.
     *
     * **Note:** This method mutates `object`.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to modify.
     * @param {Array|string} path The path of the property to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns `object`.
     * @example
     *
     * var object = { 'a': [{ 'b': { 'c': 3 } }] };
     *
     * _.set(object, 'a[0].b.c', 4);
     * console.log(object.a[0].b.c);
     * // => 4
     *
     * _.set(object, 'x[0].y.z', 5);
     * console.log(object.x[0].y.z);
     * // => 5
     */
    function set(object, path, value) {
      return object == null ? object : baseSet(object, path, value);
    }

    /**
     * This method is like `_.set` except that it accepts `customizer` which is
     * invoked to produce the objects of `path`.  If `customizer` returns `undefined`
     * path creation is handled by the method instead. The `customizer` is invoked
     * with three arguments: (nsValue, key, nsObject).
     *
     * **Note:** This method mutates `object`.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to modify.
     * @param {Array|string} path The path of the property to set.
     * @param {*} value The value to set.
     * @param {Function} [customizer] The function to customize assigned values.
     * @returns {Object} Returns `object`.
     * @example
     *
     * _.setWith({ '0': { 'length': 2 } }, '[0][1][2]', 3, Object);
     * // => { '0': { '1': { '2': 3 }, 'length': 2 } }
     */
    function setWith(object, path, value, customizer) {
      customizer = typeof customizer == 'function' ? customizer : undefined;
      return object == null ? object : baseSet(object, path, value, customizer);
    }

    /**
     * Creates an array of own enumerable key-value pairs for `object`.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @returns {Array} Returns the new array of key-value pairs.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.toPairs(new Foo);
     * // => [['a', 1], ['b', 2]] (iteration order is not guaranteed)
     */
    function toPairs(object) {
      return baseToPairs(object, keys(object));
    }

    /**
     * Creates an array of own and inherited enumerable key-value pairs for `object`.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @returns {Array} Returns the new array of key-value pairs.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.toPairsIn(new Foo);
     * // => [['a', 1], ['b', 2], ['c', 1]] (iteration order is not guaranteed)
     */
    function toPairsIn(object) {
      return baseToPairs(object, keysIn(object));
    }

    /**
     * An alternative to `_.reduce`; this method transforms `object` to a new
     * `accumulator` object which is the result of running each of its own enumerable
     * properties through `iteratee`, with each invocation potentially mutating
     * the `accumulator` object. The iteratee is invoked with four arguments:
     * (accumulator, value, key, object). Iteratee functions may exit iteration
     * early by explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Array|Object} object The object to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @param {*} [accumulator] The custom accumulator value.
     * @returns {*} Returns the accumulated value.
     * @example
     *
     * _.transform([2, 3, 4], function(result, n) {
     *   result.push(n *= n);
     *   return n % 2 == 0;
     * }, []);
     * // => [4, 9]
     *
     * _.transform({ 'a': 1, 'b': 2, 'c': 1 }, function(result, value, key) {
     *   (result[value] || (result[value] = [])).push(key);
     * }, {});
     * // => { '1': ['a', 'c'], '2': ['b'] }
     */
    function transform(object, iteratee, accumulator) {
      var isArr = isArray(object) || isTypedArray(object);
      iteratee = getIteratee(iteratee, 4);

      if (accumulator == null) {
        if (isArr || isObject(object)) {
          var Ctor = object.constructor;
          if (isArr) {
            accumulator = isArray(object) ? new Ctor : [];
          } else {
            accumulator = baseCreate(isFunction(Ctor) ? Ctor.prototype : undefined);
          }
        } else {
          accumulator = {};
        }
      }
      (isArr ? arrayEach : baseForOwn)(object, function(value, index, object) {
        return iteratee(accumulator, value, index, object);
      });
      return accumulator;
    }

    /**
     * Removes the property at `path` of `object`.
     *
     * **Note:** This method mutates `object`.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to modify.
     * @param {Array|string} path The path of the property to unset.
     * @returns {boolean} Returns `true` if the property is deleted, else `false`.
     * @example
     *
     * var object = { 'a': [{ 'b': { 'c': 7 } }] };
     * _.unset(object, 'a[0].b.c');
     * // => true
     *
     * console.log(object);
     * // => { 'a': [{ 'b': {} }] };
     *
     * _.unset(object, 'a[0].b.c');
     * // => true
     *
     * console.log(object);
     * // => { 'a': [{ 'b': {} }] };
     */
    function unset(object, path) {
      return object == null ? true : baseUnset(object, path);
    }

    /**
     * Creates an array of the own enumerable property values of `object`.
     *
     * **Note:** Non-object values are coerced to objects.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property values.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.values(new Foo);
     * // => [1, 2] (iteration order is not guaranteed)
     *
     * _.values('hi');
     * // => ['h', 'i']
     */
    function values(object) {
      return object ? baseValues(object, keys(object)) : [];
    }

    /**
     * Creates an array of the own and inherited enumerable property values of `object`.
     *
     * **Note:** Non-object values are coerced to objects.
     *
     * @static
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property values.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.valuesIn(new Foo);
     * // => [1, 2, 3] (iteration order is not guaranteed)
     */
    function valuesIn(object) {
      return object == null ? baseValues(object, keysIn(object)) : [];
    }

    /*------------------------------------------------------------------------*/

    /**
     * Clamps `number` within the inclusive `lower` and `upper` bounds.
     *
     * @static
     * @memberOf _
     * @category Number
     * @param {number} number The number to clamp.
     * @param {number} [lower] The lower bound.
     * @param {number} upper The upper bound.
     * @returns {number} Returns the clamped number.
     * @example
     *
     * _.clamp(-10, -5, 5);
     * // => -5
     *
     * _.clamp(10, -5, 5);
     * // => 5
     */
    function clamp(number, lower, upper) {
      if (upper === undefined) {
        upper = lower;
        lower = undefined;
      }
      if (upper !== undefined) {
        upper = toNumber(upper);
        upper = upper === upper ? upper : 0;
      }
      if (lower !== undefined) {
        lower = toNumber(lower);
        lower = lower === lower ? lower : 0;
      }
      return baseClamp(toNumber(number), lower, upper);
    }

    /**
     * Checks if `n` is between `start` and up to but not including, `end`. If
     * `end` is not specified it's set to `start` with `start` then set to `0`.
     * If `start` is greater than `end` the params are swapped to support
     * negative ranges.
     *
     * @static
     * @memberOf _
     * @category Number
     * @param {number} number The number to check.
     * @param {number} [start=0] The start of the range.
     * @param {number} end The end of the range.
     * @returns {boolean} Returns `true` if `number` is in the range, else `false`.
     * @example
     *
     * _.inRange(3, 2, 4);
     * // => true
     *
     * _.inRange(4, 8);
     * // => true
     *
     * _.inRange(4, 2);
     * // => false
     *
     * _.inRange(2, 2);
     * // => false
     *
     * _.inRange(1.2, 2);
     * // => true
     *
     * _.inRange(5.2, 4);
     * // => false
     *
     * _.inRange(-3, -2, -6);
     * // => true
     */
    function inRange(number, start, end) {
      start = toNumber(start) || 0;
      if (end === undefined) {
        end = start;
        start = 0;
      } else {
        end = toNumber(end) || 0;
      }
      number = toNumber(number);
      return baseInRange(number, start, end);
    }

    /**
     * Produces a random number between the inclusive `lower` and `upper` bounds.
     * If only one argument is provided a number between `0` and the given number
     * is returned. If `floating` is `true`, or either `lower` or `upper` are floats,
     * a floating-point number is returned instead of an integer.
     *
     * **Note:** JavaScript follows the IEEE-754 standard for resolving
     * floating-point values which can produce unexpected results.
     *
     * @static
     * @memberOf _
     * @category Number
     * @param {number} [lower=0] The lower bound.
     * @param {number} [upper=1] The upper bound.
     * @param {boolean} [floating] Specify returning a floating-point number.
     * @returns {number} Returns the random number.
     * @example
     *
     * _.random(0, 5);
     * // => an integer between 0 and 5
     *
     * _.random(5);
     * // => also an integer between 0 and 5
     *
     * _.random(5, true);
     * // => a floating-point number between 0 and 5
     *
     * _.random(1.2, 5.2);
     * // => a floating-point number between 1.2 and 5.2
     */
    function random(lower, upper, floating) {
      if (floating && typeof floating != 'boolean' && isIterateeCall(lower, upper, floating)) {
        upper = floating = undefined;
      }
      if (floating === undefined) {
        if (typeof upper == 'boolean') {
          floating = upper;
          upper = undefined;
        }
        else if (typeof lower == 'boolean') {
          floating = lower;
          lower = undefined;
        }
      }
      if (lower === undefined && upper === undefined) {
        lower = 0;
        upper = 1;
      }
      else {
        lower = toNumber(lower) || 0;
        if (upper === undefined) {
          upper = lower;
          lower = 0;
        } else {
          upper = toNumber(upper) || 0;
        }
      }
      if (lower > upper) {
        var temp = lower;
        lower = upper;
        upper = temp;
      }
      if (floating || lower % 1 || upper % 1) {
        var rand = nativeRandom();
        return nativeMin(lower + (rand * (upper - lower + freeParseFloat('1e-' + ((rand + '').length - 1)))), upper);
      }
      return baseRandom(lower, upper);
    }

    /*------------------------------------------------------------------------*/

    /**
     * Converts `string` to [camel case](https://en.wikipedia.org/wiki/CamelCase).
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to convert.
     * @returns {string} Returns the camel cased string.
     * @example
     *
     * _.camelCase('Foo Bar');
     * // => 'fooBar'
     *
     * _.camelCase('--foo-bar');
     * // => 'fooBar'
     *
     * _.camelCase('__foo_bar__');
     * // => 'fooBar'
     */
    var camelCase = createCompounder(function(result, word, index) {
      word = word.toLowerCase();
      return result + (index ? capitalize(word) : word);
    });

    /**
     * Converts the first character of `string` to upper case and the remaining
     * to lower case.
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to capitalize.
     * @returns {string} Returns the capitalized string.
     * @example
     *
     * _.capitalize('FRED');
     * // => 'Fred'
     */
    function capitalize(string) {
      return upperFirst(toString(string).toLowerCase());
    }

    /**
     * Deburrs `string` by converting [latin-1 supplementary letters](https://en.wikipedia.org/wiki/Latin-1_Supplement_(Unicode_block)#Character_table)
     * to basic latin letters and removing [combining diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks).
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to deburr.
     * @returns {string} Returns the deburred string.
     * @example
     *
     * _.deburr('déjà vu');
     * // => 'deja vu'
     */
    function deburr(string) {
      string = toString(string);
      return string && string.replace(reLatin1, deburrLetter).replace(reComboMark, '');
    }

    /**
     * Checks if `string` ends with the given target string.
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to search.
     * @param {string} [target] The string to search for.
     * @param {number} [position=string.length] The position to search from.
     * @returns {boolean} Returns `true` if `string` ends with `target`, else `false`.
     * @example
     *
     * _.endsWith('abc', 'c');
     * // => true
     *
     * _.endsWith('abc', 'b');
     * // => false
     *
     * _.endsWith('abc', 'b', 2);
     * // => true
     */
    function endsWith(string, target, position) {
      string = toString(string);
      target = typeof target == 'string' ? target : (target + '');

      var length = string.length;
      position = position === undefined
        ? length
        : baseClamp(toInteger(position), 0, length);

      position -= target.length;
      return position >= 0 && string.indexOf(target, position) == position;
    }

    /**
     * Converts the characters "&", "<", ">", '"', "'", and "\`" in `string` to
     * their corresponding HTML entities.
     *
     * **Note:** No other characters are escaped. To escape additional
     * characters use a third-party library like [_he_](https://mths.be/he).
     *
     * Though the ">" character is escaped for symmetry, characters like
     * ">" and "/" don't need escaping in HTML and have no special meaning
     * unless they're part of a tag or unquoted attribute value.
     * See [Mathias Bynens's article](https://mathiasbynens.be/notes/ambiguous-ampersands)
     * (under "semi-related fun fact") for more details.
     *
     * Backticks are escaped because in IE < 9, they can break out of
     * attribute values or HTML comments. See [#59](https://html5sec.org/#59),
     * [#102](https://html5sec.org/#102), [#108](https://html5sec.org/#108), and
     * [#133](https://html5sec.org/#133) of the [HTML5 Security Cheatsheet](https://html5sec.org/)
     * for more details.
     *
     * When working with HTML you should always [quote attribute values](http://wonko.com/post/html-escaping)
     * to reduce XSS vectors.
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to escape.
     * @returns {string} Returns the escaped string.
     * @example
     *
     * _.escape('fred, barney, & pebbles');
     * // => 'fred, barney, &amp; pebbles'
     */
    function escape(string) {
      string = toString(string);
      return (string && reHasUnescapedHtml.test(string))
        ? string.replace(reUnescapedHtml, escapeHtmlChar)
        : string;
    }

    /**
     * Escapes the `RegExp` special characters "^", "$", "\", ".", "*", "+",
     * "?", "(", ")", "[", "]", "{", "}", and "|" in `string`.
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to escape.
     * @returns {string} Returns the escaped string.
     * @example
     *
     * _.escapeRegExp('[lodash](https://lodash.com/)');
     * // => '\[lodash\]\(https://lodash\.com/\)'
     */
    function escapeRegExp(string) {
      string = toString(string);
      return (string && reHasRegExpChar.test(string))
        ? string.replace(reRegExpChar, '\\$&')
        : string;
    }

    /**
     * Converts `string` to [kebab case](https://en.wikipedia.org/wiki/Letter_case#Special_case_styles).
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to convert.
     * @returns {string} Returns the kebab cased string.
     * @example
     *
     * _.kebabCase('Foo Bar');
     * // => 'foo-bar'
     *
     * _.kebabCase('fooBar');
     * // => 'foo-bar'
     *
     * _.kebabCase('__foo_bar__');
     * // => 'foo-bar'
     */
    var kebabCase = createCompounder(function(result, word, index) {
      return result + (index ? '-' : '') + word.toLowerCase();
    });

    /**
     * Converts `string`, as space separated words, to lower case.
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to convert.
     * @returns {string} Returns the lower cased string.
     * @example
     *
     * _.lowerCase('--Foo-Bar');
     * // => 'foo bar'
     *
     * _.lowerCase('fooBar');
     * // => 'foo bar'
     *
     * _.lowerCase('__FOO_BAR__');
     * // => 'foo bar'
     */
    var lowerCase = createCompounder(function(result, word, index) {
      return result + (index ? ' ' : '') + word.toLowerCase();
    });

    /**
     * Converts the first character of `string` to lower case.
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to convert.
     * @returns {string} Returns the converted string.
     * @example
     *
     * _.lowerFirst('Fred');
     * // => 'fred'
     *
     * _.lowerFirst('FRED');
     * // => 'fRED'
     */
    var lowerFirst = createCaseFirst('toLowerCase');

    /**
     * Converts the first character of `string` to upper case.
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to convert.
     * @returns {string} Returns the converted string.
     * @example
     *
     * _.upperFirst('fred');
     * // => 'Fred'
     *
     * _.upperFirst('FRED');
     * // => 'FRED'
     */
    var upperFirst = createCaseFirst('toUpperCase');

    /**
     * Pads `string` on the left and right sides if it's shorter than `length`.
     * Padding characters are truncated if they can't be evenly divided by `length`.
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to pad.
     * @param {number} [length=0] The padding length.
     * @param {string} [chars=' '] The string used as padding.
     * @returns {string} Returns the padded string.
     * @example
     *
     * _.pad('abc', 8);
     * // => '  abc   '
     *
     * _.pad('abc', 8, '_-');
     * // => '_-abc_-_'
     *
     * _.pad('abc', 3);
     * // => 'abc'
     */
    function pad(string, length, chars) {
      string = toString(string);
      length = toInteger(length);

      var strLength = stringSize(string);
      if (!length || strLength >= length) {
        return string;
      }
      var mid = (length - strLength) / 2,
          leftLength = nativeFloor(mid),
          rightLength = nativeCeil(mid);

      return createPadding('', leftLength, chars) + string + createPadding('', rightLength, chars);
    }

    /**
     * Pads `string` on the right side if it's shorter than `length`. Padding
     * characters are truncated if they exceed `length`.
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to pad.
     * @param {number} [length=0] The padding length.
     * @param {string} [chars=' '] The string used as padding.
     * @returns {string} Returns the padded string.
     * @example
     *
     * _.padEnd('abc', 6);
     * // => 'abc   '
     *
     * _.padEnd('abc', 6, '_-');
     * // => 'abc_-_'
     *
     * _.padEnd('abc', 3);
     * // => 'abc'
     */
    function padEnd(string, length, chars) {
      string = toString(string);
      return string + createPadding(string, length, chars);
    }

    /**
     * Pads `string` on the left side if it's shorter than `length`. Padding
     * characters are truncated if they exceed `length`.
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to pad.
     * @param {number} [length=0] The padding length.
     * @param {string} [chars=' '] The string used as padding.
     * @returns {string} Returns the padded string.
     * @example
     *
     * _.padStart('abc', 6);
     * // => '   abc'
     *
     * _.padStart('abc', 6, '_-');
     * // => '_-_abc'
     *
     * _.padStart('abc', 3);
     * // => 'abc'
     */
    function padStart(string, length, chars) {
      string = toString(string);
      return createPadding(string, length, chars) + string;
    }

    /**
     * Converts `string` to an integer of the specified radix. If `radix` is
     * `undefined` or `0`, a `radix` of `10` is used unless `value` is a hexadecimal,
     * in which case a `radix` of `16` is used.
     *
     * **Note:** This method aligns with the [ES5 implementation](https://es5.github.io/#x15.1.2.2)
     * of `parseInt`.
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} string The string to convert.
     * @param {number} [radix] The radix to interpret `value` by.
     * @param- {Object} [guard] Enables use as an iteratee for functions like `_.map`.
     * @returns {number} Returns the converted integer.
     * @example
     *
     * _.parseInt('08');
     * // => 8
     *
     * _.map(['6', '08', '10'], _.parseInt);
     * // => [6, 8, 10]
     */
    function parseInt(string, radix, guard) {
      // Chrome fails to trim leading <BOM> whitespace characters.
      // See https://code.google.com/p/v8/issues/detail?id=3109 for more details.
      if (guard || radix == null) {
        radix = 0;
      } else if (radix) {
        radix = +radix;
      }
      string = toString(string).replace(reTrim, '');
      return nativeParseInt(string, radix || (reHasHexPrefix.test(string) ? 16 : 10));
    }

    /**
     * Repeats the given string `n` times.
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to repeat.
     * @param {number} [n=0] The number of times to repeat the string.
     * @returns {string} Returns the repeated string.
     * @example
     *
     * _.repeat('*', 3);
     * // => '***'
     *
     * _.repeat('abc', 2);
     * // => 'abcabc'
     *
     * _.repeat('abc', 0);
     * // => ''
     */
    function repeat(string, n) {
      string = toString(string);
      n = toInteger(n);

      var result = '';
      if (!string || n < 1 || n > MAX_SAFE_INTEGER) {
        return result;
      }
      // Leverage the exponentiation by squaring algorithm for a faster repeat.
      // See https://en.wikipedia.org/wiki/Exponentiation_by_squaring for more details.
      do {
        if (n % 2) {
          result += string;
        }
        n = nativeFloor(n / 2);
        string += string;
      } while (n);

      return result;
    }

    /**
     * Replaces matches for `pattern` in `string` with `replacement`.
     *
     * **Note:** This method is based on [`String#replace`](https://mdn.io/String/replace).
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to modify.
     * @param {RegExp|string} pattern The pattern to replace.
     * @param {Function|string} replacement The match replacement.
     * @returns {string} Returns the modified string.
     * @example
     *
     * _.replace('Hi Fred', 'Fred', 'Barney');
     * // => 'Hi Barney'
     */
    function replace() {
      var args = arguments,
          string = toString(args[0]);

      return args.length < 3 ? string : string.replace(args[1], args[2]);
    }

    /**
     * Converts `string` to [snake case](https://en.wikipedia.org/wiki/Snake_case).
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to convert.
     * @returns {string} Returns the snake cased string.
     * @example
     *
     * _.snakeCase('Foo Bar');
     * // => 'foo_bar'
     *
     * _.snakeCase('fooBar');
     * // => 'foo_bar'
     *
     * _.snakeCase('--foo-bar');
     * // => 'foo_bar'
     */
    var snakeCase = createCompounder(function(result, word, index) {
      return result + (index ? '_' : '') + word.toLowerCase();
    });

    /**
     * Splits `string` by `separator`.
     *
     * **Note:** This method is based on [`String#split`](https://mdn.io/String/split).
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to split.
     * @param {RegExp|string} separator The separator pattern to split by.
     * @param {number} [limit] The length to truncate results to.
     * @returns {Array} Returns the new array of string segments.
     * @example
     *
     * _.split('a-b-c', '-', 2);
     * // => ['a', 'b']
     */
    function split(string, separator, limit) {
      return toString(string).split(separator, limit);
    }

    /**
     * Converts `string` to [start case](https://en.wikipedia.org/wiki/Letter_case#Stylistic_or_specialised_usage).
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to convert.
     * @returns {string} Returns the start cased string.
     * @example
     *
     * _.startCase('--foo-bar');
     * // => 'Foo Bar'
     *
     * _.startCase('fooBar');
     * // => 'Foo Bar'
     *
     * _.startCase('__foo_bar__');
     * // => 'Foo Bar'
     */
    var startCase = createCompounder(function(result, word, index) {
      return result + (index ? ' ' : '') + capitalize(word);
    });

    /**
     * Checks if `string` starts with the given target string.
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to search.
     * @param {string} [target] The string to search for.
     * @param {number} [position=0] The position to search from.
     * @returns {boolean} Returns `true` if `string` starts with `target`, else `false`.
     * @example
     *
     * _.startsWith('abc', 'a');
     * // => true
     *
     * _.startsWith('abc', 'b');
     * // => false
     *
     * _.startsWith('abc', 'b', 1);
     * // => true
     */
    function startsWith(string, target, position) {
      string = toString(string);
      position = baseClamp(toInteger(position), 0, string.length);
      return string.lastIndexOf(target, position) == position;
    }

    /**
     * Creates a compiled template function that can interpolate data properties
     * in "interpolate" delimiters, HTML-escape interpolated data properties in
     * "escape" delimiters, and execute JavaScript in "evaluate" delimiters. Data
     * properties may be accessed as free variables in the template. If a setting
     * object is given it takes precedence over `_.templateSettings` values.
     *
     * **Note:** In the development build `_.template` utilizes
     * [sourceURLs](http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl)
     * for easier debugging.
     *
     * For more information on precompiling templates see
     * [lodash's custom builds documentation](https://lodash.com/custom-builds).
     *
     * For more information on Chrome extension sandboxes see
     * [Chrome's extensions documentation](https://developer.chrome.com/extensions/sandboxingEval).
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The template string.
     * @param {Object} [options] The options object.
     * @param {RegExp} [options.escape] The HTML "escape" delimiter.
     * @param {RegExp} [options.evaluate] The "evaluate" delimiter.
     * @param {Object} [options.imports] An object to import into the template as free variables.
     * @param {RegExp} [options.interpolate] The "interpolate" delimiter.
     * @param {string} [options.sourceURL] The sourceURL of the template's compiled source.
     * @param {string} [options.variable] The data object variable name.
     * @param- {Object} [guard] Enables use as an iteratee for functions like `_.map`.
     * @returns {Function} Returns the compiled template function.
     * @example
     *
     * // Use the "interpolate" delimiter to create a compiled template.
     * var compiled = _.template('hello <%= user %>!');
     * compiled({ 'user': 'fred' });
     * // => 'hello fred!'
     *
     * // Use the HTML "escape" delimiter to escape data property values.
     * var compiled = _.template('<b><%- value %></b>');
     * compiled({ 'value': '<script>' });
     * // => '<b>&lt;script&gt;</b>'
     *
     * // Use the "evaluate" delimiter to execute JavaScript and generate HTML.
     * var compiled = _.template('<% _.forEach(users, function(user) { %><li><%- user %></li><% }); %>');
     * compiled({ 'users': ['fred', 'barney'] });
     * // => '<li>fred</li><li>barney</li>'
     *
     * // Use the internal `print` function in "evaluate" delimiters.
     * var compiled = _.template('<% print("hello " + user); %>!');
     * compiled({ 'user': 'barney' });
     * // => 'hello barney!'
     *
     * // Use the ES delimiter as an alternative to the default "interpolate" delimiter.
     * var compiled = _.template('hello ${ user }!');
     * compiled({ 'user': 'pebbles' });
     * // => 'hello pebbles!'
     *
     * // Use custom template delimiters.
     * _.templateSettings.interpolate = /{{([\s\S]+?)}}/g;
     * var compiled = _.template('hello {{ user }}!');
     * compiled({ 'user': 'mustache' });
     * // => 'hello mustache!'
     *
     * // Use backslashes to treat delimiters as plain text.
     * var compiled = _.template('<%= "\\<%- value %\\>" %>');
     * compiled({ 'value': 'ignored' });
     * // => '<%- value %>'
     *
     * // Use the `imports` option to import `jQuery` as `jq`.
     * var text = '<% jq.each(users, function(user) { %><li><%- user %></li><% }); %>';
     * var compiled = _.template(text, { 'imports': { 'jq': jQuery } });
     * compiled({ 'users': ['fred', 'barney'] });
     * // => '<li>fred</li><li>barney</li>'
     *
     * // Use the `sourceURL` option to specify a custom sourceURL for the template.
     * var compiled = _.template('hello <%= user %>!', { 'sourceURL': '/basic/greeting.jst' });
     * compiled(data);
     * // => find the source of "greeting.jst" under the Sources tab or Resources panel of the web inspector
     *
     * // Use the `variable` option to ensure a with-statement isn't used in the compiled template.
     * var compiled = _.template('hi <%= data.user %>!', { 'variable': 'data' });
     * compiled.source;
     * // => function(data) {
     * //   var __t, __p = '';
     * //   __p += 'hi ' + ((__t = ( data.user )) == null ? '' : __t) + '!';
     * //   return __p;
     * // }
     *
     * // Use the `source` property to inline compiled templates for meaningful
     * // line numbers in error messages and stack traces.
     * fs.writeFileSync(path.join(cwd, 'jst.js'), '\
     *   var JST = {\
     *     "main": ' + _.template(mainText).source + '\
     *   };\
     * ');
     */
    function template(string, options, guard) {
      // Based on John Resig's `tmpl` implementation (http://ejohn.org/blog/javascript-micro-templating/)
      // and Laura Doktorova's doT.js (https://github.com/olado/doT).
      var settings = lodash.templateSettings;

      if (guard && isIterateeCall(string, options, guard)) {
        options = undefined;
      }
      string = toString(string);
      options = assignInWith({}, options, settings, assignInDefaults);

      var imports = assignInWith({}, options.imports, settings.imports, assignInDefaults),
          importsKeys = keys(imports),
          importsValues = baseValues(imports, importsKeys);

      var isEscaping,
          isEvaluating,
          index = 0,
          interpolate = options.interpolate || reNoMatch,
          source = "__p += '";

      // Compile the regexp to match each delimiter.
      var reDelimiters = RegExp(
        (options.escape || reNoMatch).source + '|' +
        interpolate.source + '|' +
        (interpolate === reInterpolate ? reEsTemplate : reNoMatch).source + '|' +
        (options.evaluate || reNoMatch).source + '|$'
      , 'g');

      // Use a sourceURL for easier debugging.
      var sourceURL = '//# sourceURL=' +
        ('sourceURL' in options
          ? options.sourceURL
          : ('lodash.templateSources[' + (++templateCounter) + ']')
        ) + '\n';

      string.replace(reDelimiters, function(match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
        interpolateValue || (interpolateValue = esTemplateValue);

        // Escape characters that can't be included in string literals.
        source += string.slice(index, offset).replace(reUnescapedString, escapeStringChar);

        // Replace delimiters with snippets.
        if (escapeValue) {
          isEscaping = true;
          source += "' +\n__e(" + escapeValue + ") +\n'";
        }
        if (evaluateValue) {
          isEvaluating = true;
          source += "';\n" + evaluateValue + ";\n__p += '";
        }
        if (interpolateValue) {
          source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
        }
        index = offset + match.length;

        // The JS engine embedded in Adobe products needs `match` returned in
        // order to produce the correct `offset` value.
        return match;
      });

      source += "';\n";

      // If `variable` is not specified wrap a with-statement around the generated
      // code to add the data object to the top of the scope chain.
      var variable = options.variable;
      if (!variable) {
        source = 'with (obj) {\n' + source + '\n}\n';
      }
      // Cleanup code by stripping empty strings.
      source = (isEvaluating ? source.replace(reEmptyStringLeading, '') : source)
        .replace(reEmptyStringMiddle, '$1')
        .replace(reEmptyStringTrailing, '$1;');

      // Frame code as the function body.
      source = 'function(' + (variable || 'obj') + ') {\n' +
        (variable
          ? ''
          : 'obj || (obj = {});\n'
        ) +
        "var __t, __p = ''" +
        (isEscaping
           ? ', __e = _.escape'
           : ''
        ) +
        (isEvaluating
          ? ', __j = Array.prototype.join;\n' +
            "function print() { __p += __j.call(arguments, '') }\n"
          : ';\n'
        ) +
        source +
        'return __p\n}';

      var result = attempt(function() {
        return Function(importsKeys, sourceURL + 'return ' + source).apply(undefined, importsValues);
      });

      // Provide the compiled function's source by its `toString` method or
      // the `source` property as a convenience for inlining compiled templates.
      result.source = source;
      if (isError(result)) {
        throw result;
      }
      return result;
    }

    /**
     * Converts `string`, as a whole, to lower case.
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to convert.
     * @returns {string} Returns the lower cased string.
     * @example
     *
     * _.toLower('--Foo-Bar');
     * // => '--foo-bar'
     *
     * _.toLower('fooBar');
     * // => 'foobar'
     *
     * _.toLower('__FOO_BAR__');
     * // => '__foo_bar__'
     */
    function toLower(value) {
      return toString(value).toLowerCase();
    }

    /**
     * Converts `string`, as a whole, to upper case.
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to convert.
     * @returns {string} Returns the upper cased string.
     * @example
     *
     * _.toUpper('--foo-bar');
     * // => '--FOO-BAR'
     *
     * _.toUpper('fooBar');
     * // => 'FOOBAR'
     *
     * _.toUpper('__foo_bar__');
     * // => '__FOO_BAR__'
     */
    function toUpper(value) {
      return toString(value).toUpperCase();
    }

    /**
     * Removes leading and trailing whitespace or specified characters from `string`.
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to trim.
     * @param {string} [chars=whitespace] The characters to trim.
     * @param- {Object} [guard] Enables use as an iteratee for functions like `_.map`.
     * @returns {string} Returns the trimmed string.
     * @example
     *
     * _.trim('  abc  ');
     * // => 'abc'
     *
     * _.trim('-_-abc-_-', '_-');
     * // => 'abc'
     *
     * _.map(['  foo  ', '  bar  '], _.trim);
     * // => ['foo', 'bar']
     */
    function trim(string, chars, guard) {
      string = toString(string);
      if (!string) {
        return string;
      }
      if (guard || chars === undefined) {
        return string.replace(reTrim, '');
      }
      chars = (chars + '');
      if (!chars) {
        return string;
      }
      var strSymbols = stringToArray(string),
          chrSymbols = stringToArray(chars);

      return strSymbols.slice(charsStartIndex(strSymbols, chrSymbols), charsEndIndex(strSymbols, chrSymbols) + 1).join('');
    }

    /**
     * Removes trailing whitespace or specified characters from `string`.
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to trim.
     * @param {string} [chars=whitespace] The characters to trim.
     * @param- {Object} [guard] Enables use as an iteratee for functions like `_.map`.
     * @returns {string} Returns the trimmed string.
     * @example
     *
     * _.trimEnd('  abc  ');
     * // => '  abc'
     *
     * _.trimEnd('-_-abc-_-', '_-');
     * // => '-_-abc'
     */
    function trimEnd(string, chars, guard) {
      string = toString(string);
      if (!string) {
        return string;
      }
      if (guard || chars === undefined) {
        return string.replace(reTrimEnd, '');
      }
      chars = (chars + '');
      if (!chars) {
        return string;
      }
      var strSymbols = stringToArray(string);
      return strSymbols.slice(0, charsEndIndex(strSymbols, stringToArray(chars)) + 1).join('');
    }

    /**
     * Removes leading whitespace or specified characters from `string`.
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to trim.
     * @param {string} [chars=whitespace] The characters to trim.
     * @param- {Object} [guard] Enables use as an iteratee for functions like `_.map`.
     * @returns {string} Returns the trimmed string.
     * @example
     *
     * _.trimStart('  abc  ');
     * // => 'abc  '
     *
     * _.trimStart('-_-abc-_-', '_-');
     * // => 'abc-_-'
     */
    function trimStart(string, chars, guard) {
      string = toString(string);
      if (!string) {
        return string;
      }
      if (guard || chars === undefined) {
        return string.replace(reTrimStart, '');
      }
      chars = (chars + '');
      if (!chars) {
        return string;
      }
      var strSymbols = stringToArray(string);
      return strSymbols.slice(charsStartIndex(strSymbols, stringToArray(chars))).join('');
    }

    /**
     * Truncates `string` if it's longer than the given maximum string length.
     * The last characters of the truncated string are replaced with the omission
     * string which defaults to "...".
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to truncate.
     * @param {Object} [options] The options object.
     * @param {number} [options.length=30] The maximum string length.
     * @param {string} [options.omission='...'] The string to indicate text is omitted.
     * @param {RegExp|string} [options.separator] The separator pattern to truncate to.
     * @returns {string} Returns the truncated string.
     * @example
     *
     * _.truncate('hi-diddly-ho there, neighborino');
     * // => 'hi-diddly-ho there, neighbo...'
     *
     * _.truncate('hi-diddly-ho there, neighborino', {
     *   'length': 24,
     *   'separator': ' '
     * });
     * // => 'hi-diddly-ho there,...'
     *
     * _.truncate('hi-diddly-ho there, neighborino', {
     *   'length': 24,
     *   'separator': /,? +/
     * });
     * // => 'hi-diddly-ho there...'
     *
     * _.truncate('hi-diddly-ho there, neighborino', {
     *   'omission': ' [...]'
     * });
     * // => 'hi-diddly-ho there, neig [...]'
     */
    function truncate(string, options) {
      var length = DEFAULT_TRUNC_LENGTH,
          omission = DEFAULT_TRUNC_OMISSION;

      if (isObject(options)) {
        var separator = 'separator' in options ? options.separator : separator;
        length = 'length' in options ? toInteger(options.length) : length;
        omission = 'omission' in options ? toString(options.omission) : omission;
      }
      string = toString(string);

      var strLength = string.length;
      if (reHasComplexSymbol.test(string)) {
        var strSymbols = stringToArray(string);
        strLength = strSymbols.length;
      }
      if (length >= strLength) {
        return string;
      }
      var end = length - stringSize(omission);
      if (end < 1) {
        return omission;
      }
      var result = strSymbols
        ? strSymbols.slice(0, end).join('')
        : string.slice(0, end);

      if (separator === undefined) {
        return result + omission;
      }
      if (strSymbols) {
        end += (result.length - end);
      }
      if (isRegExp(separator)) {
        if (string.slice(end).search(separator)) {
          var match,
              substring = result;

          if (!separator.global) {
            separator = RegExp(separator.source, toString(reFlags.exec(separator)) + 'g');
          }
          separator.lastIndex = 0;
          while ((match = separator.exec(substring))) {
            var newEnd = match.index;
          }
          result = result.slice(0, newEnd === undefined ? end : newEnd);
        }
      } else if (string.indexOf(separator, end) != end) {
        var index = result.lastIndexOf(separator);
        if (index > -1) {
          result = result.slice(0, index);
        }
      }
      return result + omission;
    }

    /**
     * The inverse of `_.escape`; this method converts the HTML entities
     * `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`, and `&#96;` in `string` to their
     * corresponding characters.
     *
     * **Note:** No other HTML entities are unescaped. To unescape additional HTML
     * entities use a third-party library like [_he_](https://mths.be/he).
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to unescape.
     * @returns {string} Returns the unescaped string.
     * @example
     *
     * _.unescape('fred, barney, &amp; pebbles');
     * // => 'fred, barney, & pebbles'
     */
    function unescape(string) {
      string = toString(string);
      return (string && reHasEscapedHtml.test(string))
        ? string.replace(reEscapedHtml, unescapeHtmlChar)
        : string;
    }

    /**
     * Converts `string`, as space separated words, to upper case.
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to convert.
     * @returns {string} Returns the upper cased string.
     * @example
     *
     * _.upperCase('--foo-bar');
     * // => 'FOO BAR'
     *
     * _.upperCase('fooBar');
     * // => 'FOO BAR'
     *
     * _.upperCase('__foo_bar__');
     * // => 'FOO BAR'
     */
    var upperCase = createCompounder(function(result, word, index) {
      return result + (index ? ' ' : '') + word.toUpperCase();
    });

    /**
     * Splits `string` into an array of its words.
     *
     * @static
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to inspect.
     * @param {RegExp|string} [pattern] The pattern to match words.
     * @param- {Object} [guard] Enables use as an iteratee for functions like `_.map`.
     * @returns {Array} Returns the words of `string`.
     * @example
     *
     * _.words('fred, barney, & pebbles');
     * // => ['fred', 'barney', 'pebbles']
     *
     * _.words('fred, barney, & pebbles', /[^, ]+/g);
     * // => ['fred', 'barney', '&', 'pebbles']
     */
    function words(string, pattern, guard) {
      string = toString(string);
      pattern = guard ? undefined : pattern;

      if (pattern === undefined) {
        pattern = reHasComplexWord.test(string) ? reComplexWord : reBasicWord;
      }
      return string.match(pattern) || [];
    }

    /*------------------------------------------------------------------------*/

    /**
     * Attempts to invoke `func`, returning either the result or the caught error
     * object. Any additional arguments are provided to `func` when it's invoked.
     *
     * @static
     * @memberOf _
     * @category Util
     * @param {Function} func The function to attempt.
     * @returns {*} Returns the `func` result or error object.
     * @example
     *
     * // Avoid throwing errors for invalid selectors.
     * var elements = _.attempt(function(selector) {
     *   return document.querySelectorAll(selector);
     * }, '>_>');
     *
     * if (_.isError(elements)) {
     *   elements = [];
     * }
     */
    var attempt = rest(function(func, args) {
      try {
        return apply(func, undefined, args);
      } catch (e) {
        return isObject(e) ? e : new Error(e);
      }
    });

    /**
     * Binds methods of an object to the object itself, overwriting the existing
     * method.
     *
     * **Note:** This method doesn't set the "length" property of bound functions.
     *
     * @static
     * @memberOf _
     * @category Util
     * @param {Object} object The object to bind and assign the bound methods to.
     * @param {...(string|string[])} methodNames The object method names to bind,
     *  specified individually or in arrays.
     * @returns {Object} Returns `object`.
     * @example
     *
     * var view = {
     *   'label': 'docs',
     *   'onClick': function() {
     *     console.log('clicked ' + this.label);
     *   }
     * };
     *
     * _.bindAll(view, 'onClick');
     * jQuery(element).on('click', view.onClick);
     * // => logs 'clicked docs' when clicked
     */
    var bindAll = rest(function(object, methodNames) {
      arrayEach(baseFlatten(methodNames), function(key) {
        object[key] = bind(object[key], object);
      });
      return object;
    });

    /**
     * Creates a function that iterates over `pairs` invoking the corresponding
     * function of the first predicate to return truthy. The predicate-function
     * pairs are invoked with the `this` binding and arguments of the created
     * function.
     *
     * @static
     * @memberOf _
     * @category Util
     * @param {Array} pairs The predicate-function pairs.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var func = _.cond([
     *   [_.matches({ 'a': 1 }),           _.constant('matches A')],
     *   [_.conforms({ 'b': _.isNumber }), _.constant('matches B')],
     *   [_.constant(true),                _.constant('no match')]
     * ]);
     *
     * func({ 'a': 1, 'b': 2 });
     * // => 'matches A'
     *
     * func({ 'a': 0, 'b': 1 });
     * // => 'matches B'
     *
     * func({ 'a': '1', 'b': '2' });
     * // => 'no match'
     */
    function cond(pairs) {
      var length = pairs ? pairs.length : 0,
          toIteratee = getIteratee();

      pairs = !length ? [] : arrayMap(pairs, function(pair) {
        if (typeof pair[1] != 'function') {
          throw new TypeError(FUNC_ERROR_TEXT);
        }
        return [toIteratee(pair[0]), pair[1]];
      });

      return rest(function(args) {
        var index = -1;
        while (++index < length) {
          var pair = pairs[index];
          if (apply(pair[0], this, args)) {
            return apply(pair[1], this, args);
          }
        }
      });
    }

    /**
     * Creates a function that invokes the predicate properties of `source` with
     * the corresponding property values of a given object, returning `true` if
     * all predicates return truthy, else `false`.
     *
     * @static
     * @memberOf _
     * @category Util
     * @param {Object} source The object of property predicates to conform to.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var users = [
     *   { 'user': 'barney', 'age': 36 },
     *   { 'user': 'fred',   'age': 40 }
     * ];
     *
     * _.filter(users, _.conforms({ 'age': _.partial(_.gt, _, 38) }));
     * // => [{ 'user': 'fred', 'age': 40 }]
     */
    function conforms(source) {
      return baseConforms(baseClone(source, true));
    }

    /**
     * Creates a function that returns `value`.
     *
     * @static
     * @memberOf _
     * @category Util
     * @param {*} value The value to return from the new function.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var object = { 'user': 'fred' };
     * var getter = _.constant(object);
     *
     * getter() === object;
     * // => true
     */
    function constant(value) {
      return function() {
        return value;
      };
    }

    /**
     * Creates a function that returns the result of invoking the given functions
     * with the `this` binding of the created function, where each successive
     * invocation is supplied the return value of the previous.
     *
     * @static
     * @memberOf _
     * @category Util
     * @param {...(Function|Function[])} [funcs] Functions to invoke.
     * @returns {Function} Returns the new function.
     * @example
     *
     * function square(n) {
     *   return n * n;
     * }
     *
     * var addSquare = _.flow(_.add, square);
     * addSquare(1, 2);
     * // => 9
     */
    var flow = createFlow();

    /**
     * This method is like `_.flow` except that it creates a function that
     * invokes the given functions from right to left.
     *
     * @static
     * @memberOf _
     * @category Util
     * @param {...(Function|Function[])} [funcs] Functions to invoke.
     * @returns {Function} Returns the new function.
     * @example
     *
     * function square(n) {
     *   return n * n;
     * }
     *
     * var addSquare = _.flowRight(square, _.add);
     * addSquare(1, 2);
     * // => 9
     */
    var flowRight = createFlow(true);

    /**
     * This method returns the first argument given to it.
     *
     * @static
     * @memberOf _
     * @category Util
     * @param {*} value Any value.
     * @returns {*} Returns `value`.
     * @example
     *
     * var object = { 'user': 'fred' };
     *
     * _.identity(object) === object;
     * // => true
     */
    function identity(value) {
      return value;
    }

    /**
     * Creates a function that invokes `func` with the arguments of the created
     * function. If `func` is a property name the created callback returns the
     * property value for a given element. If `func` is an object the created
     * callback returns `true` for elements that contain the equivalent object properties, otherwise it returns `false`.
     *
     * @static
     * @memberOf _
     * @category Util
     * @param {*} [func=_.identity] The value to convert to a callback.
     * @returns {Function} Returns the callback.
     * @example
     *
     * var users = [
     *   { 'user': 'barney', 'age': 36 },
     *   { 'user': 'fred',   'age': 40 }
     * ];
     *
     * // Create custom iteratee shorthands.
     * _.iteratee = _.wrap(_.iteratee, function(callback, func) {
     *   var p = /^(\S+)\s*([<>])\s*(\S+)$/.exec(func);
     *   return !p ? callback(func) : function(object) {
     *     return (p[2] == '>' ? object[p[1]] > p[3] : object[p[1]] < p[3]);
     *   };
     * });
     *
     * _.filter(users, 'age > 36');
     * // => [{ 'user': 'fred', 'age': 40 }]
     */
    function iteratee(func) {
      return baseIteratee(typeof func == 'function' ? func : baseClone(func, true));
    }

    /**
     * Creates a function that performs a deep partial comparison between a given
     * object and `source`, returning `true` if the given object has equivalent
     * property values, else `false`.
     *
     * **Note:** This method supports comparing the same values as `_.isEqual`.
     *
     * @static
     * @memberOf _
     * @category Util
     * @param {Object} source The object of property values to match.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var users = [
     *   { 'user': 'barney', 'age': 36, 'active': true },
     *   { 'user': 'fred',   'age': 40, 'active': false }
     * ];
     *
     * _.filter(users, _.matches({ 'age': 40, 'active': false }));
     * // => [{ 'user': 'fred', 'age': 40, 'active': false }]
     */
    function matches(source) {
      return baseMatches(baseClone(source, true));
    }

    /**
     * Creates a function that performs a deep partial comparison between the
     * value at `path` of a given object to `srcValue`, returning `true` if the
     * object value is equivalent, else `false`.
     *
     * **Note:** This method supports comparing the same values as `_.isEqual`.
     *
     * @static
     * @memberOf _
     * @category Util
     * @param {Array|string} path The path of the property to get.
     * @param {*} srcValue The value to match.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var users = [
     *   { 'user': 'barney' },
     *   { 'user': 'fred' }
     * ];
     *
     * _.find(users, _.matchesProperty('user', 'fred'));
     * // => { 'user': 'fred' }
     */
    function matchesProperty(path, srcValue) {
      return baseMatchesProperty(path, baseClone(srcValue, true));
    }

    /**
     * Creates a function that invokes the method at `path` of a given object.
     * Any additional arguments are provided to the invoked method.
     *
     * @static
     * @memberOf _
     * @category Util
     * @param {Array|string} path The path of the method to invoke.
     * @param {...*} [args] The arguments to invoke the method with.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var objects = [
     *   { 'a': { 'b': { 'c': _.constant(2) } } },
     *   { 'a': { 'b': { 'c': _.constant(1) } } }
     * ];
     *
     * _.map(objects, _.method('a.b.c'));
     * // => [2, 1]
     *
     * _.invokeMap(_.sortBy(objects, _.method(['a', 'b', 'c'])), 'a.b.c');
     * // => [1, 2]
     */
    var method = rest(function(path, args) {
      return function(object) {
        return baseInvoke(object, path, args);
      };
    });

    /**
     * The opposite of `_.method`; this method creates a function that invokes
     * the method at a given path of `object`. Any additional arguments are
     * provided to the invoked method.
     *
     * @static
     * @memberOf _
     * @category Util
     * @param {Object} object The object to query.
     * @param {...*} [args] The arguments to invoke the method with.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var array = _.times(3, _.constant),
     *     object = { 'a': array, 'b': array, 'c': array };
     *
     * _.map(['a[2]', 'c[0]'], _.methodOf(object));
     * // => [2, 0]
     *
     * _.map([['a', '2'], ['c', '0']], _.methodOf(object));
     * // => [2, 0]
     */
    var methodOf = rest(function(object, args) {
      return function(path) {
        return baseInvoke(object, path, args);
      };
    });

    /**
     * Adds all own enumerable function properties of a source object to the
     * destination object. If `object` is a function then methods are added to
     * its prototype as well.
     *
     * **Note:** Use `_.runInContext` to create a pristine `lodash` function to
     * avoid conflicts caused by modifying the original.
     *
     * @static
     * @memberOf _
     * @category Util
     * @param {Function|Object} [object=lodash] The destination object.
     * @param {Object} source The object of functions to add.
     * @param {Object} [options] The options object.
     * @param {boolean} [options.chain=true] Specify whether the functions added
     *  are chainable.
     * @returns {Function|Object} Returns `object`.
     * @example
     *
     * function vowels(string) {
     *   return _.filter(string, function(v) {
     *     return /[aeiou]/i.test(v);
     *   });
     * }
     *
     * _.mixin({ 'vowels': vowels });
     * _.vowels('fred');
     * // => ['e']
     *
     * _('fred').vowels().value();
     * // => ['e']
     *
     * _.mixin({ 'vowels': vowels }, { 'chain': false });
     * _('fred').vowels();
     * // => ['e']
     */
    function mixin(object, source, options) {
      var props = keys(source),
          methodNames = baseFunctions(source, props);

      if (options == null &&
          !(isObject(source) && (methodNames.length || !props.length))) {
        options = source;
        source = object;
        object = this;
        methodNames = baseFunctions(source, keys(source));
      }
      var chain = (isObject(options) && 'chain' in options) ? options.chain : true,
          isFunc = isFunction(object);

      arrayEach(methodNames, function(methodName) {
        var func = source[methodName];
        object[methodName] = func;
        if (isFunc) {
          object.prototype[methodName] = function() {
            var chainAll = this.__chain__;
            if (chain || chainAll) {
              var result = object(this.__wrapped__),
                  actions = result.__actions__ = copyArray(this.__actions__);

              actions.push({ 'func': func, 'args': arguments, 'thisArg': object });
              result.__chain__ = chainAll;
              return result;
            }
            return func.apply(object, arrayPush([this.value()], arguments));
          };
        }
      });

      return object;
    }

    /**
     * Reverts the `_` variable to its previous value and returns a reference to
     * the `lodash` function.
     *
     * @static
     * @memberOf _
     * @category Util
     * @returns {Function} Returns the `lodash` function.
     * @example
     *
     * var lodash = _.noConflict();
     */
    function noConflict() {
      if (root._ === this) {
        root._ = oldDash;
      }
      return this;
    }

    /**
     * A no-operation function that returns `undefined` regardless of the
     * arguments it receives.
     *
     * @static
     * @memberOf _
     * @category Util
     * @example
     *
     * var object = { 'user': 'fred' };
     *
     * _.noop(object) === undefined;
     * // => true
     */
    function noop() {
      // No operation performed.
    }

    /**
     * Creates a function that returns its nth argument.
     *
     * @static
     * @memberOf _
     * @category Util
     * @param {number} [n=0] The index of the argument to return.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var func = _.nthArg(1);
     *
     * func('a', 'b', 'c');
     * // => 'b'
     */
    function nthArg(n) {
      n = toInteger(n);
      return function() {
        return arguments[n];
      };
    }

    /**
     * Creates a function that invokes `iteratees` with the arguments provided
     * to the created function and returns their results.
     *
     * @static
     * @memberOf _
     * @category Util
     * @param {...(Function|Function[])} iteratees The iteratees to invoke.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var func = _.over(Math.max, Math.min);
     *
     * func(1, 2, 3, 4);
     * // => [4, 1]
     */
    var over = createOver(arrayMap);

    /**
     * Creates a function that checks if **all** of the `predicates` return
     * truthy when invoked with the arguments provided to the created function.
     *
     * @static
     * @memberOf _
     * @category Util
     * @param {...(Function|Function[])} predicates The predicates to check.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var func = _.overEvery(Boolean, isFinite);
     *
     * func('1');
     * // => true
     *
     * func(null);
     * // => false
     *
     * func(NaN);
     * // => false
     */
    var overEvery = createOver(arrayEvery);

    /**
     * Creates a function that checks if **any** of the `predicates` return
     * truthy when invoked with the arguments provided to the created function.
     *
     * @static
     * @memberOf _
     * @category Util
     * @param {...(Function|Function[])} predicates The predicates to check.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var func = _.overSome(Boolean, isFinite);
     *
     * func('1');
     * // => true
     *
     * func(null);
     * // => true
     *
     * func(NaN);
     * // => false
     */
    var overSome = createOver(arraySome);

    /**
     * Creates a function that returns the value at `path` of a given object.
     *
     * @static
     * @memberOf _
     * @category Util
     * @param {Array|string} path The path of the property to get.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var objects = [
     *   { 'a': { 'b': { 'c': 2 } } },
     *   { 'a': { 'b': { 'c': 1 } } }
     * ];
     *
     * _.map(objects, _.property('a.b.c'));
     * // => [2, 1]
     *
     * _.map(_.sortBy(objects, _.property(['a', 'b', 'c'])), 'a.b.c');
     * // => [1, 2]
     */
    function property(path) {
      return isKey(path) ? baseProperty(path) : basePropertyDeep(path);
    }

    /**
     * The opposite of `_.property`; this method creates a function that returns
     * the value at a given path of `object`.
     *
     * @static
     * @memberOf _
     * @category Util
     * @param {Object} object The object to query.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var array = [0, 1, 2],
     *     object = { 'a': array, 'b': array, 'c': array };
     *
     * _.map(['a[2]', 'c[0]'], _.propertyOf(object));
     * // => [2, 0]
     *
     * _.map([['a', '2'], ['c', '0']], _.propertyOf(object));
     * // => [2, 0]
     */
    function propertyOf(object) {
      return function(path) {
        return object == null ? undefined : baseGet(object, path);
      };
    }

    /**
     * Creates an array of numbers (positive and/or negative) progressing from
     * `start` up to, but not including, `end`. A step of `-1` is used if a negative
     * `start` is specified without an `end` or `step`. If `end` is not specified
     * it's set to `start` with `start` then set to `0`.
     *
     * **Note:** JavaScript follows the IEEE-754 standard for resolving
     * floating-point values which can produce unexpected results.
     *
     * @static
     * @memberOf _
     * @category Util
     * @param {number} [start=0] The start of the range.
     * @param {number} end The end of the range.
     * @param {number} [step=1] The value to increment or decrement by.
     * @returns {Array} Returns the new array of numbers.
     * @example
     *
     * _.range(4);
     * // => [0, 1, 2, 3]
     *
     * _.range(-4);
     * // => [0, -1, -2, -3]
     *
     * _.range(1, 5);
     * // => [1, 2, 3, 4]
     *
     * _.range(0, 20, 5);
     * // => [0, 5, 10, 15]
     *
     * _.range(0, -4, -1);
     * // => [0, -1, -2, -3]
     *
     * _.range(1, 4, 0);
     * // => [1, 1, 1]
     *
     * _.range(0);
     * // => []
     */
    var range = createRange();

    /**
     * This method is like `_.range` except that it populates values in
     * descending order.
     *
     * @static
     * @memberOf _
     * @category Util
     * @param {number} [start=0] The start of the range.
     * @param {number} end The end of the range.
     * @param {number} [step=1] The value to increment or decrement by.
     * @returns {Array} Returns the new array of numbers.
     * @example
     *
     * _.rangeRight(4);
     * // => [3, 2, 1, 0]
     *
     * _.rangeRight(-4);
     * // => [-3, -2, -1, 0]
     *
     * _.rangeRight(1, 5);
     * // => [4, 3, 2, 1]
     *
     * _.rangeRight(0, 20, 5);
     * // => [15, 10, 5, 0]
     *
     * _.rangeRight(0, -4, -1);
     * // => [-3, -2, -1, 0]
     *
     * _.rangeRight(1, 4, 0);
     * // => [1, 1, 1]
     *
     * _.rangeRight(0);
     * // => []
     */
    var rangeRight = createRange(true);

    /**
     * Invokes the iteratee function `n` times, returning an array of the results
     * of each invocation. The iteratee is invoked with one argument; (index).
     *
     * @static
     * @memberOf _
     * @category Util
     * @param {number} n The number of times to invoke `iteratee`.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the array of results.
     * @example
     *
     * _.times(3, String);
     * // => ['0', '1', '2']
     *
     *  _.times(4, _.constant(true));
     * // => [true, true, true, true]
     */
    function times(n, iteratee) {
      n = toInteger(n);
      if (n < 1 || n > MAX_SAFE_INTEGER) {
        return [];
      }
      var index = MAX_ARRAY_LENGTH,
          length = nativeMin(n, MAX_ARRAY_LENGTH);

      iteratee = toFunction(iteratee);
      n -= MAX_ARRAY_LENGTH;

      var result = baseTimes(length, iteratee);
      while (++index < n) {
        iteratee(index);
      }
      return result;
    }

    /**
     * Converts `value` to a property path array.
     *
     * @static
     * @memberOf _
     * @category Util
     * @param {*} value The value to convert.
     * @returns {Array} Returns the new property path array.
     * @example
     *
     * _.toPath('a.b.c');
     * // => ['a', 'b', 'c']
     *
     * _.toPath('a[0].b.c');
     * // => ['a', '0', 'b', 'c']
     *
     * var path = ['a', 'b', 'c'],
     *     newPath = _.toPath(path);
     *
     * console.log(newPath);
     * // => ['a', 'b', 'c']
     *
     * console.log(path === newPath);
     * // => false
     */
    function toPath(value) {
      return isArray(value) ? arrayMap(value, String) : stringToPath(value);
    }

    /**
     * Generates a unique ID. If `prefix` is given the ID is appended to it.
     *
     * @static
     * @memberOf _
     * @category Util
     * @param {string} [prefix] The value to prefix the ID with.
     * @returns {string} Returns the unique ID.
     * @example
     *
     * _.uniqueId('contact_');
     * // => 'contact_104'
     *
     * _.uniqueId();
     * // => '105'
     */
    function uniqueId(prefix) {
      var id = ++idCounter;
      return toString(prefix) + id;
    }

    /*------------------------------------------------------------------------*/

    /**
     * Adds two numbers.
     *
     * @static
     * @memberOf _
     * @category Math
     * @param {number} augend The first number in an addition.
     * @param {number} addend The second number in an addition.
     * @returns {number} Returns the total.
     * @example
     *
     * _.add(6, 4);
     * // => 10
     */
    function add(augend, addend) {
      var result;
      if (augend === undefined && addend === undefined) {
        return 0;
      }
      if (augend !== undefined) {
        result = augend;
      }
      if (addend !== undefined) {
        result = result === undefined ? addend : (result + addend);
      }
      return result;
    }

    /**
     * Computes `number` rounded up to `precision`.
     *
     * @static
     * @memberOf _
     * @category Math
     * @param {number} number The number to round up.
     * @param {number} [precision=0] The precision to round up to.
     * @returns {number} Returns the rounded up number.
     * @example
     *
     * _.ceil(4.006);
     * // => 5
     *
     * _.ceil(6.004, 2);
     * // => 6.01
     *
     * _.ceil(6040, -2);
     * // => 6100
     */
    var ceil = createRound('ceil');

    /**
     * Computes `number` rounded down to `precision`.
     *
     * @static
     * @memberOf _
     * @category Math
     * @param {number} number The number to round down.
     * @param {number} [precision=0] The precision to round down to.
     * @returns {number} Returns the rounded down number.
     * @example
     *
     * _.floor(4.006);
     * // => 4
     *
     * _.floor(0.046, 2);
     * // => 0.04
     *
     * _.floor(4060, -2);
     * // => 4000
     */
    var floor = createRound('floor');

    /**
     * Computes the maximum value of `array`. If `array` is empty or falsey
     * `undefined` is returned.
     *
     * @static
     * @memberOf _
     * @category Math
     * @param {Array} array The array to iterate over.
     * @returns {*} Returns the maximum value.
     * @example
     *
     * _.max([4, 2, 8, 6]);
     * // => 8
     *
     * _.max([]);
     * // => undefined
     */
    function max(array) {
      return (array && array.length)
        ? baseExtremum(array, identity, gt)
        : undefined;
    }

    /**
     * This method is like `_.max` except that it accepts `iteratee` which is
     * invoked for each element in `array` to generate the criterion by which
     * the value is ranked. The iteratee is invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @category Math
     * @param {Array} array The array to iterate over.
     * @param {Function|Object|string} [iteratee=_.identity] The iteratee invoked per element.
     * @returns {*} Returns the maximum value.
     * @example
     *
     * var objects = [{ 'n': 1 }, { 'n': 2 }];
     *
     * _.maxBy(objects, function(o) { return o.n; });
     * // => { 'n': 2 }
     *
     * // The `_.property` iteratee shorthand.
     * _.maxBy(objects, 'n');
     * // => { 'n': 2 }
     */
    function maxBy(array, iteratee) {
      return (array && array.length)
        ? baseExtremum(array, getIteratee(iteratee), gt)
        : undefined;
    }

    /**
     * Computes the mean of the values in `array`.
     *
     * @static
     * @memberOf _
     * @category Math
     * @param {Array} array The array to iterate over.
     * @returns {number} Returns the mean.
     * @example
     *
     * _.mean([4, 2, 8, 6]);
     * // => 5
     */
    function mean(array) {
      return sum(array) / (array ? array.length : 0);
    }

    /**
     * Computes the minimum value of `array`. If `array` is empty or falsey
     * `undefined` is returned.
     *
     * @static
     * @memberOf _
     * @category Math
     * @param {Array} array The array to iterate over.
     * @returns {*} Returns the minimum value.
     * @example
     *
     * _.min([4, 2, 8, 6]);
     * // => 2
     *
     * _.min([]);
     * // => undefined
     */
    function min(array) {
      return (array && array.length)
        ? baseExtremum(array, identity, lt)
        : undefined;
    }

    /**
     * This method is like `_.min` except that it accepts `iteratee` which is
     * invoked for each element in `array` to generate the criterion by which
     * the value is ranked. The iteratee is invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @category Math
     * @param {Array} array The array to iterate over.
     * @param {Function|Object|string} [iteratee=_.identity] The iteratee invoked per element.
     * @returns {*} Returns the minimum value.
     * @example
     *
     * var objects = [{ 'n': 1 }, { 'n': 2 }];
     *
     * _.minBy(objects, function(o) { return o.n; });
     * // => { 'n': 1 }
     *
     * // The `_.property` iteratee shorthand.
     * _.minBy(objects, 'n');
     * // => { 'n': 1 }
     */
    function minBy(array, iteratee) {
      return (array && array.length)
        ? baseExtremum(array, getIteratee(iteratee), lt)
        : undefined;
    }

    /**
     * Computes `number` rounded to `precision`.
     *
     * @static
     * @memberOf _
     * @category Math
     * @param {number} number The number to round.
     * @param {number} [precision=0] The precision to round to.
     * @returns {number} Returns the rounded number.
     * @example
     *
     * _.round(4.006);
     * // => 4
     *
     * _.round(4.006, 2);
     * // => 4.01
     *
     * _.round(4060, -2);
     * // => 4100
     */
    var round = createRound('round');

    /**
     * Subtract two numbers.
     *
     * @static
     * @memberOf _
     * @category Math
     * @param {number} minuend The first number in a subtraction.
     * @param {number} subtrahend The second number in a subtraction.
     * @returns {number} Returns the difference.
     * @example
     *
     * _.subtract(6, 4);
     * // => 2
     */
    function subtract(minuend, subtrahend) {
      var result;
      if (minuend === undefined && subtrahend === undefined) {
        return 0;
      }
      if (minuend !== undefined) {
        result = minuend;
      }
      if (subtrahend !== undefined) {
        result = result === undefined ? subtrahend : (result - subtrahend);
      }
      return result;
    }

    /**
     * Computes the sum of the values in `array`.
     *
     * @static
     * @memberOf _
     * @category Math
     * @param {Array} array The array to iterate over.
     * @returns {number} Returns the sum.
     * @example
     *
     * _.sum([4, 2, 8, 6]);
     * // => 20
     */
    function sum(array) {
      return (array && array.length)
        ? baseSum(array, identity)
        : 0;
    }

    /**
     * This method is like `_.sum` except that it accepts `iteratee` which is
     * invoked for each element in `array` to generate the value to be summed.
     * The iteratee is invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @category Math
     * @param {Array} array The array to iterate over.
     * @param {Function|Object|string} [iteratee=_.identity] The iteratee invoked per element.
     * @returns {number} Returns the sum.
     * @example
     *
     * var objects = [{ 'n': 4 }, { 'n': 2 }, { 'n': 8 }, { 'n': 6 }];
     *
     * _.sumBy(objects, function(o) { return o.n; });
     * // => 20
     *
     * // The `_.property` iteratee shorthand.
     * _.sumBy(objects, 'n');
     * // => 20
     */
    function sumBy(array, iteratee) {
      return (array && array.length)
        ? baseSum(array, getIteratee(iteratee))
        : 0;
    }

    /*------------------------------------------------------------------------*/

    // Ensure wrappers are instances of `baseLodash`.
    lodash.prototype = baseLodash.prototype;

    LodashWrapper.prototype = baseCreate(baseLodash.prototype);
    LodashWrapper.prototype.constructor = LodashWrapper;

    LazyWrapper.prototype = baseCreate(baseLodash.prototype);
    LazyWrapper.prototype.constructor = LazyWrapper;

    // Avoid inheriting from `Object.prototype` when possible.
    Hash.prototype = nativeCreate ? nativeCreate(null) : objectProto;

    // Add functions to the `MapCache`.
    MapCache.prototype.clear = mapClear;
    MapCache.prototype['delete'] = mapDelete;
    MapCache.prototype.get = mapGet;
    MapCache.prototype.has = mapHas;
    MapCache.prototype.set = mapSet;

    // Add functions to the `SetCache`.
    SetCache.prototype.push = cachePush;

    // Add functions to the `Stack` cache.
    Stack.prototype.clear = stackClear;
    Stack.prototype['delete'] = stackDelete;
    Stack.prototype.get = stackGet;
    Stack.prototype.has = stackHas;
    Stack.prototype.set = stackSet;

    // Assign cache to `_.memoize`.
    memoize.Cache = MapCache;

    // Add functions that return wrapped values when chaining.
    lodash.after = after;
    lodash.ary = ary;
    lodash.assign = assign;
    lodash.assignIn = assignIn;
    lodash.assignInWith = assignInWith;
    lodash.assignWith = assignWith;
    lodash.at = at;
    lodash.before = before;
    lodash.bind = bind;
    lodash.bindAll = bindAll;
    lodash.bindKey = bindKey;
    lodash.chain = chain;
    lodash.chunk = chunk;
    lodash.compact = compact;
    lodash.concat = concat;
    lodash.cond = cond;
    lodash.conforms = conforms;
    lodash.constant = constant;
    lodash.countBy = countBy;
    lodash.create = create;
    lodash.curry = curry;
    lodash.curryRight = curryRight;
    lodash.debounce = debounce;
    lodash.defaults = defaults;
    lodash.defaultsDeep = defaultsDeep;
    lodash.defer = defer;
    lodash.delay = delay;
    lodash.difference = difference;
    lodash.differenceBy = differenceBy;
    lodash.differenceWith = differenceWith;
    lodash.drop = drop;
    lodash.dropRight = dropRight;
    lodash.dropRightWhile = dropRightWhile;
    lodash.dropWhile = dropWhile;
    lodash.fill = fill;
    lodash.filter = filter;
    lodash.flatMap = flatMap;
    lodash.flatten = flatten;
    lodash.flattenDeep = flattenDeep;
    lodash.flip = flip;
    lodash.flow = flow;
    lodash.flowRight = flowRight;
    lodash.fromPairs = fromPairs;
    lodash.functions = functions;
    lodash.functionsIn = functionsIn;
    lodash.groupBy = groupBy;
    lodash.initial = initial;
    lodash.intersection = intersection;
    lodash.intersectionBy = intersectionBy;
    lodash.intersectionWith = intersectionWith;
    lodash.invert = invert;
    lodash.invertBy = invertBy;
    lodash.invokeMap = invokeMap;
    lodash.iteratee = iteratee;
    lodash.keyBy = keyBy;
    lodash.keys = keys;
    lodash.keysIn = keysIn;
    lodash.map = map;
    lodash.mapKeys = mapKeys;
    lodash.mapValues = mapValues;
    lodash.matches = matches;
    lodash.matchesProperty = matchesProperty;
    lodash.memoize = memoize;
    lodash.merge = merge;
    lodash.mergeWith = mergeWith;
    lodash.method = method;
    lodash.methodOf = methodOf;
    lodash.mixin = mixin;
    lodash.negate = negate;
    lodash.nthArg = nthArg;
    lodash.omit = omit;
    lodash.omitBy = omitBy;
    lodash.once = once;
    lodash.orderBy = orderBy;
    lodash.over = over;
    lodash.overArgs = overArgs;
    lodash.overEvery = overEvery;
    lodash.overSome = overSome;
    lodash.partial = partial;
    lodash.partialRight = partialRight;
    lodash.partition = partition;
    lodash.pick = pick;
    lodash.pickBy = pickBy;
    lodash.property = property;
    lodash.propertyOf = propertyOf;
    lodash.pull = pull;
    lodash.pullAll = pullAll;
    lodash.pullAllBy = pullAllBy;
    lodash.pullAt = pullAt;
    lodash.range = range;
    lodash.rangeRight = rangeRight;
    lodash.rearg = rearg;
    lodash.reject = reject;
    lodash.remove = remove;
    lodash.rest = rest;
    lodash.reverse = reverse;
    lodash.sampleSize = sampleSize;
    lodash.set = set;
    lodash.setWith = setWith;
    lodash.shuffle = shuffle;
    lodash.slice = slice;
    lodash.sortBy = sortBy;
    lodash.sortedUniq = sortedUniq;
    lodash.sortedUniqBy = sortedUniqBy;
    lodash.split = split;
    lodash.spread = spread;
    lodash.tail = tail;
    lodash.take = take;
    lodash.takeRight = takeRight;
    lodash.takeRightWhile = takeRightWhile;
    lodash.takeWhile = takeWhile;
    lodash.tap = tap;
    lodash.throttle = throttle;
    lodash.thru = thru;
    lodash.toArray = toArray;
    lodash.toPairs = toPairs;
    lodash.toPairsIn = toPairsIn;
    lodash.toPath = toPath;
    lodash.toPlainObject = toPlainObject;
    lodash.transform = transform;
    lodash.unary = unary;
    lodash.union = union;
    lodash.unionBy = unionBy;
    lodash.unionWith = unionWith;
    lodash.uniq = uniq;
    lodash.uniqBy = uniqBy;
    lodash.uniqWith = uniqWith;
    lodash.unset = unset;
    lodash.unzip = unzip;
    lodash.unzipWith = unzipWith;
    lodash.values = values;
    lodash.valuesIn = valuesIn;
    lodash.without = without;
    lodash.words = words;
    lodash.wrap = wrap;
    lodash.xor = xor;
    lodash.xorBy = xorBy;
    lodash.xorWith = xorWith;
    lodash.zip = zip;
    lodash.zipObject = zipObject;
    lodash.zipObjectDeep = zipObjectDeep;
    lodash.zipWith = zipWith;

    // Add aliases.
    lodash.extend = assignIn;
    lodash.extendWith = assignInWith;

    // Add functions to `lodash.prototype`.
    mixin(lodash, lodash);

    /*------------------------------------------------------------------------*/

    // Add functions that return unwrapped values when chaining.
    lodash.add = add;
    lodash.attempt = attempt;
    lodash.camelCase = camelCase;
    lodash.capitalize = capitalize;
    lodash.ceil = ceil;
    lodash.clamp = clamp;
    lodash.clone = clone;
    lodash.cloneDeep = cloneDeep;
    lodash.cloneDeepWith = cloneDeepWith;
    lodash.cloneWith = cloneWith;
    lodash.deburr = deburr;
    lodash.endsWith = endsWith;
    lodash.eq = eq;
    lodash.escape = escape;
    lodash.escapeRegExp = escapeRegExp;
    lodash.every = every;
    lodash.find = find;
    lodash.findIndex = findIndex;
    lodash.findKey = findKey;
    lodash.findLast = findLast;
    lodash.findLastIndex = findLastIndex;
    lodash.findLastKey = findLastKey;
    lodash.floor = floor;
    lodash.forEach = forEach;
    lodash.forEachRight = forEachRight;
    lodash.forIn = forIn;
    lodash.forInRight = forInRight;
    lodash.forOwn = forOwn;
    lodash.forOwnRight = forOwnRight;
    lodash.get = get;
    lodash.gt = gt;
    lodash.gte = gte;
    lodash.has = has;
    lodash.hasIn = hasIn;
    lodash.head = head;
    lodash.identity = identity;
    lodash.includes = includes;
    lodash.indexOf = indexOf;
    lodash.inRange = inRange;
    lodash.invoke = invoke;
    lodash.isArguments = isArguments;
    lodash.isArray = isArray;
    lodash.isArrayBuffer = isArrayBuffer;
    lodash.isArrayLike = isArrayLike;
    lodash.isArrayLikeObject = isArrayLikeObject;
    lodash.isBoolean = isBoolean;
    lodash.isBuffer = isBuffer;
    lodash.isDate = isDate;
    lodash.isElement = isElement;
    lodash.isEmpty = isEmpty;
    lodash.isEqual = isEqual;
    lodash.isEqualWith = isEqualWith;
    lodash.isError = isError;
    lodash.isFinite = isFinite;
    lodash.isFunction = isFunction;
    lodash.isInteger = isInteger;
    lodash.isLength = isLength;
    lodash.isMap = isMap;
    lodash.isMatch = isMatch;
    lodash.isMatchWith = isMatchWith;
    lodash.isNaN = isNaN;
    lodash.isNative = isNative;
    lodash.isNil = isNil;
    lodash.isNull = isNull;
    lodash.isNumber = isNumber;
    lodash.isObject = isObject;
    lodash.isObjectLike = isObjectLike;
    lodash.isPlainObject = isPlainObject;
    lodash.isRegExp = isRegExp;
    lodash.isSafeInteger = isSafeInteger;
    lodash.isSet = isSet;
    lodash.isString = isString;
    lodash.isSymbol = isSymbol;
    lodash.isTypedArray = isTypedArray;
    lodash.isUndefined = isUndefined;
    lodash.isWeakMap = isWeakMap;
    lodash.isWeakSet = isWeakSet;
    lodash.join = join;
    lodash.kebabCase = kebabCase;
    lodash.last = last;
    lodash.lastIndexOf = lastIndexOf;
    lodash.lowerCase = lowerCase;
    lodash.lowerFirst = lowerFirst;
    lodash.lt = lt;
    lodash.lte = lte;
    lodash.max = max;
    lodash.maxBy = maxBy;
    lodash.mean = mean;
    lodash.min = min;
    lodash.minBy = minBy;
    lodash.noConflict = noConflict;
    lodash.noop = noop;
    lodash.now = now;
    lodash.pad = pad;
    lodash.padEnd = padEnd;
    lodash.padStart = padStart;
    lodash.parseInt = parseInt;
    lodash.random = random;
    lodash.reduce = reduce;
    lodash.reduceRight = reduceRight;
    lodash.repeat = repeat;
    lodash.replace = replace;
    lodash.result = result;
    lodash.round = round;
    lodash.runInContext = runInContext;
    lodash.sample = sample;
    lodash.size = size;
    lodash.snakeCase = snakeCase;
    lodash.some = some;
    lodash.sortedIndex = sortedIndex;
    lodash.sortedIndexBy = sortedIndexBy;
    lodash.sortedIndexOf = sortedIndexOf;
    lodash.sortedLastIndex = sortedLastIndex;
    lodash.sortedLastIndexBy = sortedLastIndexBy;
    lodash.sortedLastIndexOf = sortedLastIndexOf;
    lodash.startCase = startCase;
    lodash.startsWith = startsWith;
    lodash.subtract = subtract;
    lodash.sum = sum;
    lodash.sumBy = sumBy;
    lodash.template = template;
    lodash.times = times;
    lodash.toInteger = toInteger;
    lodash.toLength = toLength;
    lodash.toLower = toLower;
    lodash.toNumber = toNumber;
    lodash.toSafeInteger = toSafeInteger;
    lodash.toString = toString;
    lodash.toUpper = toUpper;
    lodash.trim = trim;
    lodash.trimEnd = trimEnd;
    lodash.trimStart = trimStart;
    lodash.truncate = truncate;
    lodash.unescape = unescape;
    lodash.uniqueId = uniqueId;
    lodash.upperCase = upperCase;
    lodash.upperFirst = upperFirst;

    // Add aliases.
    lodash.each = forEach;
    lodash.eachRight = forEachRight;
    lodash.first = head;

    mixin(lodash, (function() {
      var source = {};
      baseForOwn(lodash, function(func, methodName) {
        if (!hasOwnProperty.call(lodash.prototype, methodName)) {
          source[methodName] = func;
        }
      });
      return source;
    }()), { 'chain': false });

    /*------------------------------------------------------------------------*/

    /**
     * The semantic version number.
     *
     * @static
     * @memberOf _
     * @type string
     */
    lodash.VERSION = VERSION;

    // Assign default placeholders.
    arrayEach(['bind', 'bindKey', 'curry', 'curryRight', 'partial', 'partialRight'], function(methodName) {
      lodash[methodName].placeholder = lodash;
    });

    // Add `LazyWrapper` methods for `_.drop` and `_.take` variants.
    arrayEach(['drop', 'take'], function(methodName, index) {
      LazyWrapper.prototype[methodName] = function(n) {
        var filtered = this.__filtered__;
        if (filtered && !index) {
          return new LazyWrapper(this);
        }
        n = n === undefined ? 1 : nativeMax(toInteger(n), 0);

        var result = this.clone();
        if (filtered) {
          result.__takeCount__ = nativeMin(n, result.__takeCount__);
        } else {
          result.__views__.push({ 'size': nativeMin(n, MAX_ARRAY_LENGTH), 'type': methodName + (result.__dir__ < 0 ? 'Right' : '') });
        }
        return result;
      };

      LazyWrapper.prototype[methodName + 'Right'] = function(n) {
        return this.reverse()[methodName](n).reverse();
      };
    });

    // Add `LazyWrapper` methods that accept an `iteratee` value.
    arrayEach(['filter', 'map', 'takeWhile'], function(methodName, index) {
      var type = index + 1,
          isFilter = type == LAZY_FILTER_FLAG || type == LAZY_WHILE_FLAG;

      LazyWrapper.prototype[methodName] = function(iteratee) {
        var result = this.clone();
        result.__iteratees__.push({ 'iteratee': getIteratee(iteratee, 3), 'type': type });
        result.__filtered__ = result.__filtered__ || isFilter;
        return result;
      };
    });

    // Add `LazyWrapper` methods for `_.head` and `_.last`.
    arrayEach(['head', 'last'], function(methodName, index) {
      var takeName = 'take' + (index ? 'Right' : '');

      LazyWrapper.prototype[methodName] = function() {
        return this[takeName](1).value()[0];
      };
    });

    // Add `LazyWrapper` methods for `_.initial` and `_.tail`.
    arrayEach(['initial', 'tail'], function(methodName, index) {
      var dropName = 'drop' + (index ? '' : 'Right');

      LazyWrapper.prototype[methodName] = function() {
        return this.__filtered__ ? new LazyWrapper(this) : this[dropName](1);
      };
    });

    LazyWrapper.prototype.compact = function() {
      return this.filter(identity);
    };

    LazyWrapper.prototype.find = function(predicate) {
      return this.filter(predicate).head();
    };

    LazyWrapper.prototype.findLast = function(predicate) {
      return this.reverse().find(predicate);
    };

    LazyWrapper.prototype.invokeMap = rest(function(path, args) {
      if (typeof path == 'function') {
        return new LazyWrapper(this);
      }
      return this.map(function(value) {
        return baseInvoke(value, path, args);
      });
    });

    LazyWrapper.prototype.reject = function(predicate) {
      predicate = getIteratee(predicate, 3);
      return this.filter(function(value) {
        return !predicate(value);
      });
    };

    LazyWrapper.prototype.slice = function(start, end) {
      start = toInteger(start);

      var result = this;
      if (result.__filtered__ && (start > 0 || end < 0)) {
        return new LazyWrapper(result);
      }
      if (start < 0) {
        result = result.takeRight(-start);
      } else if (start) {
        result = result.drop(start);
      }
      if (end !== undefined) {
        end = toInteger(end);
        result = end < 0 ? result.dropRight(-end) : result.take(end - start);
      }
      return result;
    };

    LazyWrapper.prototype.takeRightWhile = function(predicate) {
      return this.reverse().takeWhile(predicate).reverse();
    };

    LazyWrapper.prototype.toArray = function() {
      return this.take(MAX_ARRAY_LENGTH);
    };

    // Add `LazyWrapper` methods to `lodash.prototype`.
    baseForOwn(LazyWrapper.prototype, function(func, methodName) {
      var checkIteratee = /^(?:filter|find|map|reject)|While$/.test(methodName),
          isTaker = /^(?:head|last)$/.test(methodName),
          lodashFunc = lodash[isTaker ? ('take' + (methodName == 'last' ? 'Right' : '')) : methodName],
          retUnwrapped = isTaker || /^find/.test(methodName);

      if (!lodashFunc) {
        return;
      }
      lodash.prototype[methodName] = function() {
        var value = this.__wrapped__,
            args = isTaker ? [1] : arguments,
            isLazy = value instanceof LazyWrapper,
            iteratee = args[0],
            useLazy = isLazy || isArray(value);

        var interceptor = function(value) {
          var result = lodashFunc.apply(lodash, arrayPush([value], args));
          return (isTaker && chainAll) ? result[0] : result;
        };

        if (useLazy && checkIteratee && typeof iteratee == 'function' && iteratee.length != 1) {
          // Avoid lazy use if the iteratee has a "length" value other than `1`.
          isLazy = useLazy = false;
        }
        var chainAll = this.__chain__,
            isHybrid = !!this.__actions__.length,
            isUnwrapped = retUnwrapped && !chainAll,
            onlyLazy = isLazy && !isHybrid;

        if (!retUnwrapped && useLazy) {
          value = onlyLazy ? value : new LazyWrapper(this);
          var result = func.apply(value, args);
          result.__actions__.push({ 'func': thru, 'args': [interceptor], 'thisArg': undefined });
          return new LodashWrapper(result, chainAll);
        }
        if (isUnwrapped && onlyLazy) {
          return func.apply(this, args);
        }
        result = this.thru(interceptor);
        return isUnwrapped ? (isTaker ? result.value()[0] : result.value()) : result;
      };
    });

    // Add `Array` and `String` methods to `lodash.prototype`.
    arrayEach(['pop', 'push', 'shift', 'sort', 'splice', 'unshift'], function(methodName) {
      var func = arrayProto[methodName],
          chainName = /^(?:push|sort|unshift)$/.test(methodName) ? 'tap' : 'thru',
          retUnwrapped = /^(?:pop|shift)$/.test(methodName);

      lodash.prototype[methodName] = function() {
        var args = arguments;
        if (retUnwrapped && !this.__chain__) {
          return func.apply(this.value(), args);
        }
        return this[chainName](function(value) {
          return func.apply(value, args);
        });
      };
    });

    // Map minified function names to their real names.
    baseForOwn(LazyWrapper.prototype, function(func, methodName) {
      var lodashFunc = lodash[methodName];
      if (lodashFunc) {
        var key = (lodashFunc.name + ''),
            names = realNames[key] || (realNames[key] = []);

        names.push({ 'name': methodName, 'func': lodashFunc });
      }
    });

    realNames[createHybridWrapper(undefined, BIND_KEY_FLAG).name] = [{ 'name': 'wrapper', 'func': undefined }];

    // Add functions to the lazy wrapper.
    LazyWrapper.prototype.clone = lazyClone;
    LazyWrapper.prototype.reverse = lazyReverse;
    LazyWrapper.prototype.value = lazyValue;

    // Add chaining functions to the `lodash` wrapper.
    lodash.prototype.at = wrapperAt;
    lodash.prototype.chain = wrapperChain;
    lodash.prototype.commit = wrapperCommit;
    lodash.prototype.flatMap = wrapperFlatMap;
    lodash.prototype.next = wrapperNext;
    lodash.prototype.plant = wrapperPlant;
    lodash.prototype.reverse = wrapperReverse;
    lodash.prototype.toJSON = lodash.prototype.valueOf = lodash.prototype.value = wrapperValue;

    if (iteratorSymbol) {
      lodash.prototype[iteratorSymbol] = wrapperToIterator;
    }
    return lodash;
  }

  /*--------------------------------------------------------------------------*/

  // Export lodash.
  var _ = runInContext();

  // Expose lodash on the free variable `window` or `self` when available. This
  // prevents errors in cases where lodash is loaded by a script tag in the presence
  // of an AMD loader. See http://requirejs.org/docs/errors.html#mismatch for more details.
  (freeWindow || freeSelf || {})._ = _;

  // Some AMD build optimizers like r.js check for condition patterns like the following:
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // Define as an anonymous module so, through path mapping, it can be
    // referenced as the "underscore" module.
    define(function() {
      return _;
    });
  }
  // Check for `exports` after `define` in case a build optimizer adds an `exports` object.
  else if (freeExports && freeModule) {
    // Export for Node.js.
    if (moduleExports) {
      (freeModule.exports = _)._ = _;
    }
    // Export for CommonJS support.
    freeExports._ = _;
  }
  else {
    // Export to the global object.
    root._ = _;
  }
}.call(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],4:[function(require,module,exports){
"use strict";

var Environment = require('./lib/Environment');
var WebLoader = require('./lib/loaders/WebLoader');

module.exports = {
	Environment: Environment,
	WebLoader: WebLoader
};
},{"./lib/Environment":6,"./lib/loaders/WebLoader":9}],5:[function(require,module,exports){
"use strict";

var _ = require('lodash');
var Parser = require('./Parser');

module.exports = {
	compile: function compile(str, options) {
		options = _.extend({}, options);

		var asl = Parser.parse(str);

		var ast = [],
		    treeNode = [];
		buildAST(asl.body);

		var extending = undefined;
		var code = [];
		code.push('"use strict";');
		code.push('var output = "";');
		code.push('function Context () { var a = []; a.push.apply(a, arguments); a.__proto__ = Context.prototype; return a; };');
		code.push('Context.prototype = new Array();');
		code.push('Context.prototype.set = function (context, key, val) {');
		code.push('\tif (val === undefined) {');
		code.push('\t\tval = key;');
		code.push('\t\tkey = context;');
		code.push('\t\tcontext = this[this.length - 1];');
		code.push('\t}');
		code.push('\tif (context) {');
		code.push('\t\tcontext[key] = val;');
		code.push('\t}');
		code.push('};');
		code.push('Context.prototype.get = function (context, key) {');
		code.push('\tif (key === undefined && context === undefined) {');
		code.push('\t\treturn this[this.length - 1];');
		code.push('\t}');
		code.push('\tif (key === undefined) {');
		code.push('\t\tkey = context;');
		code.push('\t\tfor (var i = this.length - 1; i >= 0; --i) {');
		code.push('\t\t\tif (this[i] && typeof this[i][key] !== \'undefined\') {');
		code.push('\t\t\t\treturn this[i][key];');
		code.push('\t\t\t}');
		code.push('\t\t}');
		code.push('\t\treturn key;');
		code.push('\t}');
		code.push('\tif (context && typeof context[key]) {');
		code.push('\t\treturn context[key];');
		code.push('\t}');
		code.push('\treturn undefined;');
		code.push('};');
		code.push('Context.prototype.collapse = function () {');
		code.push('\tvar data = {};');
		code.push('\tfor (var a = 0, b = this.length; a < b; ++a) {');
		code.push('\t\tfor (var k in this[a]) {');
		code.push('\t\t\tdata[k] = this[a][k];');
		code.push('\t\t}');
		code.push('\t}');
		code.push('\treturn new Context(data);');
		code.push('};');
		code.push('Context.prototype.bindParents = function (func) {');
		code.push('\tif (func.parent) {');
		code.push('\t\tfunc.parent = this.bindParents(func.parent);');
		code.push('\t}');
		code.push('\treturn func.bind(null, func.parent);');
		code.push('};');
		code.push('var noop = function () {};');
		code.push('var context = new Context(data || {});');
		code.push('context[0]["$$blocks"] = context[0]["$$blocks"] || {};');
		code.push('var options = ' + JSON.stringify(options) + ';');
		walkAST(ast[0]);

		if (extending === undefined) {
			code.push('return {output: output, context: context.collapse()[0]};');
		} else {
			code.push('return this.render(' + extending + ', context.collapse()[0]);');
		}

		return code.join('');

		function append(node) {
			treeNode.push(node);
		}

		function push(node) {
			append(node);

			ast.push(treeNode);
			treeNode = [];
		}

		function pop(node, expectType) {
			var t = treeNode;
			treeNode = ast.pop();
			var lastNode = treeNode[treeNode.length - 1];

			if (expectType.indexOf(lastNode.type) === -1) {
				throw new Parser.SyntaxError('Expected ' + expectType + ' and found ' + lastNode.type + ' instead.', expectType, lastNode.type, node.location);
			}

			lastNode['children'] = t || [];
		}

		function buildAST(nodes) {
			_.each(nodes, function (node) {
				switch (node.type) {
					case 'TemplateMacro':
						push(node);
						break;
					case 'TemplateEndMacro':
						pop(node, ['TemplateMacro']);
						//append(node);
						break;

					case 'TemplateBlock':
						push(node);
						break;
					case 'TemplateEndBlock':
						pop(node, ['TemplateBlock']);
						//append(node);
						break;

					case 'TemplateRaw':
						append(node);
						break;

					case 'TemplateFor':
						push(node);
						break;
					case 'TemplateEndFor':
						pop(node, ['TemplateFor']);
						//append(node);
						break;

					case 'TemplateIf':
						push(node);
						break;
					case 'TemplateElseIf':
						pop(node, ['TemplateIf', 'TemplateElseIf']);
						push(node);
						break;
					case 'TemplateElse':
						pop(node, ['TemplateIf', 'TemplateElseIf']);
						push(node);
						break;
					case 'TemplateEndIf':
						pop(node, ['TemplateIf', 'TemplateElseIf', 'TemplateElse']);
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
						append(node);
				}
			});
			ast.push(treeNode);
		}

		function walkAST(tree, parents) {
			tree = tree || [];

			parents = parents || [];
			for (var i = 0, l = tree.length; i < l; ++i) {
				var node = tree[i];

				switch (node.type) {

					// JS related syntax
					// NOTE Needs to fit in a single code.push
					case 'Identifier':
						//code.push(`context.get("${node.name}")`);
						code.push('' + node.name);
						break;
					case 'Literal':
						code.push(JSON.stringify(node.value));
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
							var key = code.pop();
							walkAST([node.properties[a].value], [node].concat(parents));
							var value = code.pop();

							props.push(key + ': ' + value);
						}
						code.push('{' + props.join(',') + '}');
						break;
					case 'ArrayExpression':
						var elements = [];
						for (var a = 0, b = node.elements.length; a < b; ++a) {
							walkAST([node.elements[a]], [node].concat(parents));
							elements.push(code.pop());
						}
						code.push('[' + elements.join(',') + ']');
						break;
					//case 'ExpressionStatement':
					//	console.log(node.type, node.expression);
					//	walkAST([node.expression], [node].concat(parents));
					//	break;
					case 'MemberExpression':
						var obj, prop;
						if (node.object.type == 'Identifier') {
							obj = '"' + node.object.name + '"';
						} else {
							walkAST([node.object], [node].concat(parents));
							obj = code.pop();
						}
						if (node.property.type == 'Identifier') {
							prop = '"' + node.property.name + '"';
						} else {
							walkAST([node.property], [node].concat(parents));
							prop = code.pop();
						}
						if (node.object.type === 'MemberExpression') {
							code.push('context.get(' + obj + ', ' + prop + ')');
						} else {
							code.push('context.get(context.get(' + obj + '), ' + prop + ')');
						}
						break;
					case 'CallExpression':
						var callee;
						if (node.callee.type == 'Identifier') {
							callee = '(context.get("' + node.callee.name + '") || noop)';
						} else {
							walkAST([node.callee], [node].concat(parents));
							callee = '(' + code.pop() + ' || noop)';
							if (node.callee.type === 'MemberExpression') {
								var prop;
								if (node.callee.object.type == 'Identifier') {
									prop = '(context.get("' + node.callee.object.name + '") || noop)';
								} else {
									walkAST([node.callee.object], [node].concat(parents));
									prop = code.pop();
								}
								callee = callee + '.bind(' + prop + ')';
							}
						}
						var args;
						if (node.arguments && node.arguments.length) {
							walkAST(node.arguments, [node].concat(parents));
							args = code.pop();
						}
						code.push(callee + '(' + (args || "") + ')');
						break;
					case 'BinaryExpression':
						var left;
						if (node.left.type == 'Identifier') {
							left = 'context.get("' + node.left.name + '")';
						} else {
							walkAST([node.left], [node].concat(parents));
							left = code.pop();
						}
						var right;
						if (node.right.type == 'Identifier') {
							right = 'context.get("' + node.right.name + '")';
						} else {
							walkAST([node.right], [node].concat(parents));
							right = code.pop();
						}
						code.push(left + ' ' + node.operator + ' ' + right);
						break;

					// Template related syntax
					case 'TemplateRaw':
						code.push('output += ' + JSON.stringify(node.raw) + ';');
						break;
					case 'TemplateLiteral':
						var literal;
						if (node.value.type == 'Identifier') {
							literal = '"' + node.value.name + '"';
						} else {
							walkAST([node.value], [node].concat(parents));
							literal = code.pop();
						}
						switch (node.value.type) {
							case 'Identifier':
								code.push('output += context.get(' + literal + ');');
								break;
							default:
								code.push('output += ' + literal + ';');
						}
						break;
					case 'TemplateSet':
						var key;
						if (node.expression.left.type == 'Identifier') {
							key = '"' + node.expression.left.name + '"';
						} else {
							walkAST([node.expression.left], [node].concat(parents));
							key = code.pop();
						}
						walkAST([node.expression.right], [node].concat(parents));
						var value = code.pop();

						code.push('context.get()[' + key + '] ' + node.expression.operator + ' ' + value + ';');
						break;
					case 'TemplateExtend':
						walkAST([node.template], [node].concat(parents));
						extending = code.pop();
						break;
					case 'TemplateImport':
						code.push('context.set("' + node.as.name + '", this.getContext("' + node.template.value + '", options));');
						break;
					case 'TemplateMacro':
						code.push('context.set(context[0], "' + node.name.name + '", (function (context) { return function () { "use strict"; var output = "";');
						walkAST(node.children, [node].concat(parents));
						code.push('return output; }.bind(this); }.bind(this))(context.collapse()));');
						break;
					case 'TemplateBlock':
						code.push('var current = (function (context) { return function (parent) { "use strict"; context.set(\'parent\', parent || noop); var output = ""; ');
						walkAST(node.children, [node].concat(parents));
						code.push('return output; }; })(context.collapse());');
						code.push('var parent = context.get(context.get(context[0], "$$blocks"), "' + node.name.name + '");');
						code.push('if (!parent) { context.set(context.get(context[0], "$$blocks"), "' + node.name.name + '", current); }');
						code.push('else { var p = parent; while (true) { if (p.parent) { p = p.parent; continue; } p.parent = current; break; } }');
						if (extending === undefined) {
							code.push('output += context.bindParents(context.get(context.get(context[0], "$$blocks"), "' + node.name.name + '"))();');
						}
						break;
					case 'TemplateFor':
						var list;
						if (node.list.type == 'Identifier') {
							list = 'context.get("' + node.list.name + '")';
						} else {
							walkAST([node.list], [node].concat(parents));
							list = code.pop();
						}
						var key = node.key && node.key[0] && node.key[0].name;
						var val = node.value.name;

						code.push('var obj = (' + list + ' || []), keys;');
						code.push('var isa = obj instanceof Array || typeof obj.length === "number";');
						code.push('if (!isa) { keys = []; for (var k in obj) { keys.push(k); } } else { keys = (new Array(obj.length)).fill(null).map(function (v, i) { return i; }); }');
						code.push('context.push({');
						code.push('  _for: { object: obj, keys: keys },');
						code.push('  loop: {first: true, last: keys.length == 0, index: 1, index0: 0, length: keys.length}');
						code.push('});');
						code.push('keys.forEach(function (k) {');
						code.push('  context.push({' + val + ': context.get("_for").object[k] ' + (key ? ',' + key + ': k' : '') + '});');
						walkAST(node.children, [node].concat(parents));
						code.push('  context.pop(); context.get(\'loop\').index++; context.get(\'loop\').index0++; context.get(\'loop\').first = false; context.get(\'loop\').last = context.get(\'loop\').index == context.get(\'loop\').length;');
						code.push('});');
						break;
					case 'TemplateIf':
						var test;
						if (node.test.type == 'Identifier') {
							test = 'context.get("' + node.test.name + '")';
						} else {
							walkAST([node.test], [node].concat(parents));
							test = code.pop();
						}
						code.push('if (' + test + ') {');
						walkAST(node.children, [node].concat(parents));
						code.push('}');
						break;
					case 'TemplateElseIf':
						var test;
						if (node.test.type == 'Identifier') {
							test = 'context.get("' + node.test.name + '")';
						} else {
							walkAST([node.test], [node].concat(parents));
							test = code.pop();
						}
						code.push('else if (' + test + ') {');
						walkAST(node.children, [node].concat(parents));
						code.push('}');
						break;
					case 'TemplateElse':
						code.push('else {');
						walkAST(node.children, [node].concat(parents));
						code.push('}');
						break;

					case undefined:
						var c = [node];
						for (var a = i + 1; a < l && tree[a] && tree[a].type === undefined; ++a, ++i) {
							c.push(tree[a]);
						}
						code.push('output += ' + JSON.stringify(c.map(function (v) {
							return v;
						}).join('')) + ';');
						break;

					// Skip
					case 'TemplateComment':
						break;
					default:
						throw new Error('Unhandled AST type \'' + node.type + '\'.');
				}
			};
		}
	}
};
},{"./Parser":8,"lodash":3}],6:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _ = require('lodash');
var compile = require('./Compiler').compile;
var path = require('path');

var Environment = function () {
	function Environment(loader) {
		_classCallCheck(this, Environment);

		this.functions = {};
		this.globals = {};
		this.loader = loader;
	}

	_createClass(Environment, [{
		key: 'setFunction',
		value: function setFunction(name, fn) {
			if (typeof fn !== 'function') {
				throw new Error('Wrong parameter type for \'fn\', function expected.');
			}
			this.functions[name + ""] = fn;
		}
	}, {
		key: 'setFunctions',
		value: function setFunctions(fns) {
			_.merge(this.functions, {}, fns);
		}
	}, {
		key: 'setGlobal',
		value: function setGlobal(name, val) {
			this.globals[name + ""] = val;
		}
	}, {
		key: 'setGlobals',
		value: function setGlobals(vals) {
			_.merge(this.globals, {}, vals);
		}
	}, {
		key: 'render',
		value: function render(name, data, options) {
			var compiled = this._compileNameAndCache(name, options);
			var result = compiled(data);
			return result;
		}
	}, {
		key: 'getContext',
		value: function getContext(name, options) {
			var compiled = this._compileNameAndCache(name, options);
			var result = compiled();
			return result.context;
		}
	}, {
		key: '_compileNameAndCache',
		value: function _compileNameAndCache(name, options) {
			name = path.normalize(name);
			if (options && options.path) {
				name = path.normalize(path.join(path.dirname(options.path), name));
			}

			var source = this.loader.getSource(name);
			if (typeof source.cached !== 'funciton') {
				source.cached = this.compileString(source.buffer, _.extend({ path: name }, options));;
			}
			return source.cached;
		}
	}, {
		key: 'renderString',
		value: function renderString(str, data, options) {
			var compiled = this.compileString(str, options);
			var result = compiled(data);
			return result.output;
		}
	}, {
		key: 'contextString',
		value: function contextString(str, data, options) {
			var compiled = this.compileString(str, options);
			var result = compiled(data);
			return result.context;
		}
	}, {
		key: 'compileString',
		value: function compileString(str, options) {
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
							case "\t":
								len += 4;break;
							default:
								len += 1;break;
						}
					}

					e.stack = e.name + ': ' + e.message + '\n';
					e.stack += '    ' + line.replace(/(\r\n|\r)/g, "\n").replace(/\t/g, "    ") + '\n';
					e.stack += '    ' + new Array(len).join(' ') + '^';
				}
				throw e;
			}

			//console.log(compiled);

			try {
				return new Function('data', 'return function render (data) { ' + compiled + ' };')().bind(this);
			} catch (e) {
				throw new Error('Environment.compileString returned a malformed function.');
			}
		}
	}]);

	return Environment;
}();

module.exports = Environment;
},{"./Compiler":5,"lodash":3,"path":1}],7:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Loader = function () {
	function Loader() {
		_classCallCheck(this, Loader);
	}

	_createClass(Loader, [{
		key: "getSource",
		value: function getSource(name) {
			throw new Error('Load must extends this function.');
		}
	}]);

	return Loader;
}();

module.exports = Loader;
},{}],8:[function(require,module,exports){
"use strict";"use strict;";module.exports=function(){"use strict"; /*
   * Generated by PEG.js 0.9.0.
   *
   * http://pegjs.org/
   */function peg$subclass(child,parent){function ctor(){this.constructor=child;}ctor.prototype=parent.prototype;child.prototype=new ctor();}function peg$SyntaxError(message,expected,found,location){this.message=message;this.expected=expected;this.found=found;this.location=location;this.name="SyntaxError";if(typeof Error.captureStackTrace==="function"){Error.captureStackTrace(this,peg$SyntaxError);}}peg$subclass(peg$SyntaxError,Error);function peg$parse(input){var options=arguments.length>1?arguments[1]:{},parser=this,peg$FAILED={},peg$startRuleFunctions={Start:peg$parseStart},peg$startRuleFunction=peg$parseStart,peg$c0=function peg$c0(program){return program;},peg$c1={type:"any",description:"any character"},peg$c2={type:"other",description:"whitespace"},peg$c3="\t",peg$c4={type:"literal",value:"\t",description:"\"\\t\""},peg$c5="\x0B",peg$c6={type:"literal",value:"\x0B",description:"\"\\x0B\""},peg$c7="\f",peg$c8={type:"literal",value:"\f",description:"\"\\f\""},peg$c9=" ",peg$c10={type:"literal",value:" ",description:"\" \""},peg$c11="\xA0",peg$c12={type:"literal",value:"\xA0",description:"\"\\xA0\""},peg$c13="﻿",peg$c14={type:"literal",value:"﻿",description:"\"\\uFEFF\""},peg$c15=/^[\n\r\u2028\u2029]/,peg$c16={type:"class",value:"[\\n\\r\\u2028\\u2029]",description:"[\\n\\r\\u2028\\u2029]"},peg$c17={type:"other",description:"end of line"},peg$c18="\n",peg$c19={type:"literal",value:"\n",description:"\"\\n\""},peg$c20="\r\n",peg$c21={type:"literal",value:"\r\n",description:"\"\\r\\n\""},peg$c22="\r",peg$c23={type:"literal",value:"\r",description:"\"\\r\""},peg$c24="\u2028",peg$c25={type:"literal",value:"\u2028",description:"\"\\u2028\""},peg$c26="\u2029",peg$c27={type:"literal",value:"\u2029",description:"\"\\u2029\""},peg$c28={type:"other",description:"comment"},peg$c29="/*",peg$c30={type:"literal",value:"/*",description:"\"/*\""},peg$c31="*/",peg$c32={type:"literal",value:"*/",description:"\"*/\""},peg$c33="//",peg$c34={type:"literal",value:"//",description:"\"//\""},peg$c35=function peg$c35(name){return name;},peg$c36={type:"other",description:"identifier"},peg$c37=function peg$c37(head,tail){return {type:"Identifier",name:head+tail.join("")};},peg$c38="$",peg$c39={type:"literal",value:"$",description:"\"$\""},peg$c40="_",peg$c41={type:"literal",value:"_",description:"\"_\""},peg$c42="\\",peg$c43={type:"literal",value:"\\",description:"\"\\\\\""},peg$c44=function peg$c44(sequence){return sequence;},peg$c45="‌",peg$c46={type:"literal",value:"‌",description:"\"\\u200C\""},peg$c47="‍",peg$c48={type:"literal",value:"‍",description:"\"\\u200D\""},peg$c49=function peg$c49(){return {type:"Literal",value:null};},peg$c50=function peg$c50(){return {type:"Literal",value:true};},peg$c51=function peg$c51(){return {type:"Literal",value:false};},peg$c52={type:"other",description:"number"},peg$c53=function peg$c53(literal){return literal;},peg$c54=".",peg$c55={type:"literal",value:".",description:"\".\""},peg$c56=function peg$c56(){return {type:"Literal",value:parseFloat(text())};},peg$c57="0",peg$c58={type:"literal",value:"0",description:"\"0\""},peg$c59=/^[0-9]/,peg$c60={type:"class",value:"[0-9]",description:"[0-9]"},peg$c61=/^[1-9]/,peg$c62={type:"class",value:"[1-9]",description:"[1-9]"},peg$c63="e",peg$c64={type:"literal",value:"e",description:"\"e\""},peg$c65=/^[+\-]/,peg$c66={type:"class",value:"[+-]",description:"[+-]"},peg$c67="0x",peg$c68={type:"literal",value:"0x",description:"\"0x\""},peg$c69=function peg$c69(digits){return {type:"Literal",value:parseInt(digits,16)};},peg$c70=/^[0-9a-f]/i,peg$c71={type:"class",value:"[0-9a-f]i",description:"[0-9a-f]i"},peg$c72={type:"other",description:"string"},peg$c73="\"",peg$c74={type:"literal",value:"\"",description:"\"\\\"\""},peg$c75=function peg$c75(chars){return {type:"Literal",value:chars.join("")};},peg$c76="'",peg$c77={type:"literal",value:"'",description:"\"'\""},peg$c78=function peg$c78(){return text();},peg$c79=function peg$c79(){return "";},peg$c80=function peg$c80(){return "\0";},peg$c81="b",peg$c82={type:"literal",value:"b",description:"\"b\""},peg$c83=function peg$c83(){return "\b";},peg$c84="f",peg$c85={type:"literal",value:"f",description:"\"f\""},peg$c86=function peg$c86(){return "\f";},peg$c87="n",peg$c88={type:"literal",value:"n",description:"\"n\""},peg$c89=function peg$c89(){return "\n";},peg$c90="r",peg$c91={type:"literal",value:"r",description:"\"r\""},peg$c92=function peg$c92(){return "\r";},peg$c93="t",peg$c94={type:"literal",value:"t",description:"\"t\""},peg$c95=function peg$c95(){return "\t";},peg$c96="v",peg$c97={type:"literal",value:"v",description:"\"v\""},peg$c98=function peg$c98(){return "\x0B";},peg$c99="x",peg$c100={type:"literal",value:"x",description:"\"x\""},peg$c101="u",peg$c102={type:"literal",value:"u",description:"\"u\""},peg$c103=function peg$c103(digits){return String.fromCharCode(parseInt(digits,16));},peg$c104={type:"other",description:"regular expression"},peg$c105="/",peg$c106={type:"literal",value:"/",description:"\"/\""},peg$c107=function peg$c107(pattern,flags){var value;try{value=new RegExp(pattern,flags);}catch(e){error(e.message);}return {type:"Literal",value:value};},peg$c108=/^[*\\\/[]/,peg$c109={type:"class",value:"[*\\\\/[]",description:"[*\\\\/[]"},peg$c110=/^[\\\/[]/,peg$c111={type:"class",value:"[\\\\/[]",description:"[\\\\/[]"},peg$c112="[",peg$c113={type:"literal",value:"[",description:"\"[\""},peg$c114="]",peg$c115={type:"literal",value:"]",description:"\"]\""},peg$c116=/^[\]\\]/,peg$c117={type:"class",value:"[\\]\\\\]",description:"[\\]\\\\]"},peg$c118=/^[a-z\xB5\xDF-\xF6\xF8-\xFF\u0101\u0103\u0105\u0107\u0109\u010B\u010D\u010F\u0111\u0113\u0115\u0117\u0119\u011B\u011D\u011F\u0121\u0123\u0125\u0127\u0129\u012B\u012D\u012F\u0131\u0133\u0135\u0137-\u0138\u013A\u013C\u013E\u0140\u0142\u0144\u0146\u0148-\u0149\u014B\u014D\u014F\u0151\u0153\u0155\u0157\u0159\u015B\u015D\u015F\u0161\u0163\u0165\u0167\u0169\u016B\u016D\u016F\u0171\u0173\u0175\u0177\u017A\u017C\u017E-\u0180\u0183\u0185\u0188\u018C-\u018D\u0192\u0195\u0199-\u019B\u019E\u01A1\u01A3\u01A5\u01A8\u01AA-\u01AB\u01AD\u01B0\u01B4\u01B6\u01B9-\u01BA\u01BD-\u01BF\u01C6\u01C9\u01CC\u01CE\u01D0\u01D2\u01D4\u01D6\u01D8\u01DA\u01DC-\u01DD\u01DF\u01E1\u01E3\u01E5\u01E7\u01E9\u01EB\u01ED\u01EF-\u01F0\u01F3\u01F5\u01F9\u01FB\u01FD\u01FF\u0201\u0203\u0205\u0207\u0209\u020B\u020D\u020F\u0211\u0213\u0215\u0217\u0219\u021B\u021D\u021F\u0221\u0223\u0225\u0227\u0229\u022B\u022D\u022F\u0231\u0233-\u0239\u023C\u023F-\u0240\u0242\u0247\u0249\u024B\u024D\u024F-\u0293\u0295-\u02AF\u0371\u0373\u0377\u037B-\u037D\u0390\u03AC-\u03CE\u03D0-\u03D1\u03D5-\u03D7\u03D9\u03DB\u03DD\u03DF\u03E1\u03E3\u03E5\u03E7\u03E9\u03EB\u03ED\u03EF-\u03F3\u03F5\u03F8\u03FB-\u03FC\u0430-\u045F\u0461\u0463\u0465\u0467\u0469\u046B\u046D\u046F\u0471\u0473\u0475\u0477\u0479\u047B\u047D\u047F\u0481\u048B\u048D\u048F\u0491\u0493\u0495\u0497\u0499\u049B\u049D\u049F\u04A1\u04A3\u04A5\u04A7\u04A9\u04AB\u04AD\u04AF\u04B1\u04B3\u04B5\u04B7\u04B9\u04BB\u04BD\u04BF\u04C2\u04C4\u04C6\u04C8\u04CA\u04CC\u04CE-\u04CF\u04D1\u04D3\u04D5\u04D7\u04D9\u04DB\u04DD\u04DF\u04E1\u04E3\u04E5\u04E7\u04E9\u04EB\u04ED\u04EF\u04F1\u04F3\u04F5\u04F7\u04F9\u04FB\u04FD\u04FF\u0501\u0503\u0505\u0507\u0509\u050B\u050D\u050F\u0511\u0513\u0515\u0517\u0519\u051B\u051D\u051F\u0521\u0523\u0525\u0527\u0529\u052B\u052D\u052F\u0561-\u0587\u13F8-\u13FD\u1D00-\u1D2B\u1D6B-\u1D77\u1D79-\u1D9A\u1E01\u1E03\u1E05\u1E07\u1E09\u1E0B\u1E0D\u1E0F\u1E11\u1E13\u1E15\u1E17\u1E19\u1E1B\u1E1D\u1E1F\u1E21\u1E23\u1E25\u1E27\u1E29\u1E2B\u1E2D\u1E2F\u1E31\u1E33\u1E35\u1E37\u1E39\u1E3B\u1E3D\u1E3F\u1E41\u1E43\u1E45\u1E47\u1E49\u1E4B\u1E4D\u1E4F\u1E51\u1E53\u1E55\u1E57\u1E59\u1E5B\u1E5D\u1E5F\u1E61\u1E63\u1E65\u1E67\u1E69\u1E6B\u1E6D\u1E6F\u1E71\u1E73\u1E75\u1E77\u1E79\u1E7B\u1E7D\u1E7F\u1E81\u1E83\u1E85\u1E87\u1E89\u1E8B\u1E8D\u1E8F\u1E91\u1E93\u1E95-\u1E9D\u1E9F\u1EA1\u1EA3\u1EA5\u1EA7\u1EA9\u1EAB\u1EAD\u1EAF\u1EB1\u1EB3\u1EB5\u1EB7\u1EB9\u1EBB\u1EBD\u1EBF\u1EC1\u1EC3\u1EC5\u1EC7\u1EC9\u1ECB\u1ECD\u1ECF\u1ED1\u1ED3\u1ED5\u1ED7\u1ED9\u1EDB\u1EDD\u1EDF\u1EE1\u1EE3\u1EE5\u1EE7\u1EE9\u1EEB\u1EED\u1EEF\u1EF1\u1EF3\u1EF5\u1EF7\u1EF9\u1EFB\u1EFD\u1EFF-\u1F07\u1F10-\u1F15\u1F20-\u1F27\u1F30-\u1F37\u1F40-\u1F45\u1F50-\u1F57\u1F60-\u1F67\u1F70-\u1F7D\u1F80-\u1F87\u1F90-\u1F97\u1FA0-\u1FA7\u1FB0-\u1FB4\u1FB6-\u1FB7\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FC7\u1FD0-\u1FD3\u1FD6-\u1FD7\u1FE0-\u1FE7\u1FF2-\u1FF4\u1FF6-\u1FF7\u210A\u210E-\u210F\u2113\u212F\u2134\u2139\u213C-\u213D\u2146-\u2149\u214E\u2184\u2C30-\u2C5E\u2C61\u2C65-\u2C66\u2C68\u2C6A\u2C6C\u2C71\u2C73-\u2C74\u2C76-\u2C7B\u2C81\u2C83\u2C85\u2C87\u2C89\u2C8B\u2C8D\u2C8F\u2C91\u2C93\u2C95\u2C97\u2C99\u2C9B\u2C9D\u2C9F\u2CA1\u2CA3\u2CA5\u2CA7\u2CA9\u2CAB\u2CAD\u2CAF\u2CB1\u2CB3\u2CB5\u2CB7\u2CB9\u2CBB\u2CBD\u2CBF\u2CC1\u2CC3\u2CC5\u2CC7\u2CC9\u2CCB\u2CCD\u2CCF\u2CD1\u2CD3\u2CD5\u2CD7\u2CD9\u2CDB\u2CDD\u2CDF\u2CE1\u2CE3-\u2CE4\u2CEC\u2CEE\u2CF3\u2D00-\u2D25\u2D27\u2D2D\uA641\uA643\uA645\uA647\uA649\uA64B\uA64D\uA64F\uA651\uA653\uA655\uA657\uA659\uA65B\uA65D\uA65F\uA661\uA663\uA665\uA667\uA669\uA66B\uA66D\uA681\uA683\uA685\uA687\uA689\uA68B\uA68D\uA68F\uA691\uA693\uA695\uA697\uA699\uA69B\uA723\uA725\uA727\uA729\uA72B\uA72D\uA72F-\uA731\uA733\uA735\uA737\uA739\uA73B\uA73D\uA73F\uA741\uA743\uA745\uA747\uA749\uA74B\uA74D\uA74F\uA751\uA753\uA755\uA757\uA759\uA75B\uA75D\uA75F\uA761\uA763\uA765\uA767\uA769\uA76B\uA76D\uA76F\uA771-\uA778\uA77A\uA77C\uA77F\uA781\uA783\uA785\uA787\uA78C\uA78E\uA791\uA793-\uA795\uA797\uA799\uA79B\uA79D\uA79F\uA7A1\uA7A3\uA7A5\uA7A7\uA7A9\uA7B5\uA7B7\uA7FA\uAB30-\uAB5A\uAB60-\uAB65\uAB70-\uABBF\uFB00-\uFB06\uFB13-\uFB17\uFF41-\uFF5A]/,peg$c119={type:"class",value:"[\\u0061-\\u007A\\u00B5\\u00DF-\\u00F6\\u00F8-\\u00FF\\u0101\\u0103\\u0105\\u0107\\u0109\\u010B\\u010D\\u010F\\u0111\\u0113\\u0115\\u0117\\u0119\\u011B\\u011D\\u011F\\u0121\\u0123\\u0125\\u0127\\u0129\\u012B\\u012D\\u012F\\u0131\\u0133\\u0135\\u0137-\\u0138\\u013A\\u013C\\u013E\\u0140\\u0142\\u0144\\u0146\\u0148-\\u0149\\u014B\\u014D\\u014F\\u0151\\u0153\\u0155\\u0157\\u0159\\u015B\\u015D\\u015F\\u0161\\u0163\\u0165\\u0167\\u0169\\u016B\\u016D\\u016F\\u0171\\u0173\\u0175\\u0177\\u017A\\u017C\\u017E-\\u0180\\u0183\\u0185\\u0188\\u018C-\\u018D\\u0192\\u0195\\u0199-\\u019B\\u019E\\u01A1\\u01A3\\u01A5\\u01A8\\u01AA-\\u01AB\\u01AD\\u01B0\\u01B4\\u01B6\\u01B9-\\u01BA\\u01BD-\\u01BF\\u01C6\\u01C9\\u01CC\\u01CE\\u01D0\\u01D2\\u01D4\\u01D6\\u01D8\\u01DA\\u01DC-\\u01DD\\u01DF\\u01E1\\u01E3\\u01E5\\u01E7\\u01E9\\u01EB\\u01ED\\u01EF-\\u01F0\\u01F3\\u01F5\\u01F9\\u01FB\\u01FD\\u01FF\\u0201\\u0203\\u0205\\u0207\\u0209\\u020B\\u020D\\u020F\\u0211\\u0213\\u0215\\u0217\\u0219\\u021B\\u021D\\u021F\\u0221\\u0223\\u0225\\u0227\\u0229\\u022B\\u022D\\u022F\\u0231\\u0233-\\u0239\\u023C\\u023F-\\u0240\\u0242\\u0247\\u0249\\u024B\\u024D\\u024F-\\u0293\\u0295-\\u02AF\\u0371\\u0373\\u0377\\u037B-\\u037D\\u0390\\u03AC-\\u03CE\\u03D0-\\u03D1\\u03D5-\\u03D7\\u03D9\\u03DB\\u03DD\\u03DF\\u03E1\\u03E3\\u03E5\\u03E7\\u03E9\\u03EB\\u03ED\\u03EF-\\u03F3\\u03F5\\u03F8\\u03FB-\\u03FC\\u0430-\\u045F\\u0461\\u0463\\u0465\\u0467\\u0469\\u046B\\u046D\\u046F\\u0471\\u0473\\u0475\\u0477\\u0479\\u047B\\u047D\\u047F\\u0481\\u048B\\u048D\\u048F\\u0491\\u0493\\u0495\\u0497\\u0499\\u049B\\u049D\\u049F\\u04A1\\u04A3\\u04A5\\u04A7\\u04A9\\u04AB\\u04AD\\u04AF\\u04B1\\u04B3\\u04B5\\u04B7\\u04B9\\u04BB\\u04BD\\u04BF\\u04C2\\u04C4\\u04C6\\u04C8\\u04CA\\u04CC\\u04CE-\\u04CF\\u04D1\\u04D3\\u04D5\\u04D7\\u04D9\\u04DB\\u04DD\\u04DF\\u04E1\\u04E3\\u04E5\\u04E7\\u04E9\\u04EB\\u04ED\\u04EF\\u04F1\\u04F3\\u04F5\\u04F7\\u04F9\\u04FB\\u04FD\\u04FF\\u0501\\u0503\\u0505\\u0507\\u0509\\u050B\\u050D\\u050F\\u0511\\u0513\\u0515\\u0517\\u0519\\u051B\\u051D\\u051F\\u0521\\u0523\\u0525\\u0527\\u0529\\u052B\\u052D\\u052F\\u0561-\\u0587\\u13F8-\\u13FD\\u1D00-\\u1D2B\\u1D6B-\\u1D77\\u1D79-\\u1D9A\\u1E01\\u1E03\\u1E05\\u1E07\\u1E09\\u1E0B\\u1E0D\\u1E0F\\u1E11\\u1E13\\u1E15\\u1E17\\u1E19\\u1E1B\\u1E1D\\u1E1F\\u1E21\\u1E23\\u1E25\\u1E27\\u1E29\\u1E2B\\u1E2D\\u1E2F\\u1E31\\u1E33\\u1E35\\u1E37\\u1E39\\u1E3B\\u1E3D\\u1E3F\\u1E41\\u1E43\\u1E45\\u1E47\\u1E49\\u1E4B\\u1E4D\\u1E4F\\u1E51\\u1E53\\u1E55\\u1E57\\u1E59\\u1E5B\\u1E5D\\u1E5F\\u1E61\\u1E63\\u1E65\\u1E67\\u1E69\\u1E6B\\u1E6D\\u1E6F\\u1E71\\u1E73\\u1E75\\u1E77\\u1E79\\u1E7B\\u1E7D\\u1E7F\\u1E81\\u1E83\\u1E85\\u1E87\\u1E89\\u1E8B\\u1E8D\\u1E8F\\u1E91\\u1E93\\u1E95-\\u1E9D\\u1E9F\\u1EA1\\u1EA3\\u1EA5\\u1EA7\\u1EA9\\u1EAB\\u1EAD\\u1EAF\\u1EB1\\u1EB3\\u1EB5\\u1EB7\\u1EB9\\u1EBB\\u1EBD\\u1EBF\\u1EC1\\u1EC3\\u1EC5\\u1EC7\\u1EC9\\u1ECB\\u1ECD\\u1ECF\\u1ED1\\u1ED3\\u1ED5\\u1ED7\\u1ED9\\u1EDB\\u1EDD\\u1EDF\\u1EE1\\u1EE3\\u1EE5\\u1EE7\\u1EE9\\u1EEB\\u1EED\\u1EEF\\u1EF1\\u1EF3\\u1EF5\\u1EF7\\u1EF9\\u1EFB\\u1EFD\\u1EFF-\\u1F07\\u1F10-\\u1F15\\u1F20-\\u1F27\\u1F30-\\u1F37\\u1F40-\\u1F45\\u1F50-\\u1F57\\u1F60-\\u1F67\\u1F70-\\u1F7D\\u1F80-\\u1F87\\u1F90-\\u1F97\\u1FA0-\\u1FA7\\u1FB0-\\u1FB4\\u1FB6-\\u1FB7\\u1FBE\\u1FC2-\\u1FC4\\u1FC6-\\u1FC7\\u1FD0-\\u1FD3\\u1FD6-\\u1FD7\\u1FE0-\\u1FE7\\u1FF2-\\u1FF4\\u1FF6-\\u1FF7\\u210A\\u210E-\\u210F\\u2113\\u212F\\u2134\\u2139\\u213C-\\u213D\\u2146-\\u2149\\u214E\\u2184\\u2C30-\\u2C5E\\u2C61\\u2C65-\\u2C66\\u2C68\\u2C6A\\u2C6C\\u2C71\\u2C73-\\u2C74\\u2C76-\\u2C7B\\u2C81\\u2C83\\u2C85\\u2C87\\u2C89\\u2C8B\\u2C8D\\u2C8F\\u2C91\\u2C93\\u2C95\\u2C97\\u2C99\\u2C9B\\u2C9D\\u2C9F\\u2CA1\\u2CA3\\u2CA5\\u2CA7\\u2CA9\\u2CAB\\u2CAD\\u2CAF\\u2CB1\\u2CB3\\u2CB5\\u2CB7\\u2CB9\\u2CBB\\u2CBD\\u2CBF\\u2CC1\\u2CC3\\u2CC5\\u2CC7\\u2CC9\\u2CCB\\u2CCD\\u2CCF\\u2CD1\\u2CD3\\u2CD5\\u2CD7\\u2CD9\\u2CDB\\u2CDD\\u2CDF\\u2CE1\\u2CE3-\\u2CE4\\u2CEC\\u2CEE\\u2CF3\\u2D00-\\u2D25\\u2D27\\u2D2D\\uA641\\uA643\\uA645\\uA647\\uA649\\uA64B\\uA64D\\uA64F\\uA651\\uA653\\uA655\\uA657\\uA659\\uA65B\\uA65D\\uA65F\\uA661\\uA663\\uA665\\uA667\\uA669\\uA66B\\uA66D\\uA681\\uA683\\uA685\\uA687\\uA689\\uA68B\\uA68D\\uA68F\\uA691\\uA693\\uA695\\uA697\\uA699\\uA69B\\uA723\\uA725\\uA727\\uA729\\uA72B\\uA72D\\uA72F-\\uA731\\uA733\\uA735\\uA737\\uA739\\uA73B\\uA73D\\uA73F\\uA741\\uA743\\uA745\\uA747\\uA749\\uA74B\\uA74D\\uA74F\\uA751\\uA753\\uA755\\uA757\\uA759\\uA75B\\uA75D\\uA75F\\uA761\\uA763\\uA765\\uA767\\uA769\\uA76B\\uA76D\\uA76F\\uA771-\\uA778\\uA77A\\uA77C\\uA77F\\uA781\\uA783\\uA785\\uA787\\uA78C\\uA78E\\uA791\\uA793-\\uA795\\uA797\\uA799\\uA79B\\uA79D\\uA79F\\uA7A1\\uA7A3\\uA7A5\\uA7A7\\uA7A9\\uA7B5\\uA7B7\\uA7FA\\uAB30-\\uAB5A\\uAB60-\\uAB65\\uAB70-\\uABBF\\uFB00-\\uFB06\\uFB13-\\uFB17\\uFF41-\\uFF5A]",description:"[\\u0061-\\u007A\\u00B5\\u00DF-\\u00F6\\u00F8-\\u00FF\\u0101\\u0103\\u0105\\u0107\\u0109\\u010B\\u010D\\u010F\\u0111\\u0113\\u0115\\u0117\\u0119\\u011B\\u011D\\u011F\\u0121\\u0123\\u0125\\u0127\\u0129\\u012B\\u012D\\u012F\\u0131\\u0133\\u0135\\u0137-\\u0138\\u013A\\u013C\\u013E\\u0140\\u0142\\u0144\\u0146\\u0148-\\u0149\\u014B\\u014D\\u014F\\u0151\\u0153\\u0155\\u0157\\u0159\\u015B\\u015D\\u015F\\u0161\\u0163\\u0165\\u0167\\u0169\\u016B\\u016D\\u016F\\u0171\\u0173\\u0175\\u0177\\u017A\\u017C\\u017E-\\u0180\\u0183\\u0185\\u0188\\u018C-\\u018D\\u0192\\u0195\\u0199-\\u019B\\u019E\\u01A1\\u01A3\\u01A5\\u01A8\\u01AA-\\u01AB\\u01AD\\u01B0\\u01B4\\u01B6\\u01B9-\\u01BA\\u01BD-\\u01BF\\u01C6\\u01C9\\u01CC\\u01CE\\u01D0\\u01D2\\u01D4\\u01D6\\u01D8\\u01DA\\u01DC-\\u01DD\\u01DF\\u01E1\\u01E3\\u01E5\\u01E7\\u01E9\\u01EB\\u01ED\\u01EF-\\u01F0\\u01F3\\u01F5\\u01F9\\u01FB\\u01FD\\u01FF\\u0201\\u0203\\u0205\\u0207\\u0209\\u020B\\u020D\\u020F\\u0211\\u0213\\u0215\\u0217\\u0219\\u021B\\u021D\\u021F\\u0221\\u0223\\u0225\\u0227\\u0229\\u022B\\u022D\\u022F\\u0231\\u0233-\\u0239\\u023C\\u023F-\\u0240\\u0242\\u0247\\u0249\\u024B\\u024D\\u024F-\\u0293\\u0295-\\u02AF\\u0371\\u0373\\u0377\\u037B-\\u037D\\u0390\\u03AC-\\u03CE\\u03D0-\\u03D1\\u03D5-\\u03D7\\u03D9\\u03DB\\u03DD\\u03DF\\u03E1\\u03E3\\u03E5\\u03E7\\u03E9\\u03EB\\u03ED\\u03EF-\\u03F3\\u03F5\\u03F8\\u03FB-\\u03FC\\u0430-\\u045F\\u0461\\u0463\\u0465\\u0467\\u0469\\u046B\\u046D\\u046F\\u0471\\u0473\\u0475\\u0477\\u0479\\u047B\\u047D\\u047F\\u0481\\u048B\\u048D\\u048F\\u0491\\u0493\\u0495\\u0497\\u0499\\u049B\\u049D\\u049F\\u04A1\\u04A3\\u04A5\\u04A7\\u04A9\\u04AB\\u04AD\\u04AF\\u04B1\\u04B3\\u04B5\\u04B7\\u04B9\\u04BB\\u04BD\\u04BF\\u04C2\\u04C4\\u04C6\\u04C8\\u04CA\\u04CC\\u04CE-\\u04CF\\u04D1\\u04D3\\u04D5\\u04D7\\u04D9\\u04DB\\u04DD\\u04DF\\u04E1\\u04E3\\u04E5\\u04E7\\u04E9\\u04EB\\u04ED\\u04EF\\u04F1\\u04F3\\u04F5\\u04F7\\u04F9\\u04FB\\u04FD\\u04FF\\u0501\\u0503\\u0505\\u0507\\u0509\\u050B\\u050D\\u050F\\u0511\\u0513\\u0515\\u0517\\u0519\\u051B\\u051D\\u051F\\u0521\\u0523\\u0525\\u0527\\u0529\\u052B\\u052D\\u052F\\u0561-\\u0587\\u13F8-\\u13FD\\u1D00-\\u1D2B\\u1D6B-\\u1D77\\u1D79-\\u1D9A\\u1E01\\u1E03\\u1E05\\u1E07\\u1E09\\u1E0B\\u1E0D\\u1E0F\\u1E11\\u1E13\\u1E15\\u1E17\\u1E19\\u1E1B\\u1E1D\\u1E1F\\u1E21\\u1E23\\u1E25\\u1E27\\u1E29\\u1E2B\\u1E2D\\u1E2F\\u1E31\\u1E33\\u1E35\\u1E37\\u1E39\\u1E3B\\u1E3D\\u1E3F\\u1E41\\u1E43\\u1E45\\u1E47\\u1E49\\u1E4B\\u1E4D\\u1E4F\\u1E51\\u1E53\\u1E55\\u1E57\\u1E59\\u1E5B\\u1E5D\\u1E5F\\u1E61\\u1E63\\u1E65\\u1E67\\u1E69\\u1E6B\\u1E6D\\u1E6F\\u1E71\\u1E73\\u1E75\\u1E77\\u1E79\\u1E7B\\u1E7D\\u1E7F\\u1E81\\u1E83\\u1E85\\u1E87\\u1E89\\u1E8B\\u1E8D\\u1E8F\\u1E91\\u1E93\\u1E95-\\u1E9D\\u1E9F\\u1EA1\\u1EA3\\u1EA5\\u1EA7\\u1EA9\\u1EAB\\u1EAD\\u1EAF\\u1EB1\\u1EB3\\u1EB5\\u1EB7\\u1EB9\\u1EBB\\u1EBD\\u1EBF\\u1EC1\\u1EC3\\u1EC5\\u1EC7\\u1EC9\\u1ECB\\u1ECD\\u1ECF\\u1ED1\\u1ED3\\u1ED5\\u1ED7\\u1ED9\\u1EDB\\u1EDD\\u1EDF\\u1EE1\\u1EE3\\u1EE5\\u1EE7\\u1EE9\\u1EEB\\u1EED\\u1EEF\\u1EF1\\u1EF3\\u1EF5\\u1EF7\\u1EF9\\u1EFB\\u1EFD\\u1EFF-\\u1F07\\u1F10-\\u1F15\\u1F20-\\u1F27\\u1F30-\\u1F37\\u1F40-\\u1F45\\u1F50-\\u1F57\\u1F60-\\u1F67\\u1F70-\\u1F7D\\u1F80-\\u1F87\\u1F90-\\u1F97\\u1FA0-\\u1FA7\\u1FB0-\\u1FB4\\u1FB6-\\u1FB7\\u1FBE\\u1FC2-\\u1FC4\\u1FC6-\\u1FC7\\u1FD0-\\u1FD3\\u1FD6-\\u1FD7\\u1FE0-\\u1FE7\\u1FF2-\\u1FF4\\u1FF6-\\u1FF7\\u210A\\u210E-\\u210F\\u2113\\u212F\\u2134\\u2139\\u213C-\\u213D\\u2146-\\u2149\\u214E\\u2184\\u2C30-\\u2C5E\\u2C61\\u2C65-\\u2C66\\u2C68\\u2C6A\\u2C6C\\u2C71\\u2C73-\\u2C74\\u2C76-\\u2C7B\\u2C81\\u2C83\\u2C85\\u2C87\\u2C89\\u2C8B\\u2C8D\\u2C8F\\u2C91\\u2C93\\u2C95\\u2C97\\u2C99\\u2C9B\\u2C9D\\u2C9F\\u2CA1\\u2CA3\\u2CA5\\u2CA7\\u2CA9\\u2CAB\\u2CAD\\u2CAF\\u2CB1\\u2CB3\\u2CB5\\u2CB7\\u2CB9\\u2CBB\\u2CBD\\u2CBF\\u2CC1\\u2CC3\\u2CC5\\u2CC7\\u2CC9\\u2CCB\\u2CCD\\u2CCF\\u2CD1\\u2CD3\\u2CD5\\u2CD7\\u2CD9\\u2CDB\\u2CDD\\u2CDF\\u2CE1\\u2CE3-\\u2CE4\\u2CEC\\u2CEE\\u2CF3\\u2D00-\\u2D25\\u2D27\\u2D2D\\uA641\\uA643\\uA645\\uA647\\uA649\\uA64B\\uA64D\\uA64F\\uA651\\uA653\\uA655\\uA657\\uA659\\uA65B\\uA65D\\uA65F\\uA661\\uA663\\uA665\\uA667\\uA669\\uA66B\\uA66D\\uA681\\uA683\\uA685\\uA687\\uA689\\uA68B\\uA68D\\uA68F\\uA691\\uA693\\uA695\\uA697\\uA699\\uA69B\\uA723\\uA725\\uA727\\uA729\\uA72B\\uA72D\\uA72F-\\uA731\\uA733\\uA735\\uA737\\uA739\\uA73B\\uA73D\\uA73F\\uA741\\uA743\\uA745\\uA747\\uA749\\uA74B\\uA74D\\uA74F\\uA751\\uA753\\uA755\\uA757\\uA759\\uA75B\\uA75D\\uA75F\\uA761\\uA763\\uA765\\uA767\\uA769\\uA76B\\uA76D\\uA76F\\uA771-\\uA778\\uA77A\\uA77C\\uA77F\\uA781\\uA783\\uA785\\uA787\\uA78C\\uA78E\\uA791\\uA793-\\uA795\\uA797\\uA799\\uA79B\\uA79D\\uA79F\\uA7A1\\uA7A3\\uA7A5\\uA7A7\\uA7A9\\uA7B5\\uA7B7\\uA7FA\\uAB30-\\uAB5A\\uAB60-\\uAB65\\uAB70-\\uABBF\\uFB00-\\uFB06\\uFB13-\\uFB17\\uFF41-\\uFF5A]"},peg$c120=/^[\u02B0-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0374\u037A\u0559\u0640\u06E5-\u06E6\u07F4-\u07F5\u07FA\u081A\u0824\u0828\u0971\u0E46\u0EC6\u10FC\u17D7\u1843\u1AA7\u1C78-\u1C7D\u1D2C-\u1D6A\u1D78\u1D9B-\u1DBF\u2071\u207F\u2090-\u209C\u2C7C-\u2C7D\u2D6F\u2E2F\u3005\u3031-\u3035\u303B\u309D-\u309E\u30FC-\u30FE\uA015\uA4F8-\uA4FD\uA60C\uA67F\uA69C-\uA69D\uA717-\uA71F\uA770\uA788\uA7F8-\uA7F9\uA9CF\uA9E6\uAA70\uAADD\uAAF3-\uAAF4\uAB5C-\uAB5F\uFF70\uFF9E-\uFF9F]/,peg$c121={type:"class",value:"[\\u02B0-\\u02C1\\u02C6-\\u02D1\\u02E0-\\u02E4\\u02EC\\u02EE\\u0374\\u037A\\u0559\\u0640\\u06E5-\\u06E6\\u07F4-\\u07F5\\u07FA\\u081A\\u0824\\u0828\\u0971\\u0E46\\u0EC6\\u10FC\\u17D7\\u1843\\u1AA7\\u1C78-\\u1C7D\\u1D2C-\\u1D6A\\u1D78\\u1D9B-\\u1DBF\\u2071\\u207F\\u2090-\\u209C\\u2C7C-\\u2C7D\\u2D6F\\u2E2F\\u3005\\u3031-\\u3035\\u303B\\u309D-\\u309E\\u30FC-\\u30FE\\uA015\\uA4F8-\\uA4FD\\uA60C\\uA67F\\uA69C-\\uA69D\\uA717-\\uA71F\\uA770\\uA788\\uA7F8-\\uA7F9\\uA9CF\\uA9E6\\uAA70\\uAADD\\uAAF3-\\uAAF4\\uAB5C-\\uAB5F\\uFF70\\uFF9E-\\uFF9F]",description:"[\\u02B0-\\u02C1\\u02C6-\\u02D1\\u02E0-\\u02E4\\u02EC\\u02EE\\u0374\\u037A\\u0559\\u0640\\u06E5-\\u06E6\\u07F4-\\u07F5\\u07FA\\u081A\\u0824\\u0828\\u0971\\u0E46\\u0EC6\\u10FC\\u17D7\\u1843\\u1AA7\\u1C78-\\u1C7D\\u1D2C-\\u1D6A\\u1D78\\u1D9B-\\u1DBF\\u2071\\u207F\\u2090-\\u209C\\u2C7C-\\u2C7D\\u2D6F\\u2E2F\\u3005\\u3031-\\u3035\\u303B\\u309D-\\u309E\\u30FC-\\u30FE\\uA015\\uA4F8-\\uA4FD\\uA60C\\uA67F\\uA69C-\\uA69D\\uA717-\\uA71F\\uA770\\uA788\\uA7F8-\\uA7F9\\uA9CF\\uA9E6\\uAA70\\uAADD\\uAAF3-\\uAAF4\\uAB5C-\\uAB5F\\uFF70\\uFF9E-\\uFF9F]"},peg$c122=/^[\xAA\xBA\u01BB\u01C0-\u01C3\u0294\u05D0-\u05EA\u05F0-\u05F2\u0620-\u063F\u0641-\u064A\u066E-\u066F\u0671-\u06D3\u06D5\u06EE-\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u0800-\u0815\u0840-\u0858\u08A0-\u08B4\u0904-\u0939\u093D\u0950\u0958-\u0961\u0972-\u0980\u0985-\u098C\u098F-\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC-\u09DD\u09DF-\u09E1\u09F0-\u09F1\u0A05-\u0A0A\u0A0F-\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32-\u0A33\u0A35-\u0A36\u0A38-\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2-\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0-\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F-\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32-\u0B33\u0B35-\u0B39\u0B3D\u0B5C-\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99-\u0B9A\u0B9C\u0B9E-\u0B9F\u0BA3-\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60-\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0-\u0CE1\u0CF1-\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32-\u0E33\u0E40-\u0E45\u0E81-\u0E82\u0E84\u0E87-\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA-\u0EAB\u0EAD-\u0EB0\u0EB2-\u0EB3\u0EBD\u0EC0-\u0EC4\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065-\u1066\u106E-\u1070\u1075-\u1081\u108E\u10D0-\u10FA\u10FD-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16F1-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17DC\u1820-\u1842\u1844-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE-\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C77\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5-\u1CF6\u2135-\u2138\u2D30-\u2D67\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u3006\u303C\u3041-\u3096\u309F\u30A1-\u30FA\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA014\uA016-\uA48C\uA4D0-\uA4F7\uA500-\uA60B\uA610-\uA61F\uA62A-\uA62B\uA66E\uA6A0-\uA6E5\uA78F\uA7F7\uA7FB-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9E0-\uA9E4\uA9E7-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA6F\uAA71-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5-\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADC\uAAE0-\uAAEA\uAAF2\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40-\uFB41\uFB43-\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF66-\uFF6F\uFF71-\uFF9D\uFFA0-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]/,peg$c123={type:"class",value:"[\\u00AA\\u00BA\\u01BB\\u01C0-\\u01C3\\u0294\\u05D0-\\u05EA\\u05F0-\\u05F2\\u0620-\\u063F\\u0641-\\u064A\\u066E-\\u066F\\u0671-\\u06D3\\u06D5\\u06EE-\\u06EF\\u06FA-\\u06FC\\u06FF\\u0710\\u0712-\\u072F\\u074D-\\u07A5\\u07B1\\u07CA-\\u07EA\\u0800-\\u0815\\u0840-\\u0858\\u08A0-\\u08B4\\u0904-\\u0939\\u093D\\u0950\\u0958-\\u0961\\u0972-\\u0980\\u0985-\\u098C\\u098F-\\u0990\\u0993-\\u09A8\\u09AA-\\u09B0\\u09B2\\u09B6-\\u09B9\\u09BD\\u09CE\\u09DC-\\u09DD\\u09DF-\\u09E1\\u09F0-\\u09F1\\u0A05-\\u0A0A\\u0A0F-\\u0A10\\u0A13-\\u0A28\\u0A2A-\\u0A30\\u0A32-\\u0A33\\u0A35-\\u0A36\\u0A38-\\u0A39\\u0A59-\\u0A5C\\u0A5E\\u0A72-\\u0A74\\u0A85-\\u0A8D\\u0A8F-\\u0A91\\u0A93-\\u0AA8\\u0AAA-\\u0AB0\\u0AB2-\\u0AB3\\u0AB5-\\u0AB9\\u0ABD\\u0AD0\\u0AE0-\\u0AE1\\u0AF9\\u0B05-\\u0B0C\\u0B0F-\\u0B10\\u0B13-\\u0B28\\u0B2A-\\u0B30\\u0B32-\\u0B33\\u0B35-\\u0B39\\u0B3D\\u0B5C-\\u0B5D\\u0B5F-\\u0B61\\u0B71\\u0B83\\u0B85-\\u0B8A\\u0B8E-\\u0B90\\u0B92-\\u0B95\\u0B99-\\u0B9A\\u0B9C\\u0B9E-\\u0B9F\\u0BA3-\\u0BA4\\u0BA8-\\u0BAA\\u0BAE-\\u0BB9\\u0BD0\\u0C05-\\u0C0C\\u0C0E-\\u0C10\\u0C12-\\u0C28\\u0C2A-\\u0C39\\u0C3D\\u0C58-\\u0C5A\\u0C60-\\u0C61\\u0C85-\\u0C8C\\u0C8E-\\u0C90\\u0C92-\\u0CA8\\u0CAA-\\u0CB3\\u0CB5-\\u0CB9\\u0CBD\\u0CDE\\u0CE0-\\u0CE1\\u0CF1-\\u0CF2\\u0D05-\\u0D0C\\u0D0E-\\u0D10\\u0D12-\\u0D3A\\u0D3D\\u0D4E\\u0D5F-\\u0D61\\u0D7A-\\u0D7F\\u0D85-\\u0D96\\u0D9A-\\u0DB1\\u0DB3-\\u0DBB\\u0DBD\\u0DC0-\\u0DC6\\u0E01-\\u0E30\\u0E32-\\u0E33\\u0E40-\\u0E45\\u0E81-\\u0E82\\u0E84\\u0E87-\\u0E88\\u0E8A\\u0E8D\\u0E94-\\u0E97\\u0E99-\\u0E9F\\u0EA1-\\u0EA3\\u0EA5\\u0EA7\\u0EAA-\\u0EAB\\u0EAD-\\u0EB0\\u0EB2-\\u0EB3\\u0EBD\\u0EC0-\\u0EC4\\u0EDC-\\u0EDF\\u0F00\\u0F40-\\u0F47\\u0F49-\\u0F6C\\u0F88-\\u0F8C\\u1000-\\u102A\\u103F\\u1050-\\u1055\\u105A-\\u105D\\u1061\\u1065-\\u1066\\u106E-\\u1070\\u1075-\\u1081\\u108E\\u10D0-\\u10FA\\u10FD-\\u1248\\u124A-\\u124D\\u1250-\\u1256\\u1258\\u125A-\\u125D\\u1260-\\u1288\\u128A-\\u128D\\u1290-\\u12B0\\u12B2-\\u12B5\\u12B8-\\u12BE\\u12C0\\u12C2-\\u12C5\\u12C8-\\u12D6\\u12D8-\\u1310\\u1312-\\u1315\\u1318-\\u135A\\u1380-\\u138F\\u1401-\\u166C\\u166F-\\u167F\\u1681-\\u169A\\u16A0-\\u16EA\\u16F1-\\u16F8\\u1700-\\u170C\\u170E-\\u1711\\u1720-\\u1731\\u1740-\\u1751\\u1760-\\u176C\\u176E-\\u1770\\u1780-\\u17B3\\u17DC\\u1820-\\u1842\\u1844-\\u1877\\u1880-\\u18A8\\u18AA\\u18B0-\\u18F5\\u1900-\\u191E\\u1950-\\u196D\\u1970-\\u1974\\u1980-\\u19AB\\u19B0-\\u19C9\\u1A00-\\u1A16\\u1A20-\\u1A54\\u1B05-\\u1B33\\u1B45-\\u1B4B\\u1B83-\\u1BA0\\u1BAE-\\u1BAF\\u1BBA-\\u1BE5\\u1C00-\\u1C23\\u1C4D-\\u1C4F\\u1C5A-\\u1C77\\u1CE9-\\u1CEC\\u1CEE-\\u1CF1\\u1CF5-\\u1CF6\\u2135-\\u2138\\u2D30-\\u2D67\\u2D80-\\u2D96\\u2DA0-\\u2DA6\\u2DA8-\\u2DAE\\u2DB0-\\u2DB6\\u2DB8-\\u2DBE\\u2DC0-\\u2DC6\\u2DC8-\\u2DCE\\u2DD0-\\u2DD6\\u2DD8-\\u2DDE\\u3006\\u303C\\u3041-\\u3096\\u309F\\u30A1-\\u30FA\\u30FF\\u3105-\\u312D\\u3131-\\u318E\\u31A0-\\u31BA\\u31F0-\\u31FF\\u3400-\\u4DB5\\u4E00-\\u9FD5\\uA000-\\uA014\\uA016-\\uA48C\\uA4D0-\\uA4F7\\uA500-\\uA60B\\uA610-\\uA61F\\uA62A-\\uA62B\\uA66E\\uA6A0-\\uA6E5\\uA78F\\uA7F7\\uA7FB-\\uA801\\uA803-\\uA805\\uA807-\\uA80A\\uA80C-\\uA822\\uA840-\\uA873\\uA882-\\uA8B3\\uA8F2-\\uA8F7\\uA8FB\\uA8FD\\uA90A-\\uA925\\uA930-\\uA946\\uA960-\\uA97C\\uA984-\\uA9B2\\uA9E0-\\uA9E4\\uA9E7-\\uA9EF\\uA9FA-\\uA9FE\\uAA00-\\uAA28\\uAA40-\\uAA42\\uAA44-\\uAA4B\\uAA60-\\uAA6F\\uAA71-\\uAA76\\uAA7A\\uAA7E-\\uAAAF\\uAAB1\\uAAB5-\\uAAB6\\uAAB9-\\uAABD\\uAAC0\\uAAC2\\uAADB-\\uAADC\\uAAE0-\\uAAEA\\uAAF2\\uAB01-\\uAB06\\uAB09-\\uAB0E\\uAB11-\\uAB16\\uAB20-\\uAB26\\uAB28-\\uAB2E\\uABC0-\\uABE2\\uAC00-\\uD7A3\\uD7B0-\\uD7C6\\uD7CB-\\uD7FB\\uF900-\\uFA6D\\uFA70-\\uFAD9\\uFB1D\\uFB1F-\\uFB28\\uFB2A-\\uFB36\\uFB38-\\uFB3C\\uFB3E\\uFB40-\\uFB41\\uFB43-\\uFB44\\uFB46-\\uFBB1\\uFBD3-\\uFD3D\\uFD50-\\uFD8F\\uFD92-\\uFDC7\\uFDF0-\\uFDFB\\uFE70-\\uFE74\\uFE76-\\uFEFC\\uFF66-\\uFF6F\\uFF71-\\uFF9D\\uFFA0-\\uFFBE\\uFFC2-\\uFFC7\\uFFCA-\\uFFCF\\uFFD2-\\uFFD7\\uFFDA-\\uFFDC]",description:"[\\u00AA\\u00BA\\u01BB\\u01C0-\\u01C3\\u0294\\u05D0-\\u05EA\\u05F0-\\u05F2\\u0620-\\u063F\\u0641-\\u064A\\u066E-\\u066F\\u0671-\\u06D3\\u06D5\\u06EE-\\u06EF\\u06FA-\\u06FC\\u06FF\\u0710\\u0712-\\u072F\\u074D-\\u07A5\\u07B1\\u07CA-\\u07EA\\u0800-\\u0815\\u0840-\\u0858\\u08A0-\\u08B4\\u0904-\\u0939\\u093D\\u0950\\u0958-\\u0961\\u0972-\\u0980\\u0985-\\u098C\\u098F-\\u0990\\u0993-\\u09A8\\u09AA-\\u09B0\\u09B2\\u09B6-\\u09B9\\u09BD\\u09CE\\u09DC-\\u09DD\\u09DF-\\u09E1\\u09F0-\\u09F1\\u0A05-\\u0A0A\\u0A0F-\\u0A10\\u0A13-\\u0A28\\u0A2A-\\u0A30\\u0A32-\\u0A33\\u0A35-\\u0A36\\u0A38-\\u0A39\\u0A59-\\u0A5C\\u0A5E\\u0A72-\\u0A74\\u0A85-\\u0A8D\\u0A8F-\\u0A91\\u0A93-\\u0AA8\\u0AAA-\\u0AB0\\u0AB2-\\u0AB3\\u0AB5-\\u0AB9\\u0ABD\\u0AD0\\u0AE0-\\u0AE1\\u0AF9\\u0B05-\\u0B0C\\u0B0F-\\u0B10\\u0B13-\\u0B28\\u0B2A-\\u0B30\\u0B32-\\u0B33\\u0B35-\\u0B39\\u0B3D\\u0B5C-\\u0B5D\\u0B5F-\\u0B61\\u0B71\\u0B83\\u0B85-\\u0B8A\\u0B8E-\\u0B90\\u0B92-\\u0B95\\u0B99-\\u0B9A\\u0B9C\\u0B9E-\\u0B9F\\u0BA3-\\u0BA4\\u0BA8-\\u0BAA\\u0BAE-\\u0BB9\\u0BD0\\u0C05-\\u0C0C\\u0C0E-\\u0C10\\u0C12-\\u0C28\\u0C2A-\\u0C39\\u0C3D\\u0C58-\\u0C5A\\u0C60-\\u0C61\\u0C85-\\u0C8C\\u0C8E-\\u0C90\\u0C92-\\u0CA8\\u0CAA-\\u0CB3\\u0CB5-\\u0CB9\\u0CBD\\u0CDE\\u0CE0-\\u0CE1\\u0CF1-\\u0CF2\\u0D05-\\u0D0C\\u0D0E-\\u0D10\\u0D12-\\u0D3A\\u0D3D\\u0D4E\\u0D5F-\\u0D61\\u0D7A-\\u0D7F\\u0D85-\\u0D96\\u0D9A-\\u0DB1\\u0DB3-\\u0DBB\\u0DBD\\u0DC0-\\u0DC6\\u0E01-\\u0E30\\u0E32-\\u0E33\\u0E40-\\u0E45\\u0E81-\\u0E82\\u0E84\\u0E87-\\u0E88\\u0E8A\\u0E8D\\u0E94-\\u0E97\\u0E99-\\u0E9F\\u0EA1-\\u0EA3\\u0EA5\\u0EA7\\u0EAA-\\u0EAB\\u0EAD-\\u0EB0\\u0EB2-\\u0EB3\\u0EBD\\u0EC0-\\u0EC4\\u0EDC-\\u0EDF\\u0F00\\u0F40-\\u0F47\\u0F49-\\u0F6C\\u0F88-\\u0F8C\\u1000-\\u102A\\u103F\\u1050-\\u1055\\u105A-\\u105D\\u1061\\u1065-\\u1066\\u106E-\\u1070\\u1075-\\u1081\\u108E\\u10D0-\\u10FA\\u10FD-\\u1248\\u124A-\\u124D\\u1250-\\u1256\\u1258\\u125A-\\u125D\\u1260-\\u1288\\u128A-\\u128D\\u1290-\\u12B0\\u12B2-\\u12B5\\u12B8-\\u12BE\\u12C0\\u12C2-\\u12C5\\u12C8-\\u12D6\\u12D8-\\u1310\\u1312-\\u1315\\u1318-\\u135A\\u1380-\\u138F\\u1401-\\u166C\\u166F-\\u167F\\u1681-\\u169A\\u16A0-\\u16EA\\u16F1-\\u16F8\\u1700-\\u170C\\u170E-\\u1711\\u1720-\\u1731\\u1740-\\u1751\\u1760-\\u176C\\u176E-\\u1770\\u1780-\\u17B3\\u17DC\\u1820-\\u1842\\u1844-\\u1877\\u1880-\\u18A8\\u18AA\\u18B0-\\u18F5\\u1900-\\u191E\\u1950-\\u196D\\u1970-\\u1974\\u1980-\\u19AB\\u19B0-\\u19C9\\u1A00-\\u1A16\\u1A20-\\u1A54\\u1B05-\\u1B33\\u1B45-\\u1B4B\\u1B83-\\u1BA0\\u1BAE-\\u1BAF\\u1BBA-\\u1BE5\\u1C00-\\u1C23\\u1C4D-\\u1C4F\\u1C5A-\\u1C77\\u1CE9-\\u1CEC\\u1CEE-\\u1CF1\\u1CF5-\\u1CF6\\u2135-\\u2138\\u2D30-\\u2D67\\u2D80-\\u2D96\\u2DA0-\\u2DA6\\u2DA8-\\u2DAE\\u2DB0-\\u2DB6\\u2DB8-\\u2DBE\\u2DC0-\\u2DC6\\u2DC8-\\u2DCE\\u2DD0-\\u2DD6\\u2DD8-\\u2DDE\\u3006\\u303C\\u3041-\\u3096\\u309F\\u30A1-\\u30FA\\u30FF\\u3105-\\u312D\\u3131-\\u318E\\u31A0-\\u31BA\\u31F0-\\u31FF\\u3400-\\u4DB5\\u4E00-\\u9FD5\\uA000-\\uA014\\uA016-\\uA48C\\uA4D0-\\uA4F7\\uA500-\\uA60B\\uA610-\\uA61F\\uA62A-\\uA62B\\uA66E\\uA6A0-\\uA6E5\\uA78F\\uA7F7\\uA7FB-\\uA801\\uA803-\\uA805\\uA807-\\uA80A\\uA80C-\\uA822\\uA840-\\uA873\\uA882-\\uA8B3\\uA8F2-\\uA8F7\\uA8FB\\uA8FD\\uA90A-\\uA925\\uA930-\\uA946\\uA960-\\uA97C\\uA984-\\uA9B2\\uA9E0-\\uA9E4\\uA9E7-\\uA9EF\\uA9FA-\\uA9FE\\uAA00-\\uAA28\\uAA40-\\uAA42\\uAA44-\\uAA4B\\uAA60-\\uAA6F\\uAA71-\\uAA76\\uAA7A\\uAA7E-\\uAAAF\\uAAB1\\uAAB5-\\uAAB6\\uAAB9-\\uAABD\\uAAC0\\uAAC2\\uAADB-\\uAADC\\uAAE0-\\uAAEA\\uAAF2\\uAB01-\\uAB06\\uAB09-\\uAB0E\\uAB11-\\uAB16\\uAB20-\\uAB26\\uAB28-\\uAB2E\\uABC0-\\uABE2\\uAC00-\\uD7A3\\uD7B0-\\uD7C6\\uD7CB-\\uD7FB\\uF900-\\uFA6D\\uFA70-\\uFAD9\\uFB1D\\uFB1F-\\uFB28\\uFB2A-\\uFB36\\uFB38-\\uFB3C\\uFB3E\\uFB40-\\uFB41\\uFB43-\\uFB44\\uFB46-\\uFBB1\\uFBD3-\\uFD3D\\uFD50-\\uFD8F\\uFD92-\\uFDC7\\uFDF0-\\uFDFB\\uFE70-\\uFE74\\uFE76-\\uFEFC\\uFF66-\\uFF6F\\uFF71-\\uFF9D\\uFFA0-\\uFFBE\\uFFC2-\\uFFC7\\uFFCA-\\uFFCF\\uFFD2-\\uFFD7\\uFFDA-\\uFFDC]"},peg$c124=/^[\u01C5\u01C8\u01CB\u01F2\u1F88-\u1F8F\u1F98-\u1F9F\u1FA8-\u1FAF\u1FBC\u1FCC\u1FFC]/,peg$c125={type:"class",value:"[\\u01C5\\u01C8\\u01CB\\u01F2\\u1F88-\\u1F8F\\u1F98-\\u1F9F\\u1FA8-\\u1FAF\\u1FBC\\u1FCC\\u1FFC]",description:"[\\u01C5\\u01C8\\u01CB\\u01F2\\u1F88-\\u1F8F\\u1F98-\\u1F9F\\u1FA8-\\u1FAF\\u1FBC\\u1FCC\\u1FFC]"},peg$c126=/^[A-Z\xC0-\xD6\xD8-\xDE\u0100\u0102\u0104\u0106\u0108\u010A\u010C\u010E\u0110\u0112\u0114\u0116\u0118\u011A\u011C\u011E\u0120\u0122\u0124\u0126\u0128\u012A\u012C\u012E\u0130\u0132\u0134\u0136\u0139\u013B\u013D\u013F\u0141\u0143\u0145\u0147\u014A\u014C\u014E\u0150\u0152\u0154\u0156\u0158\u015A\u015C\u015E\u0160\u0162\u0164\u0166\u0168\u016A\u016C\u016E\u0170\u0172\u0174\u0176\u0178-\u0179\u017B\u017D\u0181-\u0182\u0184\u0186-\u0187\u0189-\u018B\u018E-\u0191\u0193-\u0194\u0196-\u0198\u019C-\u019D\u019F-\u01A0\u01A2\u01A4\u01A6-\u01A7\u01A9\u01AC\u01AE-\u01AF\u01B1-\u01B3\u01B5\u01B7-\u01B8\u01BC\u01C4\u01C7\u01CA\u01CD\u01CF\u01D1\u01D3\u01D5\u01D7\u01D9\u01DB\u01DE\u01E0\u01E2\u01E4\u01E6\u01E8\u01EA\u01EC\u01EE\u01F1\u01F4\u01F6-\u01F8\u01FA\u01FC\u01FE\u0200\u0202\u0204\u0206\u0208\u020A\u020C\u020E\u0210\u0212\u0214\u0216\u0218\u021A\u021C\u021E\u0220\u0222\u0224\u0226\u0228\u022A\u022C\u022E\u0230\u0232\u023A-\u023B\u023D-\u023E\u0241\u0243-\u0246\u0248\u024A\u024C\u024E\u0370\u0372\u0376\u037F\u0386\u0388-\u038A\u038C\u038E-\u038F\u0391-\u03A1\u03A3-\u03AB\u03CF\u03D2-\u03D4\u03D8\u03DA\u03DC\u03DE\u03E0\u03E2\u03E4\u03E6\u03E8\u03EA\u03EC\u03EE\u03F4\u03F7\u03F9-\u03FA\u03FD-\u042F\u0460\u0462\u0464\u0466\u0468\u046A\u046C\u046E\u0470\u0472\u0474\u0476\u0478\u047A\u047C\u047E\u0480\u048A\u048C\u048E\u0490\u0492\u0494\u0496\u0498\u049A\u049C\u049E\u04A0\u04A2\u04A4\u04A6\u04A8\u04AA\u04AC\u04AE\u04B0\u04B2\u04B4\u04B6\u04B8\u04BA\u04BC\u04BE\u04C0-\u04C1\u04C3\u04C5\u04C7\u04C9\u04CB\u04CD\u04D0\u04D2\u04D4\u04D6\u04D8\u04DA\u04DC\u04DE\u04E0\u04E2\u04E4\u04E6\u04E8\u04EA\u04EC\u04EE\u04F0\u04F2\u04F4\u04F6\u04F8\u04FA\u04FC\u04FE\u0500\u0502\u0504\u0506\u0508\u050A\u050C\u050E\u0510\u0512\u0514\u0516\u0518\u051A\u051C\u051E\u0520\u0522\u0524\u0526\u0528\u052A\u052C\u052E\u0531-\u0556\u10A0-\u10C5\u10C7\u10CD\u13A0-\u13F5\u1E00\u1E02\u1E04\u1E06\u1E08\u1E0A\u1E0C\u1E0E\u1E10\u1E12\u1E14\u1E16\u1E18\u1E1A\u1E1C\u1E1E\u1E20\u1E22\u1E24\u1E26\u1E28\u1E2A\u1E2C\u1E2E\u1E30\u1E32\u1E34\u1E36\u1E38\u1E3A\u1E3C\u1E3E\u1E40\u1E42\u1E44\u1E46\u1E48\u1E4A\u1E4C\u1E4E\u1E50\u1E52\u1E54\u1E56\u1E58\u1E5A\u1E5C\u1E5E\u1E60\u1E62\u1E64\u1E66\u1E68\u1E6A\u1E6C\u1E6E\u1E70\u1E72\u1E74\u1E76\u1E78\u1E7A\u1E7C\u1E7E\u1E80\u1E82\u1E84\u1E86\u1E88\u1E8A\u1E8C\u1E8E\u1E90\u1E92\u1E94\u1E9E\u1EA0\u1EA2\u1EA4\u1EA6\u1EA8\u1EAA\u1EAC\u1EAE\u1EB0\u1EB2\u1EB4\u1EB6\u1EB8\u1EBA\u1EBC\u1EBE\u1EC0\u1EC2\u1EC4\u1EC6\u1EC8\u1ECA\u1ECC\u1ECE\u1ED0\u1ED2\u1ED4\u1ED6\u1ED8\u1EDA\u1EDC\u1EDE\u1EE0\u1EE2\u1EE4\u1EE6\u1EE8\u1EEA\u1EEC\u1EEE\u1EF0\u1EF2\u1EF4\u1EF6\u1EF8\u1EFA\u1EFC\u1EFE\u1F08-\u1F0F\u1F18-\u1F1D\u1F28-\u1F2F\u1F38-\u1F3F\u1F48-\u1F4D\u1F59\u1F5B\u1F5D\u1F5F\u1F68-\u1F6F\u1FB8-\u1FBB\u1FC8-\u1FCB\u1FD8-\u1FDB\u1FE8-\u1FEC\u1FF8-\u1FFB\u2102\u2107\u210B-\u210D\u2110-\u2112\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u2130-\u2133\u213E-\u213F\u2145\u2183\u2C00-\u2C2E\u2C60\u2C62-\u2C64\u2C67\u2C69\u2C6B\u2C6D-\u2C70\u2C72\u2C75\u2C7E-\u2C80\u2C82\u2C84\u2C86\u2C88\u2C8A\u2C8C\u2C8E\u2C90\u2C92\u2C94\u2C96\u2C98\u2C9A\u2C9C\u2C9E\u2CA0\u2CA2\u2CA4\u2CA6\u2CA8\u2CAA\u2CAC\u2CAE\u2CB0\u2CB2\u2CB4\u2CB6\u2CB8\u2CBA\u2CBC\u2CBE\u2CC0\u2CC2\u2CC4\u2CC6\u2CC8\u2CCA\u2CCC\u2CCE\u2CD0\u2CD2\u2CD4\u2CD6\u2CD8\u2CDA\u2CDC\u2CDE\u2CE0\u2CE2\u2CEB\u2CED\u2CF2\uA640\uA642\uA644\uA646\uA648\uA64A\uA64C\uA64E\uA650\uA652\uA654\uA656\uA658\uA65A\uA65C\uA65E\uA660\uA662\uA664\uA666\uA668\uA66A\uA66C\uA680\uA682\uA684\uA686\uA688\uA68A\uA68C\uA68E\uA690\uA692\uA694\uA696\uA698\uA69A\uA722\uA724\uA726\uA728\uA72A\uA72C\uA72E\uA732\uA734\uA736\uA738\uA73A\uA73C\uA73E\uA740\uA742\uA744\uA746\uA748\uA74A\uA74C\uA74E\uA750\uA752\uA754\uA756\uA758\uA75A\uA75C\uA75E\uA760\uA762\uA764\uA766\uA768\uA76A\uA76C\uA76E\uA779\uA77B\uA77D-\uA77E\uA780\uA782\uA784\uA786\uA78B\uA78D\uA790\uA792\uA796\uA798\uA79A\uA79C\uA79E\uA7A0\uA7A2\uA7A4\uA7A6\uA7A8\uA7AA-\uA7AD\uA7B0-\uA7B4\uA7B6\uFF21-\uFF3A]/,peg$c127={type:"class",value:"[\\u0041-\\u005A\\u00C0-\\u00D6\\u00D8-\\u00DE\\u0100\\u0102\\u0104\\u0106\\u0108\\u010A\\u010C\\u010E\\u0110\\u0112\\u0114\\u0116\\u0118\\u011A\\u011C\\u011E\\u0120\\u0122\\u0124\\u0126\\u0128\\u012A\\u012C\\u012E\\u0130\\u0132\\u0134\\u0136\\u0139\\u013B\\u013D\\u013F\\u0141\\u0143\\u0145\\u0147\\u014A\\u014C\\u014E\\u0150\\u0152\\u0154\\u0156\\u0158\\u015A\\u015C\\u015E\\u0160\\u0162\\u0164\\u0166\\u0168\\u016A\\u016C\\u016E\\u0170\\u0172\\u0174\\u0176\\u0178-\\u0179\\u017B\\u017D\\u0181-\\u0182\\u0184\\u0186-\\u0187\\u0189-\\u018B\\u018E-\\u0191\\u0193-\\u0194\\u0196-\\u0198\\u019C-\\u019D\\u019F-\\u01A0\\u01A2\\u01A4\\u01A6-\\u01A7\\u01A9\\u01AC\\u01AE-\\u01AF\\u01B1-\\u01B3\\u01B5\\u01B7-\\u01B8\\u01BC\\u01C4\\u01C7\\u01CA\\u01CD\\u01CF\\u01D1\\u01D3\\u01D5\\u01D7\\u01D9\\u01DB\\u01DE\\u01E0\\u01E2\\u01E4\\u01E6\\u01E8\\u01EA\\u01EC\\u01EE\\u01F1\\u01F4\\u01F6-\\u01F8\\u01FA\\u01FC\\u01FE\\u0200\\u0202\\u0204\\u0206\\u0208\\u020A\\u020C\\u020E\\u0210\\u0212\\u0214\\u0216\\u0218\\u021A\\u021C\\u021E\\u0220\\u0222\\u0224\\u0226\\u0228\\u022A\\u022C\\u022E\\u0230\\u0232\\u023A-\\u023B\\u023D-\\u023E\\u0241\\u0243-\\u0246\\u0248\\u024A\\u024C\\u024E\\u0370\\u0372\\u0376\\u037F\\u0386\\u0388-\\u038A\\u038C\\u038E-\\u038F\\u0391-\\u03A1\\u03A3-\\u03AB\\u03CF\\u03D2-\\u03D4\\u03D8\\u03DA\\u03DC\\u03DE\\u03E0\\u03E2\\u03E4\\u03E6\\u03E8\\u03EA\\u03EC\\u03EE\\u03F4\\u03F7\\u03F9-\\u03FA\\u03FD-\\u042F\\u0460\\u0462\\u0464\\u0466\\u0468\\u046A\\u046C\\u046E\\u0470\\u0472\\u0474\\u0476\\u0478\\u047A\\u047C\\u047E\\u0480\\u048A\\u048C\\u048E\\u0490\\u0492\\u0494\\u0496\\u0498\\u049A\\u049C\\u049E\\u04A0\\u04A2\\u04A4\\u04A6\\u04A8\\u04AA\\u04AC\\u04AE\\u04B0\\u04B2\\u04B4\\u04B6\\u04B8\\u04BA\\u04BC\\u04BE\\u04C0-\\u04C1\\u04C3\\u04C5\\u04C7\\u04C9\\u04CB\\u04CD\\u04D0\\u04D2\\u04D4\\u04D6\\u04D8\\u04DA\\u04DC\\u04DE\\u04E0\\u04E2\\u04E4\\u04E6\\u04E8\\u04EA\\u04EC\\u04EE\\u04F0\\u04F2\\u04F4\\u04F6\\u04F8\\u04FA\\u04FC\\u04FE\\u0500\\u0502\\u0504\\u0506\\u0508\\u050A\\u050C\\u050E\\u0510\\u0512\\u0514\\u0516\\u0518\\u051A\\u051C\\u051E\\u0520\\u0522\\u0524\\u0526\\u0528\\u052A\\u052C\\u052E\\u0531-\\u0556\\u10A0-\\u10C5\\u10C7\\u10CD\\u13A0-\\u13F5\\u1E00\\u1E02\\u1E04\\u1E06\\u1E08\\u1E0A\\u1E0C\\u1E0E\\u1E10\\u1E12\\u1E14\\u1E16\\u1E18\\u1E1A\\u1E1C\\u1E1E\\u1E20\\u1E22\\u1E24\\u1E26\\u1E28\\u1E2A\\u1E2C\\u1E2E\\u1E30\\u1E32\\u1E34\\u1E36\\u1E38\\u1E3A\\u1E3C\\u1E3E\\u1E40\\u1E42\\u1E44\\u1E46\\u1E48\\u1E4A\\u1E4C\\u1E4E\\u1E50\\u1E52\\u1E54\\u1E56\\u1E58\\u1E5A\\u1E5C\\u1E5E\\u1E60\\u1E62\\u1E64\\u1E66\\u1E68\\u1E6A\\u1E6C\\u1E6E\\u1E70\\u1E72\\u1E74\\u1E76\\u1E78\\u1E7A\\u1E7C\\u1E7E\\u1E80\\u1E82\\u1E84\\u1E86\\u1E88\\u1E8A\\u1E8C\\u1E8E\\u1E90\\u1E92\\u1E94\\u1E9E\\u1EA0\\u1EA2\\u1EA4\\u1EA6\\u1EA8\\u1EAA\\u1EAC\\u1EAE\\u1EB0\\u1EB2\\u1EB4\\u1EB6\\u1EB8\\u1EBA\\u1EBC\\u1EBE\\u1EC0\\u1EC2\\u1EC4\\u1EC6\\u1EC8\\u1ECA\\u1ECC\\u1ECE\\u1ED0\\u1ED2\\u1ED4\\u1ED6\\u1ED8\\u1EDA\\u1EDC\\u1EDE\\u1EE0\\u1EE2\\u1EE4\\u1EE6\\u1EE8\\u1EEA\\u1EEC\\u1EEE\\u1EF0\\u1EF2\\u1EF4\\u1EF6\\u1EF8\\u1EFA\\u1EFC\\u1EFE\\u1F08-\\u1F0F\\u1F18-\\u1F1D\\u1F28-\\u1F2F\\u1F38-\\u1F3F\\u1F48-\\u1F4D\\u1F59\\u1F5B\\u1F5D\\u1F5F\\u1F68-\\u1F6F\\u1FB8-\\u1FBB\\u1FC8-\\u1FCB\\u1FD8-\\u1FDB\\u1FE8-\\u1FEC\\u1FF8-\\u1FFB\\u2102\\u2107\\u210B-\\u210D\\u2110-\\u2112\\u2115\\u2119-\\u211D\\u2124\\u2126\\u2128\\u212A-\\u212D\\u2130-\\u2133\\u213E-\\u213F\\u2145\\u2183\\u2C00-\\u2C2E\\u2C60\\u2C62-\\u2C64\\u2C67\\u2C69\\u2C6B\\u2C6D-\\u2C70\\u2C72\\u2C75\\u2C7E-\\u2C80\\u2C82\\u2C84\\u2C86\\u2C88\\u2C8A\\u2C8C\\u2C8E\\u2C90\\u2C92\\u2C94\\u2C96\\u2C98\\u2C9A\\u2C9C\\u2C9E\\u2CA0\\u2CA2\\u2CA4\\u2CA6\\u2CA8\\u2CAA\\u2CAC\\u2CAE\\u2CB0\\u2CB2\\u2CB4\\u2CB6\\u2CB8\\u2CBA\\u2CBC\\u2CBE\\u2CC0\\u2CC2\\u2CC4\\u2CC6\\u2CC8\\u2CCA\\u2CCC\\u2CCE\\u2CD0\\u2CD2\\u2CD4\\u2CD6\\u2CD8\\u2CDA\\u2CDC\\u2CDE\\u2CE0\\u2CE2\\u2CEB\\u2CED\\u2CF2\\uA640\\uA642\\uA644\\uA646\\uA648\\uA64A\\uA64C\\uA64E\\uA650\\uA652\\uA654\\uA656\\uA658\\uA65A\\uA65C\\uA65E\\uA660\\uA662\\uA664\\uA666\\uA668\\uA66A\\uA66C\\uA680\\uA682\\uA684\\uA686\\uA688\\uA68A\\uA68C\\uA68E\\uA690\\uA692\\uA694\\uA696\\uA698\\uA69A\\uA722\\uA724\\uA726\\uA728\\uA72A\\uA72C\\uA72E\\uA732\\uA734\\uA736\\uA738\\uA73A\\uA73C\\uA73E\\uA740\\uA742\\uA744\\uA746\\uA748\\uA74A\\uA74C\\uA74E\\uA750\\uA752\\uA754\\uA756\\uA758\\uA75A\\uA75C\\uA75E\\uA760\\uA762\\uA764\\uA766\\uA768\\uA76A\\uA76C\\uA76E\\uA779\\uA77B\\uA77D-\\uA77E\\uA780\\uA782\\uA784\\uA786\\uA78B\\uA78D\\uA790\\uA792\\uA796\\uA798\\uA79A\\uA79C\\uA79E\\uA7A0\\uA7A2\\uA7A4\\uA7A6\\uA7A8\\uA7AA-\\uA7AD\\uA7B0-\\uA7B4\\uA7B6\\uFF21-\\uFF3A]",description:"[\\u0041-\\u005A\\u00C0-\\u00D6\\u00D8-\\u00DE\\u0100\\u0102\\u0104\\u0106\\u0108\\u010A\\u010C\\u010E\\u0110\\u0112\\u0114\\u0116\\u0118\\u011A\\u011C\\u011E\\u0120\\u0122\\u0124\\u0126\\u0128\\u012A\\u012C\\u012E\\u0130\\u0132\\u0134\\u0136\\u0139\\u013B\\u013D\\u013F\\u0141\\u0143\\u0145\\u0147\\u014A\\u014C\\u014E\\u0150\\u0152\\u0154\\u0156\\u0158\\u015A\\u015C\\u015E\\u0160\\u0162\\u0164\\u0166\\u0168\\u016A\\u016C\\u016E\\u0170\\u0172\\u0174\\u0176\\u0178-\\u0179\\u017B\\u017D\\u0181-\\u0182\\u0184\\u0186-\\u0187\\u0189-\\u018B\\u018E-\\u0191\\u0193-\\u0194\\u0196-\\u0198\\u019C-\\u019D\\u019F-\\u01A0\\u01A2\\u01A4\\u01A6-\\u01A7\\u01A9\\u01AC\\u01AE-\\u01AF\\u01B1-\\u01B3\\u01B5\\u01B7-\\u01B8\\u01BC\\u01C4\\u01C7\\u01CA\\u01CD\\u01CF\\u01D1\\u01D3\\u01D5\\u01D7\\u01D9\\u01DB\\u01DE\\u01E0\\u01E2\\u01E4\\u01E6\\u01E8\\u01EA\\u01EC\\u01EE\\u01F1\\u01F4\\u01F6-\\u01F8\\u01FA\\u01FC\\u01FE\\u0200\\u0202\\u0204\\u0206\\u0208\\u020A\\u020C\\u020E\\u0210\\u0212\\u0214\\u0216\\u0218\\u021A\\u021C\\u021E\\u0220\\u0222\\u0224\\u0226\\u0228\\u022A\\u022C\\u022E\\u0230\\u0232\\u023A-\\u023B\\u023D-\\u023E\\u0241\\u0243-\\u0246\\u0248\\u024A\\u024C\\u024E\\u0370\\u0372\\u0376\\u037F\\u0386\\u0388-\\u038A\\u038C\\u038E-\\u038F\\u0391-\\u03A1\\u03A3-\\u03AB\\u03CF\\u03D2-\\u03D4\\u03D8\\u03DA\\u03DC\\u03DE\\u03E0\\u03E2\\u03E4\\u03E6\\u03E8\\u03EA\\u03EC\\u03EE\\u03F4\\u03F7\\u03F9-\\u03FA\\u03FD-\\u042F\\u0460\\u0462\\u0464\\u0466\\u0468\\u046A\\u046C\\u046E\\u0470\\u0472\\u0474\\u0476\\u0478\\u047A\\u047C\\u047E\\u0480\\u048A\\u048C\\u048E\\u0490\\u0492\\u0494\\u0496\\u0498\\u049A\\u049C\\u049E\\u04A0\\u04A2\\u04A4\\u04A6\\u04A8\\u04AA\\u04AC\\u04AE\\u04B0\\u04B2\\u04B4\\u04B6\\u04B8\\u04BA\\u04BC\\u04BE\\u04C0-\\u04C1\\u04C3\\u04C5\\u04C7\\u04C9\\u04CB\\u04CD\\u04D0\\u04D2\\u04D4\\u04D6\\u04D8\\u04DA\\u04DC\\u04DE\\u04E0\\u04E2\\u04E4\\u04E6\\u04E8\\u04EA\\u04EC\\u04EE\\u04F0\\u04F2\\u04F4\\u04F6\\u04F8\\u04FA\\u04FC\\u04FE\\u0500\\u0502\\u0504\\u0506\\u0508\\u050A\\u050C\\u050E\\u0510\\u0512\\u0514\\u0516\\u0518\\u051A\\u051C\\u051E\\u0520\\u0522\\u0524\\u0526\\u0528\\u052A\\u052C\\u052E\\u0531-\\u0556\\u10A0-\\u10C5\\u10C7\\u10CD\\u13A0-\\u13F5\\u1E00\\u1E02\\u1E04\\u1E06\\u1E08\\u1E0A\\u1E0C\\u1E0E\\u1E10\\u1E12\\u1E14\\u1E16\\u1E18\\u1E1A\\u1E1C\\u1E1E\\u1E20\\u1E22\\u1E24\\u1E26\\u1E28\\u1E2A\\u1E2C\\u1E2E\\u1E30\\u1E32\\u1E34\\u1E36\\u1E38\\u1E3A\\u1E3C\\u1E3E\\u1E40\\u1E42\\u1E44\\u1E46\\u1E48\\u1E4A\\u1E4C\\u1E4E\\u1E50\\u1E52\\u1E54\\u1E56\\u1E58\\u1E5A\\u1E5C\\u1E5E\\u1E60\\u1E62\\u1E64\\u1E66\\u1E68\\u1E6A\\u1E6C\\u1E6E\\u1E70\\u1E72\\u1E74\\u1E76\\u1E78\\u1E7A\\u1E7C\\u1E7E\\u1E80\\u1E82\\u1E84\\u1E86\\u1E88\\u1E8A\\u1E8C\\u1E8E\\u1E90\\u1E92\\u1E94\\u1E9E\\u1EA0\\u1EA2\\u1EA4\\u1EA6\\u1EA8\\u1EAA\\u1EAC\\u1EAE\\u1EB0\\u1EB2\\u1EB4\\u1EB6\\u1EB8\\u1EBA\\u1EBC\\u1EBE\\u1EC0\\u1EC2\\u1EC4\\u1EC6\\u1EC8\\u1ECA\\u1ECC\\u1ECE\\u1ED0\\u1ED2\\u1ED4\\u1ED6\\u1ED8\\u1EDA\\u1EDC\\u1EDE\\u1EE0\\u1EE2\\u1EE4\\u1EE6\\u1EE8\\u1EEA\\u1EEC\\u1EEE\\u1EF0\\u1EF2\\u1EF4\\u1EF6\\u1EF8\\u1EFA\\u1EFC\\u1EFE\\u1F08-\\u1F0F\\u1F18-\\u1F1D\\u1F28-\\u1F2F\\u1F38-\\u1F3F\\u1F48-\\u1F4D\\u1F59\\u1F5B\\u1F5D\\u1F5F\\u1F68-\\u1F6F\\u1FB8-\\u1FBB\\u1FC8-\\u1FCB\\u1FD8-\\u1FDB\\u1FE8-\\u1FEC\\u1FF8-\\u1FFB\\u2102\\u2107\\u210B-\\u210D\\u2110-\\u2112\\u2115\\u2119-\\u211D\\u2124\\u2126\\u2128\\u212A-\\u212D\\u2130-\\u2133\\u213E-\\u213F\\u2145\\u2183\\u2C00-\\u2C2E\\u2C60\\u2C62-\\u2C64\\u2C67\\u2C69\\u2C6B\\u2C6D-\\u2C70\\u2C72\\u2C75\\u2C7E-\\u2C80\\u2C82\\u2C84\\u2C86\\u2C88\\u2C8A\\u2C8C\\u2C8E\\u2C90\\u2C92\\u2C94\\u2C96\\u2C98\\u2C9A\\u2C9C\\u2C9E\\u2CA0\\u2CA2\\u2CA4\\u2CA6\\u2CA8\\u2CAA\\u2CAC\\u2CAE\\u2CB0\\u2CB2\\u2CB4\\u2CB6\\u2CB8\\u2CBA\\u2CBC\\u2CBE\\u2CC0\\u2CC2\\u2CC4\\u2CC6\\u2CC8\\u2CCA\\u2CCC\\u2CCE\\u2CD0\\u2CD2\\u2CD4\\u2CD6\\u2CD8\\u2CDA\\u2CDC\\u2CDE\\u2CE0\\u2CE2\\u2CEB\\u2CED\\u2CF2\\uA640\\uA642\\uA644\\uA646\\uA648\\uA64A\\uA64C\\uA64E\\uA650\\uA652\\uA654\\uA656\\uA658\\uA65A\\uA65C\\uA65E\\uA660\\uA662\\uA664\\uA666\\uA668\\uA66A\\uA66C\\uA680\\uA682\\uA684\\uA686\\uA688\\uA68A\\uA68C\\uA68E\\uA690\\uA692\\uA694\\uA696\\uA698\\uA69A\\uA722\\uA724\\uA726\\uA728\\uA72A\\uA72C\\uA72E\\uA732\\uA734\\uA736\\uA738\\uA73A\\uA73C\\uA73E\\uA740\\uA742\\uA744\\uA746\\uA748\\uA74A\\uA74C\\uA74E\\uA750\\uA752\\uA754\\uA756\\uA758\\uA75A\\uA75C\\uA75E\\uA760\\uA762\\uA764\\uA766\\uA768\\uA76A\\uA76C\\uA76E\\uA779\\uA77B\\uA77D-\\uA77E\\uA780\\uA782\\uA784\\uA786\\uA78B\\uA78D\\uA790\\uA792\\uA796\\uA798\\uA79A\\uA79C\\uA79E\\uA7A0\\uA7A2\\uA7A4\\uA7A6\\uA7A8\\uA7AA-\\uA7AD\\uA7B0-\\uA7B4\\uA7B6\\uFF21-\\uFF3A]"},peg$c128=/^[\u0903\u093B\u093E-\u0940\u0949-\u094C\u094E-\u094F\u0982-\u0983\u09BE-\u09C0\u09C7-\u09C8\u09CB-\u09CC\u09D7\u0A03\u0A3E-\u0A40\u0A83\u0ABE-\u0AC0\u0AC9\u0ACB-\u0ACC\u0B02-\u0B03\u0B3E\u0B40\u0B47-\u0B48\u0B4B-\u0B4C\u0B57\u0BBE-\u0BBF\u0BC1-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCC\u0BD7\u0C01-\u0C03\u0C41-\u0C44\u0C82-\u0C83\u0CBE\u0CC0-\u0CC4\u0CC7-\u0CC8\u0CCA-\u0CCB\u0CD5-\u0CD6\u0D02-\u0D03\u0D3E-\u0D40\u0D46-\u0D48\u0D4A-\u0D4C\u0D57\u0D82-\u0D83\u0DCF-\u0DD1\u0DD8-\u0DDF\u0DF2-\u0DF3\u0F3E-\u0F3F\u0F7F\u102B-\u102C\u1031\u1038\u103B-\u103C\u1056-\u1057\u1062-\u1064\u1067-\u106D\u1083-\u1084\u1087-\u108C\u108F\u109A-\u109C\u17B6\u17BE-\u17C5\u17C7-\u17C8\u1923-\u1926\u1929-\u192B\u1930-\u1931\u1933-\u1938\u1A19-\u1A1A\u1A55\u1A57\u1A61\u1A63-\u1A64\u1A6D-\u1A72\u1B04\u1B35\u1B3B\u1B3D-\u1B41\u1B43-\u1B44\u1B82\u1BA1\u1BA6-\u1BA7\u1BAA\u1BE7\u1BEA-\u1BEC\u1BEE\u1BF2-\u1BF3\u1C24-\u1C2B\u1C34-\u1C35\u1CE1\u1CF2-\u1CF3\u302E-\u302F\uA823-\uA824\uA827\uA880-\uA881\uA8B4-\uA8C3\uA952-\uA953\uA983\uA9B4-\uA9B5\uA9BA-\uA9BB\uA9BD-\uA9C0\uAA2F-\uAA30\uAA33-\uAA34\uAA4D\uAA7B\uAA7D\uAAEB\uAAEE-\uAAEF\uAAF5\uABE3-\uABE4\uABE6-\uABE7\uABE9-\uABEA\uABEC]/,peg$c129={type:"class",value:"[\\u0903\\u093B\\u093E-\\u0940\\u0949-\\u094C\\u094E-\\u094F\\u0982-\\u0983\\u09BE-\\u09C0\\u09C7-\\u09C8\\u09CB-\\u09CC\\u09D7\\u0A03\\u0A3E-\\u0A40\\u0A83\\u0ABE-\\u0AC0\\u0AC9\\u0ACB-\\u0ACC\\u0B02-\\u0B03\\u0B3E\\u0B40\\u0B47-\\u0B48\\u0B4B-\\u0B4C\\u0B57\\u0BBE-\\u0BBF\\u0BC1-\\u0BC2\\u0BC6-\\u0BC8\\u0BCA-\\u0BCC\\u0BD7\\u0C01-\\u0C03\\u0C41-\\u0C44\\u0C82-\\u0C83\\u0CBE\\u0CC0-\\u0CC4\\u0CC7-\\u0CC8\\u0CCA-\\u0CCB\\u0CD5-\\u0CD6\\u0D02-\\u0D03\\u0D3E-\\u0D40\\u0D46-\\u0D48\\u0D4A-\\u0D4C\\u0D57\\u0D82-\\u0D83\\u0DCF-\\u0DD1\\u0DD8-\\u0DDF\\u0DF2-\\u0DF3\\u0F3E-\\u0F3F\\u0F7F\\u102B-\\u102C\\u1031\\u1038\\u103B-\\u103C\\u1056-\\u1057\\u1062-\\u1064\\u1067-\\u106D\\u1083-\\u1084\\u1087-\\u108C\\u108F\\u109A-\\u109C\\u17B6\\u17BE-\\u17C5\\u17C7-\\u17C8\\u1923-\\u1926\\u1929-\\u192B\\u1930-\\u1931\\u1933-\\u1938\\u1A19-\\u1A1A\\u1A55\\u1A57\\u1A61\\u1A63-\\u1A64\\u1A6D-\\u1A72\\u1B04\\u1B35\\u1B3B\\u1B3D-\\u1B41\\u1B43-\\u1B44\\u1B82\\u1BA1\\u1BA6-\\u1BA7\\u1BAA\\u1BE7\\u1BEA-\\u1BEC\\u1BEE\\u1BF2-\\u1BF3\\u1C24-\\u1C2B\\u1C34-\\u1C35\\u1CE1\\u1CF2-\\u1CF3\\u302E-\\u302F\\uA823-\\uA824\\uA827\\uA880-\\uA881\\uA8B4-\\uA8C3\\uA952-\\uA953\\uA983\\uA9B4-\\uA9B5\\uA9BA-\\uA9BB\\uA9BD-\\uA9C0\\uAA2F-\\uAA30\\uAA33-\\uAA34\\uAA4D\\uAA7B\\uAA7D\\uAAEB\\uAAEE-\\uAAEF\\uAAF5\\uABE3-\\uABE4\\uABE6-\\uABE7\\uABE9-\\uABEA\\uABEC]",description:"[\\u0903\\u093B\\u093E-\\u0940\\u0949-\\u094C\\u094E-\\u094F\\u0982-\\u0983\\u09BE-\\u09C0\\u09C7-\\u09C8\\u09CB-\\u09CC\\u09D7\\u0A03\\u0A3E-\\u0A40\\u0A83\\u0ABE-\\u0AC0\\u0AC9\\u0ACB-\\u0ACC\\u0B02-\\u0B03\\u0B3E\\u0B40\\u0B47-\\u0B48\\u0B4B-\\u0B4C\\u0B57\\u0BBE-\\u0BBF\\u0BC1-\\u0BC2\\u0BC6-\\u0BC8\\u0BCA-\\u0BCC\\u0BD7\\u0C01-\\u0C03\\u0C41-\\u0C44\\u0C82-\\u0C83\\u0CBE\\u0CC0-\\u0CC4\\u0CC7-\\u0CC8\\u0CCA-\\u0CCB\\u0CD5-\\u0CD6\\u0D02-\\u0D03\\u0D3E-\\u0D40\\u0D46-\\u0D48\\u0D4A-\\u0D4C\\u0D57\\u0D82-\\u0D83\\u0DCF-\\u0DD1\\u0DD8-\\u0DDF\\u0DF2-\\u0DF3\\u0F3E-\\u0F3F\\u0F7F\\u102B-\\u102C\\u1031\\u1038\\u103B-\\u103C\\u1056-\\u1057\\u1062-\\u1064\\u1067-\\u106D\\u1083-\\u1084\\u1087-\\u108C\\u108F\\u109A-\\u109C\\u17B6\\u17BE-\\u17C5\\u17C7-\\u17C8\\u1923-\\u1926\\u1929-\\u192B\\u1930-\\u1931\\u1933-\\u1938\\u1A19-\\u1A1A\\u1A55\\u1A57\\u1A61\\u1A63-\\u1A64\\u1A6D-\\u1A72\\u1B04\\u1B35\\u1B3B\\u1B3D-\\u1B41\\u1B43-\\u1B44\\u1B82\\u1BA1\\u1BA6-\\u1BA7\\u1BAA\\u1BE7\\u1BEA-\\u1BEC\\u1BEE\\u1BF2-\\u1BF3\\u1C24-\\u1C2B\\u1C34-\\u1C35\\u1CE1\\u1CF2-\\u1CF3\\u302E-\\u302F\\uA823-\\uA824\\uA827\\uA880-\\uA881\\uA8B4-\\uA8C3\\uA952-\\uA953\\uA983\\uA9B4-\\uA9B5\\uA9BA-\\uA9BB\\uA9BD-\\uA9C0\\uAA2F-\\uAA30\\uAA33-\\uAA34\\uAA4D\\uAA7B\\uAA7D\\uAAEB\\uAAEE-\\uAAEF\\uAAF5\\uABE3-\\uABE4\\uABE6-\\uABE7\\uABE9-\\uABEA\\uABEC]"},peg$c130=/^[\u0300-\u036F\u0483-\u0487\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08E3-\u0902\u093A\u093C\u0941-\u0948\u094D\u0951-\u0957\u0962-\u0963\u0981\u09BC\u09C1-\u09C4\u09CD\u09E2-\u09E3\u0A01-\u0A02\u0A3C\u0A41-\u0A42\u0A47-\u0A48\u0A4B-\u0A4D\u0A51\u0A70-\u0A71\u0A75\u0A81-\u0A82\u0ABC\u0AC1-\u0AC5\u0AC7-\u0AC8\u0ACD\u0AE2-\u0AE3\u0B01\u0B3C\u0B3F\u0B41-\u0B44\u0B4D\u0B56\u0B62-\u0B63\u0B82\u0BC0\u0BCD\u0C00\u0C3E-\u0C40\u0C46-\u0C48\u0C4A-\u0C4D\u0C55-\u0C56\u0C62-\u0C63\u0C81\u0CBC\u0CBF\u0CC6\u0CCC-\u0CCD\u0CE2-\u0CE3\u0D01\u0D41-\u0D44\u0D4D\u0D62-\u0D63\u0DCA\u0DD2-\u0DD4\u0DD6\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB-\u0EBC\u0EC8-\u0ECD\u0F18-\u0F19\u0F35\u0F37\u0F39\u0F71-\u0F7E\u0F80-\u0F84\u0F86-\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102D-\u1030\u1032-\u1037\u1039-\u103A\u103D-\u103E\u1058-\u1059\u105E-\u1060\u1071-\u1074\u1082\u1085-\u1086\u108D\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752-\u1753\u1772-\u1773\u17B4-\u17B5\u17B7-\u17BD\u17C6\u17C9-\u17D3\u17DD\u180B-\u180D\u18A9\u1920-\u1922\u1927-\u1928\u1932\u1939-\u193B\u1A17-\u1A18\u1A1B\u1A56\u1A58-\u1A5E\u1A60\u1A62\u1A65-\u1A6C\u1A73-\u1A7C\u1A7F\u1AB0-\u1ABD\u1B00-\u1B03\u1B34\u1B36-\u1B3A\u1B3C\u1B42\u1B6B-\u1B73\u1B80-\u1B81\u1BA2-\u1BA5\u1BA8-\u1BA9\u1BAB-\u1BAD\u1BE6\u1BE8-\u1BE9\u1BED\u1BEF-\u1BF1\u1C2C-\u1C33\u1C36-\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE0\u1CE2-\u1CE8\u1CED\u1CF4\u1CF8-\u1CF9\u1DC0-\u1DF5\u1DFC-\u1DFF\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302D\u3099-\u309A\uA66F\uA674-\uA67D\uA69E-\uA69F\uA6F0-\uA6F1\uA802\uA806\uA80B\uA825-\uA826\uA8C4\uA8E0-\uA8F1\uA926-\uA92D\uA947-\uA951\uA980-\uA982\uA9B3\uA9B6-\uA9B9\uA9BC\uA9E5\uAA29-\uAA2E\uAA31-\uAA32\uAA35-\uAA36\uAA43\uAA4C\uAA7C\uAAB0\uAAB2-\uAAB4\uAAB7-\uAAB8\uAABE-\uAABF\uAAC1\uAAEC-\uAAED\uAAF6\uABE5\uABE8\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F]/,peg$c131={type:"class",value:"[\\u0300-\\u036F\\u0483-\\u0487\\u0591-\\u05BD\\u05BF\\u05C1-\\u05C2\\u05C4-\\u05C5\\u05C7\\u0610-\\u061A\\u064B-\\u065F\\u0670\\u06D6-\\u06DC\\u06DF-\\u06E4\\u06E7-\\u06E8\\u06EA-\\u06ED\\u0711\\u0730-\\u074A\\u07A6-\\u07B0\\u07EB-\\u07F3\\u0816-\\u0819\\u081B-\\u0823\\u0825-\\u0827\\u0829-\\u082D\\u0859-\\u085B\\u08E3-\\u0902\\u093A\\u093C\\u0941-\\u0948\\u094D\\u0951-\\u0957\\u0962-\\u0963\\u0981\\u09BC\\u09C1-\\u09C4\\u09CD\\u09E2-\\u09E3\\u0A01-\\u0A02\\u0A3C\\u0A41-\\u0A42\\u0A47-\\u0A48\\u0A4B-\\u0A4D\\u0A51\\u0A70-\\u0A71\\u0A75\\u0A81-\\u0A82\\u0ABC\\u0AC1-\\u0AC5\\u0AC7-\\u0AC8\\u0ACD\\u0AE2-\\u0AE3\\u0B01\\u0B3C\\u0B3F\\u0B41-\\u0B44\\u0B4D\\u0B56\\u0B62-\\u0B63\\u0B82\\u0BC0\\u0BCD\\u0C00\\u0C3E-\\u0C40\\u0C46-\\u0C48\\u0C4A-\\u0C4D\\u0C55-\\u0C56\\u0C62-\\u0C63\\u0C81\\u0CBC\\u0CBF\\u0CC6\\u0CCC-\\u0CCD\\u0CE2-\\u0CE3\\u0D01\\u0D41-\\u0D44\\u0D4D\\u0D62-\\u0D63\\u0DCA\\u0DD2-\\u0DD4\\u0DD6\\u0E31\\u0E34-\\u0E3A\\u0E47-\\u0E4E\\u0EB1\\u0EB4-\\u0EB9\\u0EBB-\\u0EBC\\u0EC8-\\u0ECD\\u0F18-\\u0F19\\u0F35\\u0F37\\u0F39\\u0F71-\\u0F7E\\u0F80-\\u0F84\\u0F86-\\u0F87\\u0F8D-\\u0F97\\u0F99-\\u0FBC\\u0FC6\\u102D-\\u1030\\u1032-\\u1037\\u1039-\\u103A\\u103D-\\u103E\\u1058-\\u1059\\u105E-\\u1060\\u1071-\\u1074\\u1082\\u1085-\\u1086\\u108D\\u109D\\u135D-\\u135F\\u1712-\\u1714\\u1732-\\u1734\\u1752-\\u1753\\u1772-\\u1773\\u17B4-\\u17B5\\u17B7-\\u17BD\\u17C6\\u17C9-\\u17D3\\u17DD\\u180B-\\u180D\\u18A9\\u1920-\\u1922\\u1927-\\u1928\\u1932\\u1939-\\u193B\\u1A17-\\u1A18\\u1A1B\\u1A56\\u1A58-\\u1A5E\\u1A60\\u1A62\\u1A65-\\u1A6C\\u1A73-\\u1A7C\\u1A7F\\u1AB0-\\u1ABD\\u1B00-\\u1B03\\u1B34\\u1B36-\\u1B3A\\u1B3C\\u1B42\\u1B6B-\\u1B73\\u1B80-\\u1B81\\u1BA2-\\u1BA5\\u1BA8-\\u1BA9\\u1BAB-\\u1BAD\\u1BE6\\u1BE8-\\u1BE9\\u1BED\\u1BEF-\\u1BF1\\u1C2C-\\u1C33\\u1C36-\\u1C37\\u1CD0-\\u1CD2\\u1CD4-\\u1CE0\\u1CE2-\\u1CE8\\u1CED\\u1CF4\\u1CF8-\\u1CF9\\u1DC0-\\u1DF5\\u1DFC-\\u1DFF\\u20D0-\\u20DC\\u20E1\\u20E5-\\u20F0\\u2CEF-\\u2CF1\\u2D7F\\u2DE0-\\u2DFF\\u302A-\\u302D\\u3099-\\u309A\\uA66F\\uA674-\\uA67D\\uA69E-\\uA69F\\uA6F0-\\uA6F1\\uA802\\uA806\\uA80B\\uA825-\\uA826\\uA8C4\\uA8E0-\\uA8F1\\uA926-\\uA92D\\uA947-\\uA951\\uA980-\\uA982\\uA9B3\\uA9B6-\\uA9B9\\uA9BC\\uA9E5\\uAA29-\\uAA2E\\uAA31-\\uAA32\\uAA35-\\uAA36\\uAA43\\uAA4C\\uAA7C\\uAAB0\\uAAB2-\\uAAB4\\uAAB7-\\uAAB8\\uAABE-\\uAABF\\uAAC1\\uAAEC-\\uAAED\\uAAF6\\uABE5\\uABE8\\uABED\\uFB1E\\uFE00-\\uFE0F\\uFE20-\\uFE2F]",description:"[\\u0300-\\u036F\\u0483-\\u0487\\u0591-\\u05BD\\u05BF\\u05C1-\\u05C2\\u05C4-\\u05C5\\u05C7\\u0610-\\u061A\\u064B-\\u065F\\u0670\\u06D6-\\u06DC\\u06DF-\\u06E4\\u06E7-\\u06E8\\u06EA-\\u06ED\\u0711\\u0730-\\u074A\\u07A6-\\u07B0\\u07EB-\\u07F3\\u0816-\\u0819\\u081B-\\u0823\\u0825-\\u0827\\u0829-\\u082D\\u0859-\\u085B\\u08E3-\\u0902\\u093A\\u093C\\u0941-\\u0948\\u094D\\u0951-\\u0957\\u0962-\\u0963\\u0981\\u09BC\\u09C1-\\u09C4\\u09CD\\u09E2-\\u09E3\\u0A01-\\u0A02\\u0A3C\\u0A41-\\u0A42\\u0A47-\\u0A48\\u0A4B-\\u0A4D\\u0A51\\u0A70-\\u0A71\\u0A75\\u0A81-\\u0A82\\u0ABC\\u0AC1-\\u0AC5\\u0AC7-\\u0AC8\\u0ACD\\u0AE2-\\u0AE3\\u0B01\\u0B3C\\u0B3F\\u0B41-\\u0B44\\u0B4D\\u0B56\\u0B62-\\u0B63\\u0B82\\u0BC0\\u0BCD\\u0C00\\u0C3E-\\u0C40\\u0C46-\\u0C48\\u0C4A-\\u0C4D\\u0C55-\\u0C56\\u0C62-\\u0C63\\u0C81\\u0CBC\\u0CBF\\u0CC6\\u0CCC-\\u0CCD\\u0CE2-\\u0CE3\\u0D01\\u0D41-\\u0D44\\u0D4D\\u0D62-\\u0D63\\u0DCA\\u0DD2-\\u0DD4\\u0DD6\\u0E31\\u0E34-\\u0E3A\\u0E47-\\u0E4E\\u0EB1\\u0EB4-\\u0EB9\\u0EBB-\\u0EBC\\u0EC8-\\u0ECD\\u0F18-\\u0F19\\u0F35\\u0F37\\u0F39\\u0F71-\\u0F7E\\u0F80-\\u0F84\\u0F86-\\u0F87\\u0F8D-\\u0F97\\u0F99-\\u0FBC\\u0FC6\\u102D-\\u1030\\u1032-\\u1037\\u1039-\\u103A\\u103D-\\u103E\\u1058-\\u1059\\u105E-\\u1060\\u1071-\\u1074\\u1082\\u1085-\\u1086\\u108D\\u109D\\u135D-\\u135F\\u1712-\\u1714\\u1732-\\u1734\\u1752-\\u1753\\u1772-\\u1773\\u17B4-\\u17B5\\u17B7-\\u17BD\\u17C6\\u17C9-\\u17D3\\u17DD\\u180B-\\u180D\\u18A9\\u1920-\\u1922\\u1927-\\u1928\\u1932\\u1939-\\u193B\\u1A17-\\u1A18\\u1A1B\\u1A56\\u1A58-\\u1A5E\\u1A60\\u1A62\\u1A65-\\u1A6C\\u1A73-\\u1A7C\\u1A7F\\u1AB0-\\u1ABD\\u1B00-\\u1B03\\u1B34\\u1B36-\\u1B3A\\u1B3C\\u1B42\\u1B6B-\\u1B73\\u1B80-\\u1B81\\u1BA2-\\u1BA5\\u1BA8-\\u1BA9\\u1BAB-\\u1BAD\\u1BE6\\u1BE8-\\u1BE9\\u1BED\\u1BEF-\\u1BF1\\u1C2C-\\u1C33\\u1C36-\\u1C37\\u1CD0-\\u1CD2\\u1CD4-\\u1CE0\\u1CE2-\\u1CE8\\u1CED\\u1CF4\\u1CF8-\\u1CF9\\u1DC0-\\u1DF5\\u1DFC-\\u1DFF\\u20D0-\\u20DC\\u20E1\\u20E5-\\u20F0\\u2CEF-\\u2CF1\\u2D7F\\u2DE0-\\u2DFF\\u302A-\\u302D\\u3099-\\u309A\\uA66F\\uA674-\\uA67D\\uA69E-\\uA69F\\uA6F0-\\uA6F1\\uA802\\uA806\\uA80B\\uA825-\\uA826\\uA8C4\\uA8E0-\\uA8F1\\uA926-\\uA92D\\uA947-\\uA951\\uA980-\\uA982\\uA9B3\\uA9B6-\\uA9B9\\uA9BC\\uA9E5\\uAA29-\\uAA2E\\uAA31-\\uAA32\\uAA35-\\uAA36\\uAA43\\uAA4C\\uAA7C\\uAAB0\\uAAB2-\\uAAB4\\uAAB7-\\uAAB8\\uAABE-\\uAABF\\uAAC1\\uAAEC-\\uAAED\\uAAF6\\uABE5\\uABE8\\uABED\\uFB1E\\uFE00-\\uFE0F\\uFE20-\\uFE2F]"},peg$c132=/^[0-9\u0660-\u0669\u06F0-\u06F9\u07C0-\u07C9\u0966-\u096F\u09E6-\u09EF\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0BE6-\u0BEF\u0C66-\u0C6F\u0CE6-\u0CEF\u0D66-\u0D6F\u0DE6-\u0DEF\u0E50-\u0E59\u0ED0-\u0ED9\u0F20-\u0F29\u1040-\u1049\u1090-\u1099\u17E0-\u17E9\u1810-\u1819\u1946-\u194F\u19D0-\u19D9\u1A80-\u1A89\u1A90-\u1A99\u1B50-\u1B59\u1BB0-\u1BB9\u1C40-\u1C49\u1C50-\u1C59\uA620-\uA629\uA8D0-\uA8D9\uA900-\uA909\uA9D0-\uA9D9\uA9F0-\uA9F9\uAA50-\uAA59\uABF0-\uABF9\uFF10-\uFF19]/,peg$c133={type:"class",value:"[\\u0030-\\u0039\\u0660-\\u0669\\u06F0-\\u06F9\\u07C0-\\u07C9\\u0966-\\u096F\\u09E6-\\u09EF\\u0A66-\\u0A6F\\u0AE6-\\u0AEF\\u0B66-\\u0B6F\\u0BE6-\\u0BEF\\u0C66-\\u0C6F\\u0CE6-\\u0CEF\\u0D66-\\u0D6F\\u0DE6-\\u0DEF\\u0E50-\\u0E59\\u0ED0-\\u0ED9\\u0F20-\\u0F29\\u1040-\\u1049\\u1090-\\u1099\\u17E0-\\u17E9\\u1810-\\u1819\\u1946-\\u194F\\u19D0-\\u19D9\\u1A80-\\u1A89\\u1A90-\\u1A99\\u1B50-\\u1B59\\u1BB0-\\u1BB9\\u1C40-\\u1C49\\u1C50-\\u1C59\\uA620-\\uA629\\uA8D0-\\uA8D9\\uA900-\\uA909\\uA9D0-\\uA9D9\\uA9F0-\\uA9F9\\uAA50-\\uAA59\\uABF0-\\uABF9\\uFF10-\\uFF19]",description:"[\\u0030-\\u0039\\u0660-\\u0669\\u06F0-\\u06F9\\u07C0-\\u07C9\\u0966-\\u096F\\u09E6-\\u09EF\\u0A66-\\u0A6F\\u0AE6-\\u0AEF\\u0B66-\\u0B6F\\u0BE6-\\u0BEF\\u0C66-\\u0C6F\\u0CE6-\\u0CEF\\u0D66-\\u0D6F\\u0DE6-\\u0DEF\\u0E50-\\u0E59\\u0ED0-\\u0ED9\\u0F20-\\u0F29\\u1040-\\u1049\\u1090-\\u1099\\u17E0-\\u17E9\\u1810-\\u1819\\u1946-\\u194F\\u19D0-\\u19D9\\u1A80-\\u1A89\\u1A90-\\u1A99\\u1B50-\\u1B59\\u1BB0-\\u1BB9\\u1C40-\\u1C49\\u1C50-\\u1C59\\uA620-\\uA629\\uA8D0-\\uA8D9\\uA900-\\uA909\\uA9D0-\\uA9D9\\uA9F0-\\uA9F9\\uAA50-\\uAA59\\uABF0-\\uABF9\\uFF10-\\uFF19]"},peg$c134=/^[\u16EE-\u16F0\u2160-\u2182\u2185-\u2188\u3007\u3021-\u3029\u3038-\u303A\uA6E6-\uA6EF]/,peg$c135={type:"class",value:"[\\u16EE-\\u16F0\\u2160-\\u2182\\u2185-\\u2188\\u3007\\u3021-\\u3029\\u3038-\\u303A\\uA6E6-\\uA6EF]",description:"[\\u16EE-\\u16F0\\u2160-\\u2182\\u2185-\\u2188\\u3007\\u3021-\\u3029\\u3038-\\u303A\\uA6E6-\\uA6EF]"},peg$c136=/^[_\u203F-\u2040\u2054\uFE33-\uFE34\uFE4D-\uFE4F\uFF3F]/,peg$c137={type:"class",value:"[\\u005F\\u203F-\\u2040\\u2054\\uFE33-\\uFE34\\uFE4D-\\uFE4F\\uFF3F]",description:"[\\u005F\\u203F-\\u2040\\u2054\\uFE33-\\uFE34\\uFE4D-\\uFE4F\\uFF3F]"},peg$c138=/^[ \xA0\u1680\u2000-\u200A\u202F\u205F\u3000]/,peg$c139={type:"class",value:"[\\u0020\\u00A0\\u1680\\u2000-\\u200A\\u202F\\u205F\\u3000]",description:"[\\u0020\\u00A0\\u1680\\u2000-\\u200A\\u202F\\u205F\\u3000]"},peg$c140="break",peg$c141={type:"literal",value:"break",description:"\"break\""},peg$c142="case",peg$c143={type:"literal",value:"case",description:"\"case\""},peg$c144="catch",peg$c145={type:"literal",value:"catch",description:"\"catch\""},peg$c146="class",peg$c147={type:"literal",value:"class",description:"\"class\""},peg$c148="const",peg$c149={type:"literal",value:"const",description:"\"const\""},peg$c150="continue",peg$c151={type:"literal",value:"continue",description:"\"continue\""},peg$c152="debugger",peg$c153={type:"literal",value:"debugger",description:"\"debugger\""},peg$c154="default",peg$c155={type:"literal",value:"default",description:"\"default\""},peg$c156="delete",peg$c157={type:"literal",value:"delete",description:"\"delete\""},peg$c158="do",peg$c159={type:"literal",value:"do",description:"\"do\""},peg$c160="else",peg$c161={type:"literal",value:"else",description:"\"else\""},peg$c162="enum",peg$c163={type:"literal",value:"enum",description:"\"enum\""},peg$c164="export",peg$c165={type:"literal",value:"export",description:"\"export\""},peg$c166="extends",peg$c167={type:"literal",value:"extends",description:"\"extends\""},peg$c168="false",peg$c169={type:"literal",value:"false",description:"\"false\""},peg$c170="finally",peg$c171={type:"literal",value:"finally",description:"\"finally\""},peg$c172="for",peg$c173={type:"literal",value:"for",description:"\"for\""},peg$c174="function",peg$c175={type:"literal",value:"function",description:"\"function\""},peg$c176="get",peg$c177={type:"literal",value:"get",description:"\"get\""},peg$c178="if",peg$c179={type:"literal",value:"if",description:"\"if\""},peg$c180="import",peg$c181={type:"literal",value:"import",description:"\"import\""},peg$c182="instanceof",peg$c183={type:"literal",value:"instanceof",description:"\"instanceof\""},peg$c184="in",peg$c185={type:"literal",value:"in",description:"\"in\""},peg$c186="new",peg$c187={type:"literal",value:"new",description:"\"new\""},peg$c188="null",peg$c189={type:"literal",value:"null",description:"\"null\""},peg$c190="return",peg$c191={type:"literal",value:"return",description:"\"return\""},peg$c192="set",peg$c193={type:"literal",value:"set",description:"\"set\""},peg$c194="super",peg$c195={type:"literal",value:"super",description:"\"super\""},peg$c196="switch",peg$c197={type:"literal",value:"switch",description:"\"switch\""},peg$c198="this",peg$c199={type:"literal",value:"this",description:"\"this\""},peg$c200="throw",peg$c201={type:"literal",value:"throw",description:"\"throw\""},peg$c202="true",peg$c203={type:"literal",value:"true",description:"\"true\""},peg$c204="try",peg$c205={type:"literal",value:"try",description:"\"try\""},peg$c206="typeof",peg$c207={type:"literal",value:"typeof",description:"\"typeof\""},peg$c208="var",peg$c209={type:"literal",value:"var",description:"\"var\""},peg$c210="void",peg$c211={type:"literal",value:"void",description:"\"void\""},peg$c212="while",peg$c213={type:"literal",value:"while",description:"\"while\""},peg$c214="with",peg$c215={type:"literal",value:"with",description:"\"with\""},peg$c216=";",peg$c217={type:"literal",value:";",description:"\";\""},peg$c218="}",peg$c219={type:"literal",value:"}",description:"\"}\""},peg$c220=function peg$c220(){return {type:"ThisExpression"};},peg$c221="(",peg$c222={type:"literal",value:"(",description:"\"(\""},peg$c223=")",peg$c224={type:"literal",value:")",description:"\")\""},peg$c225=function peg$c225(expression){return expression;},peg$c226=function peg$c226(elision){return {type:"ArrayExpression",elements:optionalList(extractOptional(elision,0))};},peg$c227=function peg$c227(elements){return {type:"ArrayExpression",elements:elements};},peg$c228=",",peg$c229={type:"literal",value:",",description:"\",\""},peg$c230=function peg$c230(elements,elision){return {type:"ArrayExpression",elements:elements.concat(optionalList(extractOptional(elision,0)))};},peg$c231=function peg$c231(elision,element){return optionalList(extractOptional(elision,0)).concat(element);},peg$c232=function peg$c232(head,elision,element){return optionalList(extractOptional(elision,0)).concat(element);},peg$c233=function peg$c233(head,tail){return Array.prototype.concat.apply(head,tail);},peg$c234=function peg$c234(commas){return filledArray(commas.length+1,null);},peg$c235="{",peg$c236={type:"literal",value:"{",description:"\"{\""},peg$c237=function peg$c237(){return {type:"ObjectExpression",properties:[]};},peg$c238=function peg$c238(properties){return {type:"ObjectExpression",properties:properties};},peg$c239=function peg$c239(head,tail){return buildList(head,tail,3);},peg$c240=":",peg$c241={type:"literal",value:":",description:"\":\""},peg$c242=function peg$c242(key,value){return {key:key,value:value,kind:"init"};},peg$c243=function peg$c243(key,body){return {key:key,value:{type:"FunctionExpression",id:null,params:[],body:body},kind:"get"};},peg$c244=function peg$c244(key,params,body){return {key:key,value:{type:"FunctionExpression",id:null,params:params,body:body},kind:"set"};},peg$c245=function peg$c245(id){return [id];},peg$c246=function peg$c246(callee,args){return {type:"NewExpression",callee:callee,arguments:args};},peg$c247=function peg$c247(head,property){return {property:property,computed:true};},peg$c248=function peg$c248(head,property){return {property:property,computed:false};},peg$c249=function peg$c249(head,tail){return buildTree(head,tail,function(result,element){return {type:"MemberExpression",object:result,property:element.property,computed:element.computed};});},peg$c250=function peg$c250(callee){return {type:"NewExpression",callee:callee,arguments:[]};},peg$c251=function peg$c251(callee,args){return {type:"CallExpression",callee:callee,arguments:args};},peg$c252=function peg$c252(head,args){return {type:"CallExpression",arguments:args};},peg$c253=function peg$c253(head,property){return {type:"MemberExpression",property:property,computed:true};},peg$c254=function peg$c254(head,property){return {type:"MemberExpression",property:property,computed:false};},peg$c255=function peg$c255(head,tail){return buildTree(head,tail,function(result,element){element[TYPES_TO_PROPERTY_NAMES[element.type]]=result;return element;});},peg$c256=function peg$c256(args){return optionalList(extractOptional(args,0));},peg$c257=function peg$c257(argument,operator){return {type:"UpdateExpression",operator:operator,argument:argument,prefix:false};},peg$c258="++",peg$c259={type:"literal",value:"++",description:"\"++\""},peg$c260="--",peg$c261={type:"literal",value:"--",description:"\"--\""},peg$c262=function peg$c262(operator,argument){var type=operator==="++"||operator==="--"?"UpdateExpression":"UnaryExpression";return {type:type,operator:operator,argument:argument,prefix:true};},peg$c263="+",peg$c264={type:"literal",value:"+",description:"\"+\""},peg$c265="=",peg$c266={type:"literal",value:"=",description:"\"=\""},peg$c267="-",peg$c268={type:"literal",value:"-",description:"\"-\""},peg$c269="~",peg$c270={type:"literal",value:"~",description:"\"~\""},peg$c271="!",peg$c272={type:"literal",value:"!",description:"\"!\""},peg$c273=function peg$c273(head,tail){return buildBinaryExpression(head,tail);},peg$c274="*",peg$c275={type:"literal",value:"*",description:"\"*\""},peg$c276="%",peg$c277={type:"literal",value:"%",description:"\"%\""},peg$c278=/^[+=]/,peg$c279={type:"class",value:"[+=]",description:"[+=]"},peg$c280=/^[\-=]/,peg$c281={type:"class",value:"[-=]",description:"[-=]"},peg$c282="<<",peg$c283={type:"literal",value:"<<",description:"\"<<\""},peg$c284=">>>",peg$c285={type:"literal",value:">>>",description:"\">>>\""},peg$c286=">>",peg$c287={type:"literal",value:">>",description:"\">>\""},peg$c288="<=",peg$c289={type:"literal",value:"<=",description:"\"<=\""},peg$c290=">=",peg$c291={type:"literal",value:">=",description:"\">=\""},peg$c292="<",peg$c293={type:"literal",value:"<",description:"\"<\""},peg$c294=">",peg$c295={type:"literal",value:">",description:"\">\""},peg$c296="===",peg$c297={type:"literal",value:"===",description:"\"===\""},peg$c298="!==",peg$c299={type:"literal",value:"!==",description:"\"!==\""},peg$c300="==",peg$c301={type:"literal",value:"==",description:"\"==\""},peg$c302="!=",peg$c303={type:"literal",value:"!=",description:"\"!=\""},peg$c304="&",peg$c305={type:"literal",value:"&",description:"\"&\""},peg$c306=/^[&=]/,peg$c307={type:"class",value:"[&=]",description:"[&=]"},peg$c308="^",peg$c309={type:"literal",value:"^",description:"\"^\""},peg$c310="|",peg$c311={type:"literal",value:"|",description:"\"|\""},peg$c312=/^[|=]/,peg$c313={type:"class",value:"[|=]",description:"[|=]"},peg$c314="&&",peg$c315={type:"literal",value:"&&",description:"\"&&\""},peg$c316="||",peg$c317={type:"literal",value:"||",description:"\"||\""},peg$c318="?",peg$c319={type:"literal",value:"?",description:"\"?\""},peg$c320=function peg$c320(test,consequent,alternate){return {type:"ConditionalExpression",test:test,consequent:consequent,alternate:alternate};},peg$c321=function peg$c321(left,right){return {type:"AssignmentExpression",operator:"=",left:left,right:right};},peg$c322=function peg$c322(left,operator,right){return {type:"AssignmentExpression",operator:operator,left:left,right:right};},peg$c323="*=",peg$c324={type:"literal",value:"*=",description:"\"*=\""},peg$c325="/=",peg$c326={type:"literal",value:"/=",description:"\"/=\""},peg$c327="%=",peg$c328={type:"literal",value:"%=",description:"\"%=\""},peg$c329="+=",peg$c330={type:"literal",value:"+=",description:"\"+=\""},peg$c331="-=",peg$c332={type:"literal",value:"-=",description:"\"-=\""},peg$c333="<<=",peg$c334={type:"literal",value:"<<=",description:"\"<<=\""},peg$c335=">>=",peg$c336={type:"literal",value:">>=",description:"\">>=\""},peg$c337=">>>=",peg$c338={type:"literal",value:">>>=",description:"\">>>=\""},peg$c339="&=",peg$c340={type:"literal",value:"&=",description:"\"&=\""},peg$c341="^=",peg$c342={type:"literal",value:"^=",description:"\"^=\""},peg$c343="|=",peg$c344={type:"literal",value:"|=",description:"\"|=\""},peg$c345=function peg$c345(head,tail){return tail.length>0?{type:"SequenceExpression",expressions:buildList(head,tail,3)}:head;},peg$c346=function peg$c346(body){return {type:"BlockStatement",body:optionalList(extractOptional(body,0))};},peg$c347=function peg$c347(head,tail){return buildList(head,tail,1);},peg$c348=function peg$c348(declarations){return {type:"VariableDeclaration",declarations:declarations};},peg$c349=function peg$c349(id,init){return {type:"VariableDeclarator",id:id,init:extractOptional(init,1)};},peg$c350=function peg$c350(){return {type:"EmptyStatement"};},peg$c351=function peg$c351(expression){return {type:"ExpressionStatement",expression:expression};},peg$c352=function peg$c352(test,consequent,alternate){return {type:"IfStatement",test:test,consequent:consequent,alternate:alternate};},peg$c353=function peg$c353(test,consequent){return {type:"IfStatement",test:test,consequent:consequent,alternate:null};},peg$c354=function peg$c354(body,test){return {type:"DoWhileStatement",body:body,test:test};},peg$c355=function peg$c355(test,body){return {type:"WhileStatement",test:test,body:body};},peg$c356=function peg$c356(init,test,update,body){return {type:"ForStatement",init:extractOptional(init,0),test:extractOptional(test,0),update:extractOptional(update,0),body:body};},peg$c357=function peg$c357(declarations,test,update,body){return {type:"ForStatement",init:{type:"VariableDeclaration",declarations:declarations},test:extractOptional(test,0),update:extractOptional(update,0),body:body};},peg$c358=function peg$c358(left,right,body){return {type:"ForInStatement",left:left,right:right,body:body};},peg$c359=function peg$c359(declarations,right,body){return {type:"ForInStatement",left:{type:"VariableDeclaration",declarations:declarations},right:right,body:body};},peg$c360=function peg$c360(){return {type:"ContinueStatement",label:null};},peg$c361=function peg$c361(label){return {type:"ContinueStatement",label:label};},peg$c362=function peg$c362(){return {type:"BreakStatement",label:null};},peg$c363=function peg$c363(label){return {type:"BreakStatement",label:label};},peg$c364=function peg$c364(){return {type:"ReturnStatement",argument:null};},peg$c365=function peg$c365(argument){return {type:"ReturnStatement",argument:argument};},peg$c366=function peg$c366(object,body){return {type:"WithStatement",object:object,body:body};},peg$c367=function peg$c367(discriminant,cases){return {type:"SwitchStatement",discriminant:discriminant,cases:cases};},peg$c368=function peg$c368(clauses){return optionalList(extractOptional(clauses,0));},peg$c369=function peg$c369(before,default_,after){return optionalList(extractOptional(before,0)).concat(default_).concat(optionalList(extractOptional(after,0)));},peg$c370=function peg$c370(test,consequent){return {type:"SwitchCase",test:test,consequent:optionalList(extractOptional(consequent,1))};},peg$c371=function peg$c371(consequent){return {type:"SwitchCase",test:null,consequent:optionalList(extractOptional(consequent,1))};},peg$c372=function peg$c372(label,body){return {type:"LabeledStatement",label:label,body:body};},peg$c373=function peg$c373(argument){return {type:"ThrowStatement",argument:argument};},peg$c374=function peg$c374(block,handler,finalizer){return {type:"TryStatement",block:block,handler:handler,finalizer:finalizer};},peg$c375=function peg$c375(block,handler){return {type:"TryStatement",block:block,handler:handler,finalizer:null};},peg$c376=function peg$c376(block,finalizer){return {type:"TryStatement",block:block,handler:null,finalizer:finalizer};},peg$c377=function peg$c377(param,body){return {type:"CatchClause",param:param,body:body};},peg$c378=function peg$c378(block){return block;},peg$c379=function peg$c379(){return {type:"DebuggerStatement"};},peg$c380=function peg$c380(id,params,body){return {type:"FunctionDeclaration",id:id,params:optionalList(extractOptional(params,0)),body:body};},peg$c381=function peg$c381(id,params,body){return {type:"FunctionExpression",id:extractOptional(id,0),params:optionalList(extractOptional(params,0)),body:body};},peg$c382=function peg$c382(body){return {type:"BlockStatement",body:optionalList(body)};},peg$c383=function peg$c383(body){return {type:"Program",body:optionalList(body)};},peg$c384=function peg$c384(head,tail){return buildList(head,tail,1);},peg$c385=function peg$c385(elements){return elements;},peg$c386="{*",peg$c387={type:"literal",value:"{*",description:"\"{*\""},peg$c388="*}",peg$c389={type:"literal",value:"*}",description:"\"*}\""},peg$c390=function peg$c390(comment){return {type:'TemplateComment'};},peg$c391="{{",peg$c392={type:"literal",value:"{{",description:"\"{{\""},peg$c393="}}",peg$c394={type:"literal",value:"}}",description:"\"}}\""},peg$c395=function peg$c395(literal){return {type:'TemplateLiteralSyntaxError',location:location()};},peg$c396="{%",peg$c397={type:"literal",value:"{%",description:"\"{%\""},peg$c398="%}",peg$c399={type:"literal",value:"%}",description:"\"%}\""},peg$c400=function peg$c400(block){return block;},peg$c401=function peg$c401(block){return {type:'TemplateBlockSyntaxError',location:location()};},peg$c402=function peg$c402(){return text();},peg$c403=function peg$c403(literal){return {type:'TemplateLiteral',value:literal,location:location()};},peg$c404=function peg$c404(template){return {type:"TemplateExtend",template:template,location:location()};},peg$c405="as",peg$c406={type:"literal",value:"as",description:"\"as\""},peg$c407=function peg$c407(template,as){return {location:location(),type:"TemplateImport",template:template,as:as,location:location()};},peg$c408=function peg$c408(expression){return {type:"TemplateSet",expression:expression,location:location()};},peg$c409="raw",peg$c410={type:"literal",value:"raw",description:"\"raw\""},peg$c411="endraw",peg$c412={type:"literal",value:"endraw",description:"\"endraw\""},peg$c413=function peg$c413(raw){return {type:"TemplateRaw",raw:optionalList(extractList(raw,1)).join(''),location:location()};},peg$c414="macro",peg$c415={type:"literal",value:"macro",description:"\"macro\""},peg$c416=function peg$c416(name){return {type:"TemplateMacro",name:name,location:location()};},peg$c417="endmacro",peg$c418={type:"literal",value:"endmacro",description:"\"endmacro\""},peg$c419=function peg$c419(){return {type:"TemplateEndMacro",location:location()};},peg$c420="block",peg$c421={type:"literal",value:"block",description:"\"block\""},peg$c422=function peg$c422(name){return {type:"TemplateBlock",name:name,location:location()};},peg$c423="endblock",peg$c424={type:"literal",value:"endblock",description:"\"endblock\""},peg$c425=function peg$c425(){return {type:"TemplateEndBlock",location:location()};},peg$c426=function peg$c426(key,value,list){return {type:"TemplateFor",key:key,value:value,list:list,location:location()};},peg$c427="endfor",peg$c428={type:"literal",value:"endfor",description:"\"endfor\""},peg$c429=function peg$c429(){return {type:"TemplateEndFor",location:location()};},peg$c430=function peg$c430(test){return {type:"TemplateIf",test:test,location:location()};},peg$c431=function peg$c431(test){return {type:"TemplateElseIf",test:test,location:location()};},peg$c432=function peg$c432(){return {type:"TemplateElse",location:location()};},peg$c433="endif",peg$c434={type:"literal",value:"endif",description:"\"endif\""},peg$c435=function peg$c435(){return {type:"TemplateEndIf",location:location()};},peg$currPos=0,peg$savedPos=0,peg$posDetailsCache=[{line:1,column:1,seenCR:false}],peg$maxFailPos=0,peg$maxFailExpected=[],peg$silentFails=0,peg$result;if("startRule" in options){if(!(options.startRule in peg$startRuleFunctions)){throw new Error("Can't start parsing from rule \""+options.startRule+"\".");}peg$startRuleFunction=peg$startRuleFunctions[options.startRule];}function text(){return input.substring(peg$savedPos,peg$currPos);}function location(){return peg$computeLocation(peg$savedPos,peg$currPos);}function expected(description){throw peg$buildException(null,[{type:"other",description:description}],input.substring(peg$savedPos,peg$currPos),peg$computeLocation(peg$savedPos,peg$currPos));}function error(message){throw peg$buildException(message,null,input.substring(peg$savedPos,peg$currPos),peg$computeLocation(peg$savedPos,peg$currPos));}function peg$computePosDetails(pos){var details=peg$posDetailsCache[pos],p,ch;if(details){return details;}else {p=pos-1;while(!peg$posDetailsCache[p]){p--;}details=peg$posDetailsCache[p];details={line:details.line,column:details.column,seenCR:details.seenCR};while(p<pos){ch=input.charAt(p);if(ch==="\n"){if(!details.seenCR){details.line++;}details.column=1;details.seenCR=false;}else if(ch==="\r"||ch==="\u2028"||ch==="\u2029"){details.line++;details.column=1;details.seenCR=true;}else {details.column++;details.seenCR=false;}p++;}peg$posDetailsCache[pos]=details;return details;}}function peg$computeLocation(startPos,endPos){var startPosDetails=peg$computePosDetails(startPos),endPosDetails=peg$computePosDetails(endPos);return {start:{offset:startPos,line:startPosDetails.line,column:startPosDetails.column},end:{offset:endPos,line:endPosDetails.line,column:endPosDetails.column}};}function peg$fail(expected){if(peg$currPos<peg$maxFailPos){return;}if(peg$currPos>peg$maxFailPos){peg$maxFailPos=peg$currPos;peg$maxFailExpected=[];}peg$maxFailExpected.push(expected);}function peg$buildException(message,expected,found,location){function cleanupExpected(expected){var i=1;expected.sort(function(a,b){if(a.description<b.description){return -1;}else if(a.description>b.description){return 1;}else {return 0;}});while(i<expected.length){if(expected[i-1]===expected[i]){expected.splice(i,1);}else {i++;}}}function buildMessage(expected,found){function stringEscape(s){function hex(ch){return ch.charCodeAt(0).toString(16).toUpperCase();}return s.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\x08/g,'\\b').replace(/\t/g,'\\t').replace(/\n/g,'\\n').replace(/\f/g,'\\f').replace(/\r/g,'\\r').replace(/[\x00-\x07\x0B\x0E\x0F]/g,function(ch){return '\\x0'+hex(ch);}).replace(/[\x10-\x1F\x80-\xFF]/g,function(ch){return '\\x'+hex(ch);}).replace(/[\u0100-\u0FFF]/g,function(ch){return "\\u0"+hex(ch);}).replace(/[\u1000-\uFFFF]/g,function(ch){return "\\u"+hex(ch);});}var expectedDescs=new Array(expected.length),expectedDesc,foundDesc,i;for(i=0;i<expected.length;i++){expectedDescs[i]=expected[i].description;}expectedDesc=expected.length>1?expectedDescs.slice(0,-1).join(", ")+" or "+expectedDescs[expected.length-1]:expectedDescs[0];foundDesc=found?"\""+stringEscape(found)+"\"":"end of input";return "Expected "+expectedDesc+" but "+foundDesc+" found.";}if(expected!==null){cleanupExpected(expected);}return new peg$SyntaxError(message!==null?message:buildMessage(expected,found),expected,found,location);}function peg$parseStart(){var s0,s1,s2,s3;s0=peg$currPos;s1=peg$parse__();if(s1!==peg$FAILED){s2=peg$parseProgram();if(s2!==peg$FAILED){s3=peg$parse__();if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c0(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseSourceCharacter(){var s0;if(input.length>peg$currPos){s0=input.charAt(peg$currPos);peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c1);}}return s0;}function peg$parseWhiteSpace(){var s0,s1;peg$silentFails++;if(input.charCodeAt(peg$currPos)===9){s0=peg$c3;peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c4);}}if(s0===peg$FAILED){if(input.charCodeAt(peg$currPos)===11){s0=peg$c5;peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c6);}}if(s0===peg$FAILED){if(input.charCodeAt(peg$currPos)===12){s0=peg$c7;peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c8);}}if(s0===peg$FAILED){if(input.charCodeAt(peg$currPos)===32){s0=peg$c9;peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c10);}}if(s0===peg$FAILED){if(input.charCodeAt(peg$currPos)===160){s0=peg$c11;peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c12);}}if(s0===peg$FAILED){if(input.charCodeAt(peg$currPos)===65279){s0=peg$c13;peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c14);}}if(s0===peg$FAILED){s0=peg$parseZs();}}}}}}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c2);}}return s0;}function peg$parseLineTerminator(){var s0;if(peg$c15.test(input.charAt(peg$currPos))){s0=input.charAt(peg$currPos);peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c16);}}return s0;}function peg$parseLineTerminatorSequence(){var s0,s1;peg$silentFails++;if(input.charCodeAt(peg$currPos)===10){s0=peg$c18;peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c19);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,2)===peg$c20){s0=peg$c20;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c21);}}if(s0===peg$FAILED){if(input.charCodeAt(peg$currPos)===13){s0=peg$c22;peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c23);}}if(s0===peg$FAILED){if(input.charCodeAt(peg$currPos)===8232){s0=peg$c24;peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c25);}}if(s0===peg$FAILED){if(input.charCodeAt(peg$currPos)===8233){s0=peg$c26;peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c27);}}}}}}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c17);}}return s0;}function peg$parseComment(){var s0,s1;peg$silentFails++;s0=peg$parseMultiLineComment();if(s0===peg$FAILED){s0=peg$parseSingleLineComment();}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c28);}}return s0;}function peg$parseMultiLineComment(){var s0,s1,s2,s3,s4,s5;s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c29){s1=peg$c29;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c30);}}if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$currPos;peg$silentFails++;if(input.substr(peg$currPos,2)===peg$c31){s5=peg$c31;peg$currPos+=2;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c32);}}peg$silentFails--;if(s5===peg$FAILED){s4=void 0;}else {peg$currPos=s4;s4=peg$FAILED;}if(s4!==peg$FAILED){s5=peg$parseSourceCharacter();if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$currPos;peg$silentFails++;if(input.substr(peg$currPos,2)===peg$c31){s5=peg$c31;peg$currPos+=2;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c32);}}peg$silentFails--;if(s5===peg$FAILED){s4=void 0;}else {peg$currPos=s4;s4=peg$FAILED;}if(s4!==peg$FAILED){s5=peg$parseSourceCharacter();if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c31){s3=peg$c31;peg$currPos+=2;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c32);}}if(s3!==peg$FAILED){s1=[s1,s2,s3];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseMultiLineCommentNoLineTerminator(){var s0,s1,s2,s3,s4,s5;s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c29){s1=peg$c29;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c30);}}if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$currPos;peg$silentFails++;if(input.substr(peg$currPos,2)===peg$c31){s5=peg$c31;peg$currPos+=2;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c32);}}if(s5===peg$FAILED){s5=peg$parseLineTerminator();}peg$silentFails--;if(s5===peg$FAILED){s4=void 0;}else {peg$currPos=s4;s4=peg$FAILED;}if(s4!==peg$FAILED){s5=peg$parseSourceCharacter();if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$currPos;peg$silentFails++;if(input.substr(peg$currPos,2)===peg$c31){s5=peg$c31;peg$currPos+=2;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c32);}}if(s5===peg$FAILED){s5=peg$parseLineTerminator();}peg$silentFails--;if(s5===peg$FAILED){s4=void 0;}else {peg$currPos=s4;s4=peg$FAILED;}if(s4!==peg$FAILED){s5=peg$parseSourceCharacter();if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c31){s3=peg$c31;peg$currPos+=2;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c32);}}if(s3!==peg$FAILED){s1=[s1,s2,s3];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseSingleLineComment(){var s0,s1,s2,s3,s4,s5;s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c33){s1=peg$c33;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c34);}}if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$currPos;peg$silentFails++;s5=peg$parseLineTerminator();peg$silentFails--;if(s5===peg$FAILED){s4=void 0;}else {peg$currPos=s4;s4=peg$FAILED;}if(s4!==peg$FAILED){s5=peg$parseSourceCharacter();if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$currPos;peg$silentFails++;s5=peg$parseLineTerminator();peg$silentFails--;if(s5===peg$FAILED){s4=void 0;}else {peg$currPos=s4;s4=peg$FAILED;}if(s4!==peg$FAILED){s5=peg$parseSourceCharacter();if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseIdentifier(){var s0,s1,s2;s0=peg$currPos;s1=peg$currPos;peg$silentFails++;s2=peg$parseReservedWord();peg$silentFails--;if(s2===peg$FAILED){s1=void 0;}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s2=peg$parseIdentifierName();if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c35(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseIdentifierName(){var s0,s1,s2,s3;peg$silentFails++;s0=peg$currPos;s1=peg$parseIdentifierStart();if(s1!==peg$FAILED){s2=[];s3=peg$parseIdentifierPart();while(s3!==peg$FAILED){s2.push(s3);s3=peg$parseIdentifierPart();}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c37(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c36);}}return s0;}function peg$parseIdentifierStart(){var s0,s1,s2;s0=peg$parseUnicodeLetter();if(s0===peg$FAILED){if(input.charCodeAt(peg$currPos)===36){s0=peg$c38;peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c39);}}if(s0===peg$FAILED){if(input.charCodeAt(peg$currPos)===95){s0=peg$c40;peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c41);}}if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===92){s1=peg$c42;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c43);}}if(s1!==peg$FAILED){s2=peg$parseUnicodeEscapeSequence();if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c44(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}}}return s0;}function peg$parseIdentifierPart(){var s0;s0=peg$parseIdentifierStart();if(s0===peg$FAILED){s0=peg$parseUnicodeCombiningMark();if(s0===peg$FAILED){s0=peg$parseNd();if(s0===peg$FAILED){s0=peg$parsePc();if(s0===peg$FAILED){if(input.charCodeAt(peg$currPos)===8204){s0=peg$c45;peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c46);}}if(s0===peg$FAILED){if(input.charCodeAt(peg$currPos)===8205){s0=peg$c47;peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c48);}}}}}}}return s0;}function peg$parseUnicodeLetter(){var s0;s0=peg$parseLu();if(s0===peg$FAILED){s0=peg$parseLl();if(s0===peg$FAILED){s0=peg$parseLt();if(s0===peg$FAILED){s0=peg$parseLm();if(s0===peg$FAILED){s0=peg$parseLo();if(s0===peg$FAILED){s0=peg$parseNl();}}}}}return s0;}function peg$parseUnicodeCombiningMark(){var s0;s0=peg$parseMn();if(s0===peg$FAILED){s0=peg$parseMc();}return s0;}function peg$parseReservedWord(){var s0;s0=peg$parseKeyword();if(s0===peg$FAILED){s0=peg$parseFutureReservedWord();if(s0===peg$FAILED){s0=peg$parseNullLiteral();if(s0===peg$FAILED){s0=peg$parseBooleanLiteral();}}}return s0;}function peg$parseKeyword(){var s0;s0=peg$parseBreakToken();if(s0===peg$FAILED){s0=peg$parseCaseToken();if(s0===peg$FAILED){s0=peg$parseCatchToken();if(s0===peg$FAILED){s0=peg$parseContinueToken();if(s0===peg$FAILED){s0=peg$parseDebuggerToken();if(s0===peg$FAILED){s0=peg$parseDefaultToken();if(s0===peg$FAILED){s0=peg$parseDeleteToken();if(s0===peg$FAILED){s0=peg$parseDoToken();if(s0===peg$FAILED){s0=peg$parseElseToken();if(s0===peg$FAILED){s0=peg$parseFinallyToken();if(s0===peg$FAILED){s0=peg$parseForToken();if(s0===peg$FAILED){s0=peg$parseFunctionToken();if(s0===peg$FAILED){s0=peg$parseIfToken();if(s0===peg$FAILED){s0=peg$parseInstanceofToken();if(s0===peg$FAILED){s0=peg$parseInToken();if(s0===peg$FAILED){s0=peg$parseNewToken();if(s0===peg$FAILED){s0=peg$parseReturnToken();if(s0===peg$FAILED){s0=peg$parseSwitchToken();if(s0===peg$FAILED){s0=peg$parseThisToken();if(s0===peg$FAILED){s0=peg$parseThrowToken();if(s0===peg$FAILED){s0=peg$parseTryToken();if(s0===peg$FAILED){s0=peg$parseTypeofToken();if(s0===peg$FAILED){s0=peg$parseVarToken();if(s0===peg$FAILED){s0=peg$parseVoidToken();if(s0===peg$FAILED){s0=peg$parseWhileToken();if(s0===peg$FAILED){s0=peg$parseWithToken();}}}}}}}}}}}}}}}}}}}}}}}}}return s0;}function peg$parseFutureReservedWord(){var s0;s0=peg$parseClassToken();if(s0===peg$FAILED){s0=peg$parseConstToken();if(s0===peg$FAILED){s0=peg$parseEnumToken();if(s0===peg$FAILED){s0=peg$parseExportToken();if(s0===peg$FAILED){s0=peg$parseExtendsToken();if(s0===peg$FAILED){s0=peg$parseImportToken();if(s0===peg$FAILED){s0=peg$parseSuperToken();}}}}}}return s0;}function peg$parseLiteral(){var s0;s0=peg$parseNullLiteral();if(s0===peg$FAILED){s0=peg$parseBooleanLiteral();if(s0===peg$FAILED){s0=peg$parseNumericLiteral();if(s0===peg$FAILED){s0=peg$parseStringLiteral();if(s0===peg$FAILED){s0=peg$parseRegularExpressionLiteral();}}}}return s0;}function peg$parseNullLiteral(){var s0,s1;s0=peg$currPos;s1=peg$parseNullToken();if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c49();}s0=s1;return s0;}function peg$parseBooleanLiteral(){var s0,s1;s0=peg$currPos;s1=peg$parseTrueToken();if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c50();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseFalseToken();if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c51();}s0=s1;}return s0;}function peg$parseNumericLiteral(){var s0,s1,s2,s3;peg$silentFails++;s0=peg$currPos;s1=peg$parseHexIntegerLiteral();if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierStart();if(s3===peg$FAILED){s3=peg$parseDecimalDigit();}peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c53(s1);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseDecimalLiteral();if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierStart();if(s3===peg$FAILED){s3=peg$parseDecimalDigit();}peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c53(s1);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c52);}}return s0;}function peg$parseDecimalLiteral(){var s0,s1,s2,s3,s4;s0=peg$currPos;s1=peg$parseDecimalIntegerLiteral();if(s1!==peg$FAILED){if(input.charCodeAt(peg$currPos)===46){s2=peg$c54;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c55);}}if(s2!==peg$FAILED){s3=[];s4=peg$parseDecimalDigit();while(s4!==peg$FAILED){s3.push(s4);s4=peg$parseDecimalDigit();}if(s3!==peg$FAILED){s4=peg$parseExponentPart();if(s4===peg$FAILED){s4=null;}if(s4!==peg$FAILED){peg$savedPos=s0;s1=peg$c56();s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===46){s1=peg$c54;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c55);}}if(s1!==peg$FAILED){s2=[];s3=peg$parseDecimalDigit();if(s3!==peg$FAILED){while(s3!==peg$FAILED){s2.push(s3);s3=peg$parseDecimalDigit();}}else {s2=peg$FAILED;}if(s2!==peg$FAILED){s3=peg$parseExponentPart();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c56();s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseDecimalIntegerLiteral();if(s1!==peg$FAILED){s2=peg$parseExponentPart();if(s2===peg$FAILED){s2=null;}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c56();s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}}return s0;}function peg$parseDecimalIntegerLiteral(){var s0,s1,s2,s3;if(input.charCodeAt(peg$currPos)===48){s0=peg$c57;peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c58);}}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseNonZeroDigit();if(s1!==peg$FAILED){s2=[];s3=peg$parseDecimalDigit();while(s3!==peg$FAILED){s2.push(s3);s3=peg$parseDecimalDigit();}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}return s0;}function peg$parseDecimalDigit(){var s0;if(peg$c59.test(input.charAt(peg$currPos))){s0=input.charAt(peg$currPos);peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c60);}}return s0;}function peg$parseNonZeroDigit(){var s0;if(peg$c61.test(input.charAt(peg$currPos))){s0=input.charAt(peg$currPos);peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c62);}}return s0;}function peg$parseExponentPart(){var s0,s1,s2;s0=peg$currPos;s1=peg$parseExponentIndicator();if(s1!==peg$FAILED){s2=peg$parseSignedInteger();if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseExponentIndicator(){var s0;if(input.substr(peg$currPos,1).toLowerCase()===peg$c63){s0=input.charAt(peg$currPos);peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c64);}}return s0;}function peg$parseSignedInteger(){var s0,s1,s2,s3;s0=peg$currPos;if(peg$c65.test(input.charAt(peg$currPos))){s1=input.charAt(peg$currPos);peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c66);}}if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){s2=[];s3=peg$parseDecimalDigit();if(s3!==peg$FAILED){while(s3!==peg$FAILED){s2.push(s3);s3=peg$parseDecimalDigit();}}else {s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseHexIntegerLiteral(){var s0,s1,s2,s3,s4;s0=peg$currPos;if(input.substr(peg$currPos,2).toLowerCase()===peg$c67){s1=input.substr(peg$currPos,2);peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c68);}}if(s1!==peg$FAILED){s2=peg$currPos;s3=[];s4=peg$parseHexDigit();if(s4!==peg$FAILED){while(s4!==peg$FAILED){s3.push(s4);s4=peg$parseHexDigit();}}else {s3=peg$FAILED;}if(s3!==peg$FAILED){s2=input.substring(s2,peg$currPos);}else {s2=s3;}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c69(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseHexDigit(){var s0;if(peg$c70.test(input.charAt(peg$currPos))){s0=input.charAt(peg$currPos);peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c71);}}return s0;}function peg$parseStringLiteral(){var s0,s1,s2,s3;peg$silentFails++;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===34){s1=peg$c73;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c74);}}if(s1!==peg$FAILED){s2=[];s3=peg$parseDoubleStringCharacter();while(s3!==peg$FAILED){s2.push(s3);s3=peg$parseDoubleStringCharacter();}if(s2!==peg$FAILED){if(input.charCodeAt(peg$currPos)===34){s3=peg$c73;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c74);}}if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c75(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===39){s1=peg$c76;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c77);}}if(s1!==peg$FAILED){s2=[];s3=peg$parseSingleStringCharacter();while(s3!==peg$FAILED){s2.push(s3);s3=peg$parseSingleStringCharacter();}if(s2!==peg$FAILED){if(input.charCodeAt(peg$currPos)===39){s3=peg$c76;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c77);}}if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c75(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c72);}}return s0;}function peg$parseDoubleStringCharacter(){var s0,s1,s2;s0=peg$currPos;s1=peg$currPos;peg$silentFails++;if(input.charCodeAt(peg$currPos)===34){s2=peg$c73;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c74);}}if(s2===peg$FAILED){if(input.charCodeAt(peg$currPos)===92){s2=peg$c42;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c43);}}if(s2===peg$FAILED){s2=peg$parseLineTerminator();}}peg$silentFails--;if(s2===peg$FAILED){s1=void 0;}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s2=peg$parseSourceCharacter();if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c78();s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===92){s1=peg$c42;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c43);}}if(s1!==peg$FAILED){s2=peg$parseEscapeSequence();if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c44(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$parseLineContinuation();}}return s0;}function peg$parseSingleStringCharacter(){var s0,s1,s2;s0=peg$currPos;s1=peg$currPos;peg$silentFails++;if(input.charCodeAt(peg$currPos)===39){s2=peg$c76;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c77);}}if(s2===peg$FAILED){if(input.charCodeAt(peg$currPos)===92){s2=peg$c42;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c43);}}if(s2===peg$FAILED){s2=peg$parseLineTerminator();}}peg$silentFails--;if(s2===peg$FAILED){s1=void 0;}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s2=peg$parseSourceCharacter();if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c78();s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===92){s1=peg$c42;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c43);}}if(s1!==peg$FAILED){s2=peg$parseEscapeSequence();if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c44(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$parseLineContinuation();}}return s0;}function peg$parseLineContinuation(){var s0,s1,s2;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===92){s1=peg$c42;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c43);}}if(s1!==peg$FAILED){s2=peg$parseLineTerminatorSequence();if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c79();s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseEscapeSequence(){var s0,s1,s2,s3;s0=peg$parseCharacterEscapeSequence();if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===48){s1=peg$c57;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c58);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseDecimalDigit();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c80();s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$parseHexEscapeSequence();if(s0===peg$FAILED){s0=peg$parseUnicodeEscapeSequence();}}}return s0;}function peg$parseCharacterEscapeSequence(){var s0;s0=peg$parseSingleEscapeCharacter();if(s0===peg$FAILED){s0=peg$parseNonEscapeCharacter();}return s0;}function peg$parseSingleEscapeCharacter(){var s0,s1;if(input.charCodeAt(peg$currPos)===39){s0=peg$c76;peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c77);}}if(s0===peg$FAILED){if(input.charCodeAt(peg$currPos)===34){s0=peg$c73;peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c74);}}if(s0===peg$FAILED){if(input.charCodeAt(peg$currPos)===92){s0=peg$c42;peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c43);}}if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===98){s1=peg$c81;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c82);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c83();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===102){s1=peg$c84;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c85);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c86();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===110){s1=peg$c87;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c88);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c89();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===114){s1=peg$c90;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c91);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c92();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===116){s1=peg$c93;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c94);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c95();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===118){s1=peg$c96;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c97);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c98();}s0=s1;}}}}}}}}return s0;}function peg$parseNonEscapeCharacter(){var s0,s1,s2;s0=peg$currPos;s1=peg$currPos;peg$silentFails++;s2=peg$parseEscapeCharacter();if(s2===peg$FAILED){s2=peg$parseLineTerminator();}peg$silentFails--;if(s2===peg$FAILED){s1=void 0;}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s2=peg$parseSourceCharacter();if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c78();s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseEscapeCharacter(){var s0;s0=peg$parseSingleEscapeCharacter();if(s0===peg$FAILED){s0=peg$parseDecimalDigit();if(s0===peg$FAILED){if(input.charCodeAt(peg$currPos)===120){s0=peg$c99;peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c100);}}if(s0===peg$FAILED){if(input.charCodeAt(peg$currPos)===117){s0=peg$c101;peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c102);}}}}}return s0;}function peg$parseHexEscapeSequence(){var s0,s1,s2,s3,s4,s5;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===120){s1=peg$c99;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c100);}}if(s1!==peg$FAILED){s2=peg$currPos;s3=peg$currPos;s4=peg$parseHexDigit();if(s4!==peg$FAILED){s5=peg$parseHexDigit();if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=input.substring(s2,peg$currPos);}else {s2=s3;}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c103(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseUnicodeEscapeSequence(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===117){s1=peg$c101;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c102);}}if(s1!==peg$FAILED){s2=peg$currPos;s3=peg$currPos;s4=peg$parseHexDigit();if(s4!==peg$FAILED){s5=peg$parseHexDigit();if(s5!==peg$FAILED){s6=peg$parseHexDigit();if(s6!==peg$FAILED){s7=peg$parseHexDigit();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=input.substring(s2,peg$currPos);}else {s2=s3;}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c103(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseRegularExpressionLiteral(){var s0,s1,s2,s3,s4,s5;peg$silentFails++;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===47){s1=peg$c105;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c106);}}if(s1!==peg$FAILED){s2=peg$currPos;s3=peg$parseRegularExpressionBody();if(s3!==peg$FAILED){s2=input.substring(s2,peg$currPos);}else {s2=s3;}if(s2!==peg$FAILED){if(input.charCodeAt(peg$currPos)===47){s3=peg$c105;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c106);}}if(s3!==peg$FAILED){s4=peg$currPos;s5=peg$parseRegularExpressionFlags();if(s5!==peg$FAILED){s4=input.substring(s4,peg$currPos);}else {s4=s5;}if(s4!==peg$FAILED){peg$savedPos=s0;s1=peg$c107(s2,s4);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c104);}}return s0;}function peg$parseRegularExpressionBody(){var s0,s1,s2,s3;s0=peg$currPos;s1=peg$parseRegularExpressionFirstChar();if(s1!==peg$FAILED){s2=[];s3=peg$parseRegularExpressionChar();while(s3!==peg$FAILED){s2.push(s3);s3=peg$parseRegularExpressionChar();}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseRegularExpressionFirstChar(){var s0,s1,s2;s0=peg$currPos;s1=peg$currPos;peg$silentFails++;if(peg$c108.test(input.charAt(peg$currPos))){s2=input.charAt(peg$currPos);peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c109);}}peg$silentFails--;if(s2===peg$FAILED){s1=void 0;}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s2=peg$parseRegularExpressionNonTerminator();if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$parseRegularExpressionBackslashSequence();if(s0===peg$FAILED){s0=peg$parseRegularExpressionClass();}}return s0;}function peg$parseRegularExpressionChar(){var s0,s1,s2;s0=peg$currPos;s1=peg$currPos;peg$silentFails++;if(peg$c110.test(input.charAt(peg$currPos))){s2=input.charAt(peg$currPos);peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c111);}}peg$silentFails--;if(s2===peg$FAILED){s1=void 0;}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s2=peg$parseRegularExpressionNonTerminator();if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$parseRegularExpressionBackslashSequence();if(s0===peg$FAILED){s0=peg$parseRegularExpressionClass();}}return s0;}function peg$parseRegularExpressionBackslashSequence(){var s0,s1,s2;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===92){s1=peg$c42;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c43);}}if(s1!==peg$FAILED){s2=peg$parseRegularExpressionNonTerminator();if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseRegularExpressionNonTerminator(){var s0,s1,s2;s0=peg$currPos;s1=peg$currPos;peg$silentFails++;s2=peg$parseLineTerminator();peg$silentFails--;if(s2===peg$FAILED){s1=void 0;}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s2=peg$parseSourceCharacter();if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseRegularExpressionClass(){var s0,s1,s2,s3;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===91){s1=peg$c112;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c113);}}if(s1!==peg$FAILED){s2=[];s3=peg$parseRegularExpressionClassChar();while(s3!==peg$FAILED){s2.push(s3);s3=peg$parseRegularExpressionClassChar();}if(s2!==peg$FAILED){if(input.charCodeAt(peg$currPos)===93){s3=peg$c114;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c115);}}if(s3!==peg$FAILED){s1=[s1,s2,s3];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseRegularExpressionClassChar(){var s0,s1,s2;s0=peg$currPos;s1=peg$currPos;peg$silentFails++;if(peg$c116.test(input.charAt(peg$currPos))){s2=input.charAt(peg$currPos);peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c117);}}peg$silentFails--;if(s2===peg$FAILED){s1=void 0;}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s2=peg$parseRegularExpressionNonTerminator();if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$parseRegularExpressionBackslashSequence();}return s0;}function peg$parseRegularExpressionFlags(){var s0,s1;s0=[];s1=peg$parseIdentifierPart();while(s1!==peg$FAILED){s0.push(s1);s1=peg$parseIdentifierPart();}return s0;}function peg$parseLl(){var s0;if(peg$c118.test(input.charAt(peg$currPos))){s0=input.charAt(peg$currPos);peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c119);}}return s0;}function peg$parseLm(){var s0;if(peg$c120.test(input.charAt(peg$currPos))){s0=input.charAt(peg$currPos);peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c121);}}return s0;}function peg$parseLo(){var s0;if(peg$c122.test(input.charAt(peg$currPos))){s0=input.charAt(peg$currPos);peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c123);}}return s0;}function peg$parseLt(){var s0;if(peg$c124.test(input.charAt(peg$currPos))){s0=input.charAt(peg$currPos);peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c125);}}return s0;}function peg$parseLu(){var s0;if(peg$c126.test(input.charAt(peg$currPos))){s0=input.charAt(peg$currPos);peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c127);}}return s0;}function peg$parseMc(){var s0;if(peg$c128.test(input.charAt(peg$currPos))){s0=input.charAt(peg$currPos);peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c129);}}return s0;}function peg$parseMn(){var s0;if(peg$c130.test(input.charAt(peg$currPos))){s0=input.charAt(peg$currPos);peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c131);}}return s0;}function peg$parseNd(){var s0;if(peg$c132.test(input.charAt(peg$currPos))){s0=input.charAt(peg$currPos);peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c133);}}return s0;}function peg$parseNl(){var s0;if(peg$c134.test(input.charAt(peg$currPos))){s0=input.charAt(peg$currPos);peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c135);}}return s0;}function peg$parsePc(){var s0;if(peg$c136.test(input.charAt(peg$currPos))){s0=input.charAt(peg$currPos);peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c137);}}return s0;}function peg$parseZs(){var s0;if(peg$c138.test(input.charAt(peg$currPos))){s0=input.charAt(peg$currPos);peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c139);}}return s0;}function peg$parseBreakToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c140){s1=peg$c140;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c141);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseCaseToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c142){s1=peg$c142;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c143);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseCatchToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c144){s1=peg$c144;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c145);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseClassToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c146){s1=peg$c146;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c147);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseConstToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c148){s1=peg$c148;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c149);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseContinueToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c150){s1=peg$c150;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c151);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseDebuggerToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c152){s1=peg$c152;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c153);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseDefaultToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c154){s1=peg$c154;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c155);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseDeleteToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c156){s1=peg$c156;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c157);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseDoToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c158){s1=peg$c158;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c159);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseElseToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c160){s1=peg$c160;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c161);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseEnumToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c162){s1=peg$c162;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c163);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseExportToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c164){s1=peg$c164;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c165);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseExtendsToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c166){s1=peg$c166;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c167);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseFalseToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c168){s1=peg$c168;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c169);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseFinallyToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c170){s1=peg$c170;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c171);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseForToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c172){s1=peg$c172;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c173);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseFunctionToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c174){s1=peg$c174;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c175);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseGetToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c176){s1=peg$c176;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c177);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseIfToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c178){s1=peg$c178;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c179);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseImportToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c180){s1=peg$c180;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c181);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseInstanceofToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c182){s1=peg$c182;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c183);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseInToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c184){s1=peg$c184;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c185);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseNewToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c186){s1=peg$c186;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c187);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseNullToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c188){s1=peg$c188;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c189);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseReturnToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c190){s1=peg$c190;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c191);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseSetToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c192){s1=peg$c192;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c193);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseSuperToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c194){s1=peg$c194;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c195);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseSwitchToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c196){s1=peg$c196;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c197);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseThisToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c198){s1=peg$c198;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c199);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseThrowToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c200){s1=peg$c200;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c201);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseTrueToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c202){s1=peg$c202;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c203);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseTryToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c204){s1=peg$c204;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c205);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseTypeofToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c206){s1=peg$c206;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c207);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseVarToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c208){s1=peg$c208;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c209);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseVoidToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c210){s1=peg$c210;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c211);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseWhileToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c212){s1=peg$c212;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c213);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseWithToken(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c214){s1=peg$c214;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c215);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;s3=peg$parseIdentifierPart();peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parse__(){var s0,s1;s0=[];s1=peg$parseWhiteSpace();if(s1===peg$FAILED){s1=peg$parseLineTerminatorSequence();if(s1===peg$FAILED){s1=peg$parseComment();}}while(s1!==peg$FAILED){s0.push(s1);s1=peg$parseWhiteSpace();if(s1===peg$FAILED){s1=peg$parseLineTerminatorSequence();if(s1===peg$FAILED){s1=peg$parseComment();}}}return s0;}function peg$parse_(){var s0,s1;s0=[];s1=peg$parseWhiteSpace();if(s1===peg$FAILED){s1=peg$parseMultiLineCommentNoLineTerminator();}while(s1!==peg$FAILED){s0.push(s1);s1=peg$parseWhiteSpace();if(s1===peg$FAILED){s1=peg$parseMultiLineCommentNoLineTerminator();}}return s0;}function peg$parseEOS(){var s0,s1,s2,s3;s0=peg$currPos;s1=peg$parse__();if(s1!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s2=peg$c216;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c217);}}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parse_();if(s1!==peg$FAILED){s2=peg$parseSingleLineComment();if(s2===peg$FAILED){s2=null;}if(s2!==peg$FAILED){s3=peg$parseLineTerminatorSequence();if(s3!==peg$FAILED){s1=[s1,s2,s3];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parse_();if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;if(input.charCodeAt(peg$currPos)===125){s3=peg$c218;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c219);}}peg$silentFails--;if(s3!==peg$FAILED){peg$currPos=s2;s2=void 0;}else {s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parse__();if(s1!==peg$FAILED){s2=peg$parseEOF();if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}}}return s0;}function peg$parseEOF(){var s0,s1;s0=peg$currPos;peg$silentFails++;if(input.length>peg$currPos){s1=input.charAt(peg$currPos);peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c1);}}peg$silentFails--;if(s1===peg$FAILED){s0=void 0;}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parsePrimaryExpression(){var s0,s1,s2,s3,s4,s5;s0=peg$currPos;s1=peg$parseThisToken();if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c220();}s0=s1;if(s0===peg$FAILED){s0=peg$parseIdentifier();if(s0===peg$FAILED){s0=peg$parseLiteral();if(s0===peg$FAILED){s0=peg$parseArrayLiteral();if(s0===peg$FAILED){s0=peg$parseObjectLiteral();if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===40){s1=peg$c221;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c222);}}if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){s3=peg$parseExpression();if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===41){s5=peg$c223;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c224);}}if(s5!==peg$FAILED){peg$savedPos=s0;s1=peg$c225(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}}}}}return s0;}function peg$parseArrayLiteral(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===91){s1=peg$c112;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c113);}}if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){s3=peg$currPos;s4=peg$parseElision();if(s4!==peg$FAILED){s5=peg$parse__();if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===93){s4=peg$c114;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c115);}}if(s4!==peg$FAILED){peg$savedPos=s0;s1=peg$c226(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===91){s1=peg$c112;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c113);}}if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){s3=peg$parseElementList();if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===93){s5=peg$c114;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c115);}}if(s5!==peg$FAILED){peg$savedPos=s0;s1=peg$c227(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===91){s1=peg$c112;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c113);}}if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){s3=peg$parseElementList();if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===44){s5=peg$c228;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c229);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$currPos;s8=peg$parseElision();if(s8!==peg$FAILED){s9=peg$parse__();if(s9!==peg$FAILED){s8=[s8,s9];s7=s8;}else {peg$currPos=s7;s7=peg$FAILED;}}else {peg$currPos=s7;s7=peg$FAILED;}if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===93){s8=peg$c114;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c115);}}if(s8!==peg$FAILED){peg$savedPos=s0;s1=peg$c230(s3,s7);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}}return s0;}function peg$parseElementList(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$currPos;s2=peg$currPos;s3=peg$parseElision();if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){s3=[s3,s4];s2=s3;}else {peg$currPos=s2;s2=peg$FAILED;}}else {peg$currPos=s2;s2=peg$FAILED;}if(s2===peg$FAILED){s2=null;}if(s2!==peg$FAILED){s3=peg$parseAssignmentExpression();if(s3!==peg$FAILED){peg$savedPos=s1;s2=peg$c231(s2,s3);s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===44){s5=peg$c228;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c229);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$currPos;s8=peg$parseElision();if(s8!==peg$FAILED){s9=peg$parse__();if(s9!==peg$FAILED){s8=[s8,s9];s7=s8;}else {peg$currPos=s7;s7=peg$FAILED;}}else {peg$currPos=s7;s7=peg$FAILED;}if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){s8=peg$parseAssignmentExpression();if(s8!==peg$FAILED){peg$savedPos=s3;s4=peg$c232(s1,s7,s8);s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===44){s5=peg$c228;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c229);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$currPos;s8=peg$parseElision();if(s8!==peg$FAILED){s9=peg$parse__();if(s9!==peg$FAILED){s8=[s8,s9];s7=s8;}else {peg$currPos=s7;s7=peg$FAILED;}}else {peg$currPos=s7;s7=peg$FAILED;}if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){s8=peg$parseAssignmentExpression();if(s8!==peg$FAILED){peg$savedPos=s3;s4=peg$c232(s1,s7,s8);s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c233(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseElision(){var s0,s1,s2,s3,s4,s5;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===44){s1=peg$c228;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c229);}}if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===44){s5=peg$c228;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c229);}}if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===44){s5=peg$c228;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c229);}}if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c234(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseObjectLiteral(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===123){s1=peg$c235;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c236);}}if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){if(input.charCodeAt(peg$currPos)===125){s3=peg$c218;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c219);}}if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c237();s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===123){s1=peg$c235;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c236);}}if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){s3=peg$parsePropertyNameAndValueList();if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===125){s5=peg$c218;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c219);}}if(s5!==peg$FAILED){peg$savedPos=s0;s1=peg$c238(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===123){s1=peg$c235;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c236);}}if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){s3=peg$parsePropertyNameAndValueList();if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===44){s5=peg$c228;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c229);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){if(input.charCodeAt(peg$currPos)===125){s7=peg$c218;peg$currPos++;}else {s7=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c219);}}if(s7!==peg$FAILED){peg$savedPos=s0;s1=peg$c238(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}}return s0;}function peg$parsePropertyNameAndValueList(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;s1=peg$parsePropertyAssignment();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===44){s5=peg$c228;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c229);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parsePropertyAssignment();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===44){s5=peg$c228;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c229);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parsePropertyAssignment();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c239(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parsePropertyAssignment(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11,s12,s13,s14,s15;s0=peg$currPos;s1=peg$parsePropertyName();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s3=peg$c240;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c241);}}if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseAssignmentExpression();if(s5!==peg$FAILED){peg$savedPos=s0;s1=peg$c242(s1,s5);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseGetToken();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){s3=peg$parsePropertyName();if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===40){s5=peg$c221;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c222);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){if(input.charCodeAt(peg$currPos)===41){s7=peg$c223;peg$currPos++;}else {s7=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c224);}}if(s7!==peg$FAILED){s8=peg$parse__();if(s8!==peg$FAILED){if(input.charCodeAt(peg$currPos)===123){s9=peg$c235;peg$currPos++;}else {s9=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c236);}}if(s9!==peg$FAILED){s10=peg$parse__();if(s10!==peg$FAILED){s11=peg$parseFunctionBody();if(s11!==peg$FAILED){s12=peg$parse__();if(s12!==peg$FAILED){if(input.charCodeAt(peg$currPos)===125){s13=peg$c218;peg$currPos++;}else {s13=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c219);}}if(s13!==peg$FAILED){peg$savedPos=s0;s1=peg$c243(s3,s11);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseSetToken();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){s3=peg$parsePropertyName();if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===40){s5=peg$c221;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c222);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parsePropertySetParameterList();if(s7!==peg$FAILED){s8=peg$parse__();if(s8!==peg$FAILED){if(input.charCodeAt(peg$currPos)===41){s9=peg$c223;peg$currPos++;}else {s9=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c224);}}if(s9!==peg$FAILED){s10=peg$parse__();if(s10!==peg$FAILED){if(input.charCodeAt(peg$currPos)===123){s11=peg$c235;peg$currPos++;}else {s11=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c236);}}if(s11!==peg$FAILED){s12=peg$parse__();if(s12!==peg$FAILED){s13=peg$parseFunctionBody();if(s13!==peg$FAILED){s14=peg$parse__();if(s14!==peg$FAILED){if(input.charCodeAt(peg$currPos)===125){s15=peg$c218;peg$currPos++;}else {s15=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c219);}}if(s15!==peg$FAILED){peg$savedPos=s0;s1=peg$c244(s3,s7,s13);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}}return s0;}function peg$parsePropertyName(){var s0;s0=peg$parseIdentifierName();if(s0===peg$FAILED){s0=peg$parseStringLiteral();if(s0===peg$FAILED){s0=peg$parseNumericLiteral();}}return s0;}function peg$parsePropertySetParameterList(){var s0,s1;s0=peg$currPos;s1=peg$parseIdentifier();if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c245(s1);}s0=s1;return s0;}function peg$parseMemberExpression(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parsePrimaryExpression();if(s1===peg$FAILED){s1=peg$parseFunctionExpression();if(s1===peg$FAILED){s1=peg$currPos;s2=peg$parseNewToken();if(s2!==peg$FAILED){s3=peg$parse__();if(s3!==peg$FAILED){s4=peg$parseMemberExpression();if(s4!==peg$FAILED){s5=peg$parse__();if(s5!==peg$FAILED){s6=peg$parseArguments();if(s6!==peg$FAILED){peg$savedPos=s1;s2=peg$c246(s4,s6);s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}}}if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===91){s5=peg$c112;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c113);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseExpression();if(s7!==peg$FAILED){s8=peg$parse__();if(s8!==peg$FAILED){if(input.charCodeAt(peg$currPos)===93){s9=peg$c114;peg$currPos++;}else {s9=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c115);}}if(s9!==peg$FAILED){peg$savedPos=s3;s4=peg$c247(s1,s7);s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}if(s3===peg$FAILED){s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===46){s5=peg$c54;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c55);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseIdentifierName();if(s7!==peg$FAILED){peg$savedPos=s3;s4=peg$c248(s1,s7);s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===91){s5=peg$c112;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c113);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseExpression();if(s7!==peg$FAILED){s8=peg$parse__();if(s8!==peg$FAILED){if(input.charCodeAt(peg$currPos)===93){s9=peg$c114;peg$currPos++;}else {s9=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c115);}}if(s9!==peg$FAILED){peg$savedPos=s3;s4=peg$c247(s1,s7);s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}if(s3===peg$FAILED){s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===46){s5=peg$c54;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c55);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseIdentifierName();if(s7!==peg$FAILED){peg$savedPos=s3;s4=peg$c248(s1,s7);s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c249(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseNewExpression(){var s0,s1,s2,s3;s0=peg$parseMemberExpression();if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseNewToken();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){s3=peg$parseNewExpression();if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c250(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}return s0;}function peg$parseCallExpression(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$currPos;s2=peg$parseMemberExpression();if(s2!==peg$FAILED){s3=peg$parse__();if(s3!==peg$FAILED){s4=peg$parseArguments();if(s4!==peg$FAILED){peg$savedPos=s1;s2=peg$c251(s2,s4);s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseArguments();if(s5!==peg$FAILED){peg$savedPos=s3;s4=peg$c252(s1,s5);s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}if(s3===peg$FAILED){s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===91){s5=peg$c112;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c113);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseExpression();if(s7!==peg$FAILED){s8=peg$parse__();if(s8!==peg$FAILED){if(input.charCodeAt(peg$currPos)===93){s9=peg$c114;peg$currPos++;}else {s9=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c115);}}if(s9!==peg$FAILED){peg$savedPos=s3;s4=peg$c253(s1,s7);s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}if(s3===peg$FAILED){s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===46){s5=peg$c54;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c55);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseIdentifierName();if(s7!==peg$FAILED){peg$savedPos=s3;s4=peg$c254(s1,s7);s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseArguments();if(s5!==peg$FAILED){peg$savedPos=s3;s4=peg$c252(s1,s5);s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}if(s3===peg$FAILED){s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===91){s5=peg$c112;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c113);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseExpression();if(s7!==peg$FAILED){s8=peg$parse__();if(s8!==peg$FAILED){if(input.charCodeAt(peg$currPos)===93){s9=peg$c114;peg$currPos++;}else {s9=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c115);}}if(s9!==peg$FAILED){peg$savedPos=s3;s4=peg$c253(s1,s7);s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}if(s3===peg$FAILED){s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===46){s5=peg$c54;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c55);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseIdentifierName();if(s7!==peg$FAILED){peg$savedPos=s3;s4=peg$c254(s1,s7);s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c255(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseArguments(){var s0,s1,s2,s3,s4,s5;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===40){s1=peg$c221;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c222);}}if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){s3=peg$currPos;s4=peg$parseArgumentList();if(s4!==peg$FAILED){s5=peg$parse__();if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===41){s4=peg$c223;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c224);}}if(s4!==peg$FAILED){peg$savedPos=s0;s1=peg$c256(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseArgumentList(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;s1=peg$parseAssignmentExpression();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===44){s5=peg$c228;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c229);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseAssignmentExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===44){s5=peg$c228;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c229);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseAssignmentExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c239(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseLeftHandSideExpression(){var s0;s0=peg$parseCallExpression();if(s0===peg$FAILED){s0=peg$parseNewExpression();}return s0;}function peg$parsePostfixExpression(){var s0,s1,s2,s3;s0=peg$currPos;s1=peg$parseLeftHandSideExpression();if(s1!==peg$FAILED){s2=peg$parse_();if(s2!==peg$FAILED){s3=peg$parsePostfixOperator();if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c257(s1,s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$parseLeftHandSideExpression();}return s0;}function peg$parsePostfixOperator(){var s0;if(input.substr(peg$currPos,2)===peg$c258){s0=peg$c258;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c259);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,2)===peg$c260){s0=peg$c260;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c261);}}}return s0;}function peg$parseUnaryExpression(){var s0,s1,s2,s3;s0=peg$parsePostfixExpression();if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseUnaryOperator();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){s3=peg$parseUnaryExpression();if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c262(s1,s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}return s0;}function peg$parseUnaryOperator(){var s0,s1,s2,s3,s4;s0=peg$currPos;s1=peg$parseDeleteToken();if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseVoidToken();if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseTypeofToken();if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){if(input.substr(peg$currPos,2)===peg$c258){s0=peg$c258;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c259);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,2)===peg$c260){s0=peg$c260;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c261);}}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$currPos;if(input.charCodeAt(peg$currPos)===43){s2=peg$c263;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c264);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;if(input.charCodeAt(peg$currPos)===61){s4=peg$c265;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c266);}}peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$currPos;if(input.charCodeAt(peg$currPos)===45){s2=peg$c267;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c268);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;if(input.charCodeAt(peg$currPos)===61){s4=peg$c265;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c266);}}peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){if(input.charCodeAt(peg$currPos)===126){s0=peg$c269;peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c270);}}if(s0===peg$FAILED){if(input.charCodeAt(peg$currPos)===33){s0=peg$c271;peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c272);}}}}}}}}}}return s0;}function peg$parseMultiplicativeExpression(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;s1=peg$parseUnaryExpression();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseMultiplicativeOperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseUnaryExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseMultiplicativeOperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseUnaryExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c273(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseMultiplicativeOperator(){var s0,s1,s2,s3,s4;s0=peg$currPos;s1=peg$currPos;if(input.charCodeAt(peg$currPos)===42){s2=peg$c274;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c275);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;if(input.charCodeAt(peg$currPos)===61){s4=peg$c265;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c266);}}peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$currPos;if(input.charCodeAt(peg$currPos)===47){s2=peg$c105;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c106);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;if(input.charCodeAt(peg$currPos)===61){s4=peg$c265;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c266);}}peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$currPos;if(input.charCodeAt(peg$currPos)===37){s2=peg$c276;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c277);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;if(input.charCodeAt(peg$currPos)===61){s4=peg$c265;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c266);}}peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}}}return s0;}function peg$parseAdditiveExpression(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;s1=peg$parseMultiplicativeExpression();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseAdditiveOperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseMultiplicativeExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseAdditiveOperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseMultiplicativeExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c273(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseAdditiveOperator(){var s0,s1,s2,s3,s4;s0=peg$currPos;s1=peg$currPos;if(input.charCodeAt(peg$currPos)===43){s2=peg$c263;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c264);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;if(peg$c278.test(input.charAt(peg$currPos))){s4=input.charAt(peg$currPos);peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c279);}}peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$currPos;if(input.charCodeAt(peg$currPos)===45){s2=peg$c267;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c268);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;if(peg$c280.test(input.charAt(peg$currPos))){s4=input.charAt(peg$currPos);peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c281);}}peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}}return s0;}function peg$parseShiftExpression(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;s1=peg$parseAdditiveExpression();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseShiftOperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseAdditiveExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseShiftOperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseAdditiveExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c273(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseShiftOperator(){var s0,s1,s2,s3,s4;s0=peg$currPos;s1=peg$currPos;if(input.substr(peg$currPos,2)===peg$c282){s2=peg$c282;peg$currPos+=2;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c283);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;if(input.charCodeAt(peg$currPos)===61){s4=peg$c265;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c266);}}peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$currPos;if(input.substr(peg$currPos,3)===peg$c284){s2=peg$c284;peg$currPos+=3;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c285);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;if(input.charCodeAt(peg$currPos)===61){s4=peg$c265;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c266);}}peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$currPos;if(input.substr(peg$currPos,2)===peg$c286){s2=peg$c286;peg$currPos+=2;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c287);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;if(input.charCodeAt(peg$currPos)===61){s4=peg$c265;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c266);}}peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}}}return s0;}function peg$parseRelationalExpression(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;s1=peg$parseShiftExpression();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseRelationalOperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseShiftExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseRelationalOperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseShiftExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c273(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseRelationalOperator(){var s0,s1,s2,s3,s4;if(input.substr(peg$currPos,2)===peg$c288){s0=peg$c288;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c289);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,2)===peg$c290){s0=peg$c290;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c291);}}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$currPos;if(input.charCodeAt(peg$currPos)===60){s2=peg$c292;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c293);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;if(input.charCodeAt(peg$currPos)===60){s4=peg$c292;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c293);}}peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$currPos;if(input.charCodeAt(peg$currPos)===62){s2=peg$c294;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c295);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;if(input.charCodeAt(peg$currPos)===62){s4=peg$c294;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c295);}}peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseInstanceofToken();if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseInToken();if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}}}}}}return s0;}function peg$parseRelationalExpressionNoIn(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;s1=peg$parseShiftExpression();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseRelationalOperatorNoIn();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseShiftExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseRelationalOperatorNoIn();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseShiftExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c273(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseRelationalOperatorNoIn(){var s0,s1,s2,s3,s4;if(input.substr(peg$currPos,2)===peg$c288){s0=peg$c288;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c289);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,2)===peg$c290){s0=peg$c290;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c291);}}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$currPos;if(input.charCodeAt(peg$currPos)===60){s2=peg$c292;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c293);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;if(input.charCodeAt(peg$currPos)===60){s4=peg$c292;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c293);}}peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$currPos;if(input.charCodeAt(peg$currPos)===62){s2=peg$c294;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c295);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;if(input.charCodeAt(peg$currPos)===62){s4=peg$c294;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c295);}}peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseInstanceofToken();if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}}}}}return s0;}function peg$parseEqualityExpression(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;s1=peg$parseRelationalExpression();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseEqualityOperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseRelationalExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseEqualityOperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseRelationalExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c273(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseEqualityExpressionNoIn(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;s1=peg$parseRelationalExpressionNoIn();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseEqualityOperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseRelationalExpressionNoIn();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseEqualityOperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseRelationalExpressionNoIn();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c273(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseEqualityOperator(){var s0;if(input.substr(peg$currPos,3)===peg$c296){s0=peg$c296;peg$currPos+=3;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c297);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,3)===peg$c298){s0=peg$c298;peg$currPos+=3;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c299);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,2)===peg$c300){s0=peg$c300;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c301);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,2)===peg$c302){s0=peg$c302;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c303);}}}}}return s0;}function peg$parseBitwiseANDExpression(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;s1=peg$parseEqualityExpression();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseBitwiseANDOperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseEqualityExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseBitwiseANDOperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseEqualityExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c273(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseBitwiseANDExpressionNoIn(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;s1=peg$parseEqualityExpressionNoIn();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseBitwiseANDOperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseEqualityExpressionNoIn();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseBitwiseANDOperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseEqualityExpressionNoIn();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c273(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseBitwiseANDOperator(){var s0,s1,s2,s3,s4;s0=peg$currPos;s1=peg$currPos;if(input.charCodeAt(peg$currPos)===38){s2=peg$c304;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c305);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;if(peg$c306.test(input.charAt(peg$currPos))){s4=input.charAt(peg$currPos);peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c307);}}peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}return s0;}function peg$parseBitwiseXORExpression(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;s1=peg$parseBitwiseANDExpression();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseBitwiseXOROperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseBitwiseANDExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseBitwiseXOROperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseBitwiseANDExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c273(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseBitwiseXORExpressionNoIn(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;s1=peg$parseBitwiseANDExpressionNoIn();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseBitwiseXOROperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseBitwiseANDExpressionNoIn();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseBitwiseXOROperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseBitwiseANDExpressionNoIn();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c273(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseBitwiseXOROperator(){var s0,s1,s2,s3,s4;s0=peg$currPos;s1=peg$currPos;if(input.charCodeAt(peg$currPos)===94){s2=peg$c308;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c309);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;if(input.charCodeAt(peg$currPos)===61){s4=peg$c265;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c266);}}peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}return s0;}function peg$parseBitwiseORExpression(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;s1=peg$parseBitwiseXORExpression();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseBitwiseOROperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseBitwiseXORExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseBitwiseOROperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseBitwiseXORExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c273(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseBitwiseORExpressionNoIn(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;s1=peg$parseBitwiseXORExpressionNoIn();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseBitwiseOROperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseBitwiseXORExpressionNoIn();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseBitwiseOROperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseBitwiseXORExpressionNoIn();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c273(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseBitwiseOROperator(){var s0,s1,s2,s3,s4;s0=peg$currPos;s1=peg$currPos;if(input.charCodeAt(peg$currPos)===124){s2=peg$c310;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c311);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;if(peg$c312.test(input.charAt(peg$currPos))){s4=input.charAt(peg$currPos);peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c313);}}peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}return s0;}function peg$parseLogicalANDExpression(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;s1=peg$parseBitwiseORExpression();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseLogicalANDOperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseBitwiseORExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseLogicalANDOperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseBitwiseORExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c273(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseLogicalANDExpressionNoIn(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;s1=peg$parseBitwiseORExpressionNoIn();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseLogicalANDOperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseBitwiseORExpressionNoIn();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseLogicalANDOperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseBitwiseORExpressionNoIn();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c273(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseLogicalANDOperator(){var s0;if(input.substr(peg$currPos,2)===peg$c314){s0=peg$c314;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c315);}}return s0;}function peg$parseLogicalORExpression(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;s1=peg$parseLogicalANDExpression();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseLogicalOROperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseLogicalANDExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseLogicalOROperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseLogicalANDExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c273(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseLogicalORExpressionNoIn(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;s1=peg$parseLogicalANDExpressionNoIn();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseLogicalOROperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseLogicalANDExpressionNoIn();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseLogicalOROperator();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseLogicalANDExpressionNoIn();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c273(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseLogicalOROperator(){var s0;if(input.substr(peg$currPos,2)===peg$c316){s0=peg$c316;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c317);}}return s0;}function peg$parseConditionalExpression(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseLogicalORExpression();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){if(input.charCodeAt(peg$currPos)===63){s3=peg$c318;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c319);}}if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseAssignmentExpression();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s7=peg$c240;peg$currPos++;}else {s7=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c241);}}if(s7!==peg$FAILED){s8=peg$parse__();if(s8!==peg$FAILED){s9=peg$parseAssignmentExpression();if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c320(s1,s5,s9);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$parseLogicalORExpression();}return s0;}function peg$parseConditionalExpressionNoIn(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseLogicalORExpressionNoIn();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){if(input.charCodeAt(peg$currPos)===63){s3=peg$c318;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c319);}}if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseAssignmentExpression();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s7=peg$c240;peg$currPos++;}else {s7=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c241);}}if(s7!==peg$FAILED){s8=peg$parse__();if(s8!==peg$FAILED){s9=peg$parseAssignmentExpressionNoIn();if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c320(s1,s5,s9);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$parseLogicalORExpressionNoIn();}return s0;}function peg$parseAssignmentExpression(){var s0,s1,s2,s3,s4,s5,s6;s0=peg$currPos;s1=peg$parseLeftHandSideExpression();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){if(input.charCodeAt(peg$currPos)===61){s3=peg$c265;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c266);}}if(s3!==peg$FAILED){s4=peg$currPos;peg$silentFails++;if(input.charCodeAt(peg$currPos)===61){s5=peg$c265;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c266);}}peg$silentFails--;if(s5===peg$FAILED){s4=void 0;}else {peg$currPos=s4;s4=peg$FAILED;}if(s4!==peg$FAILED){s5=peg$parse__();if(s5!==peg$FAILED){s6=peg$parseAssignmentExpression();if(s6!==peg$FAILED){peg$savedPos=s0;s1=peg$c321(s1,s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseLeftHandSideExpression();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){s3=peg$parseAssignmentOperator();if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseAssignmentExpression();if(s5!==peg$FAILED){peg$savedPos=s0;s1=peg$c322(s1,s3,s5);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$parseConditionalExpression();}}return s0;}function peg$parseAssignmentExpressionNoIn(){var s0,s1,s2,s3,s4,s5,s6;s0=peg$currPos;s1=peg$parseLeftHandSideExpression();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){if(input.charCodeAt(peg$currPos)===61){s3=peg$c265;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c266);}}if(s3!==peg$FAILED){s4=peg$currPos;peg$silentFails++;if(input.charCodeAt(peg$currPos)===61){s5=peg$c265;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c266);}}peg$silentFails--;if(s5===peg$FAILED){s4=void 0;}else {peg$currPos=s4;s4=peg$FAILED;}if(s4!==peg$FAILED){s5=peg$parse__();if(s5!==peg$FAILED){s6=peg$parseAssignmentExpressionNoIn();if(s6!==peg$FAILED){peg$savedPos=s0;s1=peg$c321(s1,s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseLeftHandSideExpression();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){s3=peg$parseAssignmentOperator();if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseAssignmentExpressionNoIn();if(s5!==peg$FAILED){peg$savedPos=s0;s1=peg$c322(s1,s3,s5);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$parseConditionalExpressionNoIn();}}return s0;}function peg$parseAssignmentOperator(){var s0;if(input.substr(peg$currPos,2)===peg$c323){s0=peg$c323;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c324);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,2)===peg$c325){s0=peg$c325;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c326);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,2)===peg$c327){s0=peg$c327;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c328);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,2)===peg$c329){s0=peg$c329;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c330);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,2)===peg$c331){s0=peg$c331;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c332);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,3)===peg$c333){s0=peg$c333;peg$currPos+=3;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c334);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,3)===peg$c335){s0=peg$c335;peg$currPos+=3;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c336);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,4)===peg$c337){s0=peg$c337;peg$currPos+=4;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c338);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,2)===peg$c339){s0=peg$c339;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c340);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,2)===peg$c341){s0=peg$c341;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c342);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,2)===peg$c343){s0=peg$c343;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c344);}}}}}}}}}}}}return s0;}function peg$parseExpression(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;s1=peg$parseAssignmentExpression();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===44){s5=peg$c228;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c229);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseAssignmentExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===44){s5=peg$c228;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c229);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseAssignmentExpression();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c345(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseExpressionNoIn(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;s1=peg$parseAssignmentExpressionNoIn();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===44){s5=peg$c228;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c229);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseAssignmentExpressionNoIn();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===44){s5=peg$c228;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c229);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseAssignmentExpressionNoIn();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c345(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseStatement(){var s0;s0=peg$parseBlock();if(s0===peg$FAILED){s0=peg$parseVariableStatement();if(s0===peg$FAILED){s0=peg$parseEmptyStatement();if(s0===peg$FAILED){s0=peg$parseExpressionStatement();if(s0===peg$FAILED){s0=peg$parseIfStatement();if(s0===peg$FAILED){s0=peg$parseIterationStatement();if(s0===peg$FAILED){s0=peg$parseContinueStatement();if(s0===peg$FAILED){s0=peg$parseBreakStatement();if(s0===peg$FAILED){s0=peg$parseReturnStatement();if(s0===peg$FAILED){s0=peg$parseWithStatement();if(s0===peg$FAILED){s0=peg$parseLabelledStatement();if(s0===peg$FAILED){s0=peg$parseSwitchStatement();if(s0===peg$FAILED){s0=peg$parseThrowStatement();if(s0===peg$FAILED){s0=peg$parseTryStatement();if(s0===peg$FAILED){s0=peg$parseDebuggerStatement();}}}}}}}}}}}}}}return s0;}function peg$parseBlock(){var s0,s1,s2,s3,s4,s5;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===123){s1=peg$c235;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c236);}}if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){s3=peg$currPos;s4=peg$parseStatementList();if(s4!==peg$FAILED){s5=peg$parse__();if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===125){s4=peg$c218;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c219);}}if(s4!==peg$FAILED){peg$savedPos=s0;s1=peg$c346(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseStatementList(){var s0,s1,s2,s3,s4,s5;s0=peg$currPos;s1=peg$parseStatement();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseStatement();if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseStatement();if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c347(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseVariableStatement(){var s0,s1,s2,s3,s4;s0=peg$currPos;s1=peg$parseVarToken();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){s3=peg$parseVariableDeclarationList();if(s3!==peg$FAILED){s4=peg$parseEOS();if(s4!==peg$FAILED){peg$savedPos=s0;s1=peg$c348(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseVariableDeclarationList(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;s1=peg$parseVariableDeclaration();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===44){s5=peg$c228;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c229);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseVariableDeclaration();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===44){s5=peg$c228;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c229);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseVariableDeclaration();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c239(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseVariableDeclarationListNoIn(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;s1=peg$parseVariableDeclarationNoIn();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===44){s5=peg$c228;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c229);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseVariableDeclarationNoIn();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===44){s5=peg$c228;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c229);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseVariableDeclarationNoIn();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c239(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseVariableDeclaration(){var s0,s1,s2,s3,s4;s0=peg$currPos;s1=peg$parseIdentifier();if(s1!==peg$FAILED){s2=peg$currPos;s3=peg$parse__();if(s3!==peg$FAILED){s4=peg$parseInitialiser();if(s4!==peg$FAILED){s3=[s3,s4];s2=s3;}else {peg$currPos=s2;s2=peg$FAILED;}}else {peg$currPos=s2;s2=peg$FAILED;}if(s2===peg$FAILED){s2=null;}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c349(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseVariableDeclarationNoIn(){var s0,s1,s2,s3,s4;s0=peg$currPos;s1=peg$parseIdentifier();if(s1!==peg$FAILED){s2=peg$currPos;s3=peg$parse__();if(s3!==peg$FAILED){s4=peg$parseInitialiserNoIn();if(s4!==peg$FAILED){s3=[s3,s4];s2=s3;}else {peg$currPos=s2;s2=peg$FAILED;}}else {peg$currPos=s2;s2=peg$FAILED;}if(s2===peg$FAILED){s2=null;}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c349(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseInitialiser(){var s0,s1,s2,s3,s4;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===61){s1=peg$c265;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c266);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;if(input.charCodeAt(peg$currPos)===61){s3=peg$c265;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c266);}}peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s3=peg$parse__();if(s3!==peg$FAILED){s4=peg$parseAssignmentExpression();if(s4!==peg$FAILED){peg$savedPos=s0;s1=peg$c225(s4);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseInitialiserNoIn(){var s0,s1,s2,s3,s4;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===61){s1=peg$c265;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c266);}}if(s1!==peg$FAILED){s2=peg$currPos;peg$silentFails++;if(input.charCodeAt(peg$currPos)===61){s3=peg$c265;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c266);}}peg$silentFails--;if(s3===peg$FAILED){s2=void 0;}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s3=peg$parse__();if(s3!==peg$FAILED){s4=peg$parseAssignmentExpressionNoIn();if(s4!==peg$FAILED){peg$savedPos=s0;s1=peg$c225(s4);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseEmptyStatement(){var s0,s1;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===59){s1=peg$c216;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c217);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c350();}s0=s1;return s0;}function peg$parseExpressionStatement(){var s0,s1,s2,s3;s0=peg$currPos;s1=peg$currPos;peg$silentFails++;if(input.charCodeAt(peg$currPos)===123){s2=peg$c235;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c236);}}if(s2===peg$FAILED){s2=peg$parseFunctionToken();}peg$silentFails--;if(s2===peg$FAILED){s1=void 0;}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s2=peg$parseExpression();if(s2!==peg$FAILED){s3=peg$parseEOS();if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c351(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseIfStatement(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11,s12,s13;s0=peg$currPos;s1=peg$parseIfToken();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){if(input.charCodeAt(peg$currPos)===40){s3=peg$c221;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c222);}}if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseExpression();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){if(input.charCodeAt(peg$currPos)===41){s7=peg$c223;peg$currPos++;}else {s7=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c224);}}if(s7!==peg$FAILED){s8=peg$parse__();if(s8!==peg$FAILED){s9=peg$parseStatement();if(s9!==peg$FAILED){s10=peg$parse__();if(s10!==peg$FAILED){s11=peg$parseElseToken();if(s11!==peg$FAILED){s12=peg$parse__();if(s12!==peg$FAILED){s13=peg$parseStatement();if(s13!==peg$FAILED){peg$savedPos=s0;s1=peg$c352(s5,s9,s13);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseIfToken();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){if(input.charCodeAt(peg$currPos)===40){s3=peg$c221;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c222);}}if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseExpression();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){if(input.charCodeAt(peg$currPos)===41){s7=peg$c223;peg$currPos++;}else {s7=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c224);}}if(s7!==peg$FAILED){s8=peg$parse__();if(s8!==peg$FAILED){s9=peg$parseStatement();if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c353(s5,s9);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}return s0;}function peg$parseIterationStatement(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11,s12,s13,s14,s15,s16,s17;s0=peg$currPos;s1=peg$parseDoToken();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){s3=peg$parseStatement();if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseWhileToken();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){if(input.charCodeAt(peg$currPos)===40){s7=peg$c221;peg$currPos++;}else {s7=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c222);}}if(s7!==peg$FAILED){s8=peg$parse__();if(s8!==peg$FAILED){s9=peg$parseExpression();if(s9!==peg$FAILED){s10=peg$parse__();if(s10!==peg$FAILED){if(input.charCodeAt(peg$currPos)===41){s11=peg$c223;peg$currPos++;}else {s11=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c224);}}if(s11!==peg$FAILED){s12=peg$parseEOS();if(s12!==peg$FAILED){peg$savedPos=s0;s1=peg$c354(s3,s9);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseWhileToken();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){if(input.charCodeAt(peg$currPos)===40){s3=peg$c221;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c222);}}if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseExpression();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){if(input.charCodeAt(peg$currPos)===41){s7=peg$c223;peg$currPos++;}else {s7=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c224);}}if(s7!==peg$FAILED){s8=peg$parse__();if(s8!==peg$FAILED){s9=peg$parseStatement();if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c355(s5,s9);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseForToken();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){if(input.charCodeAt(peg$currPos)===40){s3=peg$c221;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c222);}}if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$currPos;s6=peg$parseExpressionNoIn();if(s6!==peg$FAILED){s7=peg$parse__();if(s7!==peg$FAILED){s6=[s6,s7];s5=s6;}else {peg$currPos=s5;s5=peg$FAILED;}}else {peg$currPos=s5;s5=peg$FAILED;}if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s6=peg$c216;peg$currPos++;}else {s6=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c217);}}if(s6!==peg$FAILED){s7=peg$parse__();if(s7!==peg$FAILED){s8=peg$currPos;s9=peg$parseExpression();if(s9!==peg$FAILED){s10=peg$parse__();if(s10!==peg$FAILED){s9=[s9,s10];s8=s9;}else {peg$currPos=s8;s8=peg$FAILED;}}else {peg$currPos=s8;s8=peg$FAILED;}if(s8===peg$FAILED){s8=null;}if(s8!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s9=peg$c216;peg$currPos++;}else {s9=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c217);}}if(s9!==peg$FAILED){s10=peg$parse__();if(s10!==peg$FAILED){s11=peg$currPos;s12=peg$parseExpression();if(s12!==peg$FAILED){s13=peg$parse__();if(s13!==peg$FAILED){s12=[s12,s13];s11=s12;}else {peg$currPos=s11;s11=peg$FAILED;}}else {peg$currPos=s11;s11=peg$FAILED;}if(s11===peg$FAILED){s11=null;}if(s11!==peg$FAILED){if(input.charCodeAt(peg$currPos)===41){s12=peg$c223;peg$currPos++;}else {s12=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c224);}}if(s12!==peg$FAILED){s13=peg$parse__();if(s13!==peg$FAILED){s14=peg$parseStatement();if(s14!==peg$FAILED){peg$savedPos=s0;s1=peg$c356(s5,s8,s11,s14);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseForToken();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){if(input.charCodeAt(peg$currPos)===40){s3=peg$c221;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c222);}}if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseVarToken();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseVariableDeclarationListNoIn();if(s7!==peg$FAILED){s8=peg$parse__();if(s8!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s9=peg$c216;peg$currPos++;}else {s9=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c217);}}if(s9!==peg$FAILED){s10=peg$parse__();if(s10!==peg$FAILED){s11=peg$currPos;s12=peg$parseExpression();if(s12!==peg$FAILED){s13=peg$parse__();if(s13!==peg$FAILED){s12=[s12,s13];s11=s12;}else {peg$currPos=s11;s11=peg$FAILED;}}else {peg$currPos=s11;s11=peg$FAILED;}if(s11===peg$FAILED){s11=null;}if(s11!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s12=peg$c216;peg$currPos++;}else {s12=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c217);}}if(s12!==peg$FAILED){s13=peg$parse__();if(s13!==peg$FAILED){s14=peg$currPos;s15=peg$parseExpression();if(s15!==peg$FAILED){s16=peg$parse__();if(s16!==peg$FAILED){s15=[s15,s16];s14=s15;}else {peg$currPos=s14;s14=peg$FAILED;}}else {peg$currPos=s14;s14=peg$FAILED;}if(s14===peg$FAILED){s14=null;}if(s14!==peg$FAILED){if(input.charCodeAt(peg$currPos)===41){s15=peg$c223;peg$currPos++;}else {s15=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c224);}}if(s15!==peg$FAILED){s16=peg$parse__();if(s16!==peg$FAILED){s17=peg$parseStatement();if(s17!==peg$FAILED){peg$savedPos=s0;s1=peg$c357(s7,s11,s14,s17);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseForToken();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){if(input.charCodeAt(peg$currPos)===40){s3=peg$c221;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c222);}}if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseLeftHandSideExpression();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseInToken();if(s7!==peg$FAILED){s8=peg$parse__();if(s8!==peg$FAILED){s9=peg$parseExpression();if(s9!==peg$FAILED){s10=peg$parse__();if(s10!==peg$FAILED){if(input.charCodeAt(peg$currPos)===41){s11=peg$c223;peg$currPos++;}else {s11=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c224);}}if(s11!==peg$FAILED){s12=peg$parse__();if(s12!==peg$FAILED){s13=peg$parseStatement();if(s13!==peg$FAILED){peg$savedPos=s0;s1=peg$c358(s5,s9,s13);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseForToken();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){if(input.charCodeAt(peg$currPos)===40){s3=peg$c221;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c222);}}if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseVarToken();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseVariableDeclarationListNoIn();if(s7!==peg$FAILED){s8=peg$parse__();if(s8!==peg$FAILED){s9=peg$parseInToken();if(s9!==peg$FAILED){s10=peg$parse__();if(s10!==peg$FAILED){s11=peg$parseExpression();if(s11!==peg$FAILED){s12=peg$parse__();if(s12!==peg$FAILED){if(input.charCodeAt(peg$currPos)===41){s13=peg$c223;peg$currPos++;}else {s13=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c224);}}if(s13!==peg$FAILED){s14=peg$parse__();if(s14!==peg$FAILED){s15=peg$parseStatement();if(s15!==peg$FAILED){peg$savedPos=s0;s1=peg$c359(s7,s11,s15);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}}}}}return s0;}function peg$parseContinueStatement(){var s0,s1,s2,s3,s4;s0=peg$currPos;s1=peg$parseContinueToken();if(s1!==peg$FAILED){s2=peg$parseEOS();if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c360();s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseContinueToken();if(s1!==peg$FAILED){s2=peg$parse_();if(s2!==peg$FAILED){s3=peg$parseIdentifier();if(s3!==peg$FAILED){s4=peg$parseEOS();if(s4!==peg$FAILED){peg$savedPos=s0;s1=peg$c361(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}return s0;}function peg$parseBreakStatement(){var s0,s1,s2,s3,s4;s0=peg$currPos;s1=peg$parseBreakToken();if(s1!==peg$FAILED){s2=peg$parseEOS();if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c362();s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseBreakToken();if(s1!==peg$FAILED){s2=peg$parse_();if(s2!==peg$FAILED){s3=peg$parseIdentifier();if(s3!==peg$FAILED){s4=peg$parseEOS();if(s4!==peg$FAILED){peg$savedPos=s0;s1=peg$c363(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}return s0;}function peg$parseReturnStatement(){var s0,s1,s2,s3,s4;s0=peg$currPos;s1=peg$parseReturnToken();if(s1!==peg$FAILED){s2=peg$parseEOS();if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c364();s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseReturnToken();if(s1!==peg$FAILED){s2=peg$parse_();if(s2!==peg$FAILED){s3=peg$parseExpression();if(s3!==peg$FAILED){s4=peg$parseEOS();if(s4!==peg$FAILED){peg$savedPos=s0;s1=peg$c365(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}return s0;}function peg$parseWithStatement(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWithToken();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){if(input.charCodeAt(peg$currPos)===40){s3=peg$c221;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c222);}}if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseExpression();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){if(input.charCodeAt(peg$currPos)===41){s7=peg$c223;peg$currPos++;}else {s7=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c224);}}if(s7!==peg$FAILED){s8=peg$parse__();if(s8!==peg$FAILED){s9=peg$parseStatement();if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c366(s5,s9);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseSwitchStatement(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseSwitchToken();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){if(input.charCodeAt(peg$currPos)===40){s3=peg$c221;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c222);}}if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseExpression();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){if(input.charCodeAt(peg$currPos)===41){s7=peg$c223;peg$currPos++;}else {s7=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c224);}}if(s7!==peg$FAILED){s8=peg$parse__();if(s8!==peg$FAILED){s9=peg$parseCaseBlock();if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c367(s5,s9);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseCaseBlock(){var s0,s1,s2,s3,s4,s5,s6,s7,s8;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===123){s1=peg$c235;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c236);}}if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){s3=peg$currPos;s4=peg$parseCaseClauses();if(s4!==peg$FAILED){s5=peg$parse__();if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===125){s4=peg$c218;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c219);}}if(s4!==peg$FAILED){peg$savedPos=s0;s1=peg$c368(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===123){s1=peg$c235;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c236);}}if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){s3=peg$currPos;s4=peg$parseCaseClauses();if(s4!==peg$FAILED){s5=peg$parse__();if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){s4=peg$parseDefaultClause();if(s4!==peg$FAILED){s5=peg$parse__();if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseCaseClauses();if(s7!==peg$FAILED){s8=peg$parse__();if(s8!==peg$FAILED){s7=[s7,s8];s6=s7;}else {peg$currPos=s6;s6=peg$FAILED;}}else {peg$currPos=s6;s6=peg$FAILED;}if(s6===peg$FAILED){s6=null;}if(s6!==peg$FAILED){if(input.charCodeAt(peg$currPos)===125){s7=peg$c218;peg$currPos++;}else {s7=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c219);}}if(s7!==peg$FAILED){peg$savedPos=s0;s1=peg$c369(s3,s4,s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}return s0;}function peg$parseCaseClauses(){var s0,s1,s2,s3,s4,s5;s0=peg$currPos;s1=peg$parseCaseClause();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseCaseClause();if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseCaseClause();if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c347(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseCaseClause(){var s0,s1,s2,s3,s4,s5,s6,s7,s8;s0=peg$currPos;s1=peg$parseCaseToken();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){s3=peg$parseExpression();if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s5=peg$c240;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c241);}}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parse__();if(s7!==peg$FAILED){s8=peg$parseStatementList();if(s8!==peg$FAILED){s7=[s7,s8];s6=s7;}else {peg$currPos=s6;s6=peg$FAILED;}}else {peg$currPos=s6;s6=peg$FAILED;}if(s6===peg$FAILED){s6=null;}if(s6!==peg$FAILED){peg$savedPos=s0;s1=peg$c370(s3,s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseDefaultClause(){var s0,s1,s2,s3,s4,s5,s6;s0=peg$currPos;s1=peg$parseDefaultToken();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s3=peg$c240;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c241);}}if(s3!==peg$FAILED){s4=peg$currPos;s5=peg$parse__();if(s5!==peg$FAILED){s6=peg$parseStatementList();if(s6!==peg$FAILED){s5=[s5,s6];s4=s5;}else {peg$currPos=s4;s4=peg$FAILED;}}else {peg$currPos=s4;s4=peg$FAILED;}if(s4===peg$FAILED){s4=null;}if(s4!==peg$FAILED){peg$savedPos=s0;s1=peg$c371(s4);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseLabelledStatement(){var s0,s1,s2,s3,s4,s5;s0=peg$currPos;s1=peg$parseIdentifier();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s3=peg$c240;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c241);}}if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseStatement();if(s5!==peg$FAILED){peg$savedPos=s0;s1=peg$c372(s1,s5);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseThrowStatement(){var s0,s1,s2,s3,s4;s0=peg$currPos;s1=peg$parseThrowToken();if(s1!==peg$FAILED){s2=peg$parse_();if(s2!==peg$FAILED){s3=peg$parseExpression();if(s3!==peg$FAILED){s4=peg$parseEOS();if(s4!==peg$FAILED){peg$savedPos=s0;s1=peg$c373(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseTryStatement(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;s1=peg$parseTryToken();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){s3=peg$parseBlock();if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseCatch();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseFinally();if(s7!==peg$FAILED){peg$savedPos=s0;s1=peg$c374(s3,s5,s7);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseTryToken();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){s3=peg$parseBlock();if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseCatch();if(s5!==peg$FAILED){peg$savedPos=s0;s1=peg$c375(s3,s5);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseTryToken();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){s3=peg$parseBlock();if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseFinally();if(s5!==peg$FAILED){peg$savedPos=s0;s1=peg$c376(s3,s5);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}}return s0;}function peg$parseCatch(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseCatchToken();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){if(input.charCodeAt(peg$currPos)===40){s3=peg$c221;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c222);}}if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseIdentifier();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){if(input.charCodeAt(peg$currPos)===41){s7=peg$c223;peg$currPos++;}else {s7=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c224);}}if(s7!==peg$FAILED){s8=peg$parse__();if(s8!==peg$FAILED){s9=peg$parseBlock();if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c377(s5,s9);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseFinally(){var s0,s1,s2,s3;s0=peg$currPos;s1=peg$parseFinallyToken();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){s3=peg$parseBlock();if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c378(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseDebuggerStatement(){var s0,s1,s2;s0=peg$currPos;s1=peg$parseDebuggerToken();if(s1!==peg$FAILED){s2=peg$parseEOS();if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c379();s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseFunctionDeclaration(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11,s12,s13,s14;s0=peg$currPos;s1=peg$parseFunctionToken();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){s3=peg$parseIdentifier();if(s3!==peg$FAILED){s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===40){s5=peg$c221;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c222);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$currPos;s8=peg$parseFormalParameterList();if(s8!==peg$FAILED){s9=peg$parse__();if(s9!==peg$FAILED){s8=[s8,s9];s7=s8;}else {peg$currPos=s7;s7=peg$FAILED;}}else {peg$currPos=s7;s7=peg$FAILED;}if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===41){s8=peg$c223;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c224);}}if(s8!==peg$FAILED){s9=peg$parse__();if(s9!==peg$FAILED){if(input.charCodeAt(peg$currPos)===123){s10=peg$c235;peg$currPos++;}else {s10=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c236);}}if(s10!==peg$FAILED){s11=peg$parse__();if(s11!==peg$FAILED){s12=peg$parseFunctionBody();if(s12!==peg$FAILED){s13=peg$parse__();if(s13!==peg$FAILED){if(input.charCodeAt(peg$currPos)===125){s14=peg$c218;peg$currPos++;}else {s14=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c219);}}if(s14!==peg$FAILED){peg$savedPos=s0;s1=peg$c380(s3,s7,s12);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseFunctionExpression(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11,s12,s13;s0=peg$currPos;s1=peg$parseFunctionToken();if(s1!==peg$FAILED){s2=peg$parse__();if(s2!==peg$FAILED){s3=peg$currPos;s4=peg$parseIdentifier();if(s4!==peg$FAILED){s5=peg$parse__();if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===40){s4=peg$c221;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c222);}}if(s4!==peg$FAILED){s5=peg$parse__();if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseFormalParameterList();if(s7!==peg$FAILED){s8=peg$parse__();if(s8!==peg$FAILED){s7=[s7,s8];s6=s7;}else {peg$currPos=s6;s6=peg$FAILED;}}else {peg$currPos=s6;s6=peg$FAILED;}if(s6===peg$FAILED){s6=null;}if(s6!==peg$FAILED){if(input.charCodeAt(peg$currPos)===41){s7=peg$c223;peg$currPos++;}else {s7=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c224);}}if(s7!==peg$FAILED){s8=peg$parse__();if(s8!==peg$FAILED){if(input.charCodeAt(peg$currPos)===123){s9=peg$c235;peg$currPos++;}else {s9=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c236);}}if(s9!==peg$FAILED){s10=peg$parse__();if(s10!==peg$FAILED){s11=peg$parseFunctionBody();if(s11!==peg$FAILED){s12=peg$parse__();if(s12!==peg$FAILED){if(input.charCodeAt(peg$currPos)===125){s13=peg$c218;peg$currPos++;}else {s13=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c219);}}if(s13!==peg$FAILED){peg$savedPos=s0;s1=peg$c381(s3,s6,s11);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseFormalParameterList(){var s0,s1,s2,s3,s4,s5,s6,s7;s0=peg$currPos;s1=peg$parseIdentifier();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===44){s5=peg$c228;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c229);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseIdentifier();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===44){s5=peg$c228;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c229);}}if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){s7=peg$parseIdentifier();if(s7!==peg$FAILED){s4=[s4,s5,s6,s7];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c239(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseFunctionBody(){var s0,s1;s0=peg$currPos;s1=peg$parseSourceElements();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c382(s1);}s0=s1;return s0;}function peg$parseProgram(){var s0,s1;s0=peg$currPos;s1=peg$parseSourceElements();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c383(s1);}s0=s1;return s0;}function peg$parseSourceElements(){var s0,s1,s2,s3,s4,s5;s0=peg$currPos;s1=peg$parseSourceElement();if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseSourceElement();if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$parse__();if(s4!==peg$FAILED){s5=peg$parseSourceElement();if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c384(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseSourceElement(){var s0;s0=peg$parseStatement();if(s0===peg$FAILED){s0=peg$parseFunctionDeclaration();}return s0;}function peg$parseProgram(){var s0,s1;s0=peg$currPos;s1=peg$parseTemplateSourceElements();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c383(s1);}s0=s1;return s0;}function peg$parseTemplateSourceElements(){var s0,s1,s2;s0=peg$currPos;s1=[];s2=peg$parseTemplateStatement();while(s2!==peg$FAILED){s1.push(s2);s2=peg$parseTemplateStatement();}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c385(s1);}s0=s1;return s0;}function peg$parseTemplateStatement(){var s0,s1,s2,s3,s4,s5;s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c386){s1=peg$c386;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c387);}}if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$currPos;peg$silentFails++;if(input.substr(peg$currPos,2)===peg$c388){s5=peg$c388;peg$currPos+=2;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c389);}}peg$silentFails--;if(s5===peg$FAILED){s4=void 0;}else {peg$currPos=s4;s4=peg$FAILED;}if(s4!==peg$FAILED){s5=peg$parseSourceCharacter();if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$currPos;peg$silentFails++;if(input.substr(peg$currPos,2)===peg$c388){s5=peg$c388;peg$currPos+=2;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c389);}}peg$silentFails--;if(s5===peg$FAILED){s4=void 0;}else {peg$currPos=s4;s4=peg$FAILED;}if(s4!==peg$FAILED){s5=peg$parseSourceCharacter();if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c388){s3=peg$c388;peg$currPos+=2;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c389);}}if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c390(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c391){s1=peg$c391;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c392);}}if(s1!==peg$FAILED){s2=peg$parseTemplateLiteral();if(s2!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c393){s3=peg$c393;peg$currPos+=2;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c394);}}if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c53(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c391){s1=peg$c391;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c392);}}if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$currPos;peg$silentFails++;if(input.substr(peg$currPos,2)===peg$c393){s5=peg$c393;peg$currPos+=2;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c394);}}peg$silentFails--;if(s5===peg$FAILED){s4=void 0;}else {peg$currPos=s4;s4=peg$FAILED;}if(s4!==peg$FAILED){s5=peg$parseSourceCharacter();if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$currPos;peg$silentFails++;if(input.substr(peg$currPos,2)===peg$c393){s5=peg$c393;peg$currPos+=2;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c394);}}peg$silentFails--;if(s5===peg$FAILED){s4=void 0;}else {peg$currPos=s4;s4=peg$FAILED;}if(s4!==peg$FAILED){s5=peg$parseSourceCharacter();if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c393){s3=peg$c393;peg$currPos+=2;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c394);}}if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c395(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c396){s1=peg$c396;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c397);}}if(s1!==peg$FAILED){s2=peg$parseTemplateBlock();if(s2!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c398){s3=peg$c398;peg$currPos+=2;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c399);}}if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c400(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c396){s1=peg$c396;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c397);}}if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$currPos;peg$silentFails++;if(input.substr(peg$currPos,2)===peg$c398){s5=peg$c398;peg$currPos+=2;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c399);}}peg$silentFails--;if(s5===peg$FAILED){s4=void 0;}else {peg$currPos=s4;s4=peg$FAILED;}if(s4!==peg$FAILED){s5=peg$parseSourceCharacter();if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$currPos;peg$silentFails++;if(input.substr(peg$currPos,2)===peg$c398){s5=peg$c398;peg$currPos+=2;}else {s5=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c399);}}peg$silentFails--;if(s5===peg$FAILED){s4=void 0;}else {peg$currPos=s4;s4=peg$FAILED;}if(s4!==peg$FAILED){s5=peg$parseSourceCharacter();if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c398){s3=peg$c398;peg$currPos+=2;}else {s3=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c399);}}if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c401(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseSourceCharacter();if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c402();}s0=s1;}}}}}return s0;}function peg$parseTemplateLiteral(){var s0,s1,s2,s3;s0=peg$currPos;s1=peg$parse__();if(s1!==peg$FAILED){s2=peg$parseExpression();if(s2!==peg$FAILED){s3=peg$parse__();if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c403(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0;}function peg$parseTemplateBlock(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11,s12,s13;s0=peg$currPos;s1=peg$parse__();if(s1!==peg$FAILED){if(input.substr(peg$currPos,7)===peg$c166){s2=peg$c166;peg$currPos+=7;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c167);}}if(s2!==peg$FAILED){s3=peg$parse__();if(s3!==peg$FAILED){s4=peg$parseStringLiteral();if(s4!==peg$FAILED){s5=peg$parse__();if(s5!==peg$FAILED){peg$savedPos=s0;s1=peg$c404(s4);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parse__();if(s1!==peg$FAILED){if(input.substr(peg$currPos,6)===peg$c180){s2=peg$c180;peg$currPos+=6;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c181);}}if(s2!==peg$FAILED){s3=peg$parse__();if(s3!==peg$FAILED){s4=peg$parseStringLiteral();if(s4!==peg$FAILED){s5=peg$parse__();if(s5!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c405){s6=peg$c405;peg$currPos+=2;}else {s6=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c406);}}if(s6!==peg$FAILED){s7=peg$parse__();if(s7!==peg$FAILED){s8=peg$parseIdentifier();if(s8!==peg$FAILED){s9=peg$parse__();if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c407(s4,s8);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parse__();if(s1!==peg$FAILED){if(input.substr(peg$currPos,3)===peg$c192){s2=peg$c192;peg$currPos+=3;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c193);}}if(s2!==peg$FAILED){s3=peg$parse__();if(s3!==peg$FAILED){s4=peg$parseAssignmentExpression();if(s4!==peg$FAILED){s5=peg$parse__();if(s5!==peg$FAILED){peg$savedPos=s0;s1=peg$c408(s4);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parse__();if(s1!==peg$FAILED){if(input.substr(peg$currPos,3)===peg$c409){s2=peg$c409;peg$currPos+=3;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c410);}}if(s2!==peg$FAILED){s3=peg$parse__();if(s3!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c398){s4=peg$c398;peg$currPos+=2;}else {s4=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c399);}}if(s4!==peg$FAILED){s5=[];s6=peg$currPos;s7=peg$currPos;peg$silentFails++;s8=peg$currPos;if(input.substr(peg$currPos,2)===peg$c396){s9=peg$c396;peg$currPos+=2;}else {s9=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c397);}}if(s9!==peg$FAILED){s10=peg$parse__();if(s10!==peg$FAILED){if(input.substr(peg$currPos,6)===peg$c411){s11=peg$c411;peg$currPos+=6;}else {s11=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c412);}}if(s11!==peg$FAILED){s12=peg$parse__();if(s12!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c398){s13=peg$c398;peg$currPos+=2;}else {s13=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c399);}}if(s13!==peg$FAILED){s9=[s9,s10,s11,s12,s13];s8=s9;}else {peg$currPos=s8;s8=peg$FAILED;}}else {peg$currPos=s8;s8=peg$FAILED;}}else {peg$currPos=s8;s8=peg$FAILED;}}else {peg$currPos=s8;s8=peg$FAILED;}}else {peg$currPos=s8;s8=peg$FAILED;}peg$silentFails--;if(s8===peg$FAILED){s7=void 0;}else {peg$currPos=s7;s7=peg$FAILED;}if(s7!==peg$FAILED){s8=peg$parseSourceCharacter();if(s8!==peg$FAILED){s7=[s7,s8];s6=s7;}else {peg$currPos=s6;s6=peg$FAILED;}}else {peg$currPos=s6;s6=peg$FAILED;}while(s6!==peg$FAILED){s5.push(s6);s6=peg$currPos;s7=peg$currPos;peg$silentFails++;s8=peg$currPos;if(input.substr(peg$currPos,2)===peg$c396){s9=peg$c396;peg$currPos+=2;}else {s9=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c397);}}if(s9!==peg$FAILED){s10=peg$parse__();if(s10!==peg$FAILED){if(input.substr(peg$currPos,6)===peg$c411){s11=peg$c411;peg$currPos+=6;}else {s11=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c412);}}if(s11!==peg$FAILED){s12=peg$parse__();if(s12!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c398){s13=peg$c398;peg$currPos+=2;}else {s13=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c399);}}if(s13!==peg$FAILED){s9=[s9,s10,s11,s12,s13];s8=s9;}else {peg$currPos=s8;s8=peg$FAILED;}}else {peg$currPos=s8;s8=peg$FAILED;}}else {peg$currPos=s8;s8=peg$FAILED;}}else {peg$currPos=s8;s8=peg$FAILED;}}else {peg$currPos=s8;s8=peg$FAILED;}peg$silentFails--;if(s8===peg$FAILED){s7=void 0;}else {peg$currPos=s7;s7=peg$FAILED;}if(s7!==peg$FAILED){s8=peg$parseSourceCharacter();if(s8!==peg$FAILED){s7=[s7,s8];s6=s7;}else {peg$currPos=s6;s6=peg$FAILED;}}else {peg$currPos=s6;s6=peg$FAILED;}}if(s5!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c396){s6=peg$c396;peg$currPos+=2;}else {s6=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c397);}}if(s6!==peg$FAILED){s7=peg$parse__();if(s7!==peg$FAILED){if(input.substr(peg$currPos,6)===peg$c411){s8=peg$c411;peg$currPos+=6;}else {s8=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c412);}}if(s8!==peg$FAILED){s9=peg$parse__();if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c413(s5);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parse__();if(s1!==peg$FAILED){if(input.substr(peg$currPos,5)===peg$c414){s2=peg$c414;peg$currPos+=5;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c415);}}if(s2!==peg$FAILED){s3=peg$parse__();if(s3!==peg$FAILED){s4=peg$parseIdentifier();if(s4!==peg$FAILED){s5=peg$parse__();if(s5!==peg$FAILED){peg$savedPos=s0;s1=peg$c416(s4);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parse__();if(s1!==peg$FAILED){if(input.substr(peg$currPos,8)===peg$c417){s2=peg$c417;peg$currPos+=8;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c418);}}if(s2!==peg$FAILED){s3=peg$parse__();if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c419();s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parse__();if(s1!==peg$FAILED){if(input.substr(peg$currPos,5)===peg$c420){s2=peg$c420;peg$currPos+=5;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c421);}}if(s2!==peg$FAILED){s3=peg$parse__();if(s3!==peg$FAILED){s4=peg$parseIdentifier();if(s4!==peg$FAILED){s5=peg$parse__();if(s5!==peg$FAILED){peg$savedPos=s0;s1=peg$c422(s4);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parse__();if(s1!==peg$FAILED){if(input.substr(peg$currPos,8)===peg$c423){s2=peg$c423;peg$currPos+=8;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c424);}}if(s2!==peg$FAILED){s3=peg$parse__();if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c425();s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parse__();if(s1!==peg$FAILED){if(input.substr(peg$currPos,3)===peg$c172){s2=peg$c172;peg$currPos+=3;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c173);}}if(s2!==peg$FAILED){s3=peg$parse__();if(s3!==peg$FAILED){s4=peg$currPos;s5=peg$parseIdentifier();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){if(input.charCodeAt(peg$currPos)===44){s7=peg$c228;peg$currPos++;}else {s7=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c229);}}if(s7!==peg$FAILED){s8=peg$parse__();if(s8!==peg$FAILED){s5=[s5,s6,s7,s8];s4=s5;}else {peg$currPos=s4;s4=peg$FAILED;}}else {peg$currPos=s4;s4=peg$FAILED;}}else {peg$currPos=s4;s4=peg$FAILED;}}else {peg$currPos=s4;s4=peg$FAILED;}if(s4===peg$FAILED){s4=null;}if(s4!==peg$FAILED){s5=peg$parseIdentifier();if(s5!==peg$FAILED){s6=peg$parse__();if(s6!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c184){s7=peg$c184;peg$currPos+=2;}else {s7=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c185);}}if(s7!==peg$FAILED){s8=peg$parse__();if(s8!==peg$FAILED){s9=peg$parseExpression();if(s9!==peg$FAILED){s10=peg$parse__();if(s10!==peg$FAILED){peg$savedPos=s0;s1=peg$c426(s4,s5,s9);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parse__();if(s1!==peg$FAILED){if(input.substr(peg$currPos,6)===peg$c427){s2=peg$c427;peg$currPos+=6;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c428);}}if(s2!==peg$FAILED){s3=peg$parse__();if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c429();s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parse__();if(s1!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c178){s2=peg$c178;peg$currPos+=2;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c179);}}if(s2!==peg$FAILED){s3=peg$parse__();if(s3!==peg$FAILED){s4=peg$parseExpression();if(s4!==peg$FAILED){s5=peg$parse__();if(s5!==peg$FAILED){peg$savedPos=s0;s1=peg$c430(s4);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parse__();if(s1!==peg$FAILED){if(input.substr(peg$currPos,4)===peg$c160){s2=peg$c160;peg$currPos+=4;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c161);}}if(s2!==peg$FAILED){s3=peg$parse__();if(s3!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c178){s4=peg$c178;peg$currPos+=2;}else {s4=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c179);}}if(s4!==peg$FAILED){s5=peg$parse__();if(s5!==peg$FAILED){s6=peg$parseExpression();if(s6!==peg$FAILED){s7=peg$parse__();if(s7!==peg$FAILED){peg$savedPos=s0;s1=peg$c431(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parse__();if(s1!==peg$FAILED){if(input.substr(peg$currPos,4)===peg$c160){s2=peg$c160;peg$currPos+=4;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c161);}}if(s2!==peg$FAILED){s3=peg$parse__();if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c432();s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parse__();if(s1!==peg$FAILED){if(input.substr(peg$currPos,5)===peg$c433){s2=peg$c433;peg$currPos+=5;}else {s2=peg$FAILED;if(peg$silentFails===0){peg$fail(peg$c434);}}if(s2!==peg$FAILED){s3=peg$parse__();if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c435();s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}}}}}}}}}}}}}return s0;}var TYPES_TO_PROPERTY_NAMES={CallExpression:"callee",MemberExpression:"object"};function filledArray(count,value){var result=new Array(count),i;for(i=0;i<count;i++){result[i]=value;}return result;}function extractOptional(optional,index){return optional?optional[index]:null;}function extractList(list,index){var result=new Array(list.length),i;for(i=0;i<list.length;i++){result[i]=list[i][index];}return result;}function buildList(head,tail,index){return [head].concat(extractList(tail,index));}function buildTree(head,tail,builder){var result=head,i;for(i=0;i<tail.length;i++){result=builder(result,tail[i]);}return result;}function buildBinaryExpression(head,tail){return buildTree(head,tail,function(result,element){return {type:"BinaryExpression",operator:element[1],left:result,right:element[3]};});}function buildLogicalExpression(head,tail){return buildTree(head,tail,function(result,element){return {type:"LogicalExpression",operator:element[1],left:result,right:element[3]};});}function optionalList(value){return value!==null?value:[];}peg$result=peg$startRuleFunction();if(peg$result!==peg$FAILED&&peg$currPos===input.length){return peg$result;}else {if(peg$result!==peg$FAILED&&peg$currPos<input.length){peg$fail({type:"end",description:"end of input"});}throw peg$buildException(null,peg$maxFailExpected,peg$maxFailPos<input.length?input.charAt(peg$maxFailPos):null,peg$maxFailPos<input.length?peg$computeLocation(peg$maxFailPos,peg$maxFailPos+1):peg$computeLocation(peg$maxFailPos,peg$maxFailPos));}}return {SyntaxError:peg$SyntaxError,parse:peg$parse};}();
},{}],9:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Loader = require('../Loader');
var path = require('path');

var WebLoader = function (_Loader) {
	_inherits(WebLoader, _Loader);

	function WebLoader(basePath, enableCache) {
		_classCallCheck(this, WebLoader);

		var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(WebLoader).call(this));

		enableCache = typeof enableCache === 'undefined' ? true : !!enableCache;

		_this.cached = {};
		_this.basePath = path.normalize(basePath);
		_this.enableCache = enableCache;
		return _this;
	}

	_createClass(WebLoader, [{
		key: 'getSource',
		value: function getSource(name) {
			var fullPath = path.resolve(this.basePath, path.normalize(name));

			if (this.enableCache === true && typeof this.cached[fullPath] !== 'undefined') {
				return this.cached[fullPath];
			}

			var ajax;
			if (window && window.XMLHttpRequest) {
				ajax = window.XMLHttpRequest();
			} else if (window && window.ActiveXObject) {
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
	}]);

	return WebLoader;
}(Loader);
},{"../Loader":7,"path":1}]},{},[4]);