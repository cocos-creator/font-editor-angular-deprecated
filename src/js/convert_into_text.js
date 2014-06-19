/*
 * convert bmFont data into text
 */
var convertIntoText = function (data) {
    var text = '';  // += operator is faster than join

    // build header
    var header = [
        { 'info': ['face', 'size', 'bold', 'italic', 'charset', 'unicode', 'stretchH', 'smooth', 'aa', 'padding', 'spacing'/*, 'outline'*/] },
        { 'common': ['lineHeight', 'base', 'scaleW', 'scaleH', 'pages', 'packed'/*, 'alphaChnl', 'redChnl', 'greenChnl', 'blueChnl'*/] },
        { 'page': ['id', 'file'] },
        { 'chars': ['count'] },
    ];
    for (var i = 0; i < header.length; i++) {
        if (i > 0) {
            text += '\n';
        }
        var tagType = Object.keys(header[i])[0];
        var tagList = header[i][tagType];
        text += tagType;
        text += ' ';
        for (var j = 0; j < tagList.length; j++) {
            var tag = tagList[j];
            console.log(tag);
            var val = data[tag];
            if (j > 0) {
                text += ' ';
            }
            text += tag;
            text += '=';
            if (typeof val === 'string') {
                text += '"';
                text += val;
                text += '"';
            }
            else {
                text += val;
            }
        }
    }

    // build chars
    var charList = data.charList;
    for (var j = 0, len = charList.length; j < len; j++) {
        var row = charList[j];
        text += '\nchar id=';
        text += padRight(row[0], 7);
        text += 'x=';
        text += padRight(row[1], 6);
        text += 'y=';
        text += padRight(row[2], 6);
        text += 'width=';
        text += padRight(row[3], 6);
        text += 'height=';
        text += padRight(row[4], 6);
        text += 'xoffset=';
        text += padRight(row[5], 6);
        text += 'yoffset=';
        text += padRight(row[6], 6);
        text += 'xadvance=';
        text += padRight(row[7], 6);
        text += 'page=0 chnl=0 letter="';
        text += row[8];
        text += '"';
    }

    text += '\n';

    // build kernings

    return text;
}

var padRight = (function () {
    var paddings = [
        '',           // 0
        ' ',          // 1
        '  ',         // 2
        '   ',        // 3
        '    ',       // 4
        '     ',      // 5
        '      ',     // 6
        '       ',    // 7
        //'        ',   // 8
        //'         ',  // 9
        //'          ', // 10
    ];
    return function (toPad, paddedWidth) {
        toPad = '' + toPad;
        return toPad + paddings[paddedWidth - toPad.length];
    }
})();