const router = require('express').Router();

const people = require('../controllers/people');

router.post('/groupbyproject', people.groupbyproject)

module.exports = router;