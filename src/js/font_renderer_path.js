var CanvasRenderer = require('fontpath-canvas');
var Font = require('./node_modules/fontpath-canvas/node_modules/fontpath-test-fonts/lib/Inconsolata.otf');

var fontRenderer_path = function (style) {
    // strokeJoin如果是miter，不论miterLimit设成多少，有些字体都无法完美描边每个字符，
    // 所以这里限制只有一定宽度以下才能使用miter
    var forceRoundCapWidth = 1;

    this.renderer = new CanvasRenderer();
    this.renderer.font = Font;
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

fontRenderer_path.prototype._caculateBounds = function () {
    var style = this.style;
    var expandLeft = Math.max(style.shadowBlur - style.shadowOffset.x, 0) + style.strokeWidth;
    var expandRight = Math.max(style.shadowBlur + style.shadowOffset.x, 0) + style.strokeWidth;
    var expandTop = Math.max(style.shadowBlur - style.shadowOffset.y, 0) + style.strokeWidth;
    var expandBottom = Math.max(style.shadowBlur + style.shadowOffset.y, 0) + style.strokeWidth;
    this.expandWidth = expandLeft + expandRight;
    var expandHeight = expandTop + expandBottom;

    var font = this.renderer.iterator.font;
    var pixelHeight = font.height / font.units_per_EM * this.renderer.fontSize;
    var pixelAscender = font.ascender / font.units_per_EM * this.renderer.fontSize;
    this.x = expandLeft;
    this.y = pixelAscender + expandTop;
    this.height = pixelHeight + expandHeight;
};

fontRenderer_path._applyOutlineStyle = function (ctx, style) {
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

fontRenderer_path._applyFillStyle = function (ctx, style) {
    ctx.fillColor = style.strokeColor.toCanvasStyle(ctx);
    //ctx.lineWidth = 0;
    //ctx.strokeStyle = 'rgba(0,0,0,0)';
};

fontRenderer_path._applyShadowStyle = function (ctx, style) {
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
}

fontRenderer_path.prototype._hasOutline = function () {
    return (!this.style.strokeColor.hasAlpha() || this.style.strokeColor.alpha > 0) && this.style.strokeWidth > 0;
};

fontRenderer_path.prototype.render = function (char) {
    // cached member
    var canvas = this.canvas;
    var style = this.style;
    var ctx = this.ctx;
    var renderer = this.renderer;

    // setup renderer
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
    fontRenderer_path._applyShadowStyle(ctx, style);
    fontRenderer_path._applyFillStyle(ctx, style);
    renderer.fill(ctx, this.x, this.y);
    if (this._hasOutline()) {
        // draw outline with shadow
        fontRenderer_path._applyOutlineStyle(ctx, style);
        renderer.stroke(ctx, this.x, this.y);
        // redraw text
        fontRenderer_path._applyShadowStyle(ctx, null);
        renderer.fill(ctx, this.x, this.y);
    }

    // create image
    var img = document.createElement('img');
    img.src = canvas.toDataURL('image/png');
    //console.log('char: ' + char + ' w: ' + img.width + ' h: ' + img.height/* + ' s: ' + img.src*/);
    return img;
};