var Path = require('path');
var FontLib = require('font-lib');

var FontEditor = (function () {
    var _super = WorkSpace;
    
    // ================================================================================
    // const
    // ================================================================================

    var _atlasBoundColor = new paper.Color(85/255, 85/255, 179/255, 0.9);

    var _sampleText = 
'The quick brown fox jumps over the lazy dog\n' + 
'abcdefghijklmnopqrstuvwxyz\n' + 
'ABCDEFGHIJKLMNOPQRSTUVWXYZ\n' + 
'1234567890;:_,.-("*!?\')';

    var _styleFields = ['fontFamily', 'fontSize', 'fontWeight', 
                        'fillColor', 'strokeColor', 'strokeWidth', 'strokeJoin', 'miterLimit', 
                        'shadowColor', 'shadowBlur', 'shadowOffset', 
                        'dashOffset', 'dashArray'];

    // ================================================================================
    // constructor
    // ================================================================================

    function FontEditor(canvas) {
        this.atlas = new FIRE.Atlas();
        this.atlas.allowRotate = false;

        _super.call(this, canvas);

        _initLayers(this);

        this._sampleText = _sampleText; // 目前不提供单独的预览功能，sampleText里面包含的所有字符最终都会被输出。
        this._displayBounds = false;
        this._font = null;              // font obj created by font-lib
        this._charTable = {};
        this._sortedCharList = null;    // sorted keys of _charTable
        this.fontTable = {names: [], paths: []};
        _updateCharTable(this);

        // font --------------------------------

        this._fontFamily = '';
        this._fontSize = 50;
        // for fonts that provide only normal and bold, 100-500 are normal, and 600-900 are bold.
        this._fontWeight = 'normal'; // normal(Same as 400) | bold(Same as 700) | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 // bolder lighter

        // color --------------------------------

        this._fillColor = 'black';

        // stroke --------------------------------

        this._strokeColor = 'white';
        this._strokeWidth = 2;
        /**
         * The shape to be used at the segments and corners of Path items when they have a stroke.
         * String('miter', 'round', 'bevel')
         */
        this._strokeJoin = 'round';
        /**
         * When two line segments meet at a sharp angle and miter joins have been specified for item.strokeJoin, 
         * it is possible for the miter to extend far beyond the item.strokeWidth of the path. The miterLimit 
         * imposes a limit on the ratio of the miter length to the item.strokeWidth.
         */
        this._miterLimit = 10;

        // shadow --------------------------------

        this._shadowColor = [0, 0, 0, 0.5];
        this._shadowBlur = 2;
        this._shadowOffset = new paper.Point(5, 8);

        // dash --------------------------------

        /**
         * The dash offset of the stroke.
         */
        this._dashOffset = 0;
        /**
         * Specifies an array containing the dash and gap lengths of the stroke.
         */
        this._dashArray = null;

        var self = this;
        console.time('enum fonts');
        FontLib.getFontTable(function(data) {
            console.timeEnd('enum fonts');
            _setFontTable(self, data);
        }, navigator.language);
    }
    FIRE.extend(FontEditor, _super);

    // ================================================================================
    // properties
    // ================================================================================

    var defineGetter = function (constructor, fieldList) {
        fieldList.forEach(function (field) {
            var _field = '_' + field;
            constructor.prototype.__defineGetter__(field, function () {
                return this[_field];
            });
        });
    };

    defineGetter (FontEditor, _styleFields);
    defineGetter (FontEditor, ['sampleText', 'displayBounds']);

    // define setter for style fields
    _styleFields.forEach(function (field) {
        var _field = '_' + field;
        FontEditor.prototype.__defineSetter__(field, function (val) {
            this[_field] = val;
            this._recreateAtlas(false);
        });
    });

    FontEditor.prototype.__defineSetter__('sampleText', function (str) {
        this._sampleText = sampleText;
        _updateCharTable();
    });

    FontEditor.prototype.__defineSetter__('displayBounds', function (value) {
        this._displayBounds = value;
        this.repaint();
    });

    // ================================================================================
    // public
    // ================================================================================

    FontEditor.prototype.exportBmFontTxt = function (file) {
        this._font.setSize(this._fontSize);

        // build sorted char list
        this._sortedCharList = Object.keys(this._charTable);
        this._sortedCharList.sort();

        // build data
        var data = {};
        _buildBmFontInfo(this, data, file);
        _buildBmGlyphData(this, data);
        _buildBmKerningData(this, data);

        // to string
        var text = convertIntoText(data);

        return text;
    };

    // ================================================================================
    // overridable
    // ================================================================================

    FontEditor.prototype.repaint = function () {
        _super.prototype.repaint.call(this);
        this._recreateAtlas(false);
    };

    FontEditor.prototype._doUpdateCanvas = function () {
        _super.prototype._doUpdateCanvas.call(this);
        _updateCanvas(this);
    };

    FontEditor.prototype._recreateBackground = function () {
        _super.prototype._recreateBackground.call(this);
        this._border.fillColor = 'white';
    };

    FontEditor.prototype._recreateAtlas = function (forExport) {
        var self = this;
        console.log('_recreateAtlas font family: ' + self.fontFamily);

        // create atlas
        console.time('create atlas');

        var style = {};
        _styleFields.forEach(function (field) {
            style[field] = self['_' + field];
        });

        self.atlas.clear();
        var fontRenderer = new fontRenderer_paper(style);
        for (var char in self._charTable) {
            var img = fontRenderer.render(char);
            if (!img) {
                continue;   // skip invisible
            }
            // create texture
            var tex = new FIRE.SpriteTexture(img);
            tex.name = char;
            self._charTable[char] = tex;
            
            // get trim rect to caculate actual size including shadow
            var trimRect = FIRE.getTrimRect(img, self.atlas.trimThreshold);
            tex.trimX = trimRect.x;
            tex.trimY = trimRect.y;
            tex.width = trimRect.width;
            tex.height = trimRect.height;

            // if visible, pack it into atlas
            if (tex.width > 0 && tex.height > 0) {
                self.atlas.add(tex);
            }
        }
        console.timeEnd('create atlas');
        // packing
        console.time('packing');
        self.atlas.sort();
        self.atlas.layout();
        console.timeEnd('packing');
        
        // create raster
        var addBounds = !forExport && self._displayBounds;
        if (!forExport) {
            self._charLayer.activate();
            self._charLayer.removeChildren();
        }
        WorkSpace.createAtlasRasters(self.atlas, addBounds);
        
        // update
        if (!forExport) {
            _updateCanvas(self);
        }
        paper.view.update();
    };

    // ================================================================================
    // private
    // ================================================================================

    var _initLayers = function (self) {
        self._charLayer = WorkSpace.createLayer();        // to draw chars

        self._cameraLayer.addChildren([
            // BOTTOM (sorted by create order) -----------
            self._charLayer,
            // TOP ---------------------------------------
        ]);
    };

    var _updateCharTable = function (self) {
        self._charTable = {};
        self._sortedCharList = null;

        var charTable = self._charTable;
        var text = self._sampleText;
        var atlas = self.atlas;
        for (var i = 0, len = text.length; i < len; ++i) {
            var char = text[i];
            var spriteTex = charTable[char];
            if (!spriteTex) {
                var tex = null;
                charTable[char] = tex;
            }
        }
        if (self.fontFaimly) {
            self._paperProject.activate();
            self._recreateAtlas(flase);
        }  
    };

    var _updateCanvas = function (self) {
        var posFilter = Math.round;
        var children = self._charLayer.children;
        for (var i = 0; i < children.length; ++i) {
            var child = children[i];
            var isRaster = child.data && child.data.texture;
            if (!isRaster) {
                continue;
            }
            // update char atlas
            var tex = child.data.texture;
            child.position = [posFilter(tex.x * self._zoom), posFilter(tex.y * self._zoom)];
            child.scaling = [self._zoom, self._zoom];
            // update debug rect
            if (self._displayBounds) {
                var left = posFilter(tex.x * self._zoom);
                var top = posFilter(tex.y * self._zoom);
                var w = posFilter(tex.rotatedWidth * self._zoom);
                var h = posFilter(tex.rotatedHeight * self._zoom);
                var bounds = child.data.boundsItem;
                bounds.size = [w, h];
                bounds.position = new paper.Rectangle(left, top, w, h).center;
                bounds.fillColor = _atlasBoundColor;
            }
        }
    };

    var _setFontTable = function (self, data) {
        console.log(data);
        self.fontTable = data;
        var fontIndex = 16;
        if (data.names.length > fontIndex) {
            self.fontFamily = data.names[fontIndex];
            self._font = FontLib.loadFont(data.paths[fontIndex]);
        }
        self._paperProject.activate();
        //self._recreateAtlas(false);
    };

    var _buildBmFontInfo = function (self, data, file) {
        // set info
        data.face = self._fontFamily;
        data.size = self._fontSize;
        var boldStyles = ['bold', '600', '700', '800', '900', 'bolder'];
        var bold = boldStyles.indexOf(self._fontWeight) !== -1;
        data.bold = (bold ? 1 : 0);
        data.italic = 0;    // TODO 保存skew
        data.charset = "";  // not used
        data.unicode = 1;   // not used
        data.stretchH = 100;// not used
        data.smooth = 1;    // not used
        data.aa = 1;        // not used
        data.padding = [0, 0, 0, 0];        // not used
        var spacing = self.atlas.customPadding;
        data.spacing = [spacing, spacing];
        data.outline = 1;   // not used

        // set common
        data.lineHeight = self._font.size.height;
        data.base = self._font.size.ascender;
        data.scaleW = self.atlas.width;
        data.scaleH = self.atlas.height;
        data.pages = 1;     // not used
        data.packed = 0;    // not used

        // set page
        data.id = 0;        // not used
        data.file = file;

        // chars count
        data.count = self._sortedCharList.length;

        return data;
    };

    var _buildBmGlyphData = function (self, data) {
        var output = [];
        data.charList = output;

        var id = 0, x = 0, y = 0, width = 0, height = 0, xoffset = 0, yoffset = 0, xadvance = 0,/* page = 0, chnl = 0,*/ letter = '';
        // cached variables
        var charList = self._sortedCharList;
        var charTable = self._charTable;
        var round = Math.round;
        var font = self._font;

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
            xadvance = font.getAdvanceX(letter);
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

    var _buildBmKerningData = function (self, data) {
        var hasKerning = (self._font.face_flags & FontLib.FT.FACE_FLAG_KERNING) > 0;
        if (hasKerning === false) {
            return;
        }
        var output = [];
        data.kerningList = output;

        // predefined variables
        var first = 0, second = 0, amount = 0, firstCharIndex = 0, secondCharIndex = 0, error = 0;
        var kerningVec = {x: 0, y: 0};
        // cached variables
        var charList = self._sortedCharList;
        var font = self._font;
        var kerningMode = FontLib.FT.KERNING_DEFAULT;
        var getCharIndex = FontLib.FT.Get_Char_Index;
        var getKerning = FontLib.FT.Get_Kerning;
        
        for (var i = 0, len = charList.length; i < len; i++) {
            first = charList[i].charCodeAt(0);
            firstCharIndex = getCharIndex(font, first);
            if (firstCharIndex === 0) {
                continue;
            }
            for (var j = 0; j < len; j++) {
                second = charList[j].charCodeAt(0);
                secondCharIndex = getCharIndex(font, second);
                if (secondCharIndex === 0) {
                    continue;
                }
                error = getKerning(font, firstCharIndex, secondCharIndex, kerningMode, kerningVec);
                if (!error && kerningVec.x !== 0) {
                    output.push([first, second, kerningVec.x / 64]);
                } 
            }
        }
    };

    FontEditor.__testOnly__ = {
        _buildBmFontInfo: _buildBmFontInfo,
        _buildBmGlyphData: _buildBmGlyphData,
        _buildBmKerningData: _buildBmKerningData,
    };

    return FontEditor;
})();
