var socketio = require('socket.io');
var io = socketio();
var socketApi = {};

socketApi.io = io;

io.on('connection', function(socket) {
    console.log('New user connected.');
});

module.exports = socketApi;

