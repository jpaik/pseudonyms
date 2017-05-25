var uuid = require('uuid/v4');
var socketio = require('socket.io');

var io = socketio();
var socketApi = {};

socketApi.io = io;

io.on('connection', function(socket) {
    var id = uuid();
    socket.clientId = id;

    // Lobby events
    socket.on('join', function() {
    });
    socket.on('leave', function() {
    });
    socket.on('teamswitch', function(data) {
    });
    socket.on('roleswitch', function(data) {
    });
    socket.on('ready', function() {
    });

    // Game events
    socket.on('hint', function(data) {
    });
    socket.on('chooseword', function(data) {
    });
    socket.on('votepass', function() {
    });
});

module.exports = socketApi;

