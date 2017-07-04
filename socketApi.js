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
                teamName : user.teamName,
                roleName : user.roleName
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
                }).emit('switch_turn', {
                    teamName: room.teamTurn
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
    socket.on('getboard', function(){ //Draw the current board state
      var room = socketApi.rooms[socket.gameCode];
      if(room.board){
        socket.emit('get_board', {
            board: room.board
        });
      }
    });
    socket.on('hint', function(data) {
      //If hint = 0, then unlimited guesses. If hint > 0, then hint = hint+1 since they have 1 more guess allowed.
      var user = getUser(socket.userId, socket.gameCode);
      if(user.roleName === "player") return; //Only Spymasters can set hints.
      var room = socketApi.rooms[socket.gameCode];

      var hint = data.hint,
          number = parseInt(data.number);
      if(number > 0) number += 1;
      if(room.board[hint.toUpperCase()] !== undefined){ //Hint word cannot be a word on the board.
        socket.emit('failhint', {
          error: 'Hint is a pseudonym on the board already.'
        });
        return;
      }
      room.hints.hint = hint;
      room.hints.number = number;

      io.in(socket.gameCode).emit('hint_display', {
        hint : room.hints.hint,
        number : room.hints.number
      });

    });
    socket.on('chooseword', function(data) { //Player chooses word.
      var user = getUser(socket.userId, socket.gameCode);
      if(user.roleName !== "player") return; //Only players can choose.

      var room = socketApi.rooms[socket.gameCode];
      if(room.teamTurn !== user.teamName) return; //Only current turn can choose.

      var word = data.word;
      var word_key = room.board[word];
      if(word_key.revealed) return;

      var word_color = room.colors[word_key.Id];
      word_key.revealed = true;
      word_key.color = word_color;

      io.in(socket.gameCode).emit('word_reveal', {
        'id': word_key.Id,
        'color': word_color
      });
      handleChooseWord(socket.gameCode, word_key);
    });
    socket.on('votepass', function() {
      var room = socketApi.rooms[socket.gameCode];
      var user = getUser(socket.userId, socket.gameCode);
      if(room.teamTurn === user.teamName){
        room.teamTurn = (room.teamTurn === "red" ? "blue" : "red");
        io.in(socket.gameCode).emit('switch_turn', {
            teamName: room.teamTurn
        });
      }
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

    var theme = "default"; //TODO: Change when we add settings to change theme - room.theme
    var load_words = kShuffle(dictionary[theme].words.slice(0)); //knuth shuffle a copy of words

    room.colors = randomizeColors(); //Holds index colors - The "solution"
    var idx = 0;
    //Generate Random Word Board
    while(Object.keys(board).length < 25){
      var selectRandom = Math.floor(Math.random() * load_words.length); //Select a random index from dictionary
      var selectedWord = load_words[selectRandom]; //And choose that indexed word
      if(!board[selectedWord]){ //If word doesn't exist
        board[selectedWord] = {
          'Id': idx,
          'revealed': false
          // 'color': room.colors[idx] //Uncomment for testing only
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

function handleChooseWord(gameCode, word){
  var room = socketApi.rooms[gameCode];
  var color = word.color;

  if(color === "black"){ //Choosing imination bot ends game and current team loses.
    io.in(gameCode).emit('endbot', {
        teamName: room.teamTurn
    });
    return;
  }
  if(color === "yellow"){ //Choosing innocent bystanders ends turn
    room.teamTurn = (room.teamTurn === "red" ? "blue" : "red");
    io.in(gameCode).emit('switch_turn', {
        teamName: room.teamTurn
    });
    return;
  }

  room.points[color] += 1; //Adds points to corresponding color
  if(room.points.red >= 9){ //Red Team Wins
    io.in(gameCode).emit('endgame', {
        teamName: 'red'
    });
    return;
  }
  if(room.points.blue >= 8){ //Blue Team Wins
    io.in(gameCode).emit('endgame', {
        teamName: 'blue'
    });
    return ;
  }

  if(room.teamTurn !== color){ //If they choose the opposing team's card, switch turn
    room.teamTurn = (room.teamTurn === "red" ? "blue" : "red");
    io.in(gameCode).emit('switch_turn', {
        teamName: room.teamTurn
    });
    return;
  }

  if(room.hints.number === 1){ //If they choose maximum number of hints, then switch turn.
    room.teamTurn = (room.teamTurn === "red" ? "blue" : "red");
    io.in(gameCode).emit('switch_turn', {
        teamName: room.teamTurn
    });
  }
  if(room.hints.number > 0 ) room.hints.number--;

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
