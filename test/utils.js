var Path = require('path');
var FontLib = require('font-lib');

var cachedFonts = {};

function loadTestFont(path) {
    var font = cachedFonts[path];
    if (font) {
        return font;
    }
    var fontPath;
    var karma = process.env.NODE_PATH;
    if (karma) {
        fontPath = Path.resolve(process.env.NODE_PATH, '../' + path);
    }
    else {
        fontPath = Path.join(process.cwd(), path);
    }
    font = FontLib.loadFont(fontPath);
    cachedFonts[path] = font;
    return font;
}