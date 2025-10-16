const express = require('express');
const router = express.Router();
const dishController = require('../controllers/dishController');
const upload = require('../middleware/uploadDishImages');

// CRUD des plats avec upload Cloudinary
router.get('/', dishController.getAllDishes);
router.post('/', upload.array('images', 5), dishController.createDish); // max 5 images
router.put('/:id', upload.array('images', 5), dishController.updateDish);
router.delete('/:id', dishController.deleteDish);

module.exports = router;
