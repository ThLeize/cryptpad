// Load #1, load as little as possible because we are in a race to get the loading screen up.
define([
    '/bower_components/nthen/index.js',
    '/common/config.js',
    'jquery',
    '/common/sframe-common-outer.js',
    '/common/cryptpad-common.js',
    '/common/common-util.js',
    '/common/common-hash.js',
    '/common/common-realtime.js',
    '/common/common-constants.js',
    '/common/common-interface.js',
], function (nThen, ApiConfig, $, SFCommonO,
    Cryptpad, Util, Hash, Realtime, Constants, UI) {

    window.Cryptpad = {
        Common: Cryptpad,
        Util: Util,
        Hash: Hash,
        Realtime: Realtime,
        Constants: Constants,
        UI: UI
    };

    // Loaded in load #2
    nThen(function (waitFor) {
        $(waitFor());
    }).nThen(function (waitFor) {
        var req = {
            cfg: ApiConfig.requireConf,
            req: [ '/common/loading.js' ],
            pfx: window.location.origin
        };
        window.rc = ApiConfig.requireConf;
        window.apiconf = ApiConfig;
        $('#sbox-iframe').attr('src',
            ApiConfig.httpSafeOrigin + '/debug/inner.html?' + ApiConfig.requireConf.urlArgs +
                '#' + encodeURIComponent(JSON.stringify(req)));

        // This is a cheap trick to avoid loading sframe-channel in parallel with the
        // loading screen setup.
        var done = waitFor();
        var onMsg = function (msg) {
            var data = JSON.parse(msg.data);
            if (data.q !== 'READY') { return; }
            window.removeEventListener('message', onMsg);
            var _done = done;
            done = function () { };
            _done();
        };
        window.addEventListener('message', onMsg);
    }).nThen(function (/*waitFor*/) {
        SFCommonO.start();
    });
});
