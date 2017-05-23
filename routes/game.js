var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    //res.status(200).send("/game reached");
    res.render('game', { title: 'Game' });
});

module.exports = router;
