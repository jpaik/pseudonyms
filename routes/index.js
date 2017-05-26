var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    if ('userId' in req.cookies && 'gameCode' in req.cookies) {
        var gameCode = req.cookies.gameCode;
        if (gameCode in req.app.socketio.rooms) {
            res.redirect('/game/' + gameCode);
            return;
        } else {
            res.clearCookie('userId');
            res.clearCookie('gameCode');
        }
    }

    res.render('index', { title: 'Home', description: 'Pseudonyms is a two team game where players have to find their team\'s cards first.' });
});

router.get('/about', function(req, res, next){
  res.render('about', { title: 'About' });
});

module.exports = router;
