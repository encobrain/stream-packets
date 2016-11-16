/**
 * Created by encobrain on 16.11.16.
 */

var net = require('net'),

    Stream = require('../').Stream,

    server = null,

    PORT = 3000,

    streamOptions = {
        packetMaxLength: 10
    },

    gotPacket,
    gotError
    ;

function serverConnection (socket) {
    console.log('Connection');

    var stream = new Stream(socket, streamOptions);

    stream.on('packet', gotPacket);

    stream.on('error', gotError);

    stream.resume();
}

module.exports = {
    'Create Server': function (test) {
        server = new net.Server();

        server.on('connection', serverConnection);

        server.listen(PORT);

        test.done();
    },

    'Send normal packet': function (test) {
        var socket = new net.Socket(),
            stream = new Stream(socket, streamOptions),

            sendBuf = new Buffer([3, 45,63])
            ;

        gotPacket = function (buf) {
            clearTimeout(timeout);
            test.ok(buf.length == 3, 'Buf length = 3');
            test.deepEqual(buf, sendBuf, 'buf data  == sendBuf data');
            socket.destroy();
            test.done();
        };

        gotError = function (err) {
            clearTimeout(timeout);
            test.ok(false, err);
            socket.destroy();
            test.done();
        };

        socket.connect(PORT);

        var timeout = setTimeout(function (){
            test.ok(false, 'Packet lost');
            socket.destroy();
            test.done();
        }, 1000);

        stream.write(sendBuf);
    },

    'Try send big packet': function (test) {
        var socket = new net.Socket(),
            stream = new Stream(socket, streamOptions),

            sendBuf = new Buffer([3,45,63,45,6,6,5,5,5,4,3])
            ;

        try {
            stream.write(sendBuf);

            test.ok(false, 'Packet sends without errors');
        } catch (err) {
            if (err.code !== 'PACKET_LENGTH_BIG') test.ok(false, err);
        }

        test.done();
    },

    'Receive packet with invalid length (hack)': function (test) {
        var socket = new net.Socket(),

            sendBuf = new Buffer([20, 2,3,4,5,6,7,9,5,3,4,5,45,45,45,4,5,45,45,43,4])
            ;

        gotPacket = function (buf) {
            clearTimeout(timeout);
            test.ok(false, 'Received packet without errors');
            test.done();
        };

        gotError = function (err) {
            clearTimeout(timeout);
            test.ok(err.code === 'PACKET_LENGTH_INVALID', err);
            socket.destroy();
            test.done();
        };

        socket.connect(PORT);

        var timeout = setTimeout(function (){
            test.ok(false, 'Packet lost');
            socket.destroy();
            test.done();
        }, 1000);

        socket.write(sendBuf);
    },

    'Receive packet with big length (hack)': function (test) {
        var socket = new net.Socket(),

            sendBuf = new Buffer([20 + 128, 2,3,4,5,6,7,9,5,3,4,5,45,45,45,4,5,45,45,43,4])
            ;

        gotPacket = function (buf) {
            clearTimeout(timeout);
            test.ok(false, 'Received packet without errors');
            socket.destroy();
            test.done();
        };

        gotError = function (err) {
            clearTimeout(timeout);
            test.ok(err.code === 'PACKET_LENGTH_BIG', err);
            socket.destroy();
            test.done();
        };

        socket.connect(PORT);

        var timeout = setTimeout(function (){
            test.ok(false, 'Packet lost');
            socket.destroy();
            test.done();
        }, 1000);

        socket.write(sendBuf);
    },

    'Close server': function (test) {

        function closed (err) {
            test.ok(!err, err);

            test.done();
        }

        server.close(closed);
    }

};
