var CanvasRenderer = require('fontpath-canvas');
var FontLib = require('font-lib');

/* Font proxy for CanvasRenderer
 * Get font data from freetype directly instead of creating whole font json file
 */
var DynamicFontProxy = function (font, size) {
    font.setSize(size);
    this.font = font;
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
    this.underline_thickness = font.underline_thickness;
    this.underline_position = font.underline_position;
    this.max_advance_width = font.max_advance_width;
    this.height = font.height;
    this.descender = font.descender;
    this.ascender = font.ascender;
    this.units_per_EM = font.units_per_EM;
    this.style_name = font.style_name;
    this.family_name = font.family_name;
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
var FontRenderer_path = function (style, font) {
    // strokeJoin如果是miter，不论miterLimit设成多少，有些字体都无法完美描边每个字符，
    // 所以这里限制只有一定宽度以下才能使用miter
    var forceRoundCapWidth = 1;

    this.renderer = new CanvasRenderer();
    this.renderer.font = new DynamicFontProxy(font, style.fontSize);
    this.renderer.fontSize = style.fontSize;
    this.renderer.align = CanvasRenderer.Align.LEFT;

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.style = style;
    
    // workaround incorrect miter stroke
    if (style.strokeJoin !== 'round' && style.strokeWidth > forceRoundCapWidth) {
        style.strokeJoin = 'round';
    }

    // adjust style
    if ((style.strokeColor instanceof paper.Color) === false) {
        style.strokeColor = new paper.Color(style.strokeColor);
    }
    if ((style.fillColor instanceof paper.Color) === false) {
        style.fillColor = new paper.Color(style.fillColor);
    }
    if ((style.shadowColor instanceof paper.Color) === false) {
        style.shadowColor = new paper.Color(style.shadowColor);
    }
    if ((style.shadowOffset instanceof paper.Point) === false) {
        style.shadowOffset = new paper.Point(style.shadowOffset);
    }
    style.strokeWidth *= 2; // externalOutlineWidth = style.strokeWidth * 0.5;

    if (this._hasOutline()) {
        // ristrict fill alpha，由于外描边其实是用双倍的居中描边模拟出来的，所以必须把内描边用填充完全遮住
        style.fillColor.alpha = 1;
    }

    this._caculateBounds();
};

FontRenderer_path.prototype._caculateBounds = function () {
    var style = this.style;
    var expandLeft = Math.max(style.shadowBlur - style.shadowOffset.x, 0) + style.strokeWidth;
    var expandRight = Math.max(style.shadowBlur + style.shadowOffset.x, 0) + style.strokeWidth;
    var expandTop = Math.max(style.shadowBlur - style.shadowOffset.y, 0) + style.strokeWidth;
    var expandBottom = Math.max(style.shadowBlur + style.shadowOffset.y, 0) + style.strokeWidth;
    this.expandWidth = expandLeft + expandRight;
    var expandHeight = expandTop + expandBottom;

    var font = this.renderer.font;
    // caculate pixel manually, because CanvasRenderer uses pt, but we use px.
    var pixelHeight = font.height / font.units_per_EM * this.renderer.fontSize;
    var pixelAscender = font.ascender / font.units_per_EM * this.renderer.fontSize;
    this.x = expandLeft;
    this.y = pixelAscender + expandTop;
    this.height = pixelHeight + expandHeight;
    /*
    // 画布需要外扩一个像素，否则放大后边缘如果有像素做线性插值时会有锯齿，不过这会对xyoffset有影响。
    var padding = 1;
    this.x += padding;
    this.y += padding;
    this.height += (padding * 2);
    this.expandWidth += (padding * 2);*/
};

FontRenderer_path._applyOutlineStyle = function (ctx, style) {
    ctx.strokeStyle = style.strokeColor.toCanvasStyle(ctx);
    ctx.lineWidth = style.strokeWidth;
    ctx.lineJoin = style.strokeJoin;
    if (ctx.lineJoin === 'round') {
        ctx.lineCap = 'round';
    } else {
        ctx.lineCap = 'square';
    }
    ctx.miterLimit = style.miterLimit;
    /*var dashArray = style.dashArray;
    if (dashArray && dashArray.length) {
        if ('setLineDash' in ctx) {
            ctx.setLineDash(dashArray);
            ctx.lineDashOffset = style.dashOffset;
        } else {
            ctx.mozDash = dashArray;
            ctx.mozDashOffset = style.dashOffset;
        }
    }*/
};

FontRenderer_path._applyFillStyle = function (ctx, style) {
    ctx.fillColor = style.strokeColor.toCanvasStyle(ctx);
    //ctx.lineWidth = 0;
    //ctx.strokeStyle = 'rgba(0,0,0,0)';
};

FontRenderer_path._applyShadowStyle = function (ctx, style) {
    if (style) {
        ctx.shadowOffsetX = style.shadowOffset.x;
        ctx.shadowOffsetY = style.shadowOffset.y;
        ctx.shadowBlur = style.shadowBlur;
        ctx.shadowColor = style.shadowColor.toCanvasStyle(ctx);
    }
    else {
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 0;
        ctx.shadowColor = null;
    }
};

FontRenderer_path.prototype._hasOutline = function () {
    return (!this.style.strokeColor.hasAlpha() || this.style.strokeColor.alpha > 0) && this.style.strokeWidth > 0;
};

FontRenderer_path.prototype.render = function (char) {
    // cached member
    var canvas = this.canvas;
    var style = this.style;
    var ctx = this.ctx;
    var renderer = this.renderer;

    // setup renderer
    renderer.font.requestCharacterGlyph(char);   // actually load glyph
    renderer.text = char;

    // setup canvas
    var bounds = renderer.getBounds();
    if (bounds.width === 0 || bounds.height === 0) {
        return null;
    }
    canvas.width = bounds.width + this.expandWidth;
    canvas.height = this.height;
    //ctx.fillStyle = 'rgb(50,128,50)';
    //ctx.fillRect(0, 0, canvas.width, canvas.height);

    // draw text with shadow
    FontRenderer_path._applyShadowStyle(ctx, style);
    FontRenderer_path._applyFillStyle(ctx, style);
    renderer.fill(ctx, this.x, this.y);
    if (this._hasOutline()) {
        // draw outline with shadow
        FontRenderer_path._applyOutlineStyle(ctx, style);
        renderer.stroke(ctx, this.x, this.y);
        // redraw text
        FontRenderer_path._applyShadowStyle(ctx, null);
        renderer.fill(ctx, this.x, this.y);
    }

    // create image
    var img = document.createElement('img');
    img.src = canvas.toDataURL('image/png');
    //console.log('char: ' + char + ' w: ' + img.width + ' h: ' + img.height/* + ' s: ' + img.src*/);
    return img;
};