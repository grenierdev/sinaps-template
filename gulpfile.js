"use strict";

var gulp = require('gulp');
var browser = require('gulp-browser');
var babel = require('gulp-babel');
var rename = require('gulp-rename');
var remove = require('del');
var uglify = require('gulp-uglify');


gulp.task('browser:babel', () => {
	return gulp
			.src(['./browser.js', './lib/**/*.js'], {base: "."})
			.pipe(babel({
				presets: ['es2015']
			}))
			.pipe(gulp.dest('./tmp'))
});

gulp.task('browser:babel-remove-fileloader', ['browser:babel'], () => {
	return remove(['./tmp/lib/loaders/FileLoader.js']);
});

gulp.task('browser:browserify', ['browser:babel-remove-fileloader'], () => {
	return gulp
			.src('./tmp/browser.js')
			.pipe(browser.browserify())
			.pipe(rename('sinaps-template.js'))
			.pipe(gulp.dest('./dist'))
			.pipe(uglify())
			.pipe(rename('sinaps-template.min.js'))
			.pipe(gulp.dest('./dist'))
});

gulp.task('browser:clean', ['browser:browserify'], () => {
	return remove(['./tmp']);
});

gulp.task('default', ['browser:clean']);
