var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    if ('game_uuid' in req.cookies && 'game_code' in req.cookies) {
        if (code in req.app.socketio.rooms) {
            res.redirect('/game/' + req.cookies.game_code);
            return;
        }
    }

    res.render('index', { title: 'Home', test: process.env.TEST_STR });
});

router.get('/about', function(req, res, next){
  res.render('about', { title: 'About' });
});

module.exports = router;
