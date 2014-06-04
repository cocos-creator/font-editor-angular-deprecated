var app = angular.module('app-font-editor', []);

angular.element(document).ready(function() {

    // canvasEL events
    var canvasEL = document.getElementById('canvas');
    canvasEL.width = canvasEL.parentNode.clientWidth;
    canvasEL.height = canvasEL.parentNode.clientHeight;
    //
    app.fontEditor = new FontEditor(canvasEL);
    window.addEventListener('resize', function() {
        canvasEL.width = canvasEL.parentNode.clientWidth;
        canvasEL.height = canvasEL.parentNode.clientHeight;
        app.fontEditor.updateWindowSize();
    }, false);

    //
    angular.bootstrap(document, ['app-font-editor']);
});
