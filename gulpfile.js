var gulp = require('gulp');
var gulpfilter = require('gulp-filter');

var clean = require('gulp-clean');
var rename = require('gulp-rename');
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
var uglify = require('gulp-uglifyjs');
var replace = require('gulp-replace');
var concat = require('gulp-concat');
var qunit = require('gulp-qunit');

var paths = {
    src: [
        'src/js/fontEditor.js',
        'src/js/app.js',
    ],
    dest: 'font-editor.min.js',
    dest_dir: 'bin/js',
    fire: [
        '../atlas-editor/bin/js/atlas-editor.min.js',
        '../atlas-editor/src/js/workSpace.js',
        '../core/bin/core.min.js',
        '../core/bin/core.dev.js',
    ],
};

// clean
gulp.task('clean', function() {
    return gulp.src('bin/js/' + paths.dest + '*', {read: false})
    .pipe(clean())
    ;
});

// copy
gulp.task('copy', ['clean'], function() {
    return gulp.src(paths.fire, {write: false})
    .pipe(gulp.dest(paths.dest_dir))
    ;
});

// build
gulp.task('build', ['copy'], function() {
    return gulp.src(paths.src)
    .pipe(jshint())
    .pipe(jshint.reporter(stylish))
    // .pipe(jshint.reporter('fail')) // disabled
    .pipe(uglify(paths.dest, {
        outSourceMap: true,
        basePath: 'http://any.url/',  // use relative path to locate to /src/js
    }))
    .pipe(gulp.dest(paths.dest_dir))
    ;
});

// fix source map
gulp.task('fix-source-map', ['build'], function() {
    // fix source map separator: https://github.com/gruntjs/grunt-contrib-uglify/issues/173
    return gulp.src([paths.dest_dir + '/' + paths.dest + '.map'])
    .pipe(replace('\\\\', '/'))
    .pipe(gulp.dest(paths.dest_dir));
});

// watch
gulp.task('watch', function() {
    gulp.watch(paths.src, ['default']);
});

//
gulp.task('default', ['build', 'fix-source-map'] );
gulp.task('all', ['default'] );