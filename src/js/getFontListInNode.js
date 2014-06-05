var getFontList = (function () {

    var Path = require('path');
    var Fs = require('fs');
    var Fontpath = require('fontpath');

    var FONT_DIRS = {
        win32: '/Windows/fonts',
        darwin: '/Library/Fonts',
        linux: '/usr/share/fonts/truetype'
    };
    var fontDir = Path.resolve(FONT_DIRS[process.platform]);

    //var SUPPORT_FORMATS = ['ttf', 'ttc', 'pfa', 'pfb', 'otf', 'cff', 'otc', 'bdf', 'pfr'];
    var SUPPORT_FORMATS = ['ttf', 'ttc'];   // have not try each format, if not support treetype will crash

    var getFontFamily = function (fonts) {

        var retval = [];
        var dir = fontDir + Path.sep;

        var getFontInfo = function (fontInfo) {
            var name = fontInfo.family_name;
            var index = binaryIndexOf.call(retval, name);
            if (index < 0) {
                retval.splice(~index, 0, name);
            }
        };
        var charFilter = function () {
            return [];  // don't need to generate any glyph
        };

        for (var i = 0, len = fonts.length; i < len; i++) {
            var ext = Path.extname(fonts[i]).slice(1).toLowerCase();
            if (SUPPORT_FORMATS.indexOf(ext) === -1) {
                continue;
            }
            var filePath = dir + fonts[i];
            var buffer = Fs.readFileSync(filePath);
            Fontpath(buffer, {
                prettyPrint: false,
                ignoreKerning: true,
                ignorePath: true,
                resolution: 72,
                //size: 12,
                //charcodes: "ascii" / "ascii-extended" / "all"
                charcodes: {
                    filter: charFilter,
                },
                exporter: {
                    export: getFontInfo,
                },
            });
            //var Font = require('font');
            //try {
            //    retval.push(new Font(buffer, fonts[i]));
            //}
            //catch (e) {
            //    console.log(e);
            //}
        }
        return retval;
    }

    return function (callback) {
        Fs.readdir(fontDir, function (err, files) {
            if (!err) {
                var fontFamilys = getFontFamily(files);
                callback(fontFamilys);
            }
            else {
                console.error(err);
            }
        });
    };
})();

/**
 * Modified from http://oli.me.uk/2013/06/08/searching-javascript-arrays-with-a-binary-search/
 * Performs a binary search on the host array. This method can either be
 * injected into Array.prototype or called with a specified scope like this:
 * - binaryIndexOf.call(someArray, searchElement);
 * @param {*} searchElement The item to search for within the sorted array.
 * @return {Number} The zero-based index of item in the array, if item is found; otherwise,
 *                  a negative number that is the bitwise complement of the index of
 *                  the next element that is larger than item or, if there is no larger element,
 *                  the bitwise complement of Count.
 */
function binaryIndexOf(searchElement) {
    'use strict';

    var minIndex = 0;
    var maxIndex = this.length - 1;
    var currentIndex;
    var currentElement;

    while (minIndex <= maxIndex) {
        currentIndex = (minIndex + maxIndex) / 2 | 0;
        currentElement = this[currentIndex];

        if (currentElement < searchElement) {
            minIndex = currentIndex + 1;
        }
        else if (currentElement > searchElement) {
            maxIndex = currentIndex - 1;
        }
        else {
            return currentIndex;
        }
    }

    return ~minIndex;
}