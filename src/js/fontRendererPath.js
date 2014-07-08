var FontRendererPath = (function () {

    var CanvasRenderer = require('fontpath-canvas');
    var FontLib = require('font-lib');

    /* Font proxy for CanvasRenderer
     * Get font data from freetype directly instead of creating whole font json file
     */
    var DynamicFontProxy = function (nativeFont, size) {
        nativeFont.setSize(size);
        this.font = nativeFont;
        this.size = size;   // actually, size is the font pt, but we use it as px.
        this.resolution = 72;
        this.kerning = [];
        this.exporter = 'dynamicFontProxy';
        this.version = '0.0.1';
        this.glyphs = {};
        //['underline_thickness', 'underline_position', 'max_advance_width','height','descender',
        // 'ascender','units_per_EM','style_name','family_name'].forEach(function (field) {
        //    this[field] = font[field]; // not worked, operator [] can not lookup values from base type
        //});
        this.underline_thickness = nativeFont.underline_thickness;
        this.underline_position = nativeFont.underline_position;
        this.max_advance_width = nativeFont.max_advance_width;
        this.height = nativeFont.height;
        this.descender = nativeFont.descender;
        this.ascender = nativeFont.ascender;
        this.units_per_EM = nativeFont.units_per_EM;
        this.style_name = nativeFont.style_name;
        this.family_name = nativeFont.family_name;
    };

    DynamicFontProxy.prototype.requestCharacterGlyph = function (char) {
        char = char[0];
        var glyph = this.glyphs[char];
        if (!glyph) {
            this.font.loadChar(char, FontLib.FT.LOAD_NO_BITMAP/* | FontLib.FT.LOAD_NO_HINTING*/);
            var metrics = this.font.glyph.metrics;
            this.glyphs[char] = {
                xoff: metrics.horiAdvance,
                width: metrics.width,
                height: metrics.height,
                hbx: metrics.horiBearingX,
                hby: metrics.horiBearingY,
                path: DynamicFontProxy._getGlyphOutline(FontLib.FT, this.font, char),
            };
        }
        return glyph;
    };

    DynamicFontProxy._getGlyphOutline = function(ft, face, code) {
        // copied from https://github.com/mattdesl/fontpath/blob/master/lib/SimpleJson.js
        if (face.glyph.format !== ft.GLYPH_FORMAT_OUTLINE) {
            console.warn("Charcode", code, "(" + String.fromCharCode(code) + ") has no outline");
            return [];
        }
        var data = [];
        ft.Outline_Decompose(face, {
            move_to: function (x, y) {
                data.push(["m", x, y]);
            },
            line_to: function (x, y) {
                data.push(["l", x, y]);
            },
            quad_to: function (cx, cy, x, y) {
                data.push(["q", cx, cy, x, y]);
            },
            cubic_to: function (cx1, cy1, cx2, cy2, x, y) {
                data.push(["c", cx1, cy1, cx2, cy2, x, y]);
            },
        });
        return data;
    };

    /* The font renderer
     */
    function FontRendererPath (fontInfo, nativeFont) {
        // strokeJoin如果是miter，不论miterLimit设成多少，有些字体都无法完美描边每个字符，
        // 所以这里限制只有一定宽度以下才能使用miter
        var forceRoundCapWidth = 1;

        this.nativeRenderer = new CanvasRenderer();
        this.nativeRenderer.font = new DynamicFontProxy(nativeFont, fontInfo.fontSize);
        this.nativeRenderer.fontSize = fontInfo.fontSize;
        this.nativeRenderer.align = CanvasRenderer.Align.LEFT;

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.fontInfo = fontInfo;
        
        // workaround incorrect miter stroke
        this.strokeJoin = fontInfo.strokeJoin;
        if (fontInfo.strokeJoin !== 'round' && fontInfo.strokeWidth > forceRoundCapWidth) {
            this.strokeJoin = 'round';
        }

        // adjust style
        this.strokeColor = PaperUtils.color(fontInfo.strokeColor);
        this.fillColor = PaperUtils.color(fontInfo.fillColor);
        this.shadowColor = PaperUtils.color(fontInfo.shadowColor);
        this.shadowOffset = PaperUtils.point(fontInfo.shadowOffset);
        this.strokeWidth = fontInfo.strokeWidth * 2;
        this.shadowBlur = fontInfo.shadowBlur;
        this.miterLimit = fontInfo.miterLimit;

        if (_hasOutline(this)) {
            // ristrict fill alpha，由于外描边其实是用双倍的居中描边模拟出来的，所以必须把内描边用填充完全遮住
            this.fillColor.alpha = 1;
        }

        _caculateBounds(this);
    }

    var _applyFillStyle = function (ctx, renderer) {
        ctx.fillColor = renderer.fillColor.toCanvasStyle(ctx);
        //ctx.lineWidth = 0;
        //ctx.strokeStyle = 'rgba(0,0,0,0)';
    };

    var _applyShadowStyle = function (ctx, renderer) {
        ctx.shadowOffsetX = renderer.shadowOffset.x;
        ctx.shadowOffsetY = renderer.shadowOffset.y;
        ctx.shadowBlur = renderer.shadowBlur;
        ctx.shadowColor = renderer.shadowColor.toCanvasStyle(ctx);
    };

    var _clearShadowStyle = function (ctx) {
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 0;
        ctx.shadowColor = null;
    };

    var _applyOutlineStyle = function (ctx, renderer) {
        ctx.strokeStyle = renderer.strokeColor.toCanvasStyle(ctx);
        ctx.lineWidth = renderer.strokeWidth;
        ctx.lineJoin = renderer.strokeJoin;
        if (ctx.lineJoin === 'round') {
            ctx.lineCap = 'round';
        } else {
            ctx.lineCap = 'square';
        }
        ctx.miterLimit = renderer.miterLimit;
        /*var dashArray = renderer.dashArray;
        if (dashArray && dashArray.length) {
            if ('setLineDash' in ctx) {
                ctx.setLineDash(dashArray);
                ctx.lineDashOffset = renderer.dashOffset;
            } else {
                ctx.mozDash = dashArray;
                ctx.mozDashOffset = renderer.dashOffset;
            }
        }*/
    };

    var _hasOutline = function ( renderer ) {
        return (!renderer.strokeColor.hasAlpha() || renderer.strokeColor.alpha > 0) && renderer.strokeWidth > 0;
    };

    var _caculateBounds = function ( renderer ) {
        var expandLeft = Math.max(renderer.shadowBlur - renderer.shadowOffset.x, 0) + renderer.strokeWidth;
        var expandRight = Math.max(renderer.shadowBlur + renderer.shadowOffset.x, 0) + renderer.strokeWidth;
        var expandTop = Math.max(renderer.shadowBlur - renderer.shadowOffset.y, 0) + renderer.strokeWidth;
        var expandBottom = Math.max(renderer.shadowBlur + renderer.shadowOffset.y, 0) + renderer.strokeWidth;
        renderer.expandWidth = expandLeft + expandRight;
        var expandHeight = expandTop + expandBottom;

        var font = renderer.nativeRenderer.font;
        // caculate pixel manually, because CanvasRenderer uses pt, but we use px.
        var pixelHeight = font.height / font.units_per_EM * renderer.nativeRenderer.fontSize;
        var pixelAscender = font.ascender / font.units_per_EM * renderer.nativeRenderer.fontSize;
        renderer.x = expandLeft;
        renderer.y = pixelAscender + expandTop;
        renderer.height = pixelHeight + expandHeight;
        /*
        // 画布需要外扩一个像素，否则放大后边缘如果有像素做线性插值时会有锯齿，不过这会对xyoffset有影响。
        var padding = 1;
        renderer.x += padding;
        renderer.y += padding;
        renderer.height += (padding * 2);
        renderer.expandWidth += (padding * 2);*/
    };

    FontRendererPath.prototype.render = function (char) {
        // cached member
        var canvas = this.canvas;
        var style = this.style;
        var ctx = this.ctx;
        var nativeRenderer = this.nativeRenderer;

        // setup renderer
        nativeRenderer.font.requestCharacterGlyph(char);   // actually load glyph
        nativeRenderer.text = char;

        // setup canvas
        var bounds = nativeRenderer.getBounds();
        if (bounds.width === 0 || bounds.height === 0) {
            return null;
        }
        canvas.width = bounds.width + this.expandWidth;
        canvas.height = this.height;
        //ctx.fillStyle = 'rgb(50,128,50)';
        //ctx.fillRect(0, 0, canvas.width, canvas.height);

        // draw text with shadow
        _applyShadowStyle(ctx, this);
        _applyFillStyle(ctx, this);
        nativeRenderer.fill(ctx, this.x, this.y);
        if (_hasOutline(this)) {
            // draw outline with shadow
            _applyOutlineStyle(ctx, this);
            nativeRenderer.stroke(ctx, this.x, this.y);

            // redraw text
            _clearShadowStyle(ctx);
            nativeRenderer.fill(ctx, this.x, this.y);
        }

        // create image
        var img = document.createElement('img');
        img.src = canvas.toDataURL('image/png');
        //console.log('char: ' + char + ' w: ' + img.width + ' h: ' + img.height/* + ' s: ' + img.src*/);
        return img;
    };

    return FontRendererPath;
})();
