const mongoose = require('mongoose');

const dishSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  images: [String], // Tableau de chemins d’images
  category: {
    type: String,
    enum: ['starters', 'mains', 'desserts', 'drinks'],
    required: true
  }
});

module.exports = mongoose.model('Dish', dishSchema);
