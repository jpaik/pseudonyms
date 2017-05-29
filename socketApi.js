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
        var userId = data.userId;
        var gameCode = data.gameCode;

        if (isInGame(userId, gameCode)) {
            socket.userId = userId;
            socket.gameCode = gameCode;

            var user = getUser(userId, gameCode);
            io.in(gameCode).emit('player_join', {
                userId : userId,
                name : user.name,
                teamName : user.teamName
            });
            socket.join(gameCode);

            var players = socketApi.rooms[gameCode].players;
            var users = [];
            Object.keys(players).forEach(function(id) {
                var player = players[id];

                if (id !== socket.userId) {
                    users.push(player);
                }
            });

            socket.emit('confirmjoin', {
                users : users
            });
        } else {
            socket.emit('failjoin');
        }
    });
    socket.on('leave', function() {
        io.in(socket.gameCode).emit('player_leave', { userId : socket.userId });
        socket.leave(socket.gameCode);
        delete socketApi.rooms[socket.gameCode].players[socket.userId];
        delete socket.userId;
        delete socket.gameCode;
        socket.emit('confirmleave');
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

function getUser(userId, gameCode) {
    return socketApi.rooms[gameCode].players[userId];
}

socketApi.getSmallestTeam = function(gameCode) {
    var teamCounts = socketApi.rooms[gameCode].teamCounts;

    var min = undefined;
    var minTeamName = undefined;
    Object.keys(teams).forEach(function(teamName) {
        var count = teamCounts[teamName];
        if (min === undefined || count < min) {
            min = count;
            minTeamName = teamName;
        }
    });

    return minTeamName;
}

module.exports = socketApi;
