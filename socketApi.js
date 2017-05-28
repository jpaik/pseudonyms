var uuid = require('uuid/v4');
var socketio = require('socket.io');

var io = socketio();

var socketApi = {};

socketApi.io = io;
socketApi.rooms = {};

io.on('connection', function(socket) {
    delete socket.userId;
    delete socket.gameCode;

    socket.use(function(packet, next) {
        if ('userId' in socket && 'gameCode' in socket) {
            if (isInGame(socket.userId, socket.gameCode)) {
                // Can't join twice
                if (packet[0] !== 'join') {
                    next();
                    return;
                }
            }
        } else if (packet[0] === 'join') {
            next();
            return;
        }

        console.log('Error processing packet: ' + packet);
    });

    // Lobby events
    socket.on('join', function(data) {
        console.log('join');
        var userId = data.userId;
        var gameCode = data.gameCode;

        if (isInGame(userId, gameCode)) {
            socket.userId = userId;
            socket.gameCode = gameCode;

            io.in(gameCode).emit('player_join', { userId : userId });
            socket.join(gameCode);
            socket.emit('confirmjoin');
        } else {
            socket.emit('failjoin');
        }
    });
    socket.on('leave', function() {
    });
    socket.on('teamswitch', function(data) {
    });
    socket.on('roleswitch', function(data) {
    });
    socket.on('ready', function() {
    });
    socket.on('unready', function() {
    });

    // Game events
    socket.on('hint', function(data) {
    });
    socket.on('chooseword', function(data) {
    });
    socket.on('votepass', function() {
    });
});

function isInGame(userId, gameCode) {
    if (gameCode in socketApi.rooms) {
        var room = socketApi.rooms[gameCode];
        if (userId in room.players) {
            return true;
        }
    }

    return false;
}

module.exports = socketApi;
