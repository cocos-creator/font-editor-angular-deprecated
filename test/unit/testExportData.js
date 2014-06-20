module('font-editor');

var used = ['face', 'size', 'bold', 'padding', 'spacing', 'lineHeight', 'base', 'scaleW', 'scaleH', 'file', 'count'];

var fontData = {};

var testFontData = function (fontEditorMocker, fontData, expectedHeader, expectedCharList) {
    FontEditor.__testOnly__.buildBmFontInfo(fontEditorMocker, fontData, 'catman.png');
    for (var i = 0; i < used.length; i++) {
        var field = used[i];
        deepEqual(fontData[field], expectedHeader[field], 'get ' + field);
    }

    FontEditor.__testOnly__.buildBmGlyphData(fontEditorMocker, fontData);
    equal(fontData.charList.length, fontData.count, 'count should match up with char list');

    deepEqual(fontData.charList, expectedCharList, 'get chars');
}

test('build font data', function() {
    var fontEditorMocker = {
        _fontFamily: 'catman',
        _fontSize: 262,
        _fontWeight: 'normal',
        _font: loadTestFont('test/fonts/catman.ttf'),
        atlas: {
            width: 512,
            height: 512,
            customPadding: 1
        },
        _sortedCharList: ['f'],
        _charTable: {
            'f': {
                x: 1718,
                y: 443,
                width: 125,
                height: 189,
                trimX: 6,
                trimY: 0,
            },
        },
    };

    // test f, one char
    var expected = {
        'face': 'catman',
        'size': 262,
        'bold': 0,
        'padding': [0,0,0,0],
        'spacing': [1,1],
        'lineHeight': 251,
        'base': 188,
        'scaleW': 512,
        'scaleH': 512,
        'file': 'catman.png',
        'count': 1,
    }
    var char_f = [102, 1718, 443, 125, 189, 6, 0, 132,/* 0, 0,*/ 'f'];
    fontData = {};
    testFontData(fontEditorMocker, fontData, expected, [char_f]);

    // test space, two chars
    fontEditorMocker._sortedCharList = [' ', 'f'];
    fontEditorMocker._charTable[' '] = {
                                            x: 123,
                                            y: 456,
                                            width: 0,
                                            height: 0,
                                            trimX: 0,
                                            trimY: 189,
                                        };
    expected.count += 1;

    fontData = {};
    var char_space = [32, 123, 456, 0, 0, 0, 189, 65,/* 0, 0,*/ 'space'];
    testFontData(fontEditorMocker, fontData, expected, [char_space, char_f]);
});

test('export text', function () {
    var text = convertIntoText(fontData);
    var expected = 'info face="catman" size=262 bold=0 italic=0 charset="" unicode=1 stretchH=100 smooth=1 aa=1 padding=0,0,0,0 spacing=1,1\n' +
                   'common lineHeight=251 base=188 scaleW=512 scaleH=512 pages=1 packed=0\n' +
                   'page id=0 file="catman.png"\n' +
                   'chars count=2\n' +
                   'char id=32     x=123   y=456   width=0     height=0     xoffset=0     yoffset=189   xadvance=65    page=0 chnl=0 letter="space"\n' +
                   'char id=102    x=1718  y=443   width=125   height=189   xoffset=6     yoffset=0     xadvance=132   page=0 chnl=0 letter="f"\n';
    equal(text, expected, 'test');
});

/* var fontlib = require('font-lib')
var font = fontlib.getFont(process.cwd() + '/test/fonts/catman.ttf');
*/