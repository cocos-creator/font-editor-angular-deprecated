var GetFontList = require('font-lib');

var FontEditor = (function () {
    var _super = WorkSpace;
    
    // ================================================================================
    /// const
    // ================================================================================

    var _atlasBoundColor = new paper.Color(85/255, 85/255, 179/255, 0.9);

    var _sampleText = 
//'The quick brown fox jumps over the lazy dog\n' + 
'abcdefghijklmnopqrstuvwxyz\n' + 
'ABCDEFGHIJKLMNOPQRSTUVWXYZ\n' + 
'1234567890;:_,.-("*!?\')';

    // ================================================================================
    /// constructor
    // ================================================================================

    function FontEditor(canvas) {
        this.atlas = new FIRE.Atlas();
        this.atlas.allowRotate = false;

        _super.call(this, canvas);

        _initLayers(this);

        this.sampleText = _sampleText;  // 目前不提供单独的预览功能，sampleText里面包含的所有字符最终都会被输出。
        this._displayBounds = false;
        
        // font

        this.fontFamily = '';
        this.fontSize = 50;

        // color

        this.fillColor = 'black';

        // stroke

        this.strokeColor = 'white';
        this.strokeWidth = 2;
        /**
         * The shape to be used at the segments and corners of Path items when they have a stroke.
         * String('miter', 'round', 'bevel')
         */
        this.strokeJoin = 'round';
        /**
         * When two line segments meet at a sharp angle and miter joins have been specified for item.strokeJoin, 
         * it is possible for the miter to extend far beyond the item.strokeWidth of the path. The miterLimit 
         * imposes a limit on the ratio of the miter length to the item.strokeWidth.
         */
        this.miterLimit = 10;

        // shadow

        this.shadowColor = [0, 0, 0, 0.5];
        this.shadowBlur = 2;
        this.shadowOffset = new paper.Point(5, 8);

        // dash

        /**
         * The dash offset of the stroke.
         */
        this.dashOffset = 0;
        /**
         * Specifies an array containing the dash and gap lengths of the stroke.
         */
        this.dashArray = null;

        var self = this;
        console.time('enum fonts');
        GetFontList(function(list) {
            console.timeEnd('enum fonts');
            _setFontList(self, list);
        }, navigator.language);
    }
    FIRE.extend(FontEditor, _super);

    // ================================================================================
    /// properties
    // ================================================================================

    FontEditor.prototype.__defineSetter__('sampleText', function (str) {
        // recreate char table
        this.charTable = {};

        var charTable = this.charTable;
        var atlas = this.atlas;
        for (var i = 0, len = str.length; i < len; ++i) {
            var char = str[i];
            var spriteTex = charTable[char];
            if (!spriteTex) {
                var tex = null;
                charTable[char] = tex;
            }
        }
        if (this.fontFaimly) {
            this._paperProject.activate();
            this._recreateAtlas(flase);
        }
    });

    FontEditor.prototype.__defineSetter__('displayBounds', function (value) {
        this._displayBounds = value;
        this.repaint();
    });

    // ================================================================================
    /// public
    // ================================================================================

    FontEditor.prototype.exportBMFontTxt = function () {
        
    };

    // ================================================================================
    /// overridable
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

        // create atlas
        console.time('create atlas');

        var style = {
            'fontFamily': self.fontFamily,
            'fontSize': self.fontSize,
            'fillColor': self.fillColor,
            'strokeColor': self.strokeColor,
            'strokeWidth': self.strokeWidth,
            'strokeJoin': self.strokeJoin,
            'miterLimit': self.miterLimit,
            'shadowColor': self.shadowColor,
            'shadowBlur': self.shadowBlur,
            'shadowOffset': self.shadowOffset,
            'dashOffset': self.dashOffset,
            'dashArray': self.dashArray,
        };
        var text = new paper.PointText(paper.Item.NO_INSERT);
        text.getStrokeBounds = _getRenderBounds(text.getStrokeBounds, style);   // HACK: reserve shadow's size when rasterizing

        self.atlas.clear();
        for (var char in self.charTable) {
            text.style = style;
            text.content = char;

            // check valid
            var bounds = text.bounds;
            if (bounds.area === 0) {
                continue;
            }

            // create image
            var img = document.createElement('img');
            var raster = text.rasterize();
            var canvas = raster.canvas;
            img.src = canvas.toDataURL('image/png');
            //console.log('char: ' + char + ' w: ' + img.width + ' h: ' + img.height/* + ' s: ' + img.src*/);

            // create texture
            var tex = new FIRE.SpriteTexture(img);
            tex.name = char;
            self.charTable[char] = tex;
            
            // get trim rect to caculate actual size including shadow
            var trimRect = FIRE.getTrimRect(canvas, self.atlas.trimThreshold);
            tex.trimX = trimRect.x;
            tex.trimY = trimRect.y;
            tex.width = trimRect.width;
            tex.height = trimRect.height;

            // if visible, pack it
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
    /// private
    // ================================================================================

    var _initLayers = function (self) {
        self._charLayer = WorkSpace.createLayer();        // to draw chars

        self._cameraLayer.addChildren([
            // BOTTOM (sorted by create order) -----------
            self._charLayer,
            // TOP ---------------------------------------
        ]);
    };

    var _getRenderBounds = function (strokeBoundsGetter, style) {
        var leftExpand = style.shadowBlur - style.shadowOffset.x;
        var rightExpand = style.shadowBlur + style.shadowOffset.x;
        var topExpand = style.shadowBlur - style.shadowOffset.y;
        var bottomExpand = style.shadowBlur + style.shadowOffset.y;

        var expandWidth = Math.max(leftExpand, 0) + Math.max(rightExpand, 0);
        var expandHeight = Math.max(topExpand, 0) + Math.max(bottomExpand, 0);

        return function () {
            var bounds = strokeBoundsGetter.call(this);
            return bounds.expand(expandWidth, expandHeight);
        };
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

    var _setFontList = function (self, list) {
        self.fontList = list;
        if (self.fontList.length > 0) {
            self.fontFamily = self.fontList[0];
        }
        self._paperProject.activate();
        self._recreateAtlas(false);
    };

    return FontEditor;
})();
