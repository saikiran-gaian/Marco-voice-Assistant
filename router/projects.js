const router = require('express').Router();

const projects = require('../controllers/projects');

router.post('/', projects.getProjects)
router.post('/performance', projects.getPerformace);
router.post('/assignee', projects.assignee);

module.exports = router;