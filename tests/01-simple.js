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
            test.ok(buf.length == sendBuf.length, 'Buf length ok');
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

    'Send few packets': function (test) {
        var socket = new net.Socket(),
            stream = new Stream(socket, streamOptions),

            sendBuf1 = new Buffer([3, 45,63,34,5,345,]),
            sendBuf2 = new Buffer([32,2,42,34]),
            checkBuf = sendBuf1;
            ;

        gotPacket = function (buf) {

            test.ok(buf.length == checkBuf.length, 'Buf length = 3');
            test.deepEqual(buf, checkBuf, 'buf data  == sendBuf data');

            if (checkBuf != sendBuf2) {
                checkBuf = sendBuf2;
                return;
            }

            clearTimeout(timeout);

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

        stream.write(sendBuf1);
        stream.write(sendBuf2);
    },

    'Send random packets': function (test) {
        var socket = new net.Socket(),
            stream = new Stream(socket, streamOptions),

            sendBufs = [
                new Buffer([3, 45,63,34,5,345,]),
                new Buffer([43,374,45,45,32,3,54]),
                new Buffer([8,9,67,6,7,9,8,8,9,78]),
                new Buffer([68,4,8,4,32,46,78,27,8])
            ],

            count = 0
        ;

        gotPacket = function (buf) {
            count++;

            function received (sendedBuf) {
                var l = sendedBuf.length;

                if (l != buf.length) return false;

                while (l--) if (sendedBuf[l] !== buf[l]) return false;

                return true;
            }

            if (!sendBufs.some(received)) test.ok(false, 'Received error buf');

            if (count > 4) test.ok(false, 'Received > 4 packets');
        };

        gotError = function (err) {
            clearTimeout(timeout);
            test.ok(false, err);
            socket.destroy();
            test.done();
        };

        socket.connect(PORT);

        function send (buf) {
            setTimeout(function () {
                stream.write(buf);
            }, Math.random() * 700 + 200);
        }

        sendBufs.forEach(send);

        var timeout = setTimeout(function (){
            test.ok(false, 'Packet lost');
            socket.destroy();
            test.done();
        }, 2000);

        setTimeout(function(){
            clearTimeout(timeout);
            test.ok(count === sendBufs.length, 'Received correct count of packets');
            socket.destroy();
            test.done();
        },1000);
    },

    'Send packet by parts': function (test) {
        var socket = new net.Socket(),

            sendBuf = new Buffer([10 + 128, 2,3,4,5,6,7,9,5,3,4]),
            shouldBeBuf = sendBuf.slice(1)
            ;

        gotPacket = function (buf) {
            clearTimeout(timeout);
            test.ok(buf.length == shouldBeBuf.length, 'Buf length ok');
            test.deepEqual(buf, shouldBeBuf, 'buf data  == sendBuf data');
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

        for (var i = 0; i < sendBuf.length; i++)
            setTimeout(function (){ socket.write(sendBuf.slice(this,this+1))}.bind(i), 100 + i * 50);
    },

    'Close server': function (test) {

        function closed (err) {
            test.ok(!err, err);

            test.done();
        }

        server.close(closed);
    }

};
