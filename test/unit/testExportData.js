module('font-editor');

var used = ['face', 'size', 'bold', 'padding', 'spacing', 'lineHeight', 'base', 'scaleW', 'scaleH', 'file', 'count'];

var fontData = {};

var testFontData = function (fontEditorMocker, fontData, expectedHeader, expectedCharList, file) {
    // test header
    FontEditor.__testOnly__._buildBmFontInfo(fontEditorMocker, fontData, file);
    for (var i = 0; i < used.length; i++) {
        var field = used[i];
        deepEqual(fontData[field], expectedHeader[field], 'test ' + field);
    }

    // test glyph
    FontEditor.__testOnly__._buildBmGlyphData(fontEditorMocker, fontData);
    equal(fontData.charList.length, fontData.count, 'count should match up with char list');
    deepEqual(fontData.charList, expectedCharList, 'test chars');

    // test kerning
    FontEditor.__testOnly__._buildBmKerningData(fontEditorMocker, fontData);
}

test('build "catman" data', function() {
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
    ok(fontEditorMocker._font, 'load font');
    fontEditorMocker._font.setSize(fontEditorMocker._fontSize);

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
    testFontData(fontEditorMocker, fontData, expected, [char_f], expected.file);

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
    testFontData(fontEditorMocker, fontData, expected, [char_space, char_f], expected.file);
});

test('build "Dekar"s kerning data', function() {
    var fontEditorMocker = {
        _fontFamily: 'Dekar Light',
        _fontSize: 123,
        _fontWeight: 'normal',
        _font: loadTestFont('test/fonts/Dekar Light.otf'),
        atlas: {
            width: 512,
            height: 512,
            customPadding: 1
        },
        _sortedCharList: ['J', 'j'],
        _charTable: {
            'J': {
                x: 1718,
                y: 443,
                width: 125,
                height: 189,
                trimX: 6,
                trimY: 0,
            },
            'j': {
                x: 123,
                y: 456,
                width: 0,
                height: 0,
                trimX: 0,
                trimY: 189,
            }
        },
    };
    ok(fontEditorMocker._font, 'load font');
    fontEditorMocker._font.setSize(fontEditorMocker._fontSize);

    // test f, one char
    var expected = {
        'face': 'Dekar Light',
        'size': 123,
        'bold': 0,
        'padding': [0,0,0,0],
        'spacing': [1,1],
        'lineHeight': 123,
        'base': 93,
        'scaleW': 512,
        'scaleH': 512,
        'file': 'Dekar Light.png',
        'count': 2,
    }
    var char_1 = [74, 1718, 443, 125, 189, 6, 0, 49,/* 0, 0,*/ 'J'];
    var char_2 = [106, 123, 456, 0, 0, 0, 189, 19,/* 0, 0,*/ 'j'];
    fontData = {};
    testFontData(fontEditorMocker, fontData, expected, [char_1, char_2], expected.file);
});

test('export text', function () {
    var text = convertIntoText(fontData);
    var expected = [
        'info face="Dekar Light" size=123 bold=0 italic=0 charset="" unicode=1 stretchH=100 smooth=1 aa=1 padding=0,0,0,0 spacing=1,1',
        'common lineHeight=123 base=93 scaleW=512 scaleH=512 pages=1 packed=0',
        'page id=0 file="Dekar Light.png"',
        'chars count=2',
        'char id=74     x=1718  y=443   width=125   height=189   xoffset=6     yoffset=0     xadvance=49    page=0 chnl=0 letter="J"',
        'char id=106    x=123   y=456   width=0     height=0     xoffset=0     yoffset=189   xadvance=19    page=0 chnl=0 letter="j"',
        'kernings count=1',
        'kerning first=106 second=106 amount=4',
        ''].join('\n');
    equal(text, expected, 'test');
});

/* var fontlib = require('font-lib')
var font = fontlib.loadFont(process.cwd() + '/test/fonts/catman.ttf');
*/