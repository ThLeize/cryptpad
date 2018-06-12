// Load #1, load as little as possible because we are in a race to get the loading screen up.
define([
    '/bower_components/nthen/index.js',
    '/common/config.js',
    '/common/dom-ready.js',
    '/common/sframe-common-outer.js',
], function (nThen, ApiConfig, DomReady, SFCommonO) {
    // Loaded in load #2
    nThen(function (waitFor) {
        DomReady.onReady(waitFor());
    }).nThen(function (waitFor) {
        var req = {
            cfg: ApiConfig.requireConf,
            req: [ '/common/loading.js' ],
            pfx: window.location.origin
        };
        window.rc = ApiConfig.requireConf;
        window.apiconf = ApiConfig;
        document.getElementById('sbox-iframe').setAttribute('src',
            ApiConfig.httpSafeOrigin + '/drive/inner.html?' + ApiConfig.requireConf.urlArgs +
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
        var getSecrets = function (Cryptpad, Utils, cb) {
            var hash = window.location.hash.slice(1) || Utils.LocalStore.getUserHash() ||
                        Utils.LocalStore.getFSHash();
            // No password for drive
            cb(null, Utils.Hash.getSecrets('drive', hash));
        };
        var addRpc = function (sframeChan, Cryptpad, Utils) {
            sframeChan.on('EV_BURN_ANON_DRIVE', function () {
                if (Utils.LocalStore.isLoggedIn()) { return; }
                Utils.LocalStore.setFSHash('');
                Utils.LocalStore.clearThumbnail();
                window.location.reload();
            });
            sframeChan.on('Q_DRIVE_USEROBJECT', function (data, cb) {
                Cryptpad.userObjectCommand(data, cb);
            });
            sframeChan.on('Q_DRIVE_GETOBJECT', function (data, cb) {
                Cryptpad.getUserObject(function (obj) {
                    cb(obj);
                });
            });
            sframeChan.on('Q_DRIVE_GETDELETED', function (data, cb) {
                Cryptpad.getDeletedPads(function (err, obj) {
                    if (err) { return void console.error(err); }
                    cb(obj);
                });
            });
            Cryptpad.onNetworkDisconnect.reg(function () {
                sframeChan.event('EV_NETWORK_DISCONNECT');
            });
            Cryptpad.onNetworkReconnect.reg(function (data) {
                sframeChan.event('EV_NETWORK_RECONNECT', data);
            });
            Cryptpad.drive.onLog.reg(function (msg) {
                sframeChan.event('EV_DRIVE_LOG', msg);
            });
            Cryptpad.drive.onChange.reg(function (data) {
                sframeChan.event('EV_DRIVE_CHANGE', data);
            });
            Cryptpad.drive.onRemove.reg(function (data) {
                sframeChan.event('EV_DRIVE_REMOVE', data);
            });
        };
        SFCommonO.start({
            getSecrets: getSecrets,
            noHash: true,
            driveEvents: true,
            addRpc: addRpc
        });
    });
});
