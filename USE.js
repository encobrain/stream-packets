/**
 * Created by Encobrain on 14.11.16.
 */

var net = require('net'),

    streamPackets = require('./index')
    ;

var socket = new net.Socket();

var options = {
    packetMaxLength: 20 * 1024 // in bytes. 0|null - 2^70 bytes

};

var stream = new streamPackets.Stream(socket, options);

stream.pause(); // by default stream is paused
stream.resume();

stream.status(); // 'paused'| 'resumed' | Error

stream.write(buffer|string|arrayOfBytes|arrayBuffer);

stream.on('packet', gotBufferPacket);

stream.on('error', gotParseError);  // after error socket is paused




