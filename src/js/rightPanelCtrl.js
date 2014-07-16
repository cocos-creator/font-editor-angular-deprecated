angular.module('fontEditor')
.controller( "rightPanelCtrl", ["$scope", "$fontInfo", "$editor", function ($scope, $fontInfo, $editor) {
    $scope.fontWeightList = [ 
        { name: 'Normal' , value: 'normal'  } ,
        { name: 'Bold'   , value: 'bold'    } ,
        { name: '100'    , value: '100'     } ,
        { name: '200'    , value: '200'     } ,
        { name: '300'    , value: '300'     } ,
        { name: '400'    , value: '400'     } ,
        { name: '500'    , value: '500'     } ,
        { name: '600'    , value: '600'     } ,
        { name: '700'    , value: '700'     } ,
        { name: '800'    , value: '800'     } ,
        { name: '900'    , value: '900'     } ,
    ];

    $scope.fontInfo = $fontInfo.data;
    $scope.editor = $editor;

    $scope.layout = function () {
        $fontInfo.layout();
    };


    var sortedCharList = null;
    var _buildBmFontInfo = function (fontInfo, nativeFont, data, file) {
        // set info
        data.face = fontInfo.fontFamily;
        data.size = fontInfo.fontSize;
        var boldStyles = ['bold', '600', '700', '800', '900', 'bolder'];
        var bold = boldStyles.indexOf(fontInfo.fontWeight) !== -1;
        data.bold = (bold ? 1 : 0);
        data.italic = 0;    // TODO 保存skew
        data.charset = "";  // not used
        data.unicode = 1;   // not used
        data.stretchH = 100;// not used
        data.smooth = 1;    // not used
        data.aa = 1;        // not used
        data.padding = [0, 0, 0, 0];        // not used
        var spacing = fontInfo.atlas.customPadding;
        data.spacing = [spacing, spacing];
        data.outline = 1;   // not used

        // set common
        data.lineHeight = nativeFont.size.height;
        data.base = nativeFont.size.ascender;
        data.scaleW = fontInfo.atlas.width;
        data.scaleH = fontInfo.atlas.height;
        data.pages = 1;     // not used
        data.packed = 0;    // not used

        // set page
        data.id = 0;        // not used
        data.file = file;

        // chars count
        data.count = sortedCharList.length;

        return data;
    };

    var _buildBmGlyphData = function ( nativeFont, charTable, data ) {
        var output = [];
        data.charList = output;

        var id = 0, x = 0, y = 0, width = 0, height = 0, xoffset = 0, yoffset = 0, xadvance = 0,/* page = 0, chnl = 0,*/ letter = '';
        // cached variables
        var charList = sortedCharList;
        var round = Math.round;

        for (var i = 0, len = charList.length; i < len; i++) {
            letter = charList[i];
            var tex = charTable[letter];
            if (!tex) {
                continue;
            }
            id = letter.charCodeAt(0);
            x = tex.x;
            y = tex.y;
            width = tex.width;
            height = tex.height;
            xoffset = tex.trimX;
            yoffset = tex.trimY;
            xadvance = nativeFont.getAdvanceX(letter);
            if (xadvance !== null) {
                if (letter === ' ') {
                    letter = 'space';
                }
                xadvance = round(xadvance);
                output.push([id, x, y, width, height, xoffset, yoffset, xadvance,/* page, chnl,*/ letter]);
            }
            else {
                console.warn('failed to load char code: ' + id);
            }
        }
    };

    var _buildBmKerningData = function (nativeFont, data) {
        var fontLib = require('font-lib');
        var hasKerning = (nativeFont.face_flags & fontLib.FT.FACE_FLAG_KERNING) > 0;
        if (hasKerning === false) {
            return;
        }
        var output = [];
        data.kerningList = output;

        // predefined variables
        var first = 0, second = 0, amount = 0, firstCharIndex = 0, secondCharIndex = 0, error = 0;
        var kerningVec = {x: 0, y: 0};
        // cached variables
        var charList = sortedCharList;
        var kerningMode = fontLib.FT.KERNING_DEFAULT;
        var getCharIndex = fontLib.FT.Get_Char_Index;
        var getKerning = fontLib.FT.Get_Kerning;
        
        for (var i = 0, len = charList.length; i < len; i++) {
            first = charList[i].charCodeAt(0);
            firstCharIndex = getCharIndex(nativeFont, first);
            if (firstCharIndex === 0) {
                continue;
            }
            for (var j = 0; j < len; j++) {
                second = charList[j].charCodeAt(0);
                secondCharIndex = getCharIndex(nativeFont, second);
                if (secondCharIndex === 0) {
                    continue;
                }
                error = getKerning(nativeFont, firstCharIndex, secondCharIndex, kerningMode, kerningVec);
                if (!error && kerningVec.x !== 0) {
                    output.push([first, second, kerningVec.x / 64]);
                }
            }
        }
    };

    var _exportBmFontTxt = function ( file, fontInfo, charTable ) {
        $scope.editor.nativeFont.setSize(fontInfo.fontSize);

        // build sorted char list
        sortedCharList = Object.keys(charTable);
        sortedCharList.sort();

        // build data
        var data = {};
        _buildBmFontInfo($scope.fontInfo, $scope.editor.nativeFont, data, file);
        _buildBmGlyphData($scope.editor.nativeFont, $scope.editor.charTable, data);
        _buildBmKerningData($scope.editor.nativeFont, data);

        // to string
        var text = convertIntoText(data);

        return text;
    };

    var _paintNewCanvas = function (atlas) {
        var canvas = document.createElement("canvas");
        paper.setup(canvas);
        paper.view.viewSize = [atlas.width, atlas.height];

        for (i = 0; i < atlas.textures.length; ++i) {
            var tex = atlas.textures[i];
            var raster = PaperUtils.createSpriteRaster(tex);
            raster.selectable = true;
            raster.data.texture = tex;
            raster.position = [tex.x, tex.y];
        }

        paper.view.update();

        return canvas;
    };

    $scope.export = function () {
        FIRE.getSavePath($scope.fontInfo.fontFamily + '.txt', 'Key_ExportBmFont', function (txtPath) {
            var pngPath = FIRE.Path.setExtension(txtPath, '.png');
            var Path = require('path');
            var basename = Path.basename(txtPath, Path.extname(txtPath));

            var txt = _exportBmFontTxt(Path.basename(pngPath), $scope.fontInfo, $scope.editor.charTable);
            var canvas = _paintNewCanvas($scope.fontInfo.atlas);

            FIRE.saveText(txt, basename + Path.extname(txtPath), txtPath);
            FIRE.savePng(canvas, basename + '.png', pngPath, null);
            
            var nwgui = require('nw.gui');
            nwgui.Shell.showItemInFolder(pngPath);
        });
    };
}]);
