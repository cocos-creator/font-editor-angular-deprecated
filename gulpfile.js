var gulp = require('gulp');
var gulpfilter = require('gulp-filter');

var clean = require('gulp-clean');
var rename = require('gulp-rename');
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
var uglify = require('gulp-uglifyjs');
var stylus = require('gulp-stylus');
var replace = require('gulp-replace');
//var karma = require('gulp-karma');
var Path = require('path');

var paths = {
    src: [
        'src/js/file_utils.js',
        'src/js/convert_into_text.js',
        'src/js/font_renderer_path.js',
        'src/js/font_renderer_paper.js',
        'src/js/workSpace.js',
        'src/js/fontEditor.js',
        'src/js/app.js'
    ],
    img: 'src/img/**/*',
    css: 'src/**/*.styl',
    //dest: 'font-editor.min.js',
    depends: [
        '../core/bin/core.dev.js',
    ],
    ext: [
        'ext/angular/angular.js',
        'ext/paper/dist/paper-core.js',
        'ext/jquery/dist/jquery.js',
        'ext/preserve-win-state.js',
        'bin/js/core.dev.js',
    ],
    test: [
        'test/*.js',
        'test/unit/*.js',
        '!src/js/app.js'
    ],
};

// clean
gulp.task('clean', function() {
    return gulp.src(['bin/js/*', '!bin/js/workSpace.js'], {read: false})
    .pipe(clean())
    ;
});

// copy img
gulp.task('cp-img', function() {
    return gulp.src(paths.img)
    .pipe(gulp.dest('bin/img'))
    ;
});

// copy js
gulp.task('cp-js', function() {
    return gulp.src(paths.depends.concat(paths.src), {write: false})
    .pipe(gulp.dest('bin/js'))
    ;
});

// copy depends
gulp.task('cp-editor-ui', function() {
    return gulp.src(paths.ext_editor_ui)
    .pipe(gulp.dest('ext/fire-editor-ui'))
    ;
});

gulp.task('copy', ['cp-js', 'cp-img', 'cp-editor-ui']);

// css
gulp.task('css', function() {
    return gulp.src('src/css/atlas-editor.styl')
    .pipe(stylus({
        compress: false,
        include: 'src'
    }))
    .pipe(gulp.dest('bin'))
    ;
});

// build
gulp.task('build', ['clean', 'copy', 'css'], function() {
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
    .pipe(gulp.dest('bin/js'))
    ;*/
});

/*/ fix source map
gulp.task('fix-source-map', ['build'], function() {
    // fix source map separator: https://github.com/gruntjs/grunt-contrib-uglify/issues/173
    return gulp.src(['bin/js' + '/' + paths.dest + '.map'])
    .pipe(replace('\\\\', '/'))
    .pipe(gulp.dest('bin/js'));
});*/

/*// test
gulp.task('test', ['default'], function() {
    var testFiles = paths.ext.concat(paths.src, paths.test);
    return gulp.src(testFiles)
        .pipe(karma({
            configFile: 'karma.conf.js',
            action: 'run',
        }))
        .on('error', function (err) {
            // Make sure failed tests cause gulp to exit non-zero
            throw err;
        });
});*/

// watch
gulp.task('watch', function() {
    gulp.watch(paths.src, ['default']);
});

// auto copy scripts from src to bin
gulp.task('watchjs', function() {
    gulp.watch(paths.src, ['cp-js']);
});

//
gulp.task('default', ['build'/*, 'fix-source-map'*/] );
//gulp.task('all', ['test'] );
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
    childProcess.execFile(nwgyp, ['rebuild', '--target=0.10.0-rc1'], { cwd: buildingPath },
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