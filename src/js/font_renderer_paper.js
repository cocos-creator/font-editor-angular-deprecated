var FontRenderer_paper = function (style) {
    this.textItem = new paper.PointText(paper.Item.NO_INSERT);
    this.textItem.style = style;
    // reserve shadow's size when rasterizing
    this.textItem.getStrokeBounds = FontRenderer_paper._fixedRenderBounds(this.textItem.getStrokeBounds, style);
};

FontRenderer_paper.prototype.render = function (char) {
    this.textItem.content = char;
    // check valid
    var bounds = this.textItem.bounds;
    if (bounds.area === 0) {    // '\n'
        return null;
    }
    else {                      // 'space'
        // create image
        var img = document.createElement('img');
        var raster = this.textItem.rasterize();
        var canvas = raster.canvas;
        img.src = canvas.toDataURL('image/png');
        //console.log('char: ' + char + ' w: ' + img.width + ' h: ' + img.height/* + ' s: ' + img.src*/);
        return img;
    }
};

FontRenderer_paper._fixedRenderBounds = function (strokeBoundsGetter, style) {
    var leftExpand = Math.max(style.shadowBlur - style.shadowOffset.x, 0);
    var rightExpand = Math.max(style.shadowBlur + style.shadowOffset.x, 0);
    var topExpand = Math.max(style.shadowBlur - style.shadowOffset.y, 0);
    var bottomExpand = Math.max(style.shadowBlur + style.shadowOffset.y, 0);

    return function () {
        var bounds = strokeBoundsGetter.call(this);
        bounds.left -= leftExpand;
        bounds.right += rightExpand;
        bounds.top -= topExpand;
        bounds.bottom += bottomExpand;
        return bounds;
    };
};