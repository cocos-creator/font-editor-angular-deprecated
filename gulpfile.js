var gulp = require('gulp');

var gutil = require('gulp-util');
var clean = require('gulp-clean');
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
var concat = require('gulp-concat');
var uglify = require('gulp-uglifyjs');
var stylus = require('gulp-stylus');
//var karma = require('gulp-karma');

var paths = {
    ext_core: [ 
        '../core/bin/**/*.js',
    ],
    ext_editor_ui: [ 
        '../editor-ui/bin/**/*',
    ],
    ext_third: [ 
        'src/third/**/*',
    ],
    img: 'src/img/**/*',
    js: 'src/**/*.js',
    js_in_order: [
        'src/js/convertIntoText.js',
        'src/js/fontRendererPath.js',
        'src/js/fontRendererPaper.js',

        'src/js/paperUtils.js',
        'src/js/app.js',
        'src/js/freeMovePaper.js',
        'src/js/rightPanelCtrl.js',
        'src/js/workSpaceCtrl.js',
    ],
    css: 'src/**/*.styl',
    html: 'src/**/*.html',
    test: [
        'test/*.js',
        'test/unit/*.js',
        '!src/js/app.js'
    ],
};

// clean
gulp.task('clean', function() {
    return gulp.src('bin/**/*', {read: false})
    .pipe(clean())
    ;
});

// copy img
gulp.task('cp-core', function() {
    return gulp.src(paths.ext_core)
    .pipe(gulp.dest('ext/fire-core'))
    ;
});
gulp.task('cp-editor-ui', function() {
    return gulp.src(paths.ext_editor_ui)
    .pipe(gulp.dest('ext/fire-editor-ui'))
    ;
});
gulp.task('cp-img', function() {
    return gulp.src(paths.img)
    .pipe(gulp.dest('bin/img'))
    ;
});
gulp.task('cp-third', function() {
    return gulp.src(paths.ext_third)
    .pipe(gulp.dest('ext/'))
    ;
});

// js
gulp.task('js', function() {
    return gulp.src(paths.js_in_order, {base: 'src'})
    .pipe(jshint())
    .pipe(jshint.reporter(stylish))
    .pipe(concat('font-editor.js'))
    .pipe(uglify())
    .pipe(gulp.dest('bin'))
    ;
});
// js-dev
gulp.task('js-dev', function() {
    return gulp.src(paths.js_in_order, {base: 'src'})
    .pipe(jshint({
        '-W087': true,
    }))
    .pipe(jshint.reporter(stylish))
    .pipe(concat('font-editor.js'))
    .pipe(gulp.dest('bin'))
    ;
});

// css
gulp.task('css', function() {
    return gulp.src('src/css/font-editor.styl')
    .pipe(stylus({
        compress: false,
        include: 'src'
    }))
    .pipe(gulp.dest('bin'))
    ;
});


// watch
gulp.task('watch', function() {
    gulp.watch(paths.ext_core, ['cp-core']).on ( 'error', gutil.log );
    gulp.watch(paths.ext_editor_ui, ['cp-editor-ui']).on ( 'error', gutil.log );
    gulp.watch(paths.img, ['cp-img']).on ( 'error', gutil.log );
    gulp.watch(paths.js, ['js-dev']).on ( 'error', gutil.log );
    gulp.watch(paths.css, ['css']).on ( 'error', gutil.log );
    // gulp.watch(paths.html, ['html']).on ( 'error', gutil.log );
});

// tasks
gulp.task('default', ['cp-core', 'cp-editor-ui', 'cp-img', 'cp-third', 'js', 'css' ] );
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
