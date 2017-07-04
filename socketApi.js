var uuid = require('uuid/v4');
var socketio = require('socket.io');
var kShuffle = require('knuth-shuffle').knuthShuffle;
var fs = require('fs');

var io = socketio();

var socketApi = {};

socketApi.io = io;
socketApi.rooms = {};

var dictionary;
fs.readFile('words.json', 'utf8', function (err, data) {
  if (err) throw err;
  dictionary = JSON.parse(data);
});

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

    socket.on('disconnect', function() {
        var userId = socket.userId;
        var gameCode = socket.gameCode;

        if (isInGame(userId, gameCode)) {
            var teamName = getUser(userId, gameCode).teamName;
            socketApi.rooms[gameCode].teamCounts[teamName]--;
            socket.to(gameCode).emit('player_leave', { userId : userId });
        }
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
                player.userId = id;
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
	var user = getUser(socket.userId, socket.gameCode);
        socketApi.rooms[socket.gameCode].teamCounts[user.teamName]--;
        socket.to(socket.gameCode).emit('player_leave', { userId : socket.userId });
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
            user.roleName = 'player';

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
            user.ready = true;
            socket.to(socket.gameCode).emit('player_ready', {
                userId : socket.userId
            });
            socket.emit('confirmready');

            // Check if we can start game
            if (canStartGame(socket.gameCode)) {
                io.in(socket.gameCode).emit('startgame');
                var room = socketApi.rooms[socket.gameCode];
                room.gameState = 'game';
                io.in(socket.gameCode).emit('get_board', {
                    board: generateBoard(socket.gameCode)
                });
            }
        }
    });
    socket.on('unready', function() {
        var user = getUser(socket.userId, socket.gameCode);

        if (!user.ready) {
            socket.emit('failunready');
        } else {
            user.ready = false;
            socket.to(socket.gameCode).emit('player_unready', {
                userId : socket.userId
            });
            socket.emit('confirmunready');
        }
    });

    // Game events
    socket.on('getboard', function(){
      var room = socketApi.rooms[socket.gameCode];
      if(room.board){
        socket.emit('get_board', {
            board: room.board
        });
      }
    });
    socket.on('hint', function(data) {
    });
    socket.on('chooseword', function(data) {
      var word = data.word;
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

function canStartGame(gameCode) {
    var room = socketApi.rooms[gameCode];
    var players = room.players;

    if (room.gameState === 'lobby') {
	      if(Object.keys(players).length < 2) return false;
        return Object.keys(players).every(userId => players[userId].ready);
    }

    return false;
}

function generateBoard(gameCode){
    var room = socketApi.rooms[gameCode];
    var board = {};
    /* Dummy Data Test
    var randColor = ['', '', 'red', 'blue', 'black', 'yellow'];
    'abcdefghijklmnopqrstuvwxy'.split('').forEach(function(l,i){ var random = Math.floor(Math.random() * 6); board[l] = {'Id': i, 'revealed': random > 1 ? true : false, 'color': randColor[random]}; });
    */

    var theme = "default"; //TODO: Change when we add settings to change theme - room.theme
    var load_words = kShuffle(dictionary[theme].words.slice(0)); //knuth shuffle a copy of words

    room['colors'] = randomizeColors(); //Holds index colors - The "solution"
    var idx = 0;
    //Generate Random Word Board
    while(Object.keys(board).length < 25){
      var selectRandom = Math.floor(Math.random() * load_words.length); //Select a random index from dictionary
      var selectedWord = load_words[selectRandom]; //And choose that indexed word
      if(!board[selectedWord]){ //If word doesn't exist
        board[selectedWord] = {
          'Id': idx,
          'revealed': true, //TODO: Remove revealed and colors.
          'color': room['colors'][idx]
        };
        idx++;
      }
    }

    room['board'] = board;
    return board;
}

//1 Black, 7 Yellows, 9 Reds, 8 Blues.
function randomizeColors(){
  var colors = [];
  for(i=0; i<9; i++) colors.push('red');
  for(i=0; i<8; i++) colors.push('blue');
  for(i=0; i<7; i++) colors.push('yellow');
  colors.push('black');
  colors = kShuffle(colors); //Knuth shuffle colors
  return colors;
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
