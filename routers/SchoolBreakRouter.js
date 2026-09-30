const express = require('express');
const { getAll, getOne, create, update, remove} = require('../controllers/SchoolBreakContoller');
const router = express.Router();

router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;