var express = require('express');
var router = express.Router();

var uuid = require('uuid/v4');
var randomstring = require('randomstring');

router.post('/create', function(req, res, next) {
    var rooms = req.app.socketio.rooms;
    var name = rqe.body.name;

    var gameCode;
    do {
        gameCode = generateRoomCode();
    } while (!isValidRoomCode(gameCode, rooms));

    var room = rooms[gameCode] = {};
    room.players = {};
    room.spymasters = [];

    var id = uuid();
    var player = {
        name : name,
        teamName : 'red',
        roleName : 'player',
        ready : false
    };

    room.players[id] = player;
    room.teamCounts = { red : 1, blue : 0}; 

    res.cookie('userId', id, { maxAge : 86400000, httpOnly : false });
    res.cookie('gameCode', gameCode, { maxAge : 86400000, httpOnly : false });
    res.cookie('name', name, { maxAge : 86400000, httpOnly : false });
    res.cookie('teamName', 'red', { maxAge : 86400000, httpOnly : false });

    res.status(200).send({code: gameCode});
});

router.post('/join', function(req, res, next) {
    var rooms = req.app.socketio.rooms;
    var gameCode = req.body.code;
    var name = req.body.name;

    if (gameCode in rooms) {
        var id = uuid();
        var smallestTeam = req.app.socketio.getSmallestTeam(gameCode);
        var player = {
            name : name,
            teamName : smallestTeam,
            roleName : 'player',
            ready : false
        };

        rooms[gameCode].players[id] = player;
        rooms.teamCounts[smallestTeam]++;

        res.cookie('userId', id, { maxAge : 86400000, httpOnly : false });
        res.cookie('gameCode', gameCode, { maxAge : 86400000, httpOnly : false });
        res.cookie('name', name, { maxAge : 86400000, httpOnly : false });
        res.cookie('teamName', smallestTeam, { maxAge : 86400000, httpOnly : false });

        res.status(200).end();
    } else {
        res.status(400).end();
    }
});

router.get('/:gameCode', function(req, res, next) {
    var rooms = req.app.socketio.rooms;
    var gameCode = req.params.gameCode;
    var userId = req.cookies.userId;

    if (gameCode in rooms) {
        var room = rooms[gameCode];
        if (userId in room.players) {
            res.render('game', { title: 'Game', gameCode : gameCode });
            return;
        }
    }

    res.status(400).end();
});

function generateRoomCode() {
    return randomstring.generate({
        length : 4,
        charset : 'alphabetic',
        capitalization : 'lowercase'
    });
}

function isValidRoomCode(code, rooms) {
    if (code in rooms || code === 'join') {
        return false;
    }

    return true;
}

module.exports = router;
