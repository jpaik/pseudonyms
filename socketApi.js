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
                users : users,
                gameState : socketApi.rooms[gameCode].gameState,
                teamName : user.teamName
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
        var teamName = data.teamName;
        var room = socketApi.rooms[socket.gameCode];
        var user = getUser(socket.userId, socket.gameCode);

        if (teamName in room.teamCounts) {
            room.teamCounts[user.teamName]--;
            room.teamCounts[teamName]++;
            user.teamName = teamName;

            socket.to(socket.gameCode).emit('player_teamswitch', {
                userId : socket.userId,
                teamName : teamName
            });
            socket.emit('confirmteamswitch');
        } else {
            socket.emit('failteamswitch');
        }
    });
    socket.on('roleswitch', function(data) {
        var roleName = data.roleName;
        var user = getUser(socket.userId, socket.gameCode);

        if (roleName === 'master') {
            if (!hasMaster(socket.gameCode, user.teamName)) {
                user.roleName = roleName;

                socket.to(socket.gameCode).emit('player_roleswitch', {
                    userId : socket.userId,
                    roleName : roleName
                });
                socket.emit('confirmroleswitch');
                return;
            }
        } else if (roleName === 'player') {
            user.roleName = roleName;

            socket.to(socket.gameCode).emit('player_roleswitch', {
                userId : socket.userId,
                roleName : roleName
            });
            socket.emit('confirmroleswitch');
            return;
        }

        socket.emit('failroleswitch');
    });
    socket.on('ready', function() {
        var user = getUser(socket.userId, socket.gameCode);

        if (user.ready) {
            socket.emit('failready');
        } else {
            socket.to(socket.gameCode).emit('player_ready', {
                userId : socket.userId
            });
            socket.emit('confirmready');
        }
    });
    socket.on('unready', function() {
        var user = getUser(socket.userId, socket.gameCode);

        if (!user.ready) {
            socket.emit('failunready');
        } else {
            socket.to(socket.gameCode).emit('player_unready', {
                userId : socket.userId
            });
            socket.emit('confirmunready');
        }
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

function hasMaster(gameCode, teamName) {
    var players = socketApi.rooms[gameCode].players;

    Object.keys(players).forEach(function(userId) {
        var player = players[userId];

        if (player.roleName === 'master' && player.teamName === teamName) {
            return true;
        }
    });

    return false;
}

socketApi.getSmallestTeam = function(gameCode) {
    var teamCounts = socketApi.rooms[gameCode].teamCounts;

    var min = undefined;
    var minTeamName = undefined;
    Object.keys(teamCounts).forEach(function(teamName) {
        var count = teamCounts[teamName];
        if (min === undefined || count < min) {
            min = count;
            minTeamName = teamName;
        }
    });

    return minTeamName;
}

module.exports = socketApi;
