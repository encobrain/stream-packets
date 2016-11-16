/**
 * Created by Encobrain on 16.11.16.
 */

var events = require('events'),
    util = require('util')
    ;

var ONE = Math.pow(2,7),
    TWO = Math.pow(2,14),
    THREE = Math.pow(2,21),
    FOUR = Math.pow(2,28),
    FIVE = Math.pow(2,35),
    SIX = Math.pow(2,42),
    SEVEN = Math.pow(2,49),
    EIGHT = Math.pow(2,56),
    NINE = Math.pow(2,63),
    TEN = Math.pow(2,70)
    ;

function byteLength (length) {
    return (
        length < ONE ? 1 :
        length < TWO ? 2 :
        length < THREE ? 3 :
        length < FOUR ? 4 :
        length < FIVE ? 5 :
        length < SIX ? 6 :
        length < SEVEN ? 7 :
        length < EIGHT ? 8 :
        length < NINE ? 9 : 10
    );
}

function Stream (socket, options) {
    events.EventEmitter.call(this);

    options = options || {};

    options.packetMaxLength = options.packetMaxLength || TEN;

    this._socket = socket;
    this._options = options;

    this._data = new Buffer(0);

    var self = this;

    function socketData () {
        socketData.handler.apply(self, arguments);
    }

    this._socketData = socketData;

    socketData.handler = handleLength;

    socket.on('data', this._socketData);

    this.pause();
}

function getError (message, code) {
    var error = new Error(message);
    error.code = code;

    return error;
}

function handleLength (buffer) {
    buffer = this._data = Buffer.concat([this._data, buffer]);

    var i = 0,
        l = buffer.length,
        maxBytes = byteLength(this._options.packetMaxLength);

    while (i < l) {
        if (buffer[i++] > 127) {
            this._data = buffer.slice(i);

            var length = buffer[--i] & 0x7F;

            while (i) length = length * 128 + buffer[--i];

            if (length > this._options.packetMaxLength) {
                this._socket.pause();

                this._status = getError('Packet length is to big: ' +
                    length + ' > ' + this._options.packetMaxLength,
                    'PACKET_LENGTH_BIG');

                setImmediate(function () {
                    this.emit('error', this._status);
                }.bind(this));

                return;
            }

            this._socketData.handler = handleData.bind(this, length);

            setImmediate(function(){
                this._socketData(new Buffer(0));
            }.bind(this));

            return;
        }

        if (i >= maxBytes) {
            this._socket.pause();

            this._status = getError('Incorrect packet length', 'PACKET_LENGTH_INVALID');

            setImmediate(function () {
                this.emit('error', this._status);
            }.bind(this));

            return;
        }
    }
}

function handleData (length, buffer) {
    buffer = this._data = Buffer.concat([this._data, buffer]);

    if (buffer.length < length) return;

    buffer = new Buffer(length);
    this._data.copy(buffer, 0, 0, length);

    this._data = this._data.slice(length);
    this._socketData.handler = handleLength;

    setImmediate(function () {
        this.emit('packet', buffer);
    }.bind(this));

    setImmediate(function(){
        this._socketData(new Buffer(0));
    }.bind(this));
}



function encodeLength (length) {

    var buf = new Buffer(byteLength(length));

    var i = 0;

    while (length >= ONE) {
        buf[i++] = length & 0x7F;
        length /= 128;
    }

    buf[i++] = length | 0x80;

    return buf;
}

function write (buffer) {
    if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);

    var length = buffer.length;

    if (length > this._options.packetMaxLength)
        throw getError('Packet length is to big: ' +
            length + ' > ' + this._options.packetMaxLength,
            'PACKET_LENGTH_BIG');

    this._socket.write(encodeLength(length));
    this._socket.write(buffer);
}

function status () {
    return this._status;
}

function pause () {
    this._socket.pause();

    this._status = 'paused';
}

function resume () {
    this._socket.resume();

    this._status = 'resumed';
}

util.inherits(Stream, events.EventEmitter);

Stream.prototype._socket = null;
Stream.prototype._options = null;
Stream.prototype._data = null;
Stream.prototype._socketData = null;
Stream.prototype._status = null;

Stream.prototype.status = status;
Stream.prototype.pause = pause;
Stream.prototype.resume = resume;
Stream.prototype.write = write;


module.exports = {
    Stream: Stream
};
