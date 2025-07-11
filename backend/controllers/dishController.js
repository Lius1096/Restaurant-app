const Dish = require('../models/Dish');

exports.getAllDishes = async (req, res) => {
  try {
    const dishes = await Dish.find();
    res.json(dishes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createDish = async (req, res) => {
  try {
    const { name, description, price, images, category } = req.body;

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ message: 'Le champ images est requis et doit contenir au moins une image.' });
    }

    const dish = new Dish({ name, description, price, images, category });
    await dish.save();
    res.status(201).json(dish);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


exports.updateDish = async (req, res) => {
  try {
    const { name, description, price, images, category } = req.body;

    if (images && !Array.isArray(images)) {
      return res.status(400).json({ message: 'Le champ images doit être un tableau.' });
    }

    const updatedData = { name, description, price, images, category };

    const dish = await Dish.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    res.json(dish);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


exports.deleteDish = async (req, res) => {
  try {
    await Dish.findByIdAndDelete(req.params.id);
    res.json({ message: 'Plat supprimé' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
