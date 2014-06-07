var GetFontList = require('font-lib');

var FontEditor = (function () {
    var _super = WorkSpace;
    
    function FontEditor(canvas) {
        _super.call(this, canvas);

        GetFontList(function(list) {
            _setFontList(this, list);
        }, navigator.language);
    }
    var _class = FontEditor;
    FIRE.extend(_class, _super);

    //_class.prototype.repaint = function () {
    //    _super.prototype.repaint.call(this);
    //};

    //_class.prototype._updateCanvas = function () {
    //    this._paperProject.view.update();
    //};

    // need its paper project activated
    _class.prototype._recreateBackground = function () {
        _super.prototype._recreateBackground.call(this);
        this._border.fillColor = 'white';
    };

    var _setFontList = function (self, list) {
        self.fontList = list;
        console.log(self.fontList);
    };

    return _class;
})();
