var WorkSpace = (function () {
    
    // ================================================================================
    /// constructor
    // ================================================================================

    function WorkSpace (canvas) {
        this._zoom = 1;
        this._border = null;
        this._autoCentered = false;  // 打开网页后，自动居中一次，然后才显示出来

        // init paper
        var size = [canvas.width, canvas.height];
        paper.setup(canvas);
        paper.view.viewSize = size; // to prevent canvas resizing during paper.setup
        this._paperProject = paper.project;

        _initLayers(this);
        this._recreateBackground();
        _centerViewport(this);
        paper.view.update();

        _bindEvents(this);
    }
    var _class = WorkSpace;

    // ================================================================================
    /// static
    // ================================================================================

    _class.BORDER_COLOR = new paper.Color(0.08, 0.08, 0.08, 1);

    _class.createLayer = function (existedLayer) {
        existedLayer = existedLayer || new paper.Layer(paper.Item.NO_INSERT);
        existedLayer.applyMatrix = false;
        existedLayer.position = [0, 0];   // in paper, position should be settled before pivot
        existedLayer.pivot = [0, 0];
        return existedLayer;
    };

    _class.createSpriteRaster = function (tex) {
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

    _class.createAtlasRasters = function (atlas, addBounds, onMouseDown, onMouseUp) {
        console.time('create raster');
        for (var i = 0; i < atlas.textures.length; ++i) {
            var tex = atlas.textures[i];
            var raster = WorkSpace.createSpriteRaster(tex);
            raster.data.texture = tex;
            if (addBounds) {
                raster.data.boundsItem = new paper.Shape.Rectangle(paper.Item.NO_INSERT);
                raster.data.boundsItem.insertBelow(raster);
                // bind events
                if (onMouseDown) {
                    raster.onMouseDown = onMouseDown;
                }
                if (onMouseUp) {
                    raster.onMouseUp = onMouseUp;
                }
            }
            else {
                raster.position = [tex.x, tex.y];
            }
        }
        console.timeEnd('create raster');
    };

    // ================================================================================
    /// public
    // ================================================================================

    _class.prototype.setZoom = function (zoom) {
        var center = this._paperProject.view.center;
        var offset = this._cameraLayer.position.subtract(center);
        var newOffset = offset.divide(this._zoom).multiply(zoom);
        this._cameraLayer.position = center.add(newOffset).round();

        this._zoom = zoom;

        this._paperProject.activate();
        this._recreateBackground();
        _updateCanvas(this);
    };

    _class.prototype.updateWindowSize = function () {
        // resize
        var view = this._paperProject.view;
        view.viewSize = [view.element.width, view.element.height];

        //console.log(init + ' ' + view.viewSize);
        //this._paperProject.activate();
        if (this._autoCentered === false) {
            _centerViewport(this);
            this._autoCentered = true;

            //this.repaint();
        }
        //else {
        //    this._updateCanvas();
        //}

        // 按理说只要第一次repaint，之后_updateCanvas就行，但这样会导致打开网页时常常看不到东西，不知道为什么
        this._paperProject.activate();
        this.repaint();
    };

    _class.prototype.paintNewCanvas = function () {
        var canvas = document.createElement("canvas");
        paper.setup(canvas);
        paper.view.viewSize = [512, 512];
        this._recreateAtlas(true);
        return canvas;
    };

    // ================================================================================
    /// overridable
    // ================================================================================

    // recreate all item
    _class.prototype.repaint = function () {
        this._paperProject.activate();
        this._recreateBackground();
    };

    // need its paper project activated
    _class.prototype._recreateAtlas = function () {};

    _class.prototype._doUpdateCanvas = function () {};
    
    // need its paper project activated
    _class.prototype._recreateBackground = function () {
        this._bgLayer.activate();
        this._bgLayer.removeChildren();
        var borderWidth = 2;
        // draw rect
        var size = Math.floor(512 * this._zoom);
        var borderRect = new paper.Rectangle(0, 0, size, size);
        borderRect = borderRect.expand(borderWidth);
        this._border = new paper.Shape.Rectangle(borderRect);
        //this._border.fillColor = new paper.Color(204/255, 204/255, 204/255, 1);
        this._border.style = {
            strokeWidth: borderWidth,
            strokeColor: WorkSpace.BORDER_COLOR,
            shadowColor: [0, 0, 0, 0.5],
            shadowBlur: 7,
            shadowOffset: new paper.Point(2, 2),
        };
    };

    _class.prototype._onMouseDrag = function (target, event) {
        var rightButtonDown = event.event.which === 3;
        rightButtonDown = rightButtonDown || (event.event.buttons !== 'undefined' && (event.event.buttons & 2) > 0); // tweak for firefox and IE
        if (rightButtonDown) {
            // drag viewport
            this._cameraLayer.position = this._cameraLayer.position.add(event.delta);
            return false;
        }
    };

    _class.prototype._onMouseDown = function (target, event) {};

    _class.prototype._onMouseUp = function (target, event) {};

    // ================================================================================
    /// private
    // ================================================================================

    var _initLayers = function (self) {
        self._cameraLayer = WorkSpace.createLayer(self._paperProject.activeLayer);   // to support viewport movement
        self._bgLayer = WorkSpace.createLayer();           // to draw checkerboard, border, shadow etc.

        self._paperProject.layers.push(self._cameraLayer);
        self._cameraLayer.addChildren([
            // BOTTOM (sorted by create order) -----------
            self._bgLayer,
            // TOP ---------------------------------------
        ]);
    };

    var _bindEvents = function (self) {
        var tool = new paper.Tool();
        tool.onMouseDrag = function (event) {
            return self._onMouseDrag(this, event);
        };
        tool.onMouseDown = function (event) {
            return self._onMouseDown(this, event);
        };
        tool.onMouseUp = function (event) {
            return self._onMouseUp(this, event);
        };

        var canvasEL = self._paperProject.view.element;
        var canvas = $(canvasEL);

        //var lastPoint;
        //canvas.mousemove(function (event) {
        //    //console.log(event);
        //    var delta;
        //    if (typeof(lastPoint) !== 'undefined') {
        //        delta = [event.screenX - lastPoint.x, event.screenY - lastPoint.y];
        //        lastPoint = new paper.Point(event.screenX, event.screenY);
        //    }
        //    else {
        //        lastPoint = new paper.Point(event.screenX, event.screenY);
        //        return;
        //    }
        //    var rightButtonDown = event.which === 3;
        //    rightButtonDown = rightButtonDown || (typeof(event.buttons) !== 'undefined' && (event.buttons & 2) > 0); // tweak for firefox and IE
        //    if (rightButtonDown) {
        //        // drag viewport
        //        self._cameraLayer.position = self._cameraLayer.position.add(delta);
        //    }
        //});
        
        // zoom in / out
        canvas.bind('mousewheel DOMMouseScroll', function(e) {
            var zoom = self._zoom;
            if(e.originalEvent.wheelDelta > 0 || e.originalEvent.detail < 0) {
                zoom += 0.1;
                zoom = Math.min(zoom, 8);
            }
            else {
                zoom -= 0.1;
                zoom = Math.max(zoom, 0.1);
            }
            self.setZoom(zoom);
        });

        // prevent default menu
        canvasEL.oncontextmenu = function() { return false; };
    };

    var _centerViewport = function (self) {
        var size = self._paperProject.view.viewSize;
        var x = Math.round((size.width - 512) * 0.5);
        var y = Math.round((size.height - 512) * 0.5);
        self._cameraLayer.position = [x, y];
    };

    var _updateCanvas = function (self) {
        self._doUpdateCanvas();
        self._paperProject.view.update();
    };

    return _class;
})();