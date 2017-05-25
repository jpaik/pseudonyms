var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Home', test: process.env.TEST_STR, teamColor: '#514A9D' });
});

router.get('/about', function(req, res, next){
  res.render('about', { title: 'About' });
});

module.exports = router;
