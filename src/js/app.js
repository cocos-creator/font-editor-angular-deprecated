//var fileUtils = require('./file_utils');

var app = angular.module('app-font-editor', []);
var nwgui = require('nw.gui');

angular.element(document).ready(function() {

    // canvasEL events
    var canvasEL = document.getElementById('canvas');
    canvasEL.width = canvasEL.parentNode.clientWidth;
    canvasEL.height = canvasEL.parentNode.clientHeight;
    //
    app.fontEditor = new FontEditor(canvasEL);
    window.addEventListener('resize', function() {
        canvasEL.width = canvasEL.parentNode.clientWidth;
        canvasEL.height = canvasEL.parentNode.clientHeight;
        app.fontEditor.updateWindowSize();
    }, false);

    // dev tools
    var win = nwgui.Window.get();
    win.on("devtools-opened", function(url) {
        console.log("devtools-opened: " + url);
        app.fontEditor.displayBounds = true;
    });
    win.on("devtools-closed", function(url) {
        console.log("devtools-closed: " + url);
        app.fontEditor.displayBounds = false;
    });
    app.fontEditor._displayBounds = win.isDevToolsOpen();

    //
    angular.bootstrap(document, ['app-font-editor']);
});

app.testExport = function () {
    getSavePath(app.fontEditor.fontFamily + '.txt', 'exportBmFont', function (path) {
        var pngPath = modifyExtension(path, '.png');
        var Path = require('path');
        var basename = Path.basename(path, Path.extname(path));

        var canvas = app.fontEditor.paintNewCanvas();
        _savePng(canvas, basename, pngPath);

        nwgui.Shell.showItemInFolder(pngPath);
    });
};