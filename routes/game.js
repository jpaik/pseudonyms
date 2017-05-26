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

    rooms[gameCode].players = {};

    var id = uuid();
    var player = {
        name : req.body.name,
        team : 'red',
        spymaster : false,
        ready : false
    };

    rooms[gameCode].players[id] = player;

    res.status(200).json({ uuid : player.id, code: gameCode });
});

router.post('/join', function(req, res, next) {
    var rooms = req.app.socketio.rooms;
    var code = req.body.code;

    if (code in rooms) {
        var id = uuid();
        var player = {
            name : req.body.name,
            team : 'red',
            spymaster : false,
            ready : false
        };

        rooms[gameCode].players[id] = player;

        res.status(200).json({ uuid : player.id });
    } else {
        res.status(400).end();
    }
});

router.get('/:code', function(req, res, next) {
    var room = req.app.socketio.rooms[code];

    if (!(room.includes(req.cookies.game_uuid))) {
        res.status(400).end();
    } else {
        res.render('game', { title: 'Game', code : req.params.code });
    }
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
