var express = require('express');
var router = express.Router();

var uuid = require('uuid/v4');
var randomstring = require('randomstring');

router.post('/create', function(req, res, next) {
    var rooms = req.app.socketio.rooms;

    var gameCode;
    do {
        gameCode = generateRoomCode();
    } while (!isValidRoomCode(gameCode, rooms));

    var room = rooms[gameCode] = {};
    room.players = {};
    room.spymasters = [];

    var id = uuid();
    var player = {
        name : req.body.name,
        team : 'red',
        spymaster : false,
        ready : false
    };

    room.players[id] = player;

    res.cookie('userId', id, { maxAge : 86400000, httpOnly : false });
    res.cookie('gameCode', gameCode, { maxAge : 86400000, httpOnly : false });
    res.status(200).send({code: gameCode});
});

router.post('/join', function(req, res, next) {
    var rooms = req.app.socketio.rooms;
    var gameCode = req.body.code;

    if (gameCode in rooms) {
        var id = uuid();
        var player = {
            name : req.body.name,
            team : 'red',
            spymaster : false,
            ready : false
        };

        rooms[gameCode].players[id] = player;

        res.cookie('userId', id, { maxAge : 86400000, httpOnly : false });
        res.cookie('gameCode', gameCode, { maxAge : 86400000, httpOnly : false });

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
