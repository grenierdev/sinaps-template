"use strict";

var gulp = require('gulp');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var babel = require('gulp-babel');
var rename = require('gulp-rename');
var remove = require('del');
var streamify = require('gulp-streamify')
var uglify = require('gulp-uglify');
var transform = require('vinyl-transform');
var fs = require('fs');
var peg = require('pegjs');
var Stream = require('stream');

gulp.task('parser:build', () => {
	return gulp
			.src('./lib/lexer.pegjs')
			.pipe(transform(function (filename) {
				return new Stream.Transform({
					transform: function (chunk, encoding, done) {
						var lexer = chunk.toString('utf8');
						this.push(`module.exports = ` + peg.buildParser(lexer, {
							cache: false,
							optimize: 'speed',
							output: 'source'
						}));
						done();
					}
				});
			}))
			.pipe(rename('Parser.js'))
			.pipe(gulp.dest('./lib'))
});

gulp.task('browser:babel', () => {
	return gulp
			.src(['./main-browser.js', './lib/**/*.js'], {base: "."})
			.pipe(babel({
				presets: ['es2015']
			}))
			.pipe(gulp.dest('./tmp'))
});

gulp.task('browser:babel-remove-fileloader', ['browser:babel'], () => {
	return remove(['./tmp/lib/loaders/FileLoader.js']);
});

gulp.task('browser:parser', ['browser:babel-remove-fileloader'], () => {
	return gulp
			.src('./lib/lexer.pegjs')
			.pipe(transform(function (filename) {
				return new Stream.Transform({
					transform: function (chunk, encoding, done) {
						var lexer = chunk.toString('utf8');
						this.push(`module.exports = ` + peg.buildParser(lexer, {
							cache: false,
							optimize: 'size',
							output: 'source'
						}));
						done();
					}
				});
			}))
			.pipe(rename('Parser.js'))
			.pipe(gulp.dest('./tmp/lib'))
})

gulp.task('browser:browserify', ['browser:parser'], () => {
	return browserify('./tmp/main-browser.js')
		.bundle()
		.pipe(source('sinaps-template.js'))
		.pipe(gulp.dest('./dist'))
		.pipe(streamify(uglify()))
		.pipe(rename('sinaps-template.min.js'))
		.pipe(gulp.dest('./dist'))
});

gulp.task('browser:clean', ['browser:browserify'], () => {
	return remove(['./tmp']);
});

gulp.task('browser', ['browser:clean']);
