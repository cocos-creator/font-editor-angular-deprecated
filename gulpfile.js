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
var Path = require('path');

var paths = {
    src: [
        'src/js/fontEditor.js',
        'src/js/app.js',
    ],
    dest: 'font-editor.min.js',
    dest_dir: 'bin/js',
    depends: [
        //*'../atlas-editor/bin/js/atlas-editor.min.js',
        'src/js/fontEditor.js',
        'src/js/app.js',
        'src/js/file_utils.js',
        '../atlas-editor/src/js/workSpace.js',
        '../core/bin/core.min.js',
        '../core/bin/core.dev.js',
    ],
};

// clean
gulp.task('clean', function() {
    return gulp.src(['bin/js/*'], {read: false})
    .pipe(clean())
    ;
});

// copy
gulp.task('copy', ['clean'], function() {
    return gulp.src(paths.depends, {write: false})
    .pipe(gulp.dest(paths.dest_dir))
    ;
});

// build
gulp.task('build', ['copy'], function() {
    return gulp.src(paths.src)
    .pipe(jshint())
    .pipe(jshint.reporter(stylish))
    // .pipe(jshint.reporter('fail')) // disabled
    ;
    /*
    .pipe(uglify(paths.dest, {
        outSourceMap: true,
        basePath: 'http://any.url/',  // use relative path to locate to /src/js
    }))
    .pipe(gulp.dest(paths.dest_dir))
    ;*/
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

/* compile node binary plugins for node-webkit
 *  - Before actually compiling, please meet its requirements (you'll need a proper Python engine and C/C++ compiler)
 *  - https://github.com/rogerwang/nw-gyp#installation
 */
gulp.task('nw', function(callback) {
    var childProcess = require('child_process');
    var path = require('path');
    var buildingPath = path.join(__dirname, 'node_modules', 'font-lib', 'node_modules', 'freetype2');
    var nwgyp = process.platform === 'win32' ? 'nw-gyp.cmd' : 'nw-gyp';
    childProcess.execFile(nwgyp, ['rebuild', '--target=0.9.2'], { cwd: buildingPath },
        function (err, stdout, stderr) {
            if (err) {
                console.error(err);
            }
            if (stdout) {
                console.log(stdout);
            }
            callback(err);
        }
    );
});