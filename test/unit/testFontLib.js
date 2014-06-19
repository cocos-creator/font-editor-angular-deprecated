var Path = require('path');
var FontLib = require('font-lib');

module('font-lib');

test('basic test', function() {
    var font = loadTestFont('test/fonts/catman.ttf');
    ok(font, 'can load font');
    font.setSize(64);
    equal(font.size.y_ppem, 64, 'can access size');
    ok(font.size.height > 0, 'can get lineHeight');
    equal(font.size.ascender, 46, 'can get base 1');
    font.setSize(262);
    equal(font.size.ascender, 188, 'can get base 2');
});
