angular.module('fontEditor')
.controller( "workSpaceCtrl", ["$scope", "$element", "$fontInfo", "$editor", function ($scope, $element, $fontInfo, $editor) {
    //
    function createCheckerboard ( width, height ) {
        var tmpLayer = PaperUtils.createLayer();
        tmpLayer.activate();

        var gridColor2 = new paper.Color(135/255, 135/255, 135/255, 1);
        var gridSize = 32;
        var posFilter = Math.round;
        var sizeFilter = Math.floor;
        var zoomedGridSize = sizeFilter(gridSize);
        var template = new paper.Shape.Rectangle(0, 0, zoomedGridSize, zoomedGridSize);
        template.remove();
        template.fillColor = gridColor2;
        template.pivot = [-zoomedGridSize/2, -zoomedGridSize/2];
        var symbol = new paper.Symbol(template);
        for (var x = 0; x < width; x += gridSize) {
            for (var y = 0; y < height; y += gridSize) {
                if (x % (gridSize * 2) !== y % (gridSize * 2)) {
                    symbol.place([posFilter(x), posFilter(y)]);
                }
            }
        }

        var raster = tmpLayer.rasterize();
        tmpLayer.remove();

        return raster;
    }

    $scope.fontInfo = $fontInfo.data;
    $scope.atlas = $fontInfo.data.atlas;
    $scope.editor = $editor;
    $scope.curZoom = 1.0;

    $scope.$watchGroup ( [
        'atlas.width', 
        'atlas.height', 
    ], function ( val, old ) {
        if ( $scope.atlas.autoSize === false ) {
            $scope.atlas.layout();
        }

        //
        $scope.atlasBGLayer.position = [-$scope.atlas.width*0.5, -$scope.atlas.height*0.5];
        $scope.atlasLayer.position = [-$scope.atlas.width*0.5, -$scope.atlas.height*0.5];
        $scope.atlasHandlerLayer.position = [-$scope.atlas.width*0.5, -$scope.atlas.height*0.5];

        //
        if ( $scope.checkerboard !== undefined ) {
            $scope.checkerboard.remove();
        }
        $scope.checkerboard = createCheckerboard( $scope.atlas.width, $scope.atlas.height );
        $scope.atlasBGLayer.addChild($scope.checkerboard);
        $scope.background.insertAbove($scope.checkerboard);

        //
        var borderWidth = 2;
        var borderRect = new paper.Rectangle(0, 0, $scope.atlas.width, $scope.atlas.height);
        borderRect = borderRect.expand(borderWidth);
        $scope.border.size = borderRect.size;
        $scope.border.position = [(borderRect.size.width-borderWidth)*0.5,(borderRect.size.height-borderWidth)*0.5];

        $scope.$broadcast( 'zoom', 1.0);
        $scope.$broadcast( 'moveTo', 0, 0 );
        $scope.$broadcast( 'repaint', true );
    }); 

    // $scope.$watchGroup ( [
    //     'atlas.customPadding',
    //     'atlas.algorithm',
    //     'atlas.sortBy',
    //     'atlas.sortOrder',
    //     'atlas.allowRotate',
    // ], function ( val, old ) {
    //     $scope.atlas.sort();
    //     $scope.atlas.layout();
    //     $scope.paint();
    //     $scope.project.view.update();
    // }); 

    $scope.$watchGroup ( [
        'editor.elementBgColor.r',
        'editor.elementBgColor.g',
        'editor.elementBgColor.b',
        'editor.elementBgColor.a',
        'editor.elementSelectColor.r',
        'editor.elementSelectColor.g',
        'editor.elementSelectColor.b',
        'editor.elementSelectColor.a',
        'editor.backgroundColor.r',
        'editor.backgroundColor.g',
        'editor.backgroundColor.b',
        'editor.backgroundColor.a',
    ], function ( val, old ) {
        $scope.paint();
        $scope.project.view.update();
    }); 
    $scope.$watch ( 'editor.showCheckerboard',
    function ( val, old ) {
        $scope.checkerboard.visible = val;
        $scope.project.view.update();
    });
    $scope.$watch ( 'editor.smoothCanvas',
    function ( val, old ) {
        $scope.$broadcast( 'smoothCanvas', val );
        $scope.$broadcast( 'repaint', true );
    });

    $scope.$on( 'initScene', function ( event, project, sceneLayer, fgLayer, bgLayer ) { 
        $scope.project = project;
        $scope.sceneLayer = sceneLayer;
        $scope.fgLayer = fgLayer;
        $scope.bgLayer = bgLayer;

        $scope.atlasBGLayer = PaperUtils.createLayer();
        $scope.atlasBGLayer.position = [-$scope.atlas.width*0.5, -$scope.atlas.height*0.5];
        $scope.atlasLayer = PaperUtils.createLayer();
        $scope.atlasLayer.position = [-$scope.atlas.width*0.5, -$scope.atlas.height*0.5];
        $scope.atlasLayer.selectable = true;
        $scope.atlasHandlerLayer = PaperUtils.createLayer();
        $scope.atlasHandlerLayer.position = [-$scope.atlas.width*0.5, -$scope.atlas.height*0.5];

        $scope.sceneLayer.addChildren ([
            $scope.atlasBGLayer,
            $scope.atlasLayer,
            $scope.atlasHandlerLayer,
        ]);

        // init atlas-bg-layer
        $scope.atlasBGLayer.activate();

        // create border rect
        if ( $scope.border === undefined ) {
            var borderWidth = 2;
            var borderRect = new paper.Rectangle(0, 0, $scope.atlas.width, $scope.atlas.height);
            borderRect = borderRect.expand(borderWidth);
            $scope.border = new paper.Shape.Rectangle(borderRect);
            $scope.border.style = {
                fillColor: new paper.Color(204/255, 204/255, 204/255, 1),
                strokeWidth: borderWidth,
                strokeColor: new paper.Color(0.08, 0.08, 0.08, 1),
                shadowColor: [0, 0, 0, 0.5],
                shadowBlur: 7,
                shadowOffset: new paper.Point(2, 2),
            };
        }

        // create checkerboard
        if ( $scope.checkerboard === undefined ) {
            $scope.checkerboard = createCheckerboard( $scope.atlas.width, $scope.atlas.height );
            $scope.atlasBGLayer.addChild($scope.checkerboard);
        }
        if ( $scope.background === undefined ) {
            $scope.background = new paper.Shape.Rectangle(0, 0, $scope.atlas.width, $scope.atlas.height);
            $scope.background.fillColor = new paper.Color( 0,0,0,0 );
            $scope.background.insertAbove($scope.checkerboard);
        }

        //
        $scope.rebuildAtlas(false);
    });

    $scope.$on( 'paint', function ( event ) { 
        $scope.paint();
    } );

    $scope.$on( 'dragenter', function () { 
        $scope.border.strokeColor = 'blue';
        $scope.project.view.update();
    } );

    $scope.$on( 'dragover', function () { 
        event.dataTransfer.dropEffect = 'copy';
        $scope.border.strokeColor = 'blue';
        $scope.project.view.update();
    } );

    $scope.$on( 'dragleave', function () { 
        $scope.border.strokeColor = new paper.Color(0.08, 0.08, 0.08, 1);
        $scope.project.view.update();
    } );

    $scope.$on( 'drop', function () { 
        $scope.border.strokeColor = new paper.Color(0.08, 0.08, 0.08, 1);
        $scope.project.view.update();

        var files = event.dataTransfer.files;
        $scope.import(files);
    } );

    $scope.$on( 'zoomChanged', function ( event, zoom) { 
        $scope.curZoom = zoom;
        $scope.atlasHandlerLayer.scale( 1.0/$scope.atlasHandlerLayer.globalMatrix.scaling.x,
                                        1.0/$scope.atlasHandlerLayer.globalMatrix.scaling.y );
        $scope.paint();
        $scope.project.view.update();
    } );

    $scope.$on( 'select', function ( event, items ) { 
        $scope.atlasHandlerLayer.activate();
        for ( var i = 0; i < items.length; ++i ) {
            var item = items[i];
            item.data.outline.visible = true;
            item.fm_selected = true;
            item.data.bgItem.bringToFront();
            item.bringToFront();
        }
        $scope.paint();
        $scope.project.view.update();
    } );

    $scope.$on( 'unselect', function ( event, items ) { 
        for ( var i = 0; i < items.length; ++i ) {
            var item = items[i];
            item.data.outline.visible = false;
            item.fm_selected = false;
        }
        $scope.paint();
        $scope.project.view.update();
    } );

    $scope.$on( 'moveSelected', function ( event, items, delta ) { 
        for ( var i = 0; i < items.length; ++i ) {
            var item = items[i];
            var tex = item.data.texture;
            tex.x = tex.x + delta.x/$scope.curZoom;
            tex.y = tex.y + delta.y/$scope.curZoom;
        }
        $scope.paint();
        $scope.project.view.update();
    } );

    //
    $scope.import = function ( files ) {
        // var acceptedTypes = {
        //     'image/png': true,
        //     'image/jpeg': true,
        //     'image/jpg': true,
        //     'image/gif': true
        // };
        // var processing = 0;
        // var onload = function (event) {
        //     var img = new Image();
        //     img.classList.add('atlas-item');
        //     img.onload = function () {
        //         var texture = new FIRE.SpriteTexture(img);
        //         texture.name = event.target.filename;

        //         if ($scope.atlas.trim) {
        //             var trimRect = FIRE.getTrimRect(img, $scope.atlas.trimThreshold);
        //             texture.trimX = trimRect.x;
        //             texture.trimY = trimRect.y;
        //             texture.width = trimRect.width;
        //             texture.height = trimRect.height;
        //         }

        //         $scope.atlas.add(texture);
        //         processing -= 1;
                
        //         // checkIfFinished
        //         if ( processing === 0 ) {
        //             $fontInfo.layout();
        //             $scope.$apply();
        //             $scope.rebuildAtlas(false);
        //         }
        //     };
        //     img.src = event.target.result;  // 这里的dataURL是原始数据，但Image填充到画布上后，透明像素的部分会变成黑色。
        // };

        // for (var i = 0; i < files.length; ++i) {
        //     file = files[i];
        //     if ( acceptedTypes[file.type] === true ) {
        //         processing += 1;
        //         var reader = new FileReader();
        //         reader.filename = file.name;
        //         reader.atlas = $scope.atlas;
        //         reader.onload = onload; 
        //         reader.readAsDataURL(file);
        //     }
        // }
    };

    //
    $scope.rebuildAtlas = function (forExport) {
        if (!forExport) {
            $scope.atlasLayer.removeChildren();
            $scope.atlasLayer.activate();
        }

        var i = 0, j = 0, len = 0;
        for (i = 0; i < $scope.atlas.textures.length; ++i) {
            var tex = $scope.atlas.textures[i];
            var raster = PaperUtils.createSpriteRaster(tex);
            raster.selectable = true;
            raster.data.texture = tex;
            raster.position = [tex.x, tex.y];

            if ( !forExport ) {
                raster.data.bgItem = new paper.Shape.Rectangle(paper.Item.NO_INSERT);
                raster.data.bgItem.insertBelow(raster);

                raster.data.outline = new paper.Shape.Rectangle(paper.Item.NO_INSERT);
                raster.data.outline.style = {
                    strokeWidth: 2,
                };
                $scope.atlasHandlerLayer.addChild(raster.data.outline);
                raster.data.outline.visible = false;
            }
        }

        if (!forExport) {
            $scope.paint();
        }
        paper.view.update();
    };

    //
    $scope.paint = function () {
        // update background
        $scope.background.fillColor = PaperUtils.color( $scope.editor.backgroundColor );

        var children = $scope.atlasLayer.children;
        for (var i = 0; i < children.length; ++i) {
            var child = children[i];
            var isRaster = child.data && child.data.texture;
            if (!isRaster) {
                continue;
            }

            // update atlas
            var tex = child.data.texture;
            if (tex.rotated) {
                child.pivot = [-tex.width * 0.5, tex.height * 0.5];
                child.rotation = 90;
            }
            else {
                child.pivot = [-tex.width * 0.5, -tex.height * 0.5];
                child.rotation = 0;
            }
            child.position = [tex.x, tex.y];

            // update rectangle
            var left = tex.x;
            var top = tex.y;
            var w = tex.rotatedWidth;
            var h = tex.rotatedHeight;
            var bgItem = child.data.bgItem;
            bgItem.size = [w, h];
            bgItem.position = new paper.Rectangle(left, top, w, h).center;
            bgItem.fillColor = PaperUtils.color( $scope.editor.elementBgColor );

            // update outline
            var outline = child.data.outline;
            if (outline.visible) {
                var outlineBounds = bgItem.bounds;
                var strokeWidth = 2;
                outlineBounds = outlineBounds.expand(-strokeWidth/$scope.curZoom);
                outline.position = [
                    outlineBounds.center.x*$scope.curZoom, 
                    outlineBounds.center.y*$scope.curZoom
                ];
                outline.size = [
                    outlineBounds.width*$scope.curZoom, 
                    outlineBounds.height*$scope.curZoom
                ];
                outline.strokeColor = PaperUtils.color($scope.editor.elementSelectColor);
                outline.dashArray = [5,3];
            }
        }
    };

    $scope.export = function () {
        var canvas = document.createElement('canvas');
        paper.setup(canvas);
        paper.view.viewSize = [$scope.atlas.width, $scope.atlas.height];
        $scope.rebuildAtlas(true);

        var ctx = canvas.getContext('2d');
        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (var i = 2, pixels = imageData.data, len = pixels.length; i < len; i += 4) {
            //pixels[i] = 255;
            //pixels[i+1] = 1;
        }
        
        return {
            canvas: canvas,
            buffer: pixels,
        };
    };
}])
;
