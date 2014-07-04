angular.module('fontEditor')
.directive( 'freeMovePaper', ['$interval',  function ( $interval ) {
    function link ( scope, element, attrs ) {
        // initialize
        var canvasEL = element[0];
        canvasEL.width = canvasEL.parentNode.clientWidth;
        canvasEL.height = canvasEL.parentNode.clientHeight;

        // windows event
        var resizeEventID = window.addEventListener('resize', function() {
            scope.resize( canvasEL.parentNode.clientWidth, canvasEL.parentNode.clientHeight );
        }, false);

        // canvas event
        canvasEL.oncontextmenu = function() { return false; };

        canvasEL.ondragenter = function() {
            scope.$emit('dragenter');
        };

        canvasEL.ondragover = function() {
            scope.$emit('dragover');
        };

        canvasEL.ondragleave = function() {
            scope.$emit('dragleave');
        };

        canvasEL.ondrop = function() {
            scope.$emit('drop');
        };

        // zoom in / out
        // https://developer.mozilla.org/en-US/docs/Web/Reference/Events/wheel
        canvasEL.onwheel = function () {
            var zoom = scope.zoom;
            if( event.deltaY < 0 ) {
                zoom += 0.1;
                zoom = Math.min(zoom, 8);
            }
            else {
                zoom -= 0.1;
                zoom = Math.max(zoom, 0.1);
            }
            scope.setZoom(zoom);
        };

        // init scope 
        scope.zoom = 1.0;
        scope.resize = function ( width, height ) {
            canvasEL.width = width;
            canvasEL.height = height;

            // resize
            scope.project.view.viewSize = [width, height];
            scope.rootLayer.position = [width * 0.5, height * 0.5];
            scope.bgLayer.position = [width * 0.5, height * 0.5];

            scope.repaint();
        };

        scope.repaint = function () {
            scope.project.activate();
            scope.$emit('paint');
            scope.project.view.update();
        };

        var promise = null;
        scope.setZoom = function (zoom) {
            // TODO: smooth zoom
            // var src = scope.zoom;
            // var dest = zoom;
            // var totalSeconds = 0.0;
            // if ( promise !== null ) {
            //     $interval.cancel(promise);
            //     promise = null;
            // }
            // promise = $interval( function () {
            //     totalSeconds += 0.01;
            //     var ratio = totalSeconds/0.2;
            //     var curZoom = src + (dest - src) * ratio;

            //     var center = scope.project.view.center;
            //     var offset = scope.sceneLayer.position.subtract(center);
            //     var newOffset = offset.divide(scope.zoom).multiply(curZoom);
            //     scope.sceneLayer.position = center.add(newOffset).round();
            //     scope.zoom = curZoom;

            //     if ( totalSeconds > 0.2 ) {
            //         $interval.cancel(promise);
            //     }
            // }, 10 );

            if ( scope.zoom != zoom ) {
                scope.zoom = zoom;
                scope.rootLayer.scaling = [zoom, zoom];
                scope.project.view.update();
                scope.$emit('zoomChanged', zoom);
            }
        };

        scope.setSmoothCanvas = function (enabled) {
            canvasEL.getContext('2d').imageSmoothingEnabled = enabled;
        };

        scope.setPos = function ( x, y ) {
            scope.sceneLayer.position = [x, y];
        };

        scope.$on( 'moveTo', function ( event, x, y ) {
            scope.setPos(x,y);
        });

        scope.$on( 'zoom', function ( event, zoom ) {
            scope.setZoom(zoom);
        });

        scope.$on( 'smoothCanvas', function ( event, enabled ) {
            scope.setSmoothCanvas(enabled);
        });

        scope.$on ( 'repaint', function ( event, repaintAll ) {
            if ( repaintAll ) {
                scope.repaint();
            }
            else {
                // repaint only parent
                scope.project.activate();
                scope.$emit('paint');
                scope.project.view.update();
            }
        });

        scope.$on('$destroy', function () {
            window.removeEventListener(resizeEventID);
        });

        var viewSize = new paper.Size(canvasEL.width, canvasEL.height);

        // init 
        paper.setup(canvasEL);
        // NOTE: initialize should be here: canvasEL.getContext('2d').imageSmoothingEnabled = enabled;
        scope.project = paper.project;
        scope.project.view.viewSize = viewSize; // to prevent canvas resizing during paper.setup

        scope.project.activate();

        // rootLayer
        scope.rootLayer = scope.project.activeLayer;
        scope.rootLayer.applyMatrix = false;
        scope.rootLayer.position = [viewSize.width * 0.5, viewSize.height * 0.5];
        scope.rootLayer.pivot = [0,0];

        // bglayer
        scope.bgLayer = PaperUtils.createLayer();
        scope.bgLayer.position = [viewSize.width * 0.5, viewSize.height * 0.5];
        scope.bgLayer.pivot = [0,0];
        scope.project.layers.unshift(scope.bgLayer);

        // fgLayer
        scope.fgLayer = PaperUtils.createLayer();
        scope.fgLayer.position = [0,0];
        scope.fgLayer.pivot = [0,0];
        scope.project.layers.push(scope.fgLayer);

        scope.sceneLayer = PaperUtils.createLayer();
        scope.rootLayer.addChildren ([
            scope.sceneLayer,
        ]);

        // create select rect
        scope.fgLayer.activate();
        scope.selectRect = new paper.Shape.Rectangle(0,0,0,0);
        scope.selectRect.style = {
            fillColor: new paper.Color(0, 0.5, 1.0, 0.5),
            strokeColor: new paper.Color(0, 0.7, 1.0, 1.0),
            strokeWidth: 1,
        };

        scope.$emit( 'initScene', scope.project, scope.sceneLayer, scope.fgLayer, scope.bgLayer );
        scope.repaint();

        scope.draggingCanvas = false;
        scope.draggingItems = false;
        scope.rectSelecting = false;
        scope.rectSelectStartAt = [0,0];
        scope.selection = [];
        scope.selectCandicates = [];

        function isSelected ( item ) {
            return scope.selection.indexOf(item) !== -1; 
        }
        function applyCursor ( event ) {
            if ( event.modifiers.control || event.modifiers.command ) {
                canvasEL.style.cursor = 'auto';
                return;
            }

            if ( event.item && event.item.fm_selected ) {
                canvasEL.style.cursor = 'pointer';
            }
            else {
                canvasEL.style.cursor = 'auto';
            }
        }
        function toggleSelect ( item ) {
            if ( !item )
                return;

            var idx = scope.selection.indexOf(item); 
            if ( idx === -1 ) {
                scope.$emit( 'select', [item] );
                scope.selection.push(item);
            }
            else {
                scope.$emit( 'unselect', [item] );
                scope.selection.splice(idx,1);
            }
        }
        function clearSelect () {
            scope.$emit( 'unselect', scope.selection );
            scope.selection = [];
        }
        function addSelect ( item ) {
            // var idx = scope.selection.indexOf(item); 
            // if ( idx === -1 ) {
                scope.$emit( 'select', [item] );
                scope.selection.push(item);
            // }
        }
        function removeSelect ( item ) {
            // var idx = scope.selection.indexOf(item); 
            // if ( idx !== -1 ) {
                scope.$emit( 'unselect', [item] );
                scope.selection.splice(idx,1);
            // }
        }
        var transformSelectRect = null;
        function doRectSelectRecrusively ( node ) {
            for ( var i = 0; i < node.children.length; ++i ) {
                var item = node.children[i];
                if ( item.selectable ) {
                    if ( item.className === 'Layer' ) {
                        var selectRectTopLeft = item.globalMatrix.inverseTransform(scope.selectRect.bounds.topLeft);
                        var selectRectBottomRight = item.globalMatrix.inverseTransform(scope.selectRect.bounds.bottomRight);
                        transformSelectRect = new paper.Rectangle(selectRectTopLeft,selectRectBottomRight); 
                        doRectSelectRecrusively(item);
                    }
                    else {
                        if ( PaperUtils.rectRectContains( transformSelectRect, item.bounds ) !== 0 ||
                             PaperUtils.rectRectIntersect( transformSelectRect, item.bounds ) )
                        {
                            if ( scope.selectCandicates.indexOf(item) === -1 ) {
                                scope.selectCandicates.push(item);
                            }
                        }
                    }
                }
            }
        }
        function doRectSelect ( node ) {
            var i = -1;
            var item = null;
            for ( i = scope.selectCandicates.length-1; i >= 0; --i ) {
                item = scope.selectCandicates[i];
                if ( scope.selection.indexOf(item) !== -1 ) {
                    scope.selectCandicates.splice(i,1);
                }
            }
            scope.$emit( 'unselect', scope.selectCandicates );
            scope.selectCandicates = [];
            doRectSelectRecrusively (node);
            scope.$emit( 'select', scope.selectCandicates );
        }
        function confirmRectSelect ( node ) {
            var i = -1;
            var item = null;
            for ( i = scope.selectCandicates.length-1; i >= 0; --i ) {
                item = scope.selectCandicates[i];
                if ( scope.selection.indexOf(item) !== -1 ) {
                    scope.selectCandicates.splice(i,1);
                }
            }
            scope.$emit( 'unselect', scope.selectCandicates );
            scope.selectCandicates = [];
            doRectSelectRecrusively (node);
            for ( i = 0; i < scope.selectCandicates.length; ++i ) {
                item = scope.selectCandicates[i];
                if ( scope.selection.indexOf(item) === -1 ) {
                    scope.selection.push(item);
                }
            }
            scope.selectCandicates = [];

            scope.$emit( 'select', scope.selection );
        }

        // Debug:
        // scope.rootLayer.activate();
        // var path = new paper.Path.Line([0,0], [999,0]);
        // path.strokeColor = 'red';
        // path = new paper.Path.Line([0,0], [0,999]);
        // path.strokeColor = 'green';

        // scope.sceneLayer.activate();
        // path = new paper.Path.Line([0,0], [999,0]);
        // path.strokeColor = 'black';
        // path = new paper.Path.Line([0,0], [0,999]);
        // path.strokeColor = 'black';

        // var debugText = new paper.PointText({
        //     point: [10, 20],
        //     content: '',
        //     fillColor: 'white',
        //     fontFamily: 'Courier New',
        //     fontWeight: 'normal',
        //     fontSize: 15
        // });  
        // scope.fgLayer.addChild (debugText);

        //
        var tool = new paper.Tool();
        var hoverItem = null; 

        tool.onKeyDown = function (event) {
            if ( event.key == 'command' || event.key == 'control' ) {
                canvasEL.style.cursor = 'auto';
            }
        };

        tool.onKeyUp = function (event) {
            if ( event.key == 'command' || event.key == 'control' ) {
                if ( hoverItem && hoverItem.fm_selected ) {
                    canvasEL.style.cursor = 'pointer';
                }
                else {
                    canvasEL.style.cursor = 'auto';
                }
            }
        };

        // NOTE: paper's mouse move will guarantee no mouse button press down.  
        tool.onMouseMove = function (event) {
            applyCursor(event);
            hoverItem = event.item;
        };

        tool.onMouseDrag = function (event) {
            // process camera move
            if (scope.draggingCanvas) {
                // drag viewport
                scope.sceneLayer.position = [
                    scope.sceneLayer.position.x + event.delta.x / scope.zoom,
                    scope.sceneLayer.position.y + event.delta.y / scope.zoom,
                ];
                scope.bgLayer.position = [ 
                    scope.bgLayer.position.x + event.delta.x,
                    scope.bgLayer.position.y + event.delta.y,
                ];
            }

            // process rect select
            if ( scope.rectSelecting ) {
                var cursorPos = event.point.add(-0.5,-0.5);
                var rect = new paper.Rectangle(scope.rectSelectStartAt, cursorPos);
                scope.selectRect.position = rect.center;
                scope.selectRect.size = rect.size;

                doRectSelect(scope.sceneLayer);
            }

            // process dragging item
            if ( scope.draggingItems ) {
                scope.$emit('moveSelected', scope.selection, event.delta );
            }
        };

        tool.onMouseDown = function (event) {
            canvasEL.focus();

            if ( scope.draggingCanvas ||
                 scope.rectSelecting ||
                 scope.draggingItems )
            {
                return;
            }

            // process camera move
            var rightButton = event.event.which === 3;
            rightButton = rightButton || (event.event.buttons !== 'undefined' && (event.event.buttons & 2) > 0); // tweak for firefox and IE
            if (rightButton) {
                scope.draggingCanvas = true;
                canvasEL.style.cursor = 'move';
                FIRE.addDragGhost("move");
            }

            // process rect select 
            if ( event.event.which === 1 ) {
                // process single item
                if ( event.item && event.item.selectable ) {
                    if ( event.modifiers.control || event.modifiers.command ) {
                        toggleSelect(event.item);
                    }
                    else {
                        if ( isSelected(event.item) ) {
                            scope.draggingItems = true;
                            canvasEL.style.cursor = 'pointer';
                            FIRE.addDragGhost("pointer");
                        }
                        else {
                            clearSelect();
                            addSelect(event.item);
                        }
                    }
                }
                else {
                    // start rect select
                    if ( !(event.modifiers.control || event.modifiers.command) ) {
                        clearSelect();
                    }
                    scope.rectSelecting = true;
                    scope.rectSelectStartAt = event.point.add(-0.5,-0.5);
                }
            }
        };

        tool.onMouseUp = function (event) {
            if ( scope.draggingCanvas ) {
                scope.draggingCanvas = false;
                applyCursor(event);
                FIRE.removeDragGhost();
            }
            if ( scope.rectSelecting ) {
                confirmRectSelect(scope.sceneLayer);

                scope.rectSelecting = false;
                scope.selectRect.position = [0,0]; 
                scope.selectRect.size = [0,0]; 
            }
            else if ( scope.draggingItems ) {
                scope.draggingItems = false;
                applyCursor(event);
                FIRE.removeDragGhost();
            }
            else {
                applyCursor(event);
            }
        };
    }

    return {
        restrict: 'E',
        replace: true,
        scope: {
        },
        template: '<canvas tabindex="1"></canvas>',
        link: link,
    };
}]);
