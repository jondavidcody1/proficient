//    Title: emitter.js
//    Author: Jon Cody
//
//    This program is free software: you can redistribute it and/or modify
//    it under the terms of the GNU General Public License as published by
//    the Free Software Foundation, either version 3 of the License, or
//    (at your option) any later version.
//
//    This program is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU General Public License for more details.
//
//    You should have received a copy of the GNU General Public License
//    along with this program.  If not, see <http://www.gnu.org/licenses/>.



(function (global) {
    'use strict';

    function emitter(object) {
        object = object && typeof object === 'object'
            ? object
            : {};
        object.events = {};
        object.addListener = function (type, listener) {
            var list = object.events[type];

            if (typeof listener === 'function') {
                if (object.events.newListener) {
                    object.emit('newListener', type, typeof listener.listener === 'function'
                        ? listener.listener
                        : listener);
                }
                if (!list) {
                    object.events[type] = [listener];
                } else {
                    object.events[type].push(listener);
                }
            }
            return object;
        };
        object.on = object.addListener;

        object.once = function (type, listener) {
            function g() {
                object.removeListener(type, g);
                listener.apply(object);
            }
            if (typeof listener === 'function') {
                g.listener = listener;
                object.on(type, g);
            }
            return object;
        };

        object.removeListener = function (type, listener) {
            var list = object.events[type],
                position = -1,
                i;

            if (typeof listener === 'function' && list) {
                for (i = list.length - 1; i >= 0; i -= 1) {
                    if (list[i] === listener || (list[i].listener && list[i].listener === listener)) {
                        position = i;
                        break;
                    }
                }
                if (position >= 0) {
                    if (list.length === 1) {
                        delete object.events[type];
                    } else {
                        list.splice(position, 1);
                    }
                    if (object.events.removeListener) {
                        object.emit('removeListener', type, listener);
                    }
                }
            }
            return object;
        };
        object.off = object.removeListener;

        object.removeAllListeners = function (type) {
            var list,
                i;

            if (!object.events.removeListener) {
                if (!type) {
                    object.events = {};
                } else {
                    delete object.events[type];
                }
            } else if (!type) {
                Object.keys(object.events).forEach(function (key) {
                    if (key !== 'removeListener') {
                        object.removeAllListeners(key);
                    }
                });
                object.removeAllListeners('removeListener');
                object.events = {};
            } else {
                list = object.events[type];
                for (i = list.length - 1; i >= 0; i -= 1) {
                    object.removeListener(type, list[i]);
                }
                delete object.events[type];
            }
            return object;
        };

        object.listeners = function (type) {
            var list = [];

            if (type) {
                if (object.events[type]) {
                    list = object.events[type];
                }
            } else {
                Object.keys(object.events).forEach(function (key) {
                    list.push(object.events[key]);
                });
            }
            return list;
        };

        object.emit = function (type) {
            var list = object.events[type],
                bool = false,
                args = [],
                length,
                i;

            if (list) {
                length = arguments.length;
                for (i = 1; i < length; i += 1) {
                    args[i - 1] = arguments[i];
                }
                length = list.length;
                for (i = 0; i < length; i += 1) {
                    list[i].apply(object, args);
                }
                bool = true;
            }
            return bool;
        };

        return object;
    }

    global.emitter = emitter;

}(window || this));



//    Title: proficient.js
//    Author: Jon Cody
//
//    This program is free software: you can redistribute it and/or modify
//    it under the terms of the GNU General Public License as published by
//    the Free Software Foundation, either version 3 of the License, or
//    (at your option) any later version.
//
//    This program is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU General Public License for more details.
//
//    You should have received a copy of the GNU General Public License
//    along with this program.  If not, see <http://www.gnu.org/licenses/>.



(function (global) {
    'use strict';


    var Utils = {},
        Manager = {
            iceCandidates: {}
        };


    function typeOf(variable) {
        var type = typeof variable;

        if (Array.isArray(variable)) {
            type = 'array';
        } else if (type === 'object' && !variable) {
            type = 'null';
        }
        return type;
    }



/*
============================================================
ADAPTER
============================================================
*/
    if (!global.RTCPeerConnection) {
        global.RTCPeerConnection = global.mozRTCPeerConnection || global.webkitRTCPeerConnection;
    }
    if (!global.RTCDataChannel) {
        global.RTCDataChannel = global.mozRTCDataChannel || global.webkitRTCDataChannel;
    }
    if (!global.RTCSessionDescription) {
        global.RTCSessionDescription = global.mozRTCSessionDescription || global.webkitRTCSessionDescription;
    }
    if (!global.RTCIceCandidate) {
        global.RTCIceCandidate = global.mozRTCIceCandidate || global.webkitRTCIceCandidate;
    }
    if (!global.navigator.getUserMedia) {
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    }



/*
============================================================
UTILS
============================================================
*/
    Utils.logging = true;


    Utils.defaultConfig = {
        iceServers: []
    };


    Utils.browser = (function uaMatch() {
        var ua = window.navigator.userAgent.toLowerCase(),
            match = (/(edge)\/([\w.]+)/).exec(ua) ||
                    (/(opr)[\/]([\w.]+)/).exec(ua) ||
                    (/(chrome)[\/]([\w.]+)/).exec(ua) ||
                    (/(version)(applewebkit)[\/]([\w.]+).*(safari)[\/]([\w.]+)/).exec(ua) ||
                    (/(webkit)[\/]([\w.]+).*(version)[\/]([\w.]+).*(safari)[\/]([\w.]+)/).exec(ua) ||
                    (/(webkit)[\/]([\w.]+)/).exec(ua) ||
                    (/(opera)(?:.*version)?[\/]([\w.]+)/).exec(ua) ||
                    (/(msie)\s([\w.]+)/).exec(ua) ||
                    (ua.indexOf("trident") >= 0 && (/(rv)(?::)?([\w.]+)/).exec(ua)) ||
                    (ua.indexOf("compatible") < 0 && (/(mozilla)(?:.*?\srv:([\w.]+))?/).exec(ua)) ||
                    [],
            platform_match = (/(ipad)/).exec(ua) ||
                    (/(ipod)/).exec(ua) ||
                    (/(iphone)/).exec(ua) ||
                    (/(kindle)/).exec(ua) ||
                    (/(silk)/).exec(ua) ||
                    (/(android)/).exec(ua) ||
                    (/(windows\sphone)/).exec(ua) ||
                    (/(win)/).exec(ua) ||
                    (/(mac)/).exec(ua) ||
                    (/(linux)/).exec(ua) ||
                    (/(cros)/).exec(ua) ||
                    (/(playbook)/).exec(ua) ||
                    (/(bb)/).exec(ua) ||
                    (/(blackberry)/).exec(ua) ||
                    [],
            browser = {},
            matched = {
                browser: match[5] || match[3] || match[1] || "",
                version: match[2] || match[4] || "0",
                versionNumber: match[4] || match[2] || "0",
                platform: platform_match[0] || ""
            };

        if (matched.browser) {
            browser[matched.browser] = true;
            browser.version = matched.version;
            browser.versionNumber = parseInt(matched.versionNumber, 10);
        }
        if (matched.platform) {
            browser[matched.platform] = true;
        }
        if (browser.android || browser.bb || browser.blackberry || browser.ipad || browser.iphone ||
                browser.ipod || browser.kindle || browser.playbook || browser.silk || browser["windows phone"]) {
            browser.mobile = true;
        }
        if (browser.cros || browser.mac || browser.linux || browser.win) {
            browser.desktop = true;
        }
        if (browser.chrome || browser.opr || browser.safari) {
            browser.webkit = true;
        }
        if (browser.rv || browser.edge) {
            var ie = "msie";

            matched.browser = ie;
            browser[ie] = true;
        }
        if (browser.safari && browser.blackberry) {
            var blackberry = "blackberry";

            matched.browser = blackberry;
            browser[blackberry] = true;
        }
        if (browser.safari && browser.playbook) {
            var playbook = "playbook";

            matched.browser = playbook;
            browser[playbook] = true;
        }
        if (browser.bb) {
            var bb = "blackberry";

            matched.browser = bb;
            browser[bb] = true;
        }
        if (browser.opr) {
            var opera = "opera";

            matched.browser = opera;
            browser[opera] = true;
        }
        if (browser.safari && browser.android) {
            var android = "android";

            matched.browser = android;
            browser[android] = true;
        }
        if (browser.safari && browser.kindle) {
            var kindle = "kindle";

            matched.browser = kindle;
            browser[kindle] = true;
        }
        if (browser.safari && browser.silk) {
            var silk = "silk";

            matched.browser = silk;
            browser[silk] = true;
        }
        browser.name = matched.browser;
        browser.platform = matched.platform;
        return browser;
    }());


    Utils.supports = (function supports() {
        var data = true,
            media = true,
            binaryBlob = false,
            sctp = false,
            pc,
            dc;

        try {
            pc = new RTCPeerConnection(Utils.defaultConfig, {optional: [{RtpDataChannels: true}]});
        } catch (ignore) {
            data = false;
            media = false;
        }
        if (data) {
            try {
                dc = pc.createDataChannel('_TEST_');
            } catch (ignore) {
                data = false;
            }
        }
        if (data) {
            try {
                dc.binaryType = 'blob';
                binaryBlob = true;
            } catch (ignore) {}
        }
        if (dc) {
            dc.close();
            dc = null;
        }
        if (pc) {
            pc.close();
            pc = null;
        }
        if (data) {
            pc = new RTCPeerConnection(Utils.defaultConfig, {});
            try {
                dc = pc.createDataChannel('_RELIABLE_TEST_', {});
                sctp = dc.reliable;
            } catch (ignore) {}
            if (dc) {
                dc.close();
            }
            pc.close();
        }

        return {
            data: data,
            media: media,
            binaryBlob: binaryBlob,
            sctp: sctp
        };
    }());


    Utils.iceTimeout = 30000;


    Utils.chunksize = Utils.supports.sctp
        ? 16000
        : 1600;


    Utils.sendTimeout = Utils.supports.sctp
        ? 100
        : 400;


    Utils.uuid = function uuid() {
        var id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';

        return id.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c === 'x'
                    ? r
                    : (r & 0x3 | 0x8);

            return v.toString(16);
        });
    };


    Utils.stringifiable = function stringifiable(object) {
        try {
            JSON.stringify(object);
            return true;
        } catch (ignore) {
            return false;
        }
    };


    Utils.parsable = function parsable(string) {
        try {
            JSON.parse(string);
            return true;
        } catch (ignore) {
            return false;
        }
    };


    Utils.stringify = function stringify(object) {
        var result = object;

        try {
            result = JSON.stringify(object);
            if (result === "{}") {
                result = object;
            }
        } catch (ignore) {
            result = object;
        }
        return result;
    };


    Utils.parse = function parse(string) {
        var result = string;

        try {
            result = JSON.parse(string);
        } catch (ignore) {
            result = string;
        }
        return result;
    };


    Utils.downloadDataURL = function downloadDataURL(uri, filename) {
        var link;

        if (!uri) {
            return;
        }
        link = document.createElement('a');
        link.download = filename || 'file';
        link.href = uri;
        link.target = '_blank';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    Utils.getCodesFromString = function getCodesFromString(string) {
        var len = string.length,
            codes = [],
            x;

        for (x = 0; x < len; x += 1) {
            codes[x] = string.charCodeAt(x) & 0xff;
        }
        return codes;
    };


    Utils.getStringFromCodes = function getStringFromCodes(codes) {
        var string = '',
            x;

        for (x = 0; x < codes.length; x += 1) {
            string += String.fromCharCode(codes[x]);
        }
        return string;
    };



/*
============================================================
MANAGER
============================================================
*/
    Manager.parseSDP = function (sdp) {
        var lineRegex = /^([\w]{1})=([.])*/,
            sdpString,
            sdpLines;

        if (typeOf(sdp) === 'object' && sdp.sdp) {
            sdpString = sdp.sdp;
            sdpLines = sdpString.split(/\n/).filter(function (line) {
                return lineRegex.test(line);
            });
        }
        return sdpLines;
    };


    Manager.storeCandidate = function (connection, candidate) {
        var id;

        if (Utils.logging) {
            console.log('storing ICE candidate: ' + connection.id);
        }
        if (!connection || !candidate) {
            return;
        }
        id = connection.id;
        if (!Manager.iceCandidates.hasOwnProperty(id)) {
            Manager.iceCandidates[id] = [];
        }
        Manager.iceCandidates[id].push(candidate);
    };


    Manager.releaseCandidates = function (connection) {
        var id,
            candidate;

        if (!connection || !Manager.iceCandidates.hasOwnProperty(connection.id)) {
            return;
        }
        id = connection.id;
        while (Manager.iceCandidates[id].length > 0) {
            candidate = Manager.iceCandidates[id].shift();
            if (candidate) {
                if (Utils.logging) {
                    console.log('releasing ICE candidate: ' + connection.id);
                }
                Manager.handleCandidate(connection, candidate);
            }
        }
        delete Manager.iceCandidates[id];
    };


    Manager.makeOffer = function (connection) {
        function offerSuccess(offer) {
            function localDescriptionSuccess() {
                if (Utils.logging) {
                    console.log('set local description, sending offer: ' + connection.id);
                    console.log(Manager.parseSDP(offer));
                }
                connection.setLocalDescription = true;
                connection.provider.socket.send('offer', {
                    type: connection.type,
                    id: connection.id,
                    label: connection.label,
                    metadata: connection.metadata,
                    reliable: connection.reliable,
                    session: connection.session,
                    sdp: offer
                }, connection.peer);
                Manager.releaseCandidates(connection);
            }
            function localDescriptionError(err) {
                connection.emit('error', err);
            }
            if (Utils.logging) {
                console.log('created offer: ' + connection.id);
            }
            connection.pc.setLocalDescription(offer, localDescriptionSuccess, localDescriptionError);
        }
        function offerError(err) {
            connection.emit('error', err);
        }

        if (!connection || !connection.pc) {
            return;
        }
        if (Utils.logging) {
            console.log('creating offer: ' + connection.id);
        }
        connection.pc.createOffer(offerSuccess, offerError, connection.constraints);
    };


    Manager.makeAnswer = function (connection) {
        function answerSuccess(answer) {
            function localDescriptionSuccess() {
                if (Utils.logging) {
                    console.log('set local description, sending answer: ' + connection.id);
                    console.log(Manager.parseSDP(answer));
                }
                connection.setLocalDescription = true;
                connection.provider.socket.send('answer', {
                    type: connection.type,
                    id: connection.id,
                    sdp: answer
                }, connection.peer);
                if (connection.type === 'media') {
                    connection.openConnection();
                }
                Manager.releaseCandidates(connection);
            }
            function localDescriptionError(err) {
                connection.emit('error', err);
            }
            if (Utils.logging) {
                console.log('created answer: ' + connection.id);
            }
            connection.pc.setLocalDescription(answer, localDescriptionSuccess, localDescriptionError);
        }
        function answerError(err) {
            connection.emit('error', err);
        }

        if (!connection || !connection.pc) {
            return;
        }
        if (Utils.logging) {
            console.log('creating answer: ' + connection.id);
        }
        connection.pc.createAnswer(answerSuccess, answerError, connection.constraints);
    };


    Manager.handleSDP = function (type, connection, sdp) {
        function remoteDescriptionSuccess() {
            if (Utils.logging) {
                console.log('set remote description: ' + connection.id);
                console.log(Manager.parseSDP(sdp));
            }
            connection.setRemoteDescription = true;
            if (type === 'offer') {
                Manager.makeAnswer(connection);
            } else if (connection.type === 'media') {
                connection.openConnection();
            }
        }
        function remoteDescriptionError(err) {
            connection.emit('error', err);
        }

        if (!connection || !connection.pc || !sdp) {
            return;
        }
        if (Utils.logging) {
            console.log('setting remote description: ' + connection.id);
            console.log(Manager.parseSDP(sdp));
        }
        sdp = new RTCSessionDescription(sdp);
        connection.pc.setRemoteDescription(sdp, remoteDescriptionSuccess, remoteDescriptionError);
    };


    Manager.handleCandidate = function (connection, ice) {
        var candidate,
            sdpMLineIndex;

        if (!connection || typeOf(ice) !== 'object' || !ice.candidate) {
            return;
        }
        candidate = ice.candidate;
        sdpMLineIndex = ice.sdpMLineIndex;
        if (Utils.logging) {
            console.log('adding ICE candidate: ' + connection.id);
        }
        connection.pc.addIceCandidate(new RTCIceCandidate({
            sdpMLineIndex: sdpMLineIndex,
            candidate: candidate
        }));
    };


    Manager.setupListeners = function (connection, pc) {
        if (!connection || !pc) {
            return;
        }
        pc.onicecandidate = function (evt) {
            if (!evt.candidate) {
                return;
            }
            if (Utils.logging) {
                console.log('sending ice candidate: ' + connection.id);
            }
            connection.provider.socket.send('candidate', {
                type: connection.type,
                id: connection.id,
                candidate: evt.candidate
            }, connection.peer);
        };
        pc.oniceconnectionstatechange = function () {
            var state = pc.iceConnectionState,
                iceTimeout = null;

            if (Utils.logging) {
                console.log('ice connection state ' + state + ': ' + connection.id);
            }
            if (iceTimeout) {
                global.clearTimeout(iceTimeout);
                iceTimeout = null;
            }
            switch (state) {
            case 'disconnected':
            case 'failed':
                iceTimeout = global.setTimeout(connection.close.bind(connection), Utils.iceTimeout);
                break;
            case 'checking':
                break;
            case 'completed':
                pc.onicecandidate = null;
                break;
            default:
                break;
            }
        };
        pc.ondatachannel = function (evt) {
            if (!evt.channel) {
                return;
            }
            if (Utils.logging) {
                console.log('adding data channel: ' + connection.id);
            }
            connection.initialize(evt.channel);
        };
        pc.onaddstream = function (evt) {
            if (!evt.stream) {
                return;
            }
            if (Utils.logging) {
                console.log('adding remote stream: ' + connection.id);
            }
            connection.addRemoteStream(evt.stream);
        };
    };


    Manager.createPeerConnection = function (connection) {
        var pc,
            type,
            pcOptions = {
                optional: [],
                mandatory: {}
            };

        if (!connection) {
            return;
        }
        type = connection.type;
        if (type === 'data' && !Utils.supports.sctp) {
            pcOptions.optional[0] = {RtpDataChannels: true};
        } else if (type === 'media') {
            pcOptions.optional[0] = {DtlsSrtpKeyAgreement: true};
        }
        pc = new RTCPeerConnection(connection.provider.config, pcOptions);
        if (pc) {
            Manager.setupListeners(connection, pc);
        }
        return pc;
    };


    Manager.startPeerConnection = function (connection) {
        var pc,
            type,
            dataChannel,
            options;

        if (!connection) {
            return;
        }
        type = connection.type;
        options = connection.options;
        pc = Manager.createPeerConnection(connection);
        if (!pc) {
            return;
        }
        connection.pc = pc;
        if (options.originator) {
            if (type === 'data') {
                dataChannel = pc.createDataChannel(connection.label, {reliable: connection.reliable});
                if (dataChannel) {
                    connection.initialize(dataChannel);
                }
                connection.start = Manager.makeOffer.bind(Manager, connection);
            } else if (type === 'media') {
                connection.start = function start() {
                    var stream;

                    if (connection.session === 'both') {
                        connection.constraints.mandatory.OfferToReceiveAudio = true;
                        connection.constraints.mandatory.OfferToReceiveVideo = true;
                        stream = connection.provider.video;
                    } else if (connection.session === 'audio') {
                        connection.constraints.mandatory.OfferToReceiveAudio = true;
                        connection.constraints.mandatory.OfferToReceiveVideo = false;
                        stream = connection.provider.audio;
                    } else if (connection.session === 'video') {
                        connection.constraints.mandatory.OfferToReceiveAudio = false;
                        connection.constraints.mandatory.OfferToReceiveVideo = true;
                        stream = connection.provider.video;
                    }
                    connection.addLocalStream(stream);
                    Manager.makeOffer(connection);
                };
            }
        } else if (options.sdp) {
            if (type === 'data') {
                connection.answer = Manager.handleSDP.bind(Manager, 'offer', connection, options.sdp);
            } else if (type === 'media') {
                connection.answer = function answer() {
                    var stream;

                    if (connection.session === 'both') {
                        connection.constraints.mandatory.OfferToReceiveAudio = true;
                        connection.constraints.mandatory.OfferToReceiveVideo = true;
                        stream = connection.provider.video;
                    } else if (connection.session === 'audio') {
                        connection.constraints.mandatory.OfferToReceiveAudio = true;
                        connection.constraints.mandatory.OfferToReceiveVideo = false;
                        stream = connection.provider.audio;
                    } else if (connection.session === 'video') {
                        connection.constraints.mandatory.OfferToReceiveAudio = false;
                        connection.constraints.mandatory.OfferToReceiveVideo = true;
                        stream = connection.provider.video;
                    }
                    connection.addLocalStream(stream);
                    Manager.handleSDP('offer', connection, options.sdp);
                };
            }
        }
    };



/*
============================================================
MEDIACONNECTION
============================================================
*/
    function MediaConnection(provider, peer, options) {
        if (!provider || !peer || typeof peer !== 'string') {
            return;
        }
        emitter(this);
        if (typeOf(options) !== 'object') {
            options = {};
        }
        this.id = options.id || 'mc_' + Utils.uuid();
        this.constraints = options.constraints || {
            optional: [],
            mandatory: {}
        };
        this.metadata = options.metadata || '';
        this.open = false;
        this.options = options;
        this.peer = peer;
        this.provider = provider;
        this.remoteStream = null;
        this.session = options.session || 'both';
        this.setRemoteDescription = false;
        this.setLocalDescription = false;
        this.type = 'media';
        this.on('error', function (err) {
            console.log(err);
        });
        Manager.startPeerConnection(this);
    }


    MediaConnection.prototype.openConnection = function () {
        this.open = true;
        this.emit('open');
    };


    MediaConnection.prototype.addLocalStream = function (stream) {
        if (!this.pc || !stream) {
            return;
        }
        this.pc.addStream(stream);
    };


    MediaConnection.prototype.addRemoteStream = function (stream) {
        if (!this.pc || !stream) {
            return;
        }
        this.remoteStream = stream;
        this.emit('stream', stream);
    };


    MediaConnection.prototype.toggleRemoteMedia = function (type) {
        var tracks,
            stream = this.remoteStream;

        if (!stream) {
            return;
        }
        if (type === 'audio') {
            tracks = stream.getAudioTracks();
        } else if (type === 'video') {
            tracks = stream.getVideoTracks();
        } else if (type === 'both') {
            tracks = stream.getAudioTracks();
            tracks.concat(stream.getVideoTracks());
        }
        tracks.forEach(function (track) {
            if (track) {
                track.enabled = !track.enabled;
            }
        });
    };


    MediaConnection.prototype.toggleLocalMedia = function (type) {
        var tracks,
            stream = type === 'audio'
                ? this.provider.audio
                : this.provider.video;

        if (!stream) {
            return;
        }
        if (type === 'audio') {
            tracks = stream.getAudioTracks();
        } else if (type === 'video') {
            tracks = stream.getVideoTracks();
        } else if (type === 'both') {
            tracks = stream.getAudioTracks();
            tracks.concat(stream.getVideoTracks());
        }
        tracks.forEach(function (track) {
            if (track) {
                track.enabled = !track.enabled;
            }
        });
    };


    MediaConnection.prototype.getStats = function (callback) {
        if (Utils.browser.name === 'mozilla') {
            this.pc.getStats(null, function (report) {
                callback(report);
            }, callback);
        } else if (Utils.browser.name === 'chrome') {
            this.pc.getStats(function (report) {
                var items = [];

                report.result().forEach(function (result) {
                    var item = {};

                    result.names().forEach(function (name) {
                        item[name] = result.stat(name);
                    });
                    item.id = result.id;
                    item.type = result.type;
                    item.timestamp = result.timestamp;
                    items.push(item);
                });
                callback(items);
            }, callback);
        }
    };


    MediaConnection.prototype.close = function () {
        var pc = this.pc;

        if (!this.open) {
            return;
        }
        if (pc && (pc.readyState !== 'closed' || pc.signalingState !== 'closed')) {
            pc.close();
            this.pc = null;
        }
        this.open = false;
        this.emit('close');
        this.provider.removeConnection(this);
        this.provider.socket.send('end', {id: this.id}, this.peer);
    };



/*
============================================================
DATACONNECTION
============================================================
*/
    function DataConnection(provider, peer, options) {
        if (!provider || !peer || typeof peer !== 'string') {
            return;
        }
        emitter(this);
        if (typeOf(options) !== 'object') {
            options = {};
        }
        this.id = options.id || 'dc_' + Utils.uuid();
        this.constraints = options.constraints || {
            optional: [],
            mandatory: {
                OfferToReceiveVideo: false,
                OfferToReceiveAudio: false
            }
        };
        this.label = options.label || this.id;
        this.metadata = options.metadata || '';
        this.open = false;
        this.options = options;
        this.peer = peer;
        this.provider = provider;
        this.buffer = {};
        this.queue = [];
        this.incomingBlacklist = [];
        this.outgoingBlacklist = [];
        this.reliable = options.reliable || Utils.supports.sctp;
        this.sending = null;
        this.setRemoteDescription = false;
        this.setLocalDescription = false;
        this.lastPacketSent = null;
        this.lastPacketReceived = null;
        this.type = 'data';
        this.on('error', function (err) {
            console.log(err);
        });
        Manager.startPeerConnection(this);
    }


    DataConnection.prototype.initialize = function (dataChannel) {
        if (!dataChannel) {
            return;
        }
        this.dataChannel = dataChannel;
        if (Utils.supports.sctp) {
            this.dataChannel.binaryType = 'arraybuffer';
        }
        this.dataChannel.onopen = this.openConnection.bind(this);
        this.dataChannel.onmessage = this.parseData.bind(this);
        this.dataChannel.onclose = this.close.bind(this);
        this.dataChannel.onerror = this.emit.bind(this, 'error');
    };


    DataConnection.prototype.openConnection = function () {
        this.open = true;
        this.emit('open');
    };


    DataConnection.prototype.cancelReceive = function (id, remote) {
        if (!id || typeof id !== 'number') {
            id = this.lastPacketReceived && this.lastPacketReceived.id;
        }
        if (!id) {
            return;
        }
        if (this.incomingBlacklist.indexOf(id) === -1) {
            this.incomingBlacklist.push(id);
            this.emit('cancel-receive', id);
        }
        if (this.buffer.hasOwnProperty(id)) {
            delete this.buffer[id];
        }
        if (!remote) {
            this.dataChannel.send(JSON.stringify({type: 'cancel-receive', id: id}));
        }
    };


    DataConnection.prototype.receiveData = function (data) {
        var chunks,
            type = data.type,
            id = data.id,
            count = data.count,
            total = data.total,
            metadata = data.metadata,
            payload = data.payload,
            combined;

        if (!type || !id || !count || !total || this.incomingBlacklist.indexOf(id) !== -1) {
            return;
        }
        if (!this.buffer.hasOwnProperty(id)) {
            this.buffer[id] = [];
        }
        chunks = this.buffer[id];
        chunks.push(payload);
        this.lastPacketReceived = data;
        this.emit('chunk-received', {
            type: type,
            id: id,
            total: total,
            count: count,
            metadata: metadata
        });
        if (chunks.length !== total) {
            return;
        }
        if (type === 1) {
            combined = chunks.join('');
        } else {
            combined = new Uint8Array((total - 1) * Utils.chunksize + payload.length);
            chunks.forEach(function (chunk, index) {
                combined.set(chunk, index * Utils.chunksize);
            });
        }
        if (typeOf(metadata) === 'object' && metadata.name && metadata.type) {
            if (type === 1) {
                Utils.downloadDataURL(combined, metadata.name);
            } else {
                Utils.downloadDataURL(global.URL.createObjectURL(new Blob([combined.buffer], {type: metadata.type})), metadata.name);
            }
        } else {
            this.emit('data', {
                type: type,
                id: id,
                payload: combined,
                metadata: metadata
            });
        }
        delete this.buffer[id];
    };


    DataConnection.prototype.parseData = function (e) {
        var that = this,
            data = e.data || e,
            filereader,
            packet,
            view;

        if (data instanceof Blob) {
            filereader = new FileReader();
            filereader.onloadend = function () {
                if (this.readyState !== 2 || !this.result) {
                    return;
                }
                that.parseData(this.result);
            };
            filereader.readAsArrayBuffer(data);
        } else if (data instanceof ArrayBuffer) {
            view = new DataView(data);
            packet = {
                type: view.getUint8(0),
                id: view.getUint32(1),
                count: view.getUint32(5),
                total: view.getUint32(9)
            };
            packet.metadata = Utils.parse(Utils.getStringFromCodes(new Uint8Array(data, 17, view.getUint32(13))));
            packet.payload = packet.type === 1
                ? Utils.getStringFromCodes(new Uint8Array(data, 17 + view.getUint32(13)))
                : new Uint8Array(data, 17 + view.getUint32(13));
        } else if (Utils.parsable(data)) {
            packet = Utils.parse(data);
            if (packet.type === 'cancel-send') {
                this.cancelReceive(packet.id, true);
                return;
            }
            if (packet.type === 'cancel-receive') {
                this.cancelSend(packet.id, true);
                return;
            }
            packet.metadata = Utils.parse(packet.metadata);
        }
        if (packet) {
            this.receiveData(packet);
        }
    };


    DataConnection.prototype.sendChunks = function () {
        var chunk,
            info = {},
            data;

        chunk = this.queue.shift();
        if (!chunk) {
            global.clearTimeout(this.sending);
            this.sending = null;
            return;
        }
        if (chunk instanceof DataView) {
            info.type = chunk.getUint8(0);
            info.id = chunk.getUint32(1);
            info.count = chunk.getUint32(5);
            info.total = chunk.getUint32(9);
            info.metadata = Utils.parse(Utils.getStringFromCodes(new Uint8Array(chunk.buffer, 17, chunk.getUint32(13))));
            data = chunk.buffer;
        } else if (typeOf(chunk) === 'object') {
            info.type = chunk.type;
            info.id = chunk.id;
            info.count = chunk.count;
            info.total = chunk.total;
            info.metadata = Utils.parse(chunk.metadata);
            data = Utils.stringify(chunk);
        }
        if (this.outgoingBlacklist.indexOf(info.id) !== -1) {
            return;
        }
        this.dataChannel.send(data);
        this.lastPacketSent = info;
        this.emit('chunk-sent', info);
        this.sending = global.setTimeout(this.sendChunks.bind(this), Utils.sendTimeout);
    };


    DataConnection.prototype.send = (function () {
        var gid = (function () {
            var i = 0;

            return function () {
                i += 1;
                if (i > 4294967295) {
                    this.incomingBlacklist = [];
                    this.outgoingBlacklist = [];
                    i = 1;
                }
                return i;
            };
        }());

        function sendBlob(that, data, metadata) {
            var type = 2,
                chunksize = Utils.chunksize,
                size = data.size,
                total = Math.ceil(size / chunksize),
                start = 0,
                end = start + chunksize < size
                    ? start + chunksize
                    : size,
                count = 1,
                id = gid(),
                chunk;

            function process() {
                var filereader = new FileReader();

                filereader.onloadend = function (e) {
                    var result = e.target.result;

                    if (this.readyState !== 2 || !result) {
                        return;
                    }
                    if (Utils.supports.sctp) {
                        chunk = new DataView(new ArrayBuffer(17 + metadata.length + end - start));
                        chunk.setUint8(0, type);
                        chunk.setUint32(1, id);
                        chunk.setUint32(5, count);
                        chunk.setUint32(9, total);
                        chunk.setUint32(13, metadata.length);
                        (new Uint8Array(chunk.buffer)).set(Utils.getCodesFromString(metadata), 17);
                        (new Uint8Array(chunk.buffer)).set(new Uint8Array(result), 17 + metadata.length);
                    } else {
                        chunk = {
                            type: type,
                            id: id,
                            count: count,
                            total: total,
                            metadata: metadata,
                            payload: result
                        };
                    }
                    if (that.outgoingBlacklist.indexOf(id) !== -1) {
                        return;
                    }
                    that.queue.push(chunk);
                    start = end;
                    count += 1;
                    if (end < size) {
                        end = start + chunksize < size
                            ? start + chunksize
                            : size;
                        process();
                    }
                    if (!that.sending) {
                        that.sendChunks();
                    }
                };
                filereader.readAsArrayBuffer(data.slice(start, end));
            }

            metadata = Utils.stringify(metadata);
            if (typeof metadata !== 'string') {
                metadata = '';
            }
            process();
        }

        function sendTextOrBuffer(that, data, metadata) {
            var type = typeof data === 'string'
                    ? 1
                    : 2,
                chunksize = Utils.chunksize,
                size = type === 1
                    ? data.length
                    : data.byteLength,
                total = Math.ceil(size / chunksize),
                start = 0,
                end = start + chunksize < size
                    ? start + chunksize
                    : size,
                count = 1,
                id = gid(),
                result,
                chunk;

            function process() {
                if (Utils.supports.sctp) {
                    chunk = new DataView(new ArrayBuffer(17 + metadata.length + end - start));
                    chunk.setUint8(0, type);
                    chunk.setUint32(1, id);
                    chunk.setUint32(5, count);
                    chunk.setUint32(9, total);
                    chunk.setUint32(13, metadata.length);
                    (new Uint8Array(chunk.buffer)).set(Utils.getCodesFromString(metadata), 17);
                    if (type === 1) {
                        (new Uint8Array(chunk.buffer)).set(Utils.getCodesFromString(data.slice(start, end)), 17 + metadata.length);
                    } else {
                        (new Uint8Array(chunk.buffer)).set(data.slice(start, end), 17 + metadata.length);
                    }
                } else {
                    chunk = {
                        type: type,
                        id: id,
                        count: count,
                        total: total,
                        metadata: metadata,
                        payload: data.slice(start, end)
                    };
                }
                if (that.outgoingBlacklist.indexOf(id) !== -1) {
                    return;
                }
                that.queue.push(chunk);
                start = end;
                count += 1;
                if (end < size) {
                    end = start + chunksize < size
                        ? start + chunksize
                        : size;
                    process();
                }
                if (!that.sending) {
                    that.sendChunks();
                }
            }

            metadata = Utils.stringify(metadata);
            if (typeof metadata !== 'string') {
                metadata = '';
            }
            process();
        }

        return function send(data, metadata) {
            if (!this.open || !this.dataChannel) {
                return;
            }
            if (data instanceof File) {
                metadata = {
                    data: metadata,
                    name: data.name,
                    type: data.type
                };
            }
            if (data instanceof Blob) {
                sendBlob(this, data, metadata);
            } else if (data instanceof ArrayBuffer || typeof data === 'string') {
                sendTextOrBuffer(this, data, metadata);
            } else if (typeof data !== 'string' && Utils.stringifiable(data)) {
                sendTextOrBuffer(this, Utils.stringify(data), metadata);
            }
        };
    }());


    DataConnection.prototype.cancelSend = function (id, remote) {
        if (!id || typeof id !== 'number') {
            id = this.lastPacketSent && this.lastPacketSent.id;
        }
        if (!id) {
            return;
        }
        if (this.sending) {
            global.clearTimeout(this.sending);
            this.sending = null;
        }
        if (this.outgoingBlacklist.indexOf(id) === -1) {
            this.outgoingBlacklist.push(id);
            this.emit('cancel-send', id);
        }
        this.queue = [];
        if (!remote) {
            this.dataChannel.send(JSON.stringify({type: 'cancel-send', id: id}));
        }
    };


    DataConnection.prototype.getStats = function (callback) {
        if (Utils.browser.name === 'mozilla') {
            this.pc.getStats(null, function (report) {
                callback(report);
            }, callback);
        } else if (Utils.browser.name === 'chrome') {
            this.pc.getStats(function (report) {
                var items = [];

                report.result().forEach(function (result) {
                    var item = {};

                    result.names().forEach(function (name) {
                        item[name] = result.stat(name);
                    });
                    item.id = result.id;
                    item.type = result.type;
                    item.timestamp = result.timestamp;
                    items.push(item);
                });
                callback(items);
            }, callback);
        }
    };


    DataConnection.prototype.close = function () {
        var pc = this.pc;

        if (!this.open) {
            return;
        }
        if (this.dataChannel) {
            this.dataChannel.close();
        }
        if (pc && (pc.readyState !== 'closed' || pc.signalingState !== 'closed')) {
            pc.close();
            this.pc = null;
        }
        this.open = false;
        this.emit('close');
        this.provider.removeConnection(this);
        this.provider.socket.send('end', {id: this.id}, this.peer);
    };



/*
============================================================
PEER
============================================================
*/
    function Peer(user, room, options) {
        if (!user || typeof user !== 'string' || !room || typeof room !== 'string') {
            return;
        }
        emitter(this);
        if (typeOf(options) !== 'object') {
            options = {};
        }
        this.browser = Utils.browser;
        this.config = options.config || Utils.defaultConfig;
        this.connections = {};
        this.options = options;
        this.user = user;
        this.audio = null;
        this.video = null;
        this.socket = rtgo.socket.join(room);
        this.socket.on('open', this.openConnection.bind(this), false);
        this.socket.on('error', this.error.bind(this), false);
        this.socket.on('close', this.close.bind(this), false);
        this.socket.on('offer', this.gotOffer.bind(this), false);
        this.socket.on('answer', this.gotAnswer.bind(this), false);
        this.socket.on('candidate', this.gotCandidate.bind(this), false);
        this.socket.on('end', this.end.bind(this), false);
        this.socket.on('joined', this.emit.bind(this, 'joined'));
        this.socket.on('left', this.emit.bind(this, 'left'));
        if (this.socket.open) {
            this.openConnection();
        }
    }


    Peer.prototype.openConnection = function () {
        this.open = true;
        this.emit('open');
    };


    Peer.prototype.getMedia = function (type) {
        var that = this,
            constraints = {
                audio: false,
                video: false
            };

        function success(stream) {
            if (type === 'video') {
                that.video = stream;
            } else if (type === 'audio') {
                that.audio = stream;
            } else if (type === 'both') {
                that.video = stream;
                that.audio = stream;
            }
            that.emit('media-success', type, stream);
        }

        function failure(err) {
            switch (err) {
            case 'PERMISSION_DENIED':
                console.log('The user denied permission to use a media device required for the operation.');
                break;
            case 'NOT_SUPPORTED_ERROR':
                console.log('A constraint specified is not supported by the browser.');
                break;
            case 'MANDATORY_UNSATISFIED_ERROR':
                console.log('No media tracks of the type specified in the constraints are found.');
                break;
            default:
                break;
            }
            that.emit('media-failure', type, err);
        }

        if (type === 'audio' || type === 'video') {
            constraints[type] = true;
        } else if (type === 'both') {
            constraints.audio = true;
            constraints.video = true;
        }
        navigator.getUserMedia(constraints, success, failure);
    };


    Peer.prototype.chat = function (peer, options) {
        var connection;

        if (!this.open || typeof peer !== 'string' || this.socket.members.indexOf(peer) === -1) {
            return;
        }
        options = typeOf(options) === 'object'
            ? options
            : {};
        options.originator = true;
        connection = new DataConnection(this, peer, options);
        this.addConnection(connection);
        return connection;
    };


    Peer.prototype.call = function (peer, options) {
        var connection;

        if (!this.open || typeof peer !== 'string' || this.socket.members.indexOf(peer) === -1) {
            return;
        }
        options = typeOf(options) === 'object'
            ? options
            : {};
        options.originator = true;
        connection = new MediaConnection(this, peer, options);
        this.addConnection(connection);
        return connection;
    };


    Peer.prototype.getConnection = function (peer, id) {
        if (typeof peer !== 'string' || typeof id !== 'string' || !this.connections.hasOwnProperty(peer)) {
            return;
        }
        return this.connections[peer][id];
    };


    Peer.prototype.addConnection = function (connection) {
        var peer,
            id;

        if (!connection) {
            return;
        }
        peer = connection.peer;
        id = connection.id;
        if (!this.connections.hasOwnProperty(peer)) {
            this.connections[peer] = {};
        }
        this.connections[peer][id] = connection;
    };


    Peer.prototype.removeConnection = function (connection) {
        var id,
            peer;

        if (!connection) {
            return;
        }
        peer = connection.peer;
        id = connection.id;
        if (this.connections.hasOwnProperty(peer) && this.connections[peer].hasOwnProperty(id)) {
            connection.close();
            delete this.connections[peer][id];
        }
    };


    Peer.prototype.gotCandidate = function (data, peer) {
        var payload = JSON.parse(Utils.getStringFromCodes(data)),
            connection = this.getConnection(peer, payload.id);

        if (!connection || !payload.candidate) {
            return;
        }
        if (!connection.setLocalDescription) {
            Manager.storeCandidate(connection, payload.candidate);
        } else {
            Manager.handleCandidate(connection, payload.candidate);
        }
    };


    Peer.prototype.gotAnswer = function (data, peer) {
        var payload = JSON.parse(Utils.getStringFromCodes(data)),
            connection = this.getConnection(peer, payload.id);

        if (connection && payload.sdp) {
            Manager.handleSDP(payload.type, connection, payload.sdp);
        }
    };


    Peer.prototype.gotOffer = function (data, peer) {
        var payload = JSON.parse(Utils.getStringFromCodes(data)),
            connection = this.getConnection(peer, payload.id);

        if (connection || !payload.id || !payload.sdp) {
            return;
        }
        if (payload.type === 'media') {
            connection = new MediaConnection(this, peer, payload);
            this.addConnection(connection);
            this.emit('call', connection);
        } else if (payload.type === 'data') {
            connection = new DataConnection(this, peer, payload);
            this.addConnection(connection);
            this.emit('chat', connection);
        }
    };


    Peer.prototype.end = function (data, peer) {
        var payload = JSON.parse(Utils.getStringFromCodes(data)),
            connection = this.getConnection(peer, payload.id);

        if (connection) {
            connection.close();
        }
    };


    Peer.prototype.cleanupPeer = function (peer) {
        if (typeof peer !== 'string' || !this.connections.hasOwnProperty(peer)) {
            return;
        }
        Object.keys(this.connections[peer]).forEach(function (id) {
            this.connections[peer][id].close();
            delete this.connections[peer][id];
        }, this);
    };


    Peer.prototype.cleanup = function () {
        Object.keys(this.connections).forEach(function (peer) {
            this.cleanupPeer(peer);
        }, this);
    };


    Peer.prototype.destroy = function (msg) {
        this.cleanup();
        if (typeof msg === 'string') {
            this.emit('error', msg);
        }
    };


    Peer.prototype.close = function () {
        this.open = false;
        this.emit('close');
    };


    Peer.prototype.error = function (e) {
        this.emit('error', e);
    };


    global.proficient = function (user, room, options) {
        return new Peer(user, room, options);
    };


}(window || this));
