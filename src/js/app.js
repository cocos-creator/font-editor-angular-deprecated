angular.module('fontEditor', ['fireUI'])
.factory ( '$fontInfo', ['$rootScope', function ($rootScope) {
    var fontInfo = {};
    fontInfo.data = new FIRE.FontInfo();
    fontInfo.layout = function () {
        this.data.atlas.sort();
        this.data.atlas.layout();
        $rootScope.$broadcast( 'repaint', true );
    };

    return fontInfo;
}])
.factory ( '$editor', function () {
    var editor = {};
    editor.elementBgColor = new FIRE.Color( 0, 0.28, 1, 0.5 );
    editor.elementSelectColor = new FIRE.Color(1,1,0,1);
    editor.backgroundColor = new FIRE.Color(0,0,0,0);
    editor.showCheckerboard = true;
    editor.smoothCanvas = true;

    return editor;
})
.run( ['$fontInfo', function($fontInfo) {
    console.log('starting font-editor');

    if ( FIRE.isnw ) {
        var nwgui = require('nw.gui');
        var nativeWin = nwgui.Window.get();

        if (process.platform === 'darwin') {
            var nativeMenuBar = new nwgui.Menu({ type: "menubar" });
            nativeMenuBar.createMacBuiltin("Font Editor");
            nativeWin.menu = nativeMenuBar;
        }

        $(document).keydown(function (e) { 
            // F12
            if ( e.keyCode == 123 ) {
                nativeWin.showDevTools(); 
                e.stopPropagation();
            }
        });
    }

    // // canvasEL events
    // var canvasEL = document.getElementById('canvas');
    // canvasEL.width = canvasEL.parentNode.clientWidth;
    // canvasEL.height = canvasEL.parentNode.clientHeight;
    // //
    // app.fontEditor = new FontEditor(canvasEL);
    // window.addEventListener('resize', function() {
    //     canvasEL.width = canvasEL.parentNode.clientWidth;
    //     canvasEL.height = canvasEL.parentNode.clientHeight;
    //     app.fontEditor.updateWindowSize();
    // }, false);

    // // dev tools
    // var win = nwgui.Window.get();
    // win.on("devtools-opened", function(url) {
    //     console.log("devtools-opened: " + url);
    //     app.fontEditor.displayBounds = true;
    // });
    // win.on("devtools-closed", function(url) {
    //     console.log("devtools-closed: " + url);
    //     app.fontEditor.displayBounds = false;
    // });
    // app.fontEditor._displayBounds = win.isDevToolsOpen();

    // //
    // angular.bootstrap(document, ['app-font-editor']);

    // app.testExport = function () {
    //     getSavePath(app.fontEditor.fontFamily + '.txt', 'exportBmFont', function (txtPath) {
    //         var pngPath = FIRE.setExtension(txtPath, '.png');
    //         var Path = require('path');
    //         var basename = Path.basename(txtPath, Path.extname(txtPath));

    //         var canvas = app.fontEditor.paintNewCanvas();
    //         _savePng(canvas, basename, pngPath);
    //         var txt = app.fontEditor.exportBmFontTxt(Path.basename(pngPath));
    //         _saveText(txt, basename + Path.extname(txtPath), txtPath);

    //         nwgui.Shell.showItemInFolder(pngPath);
    //     });
    // };
}])
;
