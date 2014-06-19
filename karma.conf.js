module.exports = function (config) {
    config.set({
        browsers: ['NodeWebkitSilent'],
        customLaunchers: {
            'NodeWebkitSilent': {
                base: 'NodeWebkit',
                options: {
                    window: {
                        'show': false,
                        "toolbar": false,
                    },
                    //main: "index.html",
                }
            }
        },
        frameworks: ['qunit'],
        plugins: ['karma-qunit', 'karma-nodewebkit-launcher'],
        reporters: ['dots'],
        files: [
          '*.js',
        ],
        colors: false,
    });
};