angular.module('fontEditor', ['fireUI'])
.factory ( '$fontInfo', ['$rootScope', function ($rootScope) {
    var fontInfo = {};
    fontInfo.data = new FIRE.FontInfo();
    fontInfo.layout = function () {
        var atlas = this.data.atlas;
        if ( atlas.autoSize ) {
            atlas.width = 128;
            atlas.height = 128;
        }
        atlas.sort();
        atlas.layout();
        $rootScope.$broadcast( 'repaint', true );
    };
    // TEMP
    fontInfo.data.fontFamily = "Arial";

    return fontInfo;
}])
.factory ( '$editor', ['$fontInfo', function ( $fontInfo ) {
    var fontLib = require('font-lib');

    var editor = {};
    editor.elementBgColor = new FIRE.Color( 0, 0.28, 1, 0.5 );
    editor.elementSelectColor = new FIRE.Color(1,1,0,1);
    editor.backgroundColor = new FIRE.Color(0,0,0,0);
    editor.showCheckerboard = true;
    editor.smoothCanvas = true;

    // TODO:
    // // enum fonts from system
    // fontLib.getFontTable(function(data) {
    //     editor.fontTable = data;
    // }, navigator.language);

    editor.fontTable = { 
        Arial: { fullname: "Arial", path: "/Library/Fonts/Arial.ttf" }
    };
    editor.nativeFont = null;
    editor.fontRenderer = null;
    editor.charTable = {};

    editor.updateNativeFont = function () {
        editor.nativeFont = fontLib.loadFont(editor.fontTable[$fontInfo.data.fontFamily].path);  
    };

    editor.updateFontRenderer = function () {
        editor.fontRenderer = new FontRendererPath( $fontInfo.data, editor.nativeFont );
    };

    editor.updateCharTable = function () {
        var charTable = editor.charTable;
        var fontInfo = $fontInfo.data;
        var text = fontInfo.charSet;
        for (var i = 0, len = text.length; i < len; ++i) {
            var c = text[i];

            var sprite = charTable[c];
            if ( !sprite ) {
                var img = editor.fontRenderer.render(c);
                if (!img) {
                    continue;   // skip invisible
                }
                if (!img.width || !img.height) {
                    console.error('invalid font raster: ' + char);
                    continue;
                }

                // create texture
                sprite = new FIRE.SpriteTexture(img);
                sprite.name = c;

                var trim = true;
                if (trim) {
                    // get trim rect to caculate actual size including effects
                    var trimRect = FIRE.getTrimRect(img, fontInfo.atlas.trimThreshold);
                    sprite.trimX = trimRect.x;
                    sprite.trimY = trimRect.y;
                    sprite.width = trimRect.width;
                    sprite.height = trimRect.height;
                }

                //
                charTable[c] = sprite;
            }
        }
    };

    editor.updateAtlas = function () {
        var fontInfo = $fontInfo.data;
        fontInfo.atlas.clear();

        for ( var c in editor.charTable ) {
            var sprite = editor.charTable[c];

            // if visible, pack it into atlas
            if (sprite.width > 0 && sprite.height > 0) {
                fontInfo.atlas.add(sprite);
            }
        }

        var atlas = fontInfo.atlas;
        if ( atlas.autoSize ) {
            atlas.width = 128;
            atlas.height = 128;
        }
        atlas.sort();
        atlas.layout();
    };

    //
    editor.updateNativeFont();
    editor.updateFontRenderer();
    editor.updateCharTable();
    editor.updateAtlas();

    return editor;
}])
.run( ['$fontInfo', '$editor', function($fontInfo,$editor) {
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
}])
;
