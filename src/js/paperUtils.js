var PaperUtils;
(function (PaperUtils) {

    PaperUtils.createSpriteRaster = function (tex) {
        var tmpRawRaster = new paper.Raster(tex.image);
        var trimRect = new paper.Rectangle(tex.trimX, tex.trimY, tex.width, tex.height);
        var raster = tmpRawRaster.getSubRaster(trimRect);
        tmpRawRaster.remove();  // can only be removed after getSubRaster
        raster.pivot = [-tex.width * 0.5, -tex.height * 0.5];
        if (tex.rotated) {
            raster.pivot = [raster.pivot.x, -raster.pivot.y];
            raster.rotation = 90;
        }
        return raster;
    };

    PaperUtils.createLayer = function () {
        var newLayer = new paper.Layer(paper.Item.NO_INSERT);
        newLayer.applyMatrix = false;
        newLayer.position = [0, 0];   // in paper, position should be settled before pivot
        newLayer.pivot = [0, 0];
        return newLayer;
    };

    PaperUtils.color = function (color) {
        return new paper.Color(color.r, color.g, color.b, color.a);
    };

    // check if rect contains, 1 is a contains b, -1 is b contains a, 0 is no contains 
    PaperUtils.rectRectContains = function (a,b) {
        if ( a.left <= b.left &&
             a.right >= b.right &&
             a.top <= b.top &&
             a.bottom >= b.bottom )
        {
            // a contains b
            return 1;
        }
        if ( b.left <= a.left &&
             b.right >= a.right &&
             b.top <= a.top &&
             b.bottom >= a.bottom )
        {
            // b contains a
            return -1;
        }
        return 0;
    };

    //
    PaperUtils.rectRectIntersect = function (a,b) {
        if ( (a.left <= b.left && a.right >= b.left) ||
             (b.left <= a.left && b.right >= a.left ) ) 
        {
            if ( (a.top <= b.top && a.bottom >= b.top) ||
                 (b.top <= a.top && b.bottom >= a.top ) ) 
            {
                return true;
            }
        }
        return false;
    };

})(PaperUtils || (PaperUtils = {}));
