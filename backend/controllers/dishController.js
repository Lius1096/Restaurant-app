const Dish = require('../models/Dish');

// Obtenir tous les plats
exports.getAllDishes = async (req, res) => {
  try {
    const dishes = await Dish.find();
    res.json(dishes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Créer un plat avec upload Cloudinary
exports.createDish = async (req, res) => {
  try {
    const { name, description, price, category } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Veuillez ajouter au moins une image.' });
    }

    // On suppose que req.files contient les URLs Cloudinary
    const imageUrls = req.files.map(file => file.path);

    const dish = new Dish({
      name,
      description,
      price,
      category,
      images: imageUrls, // tableau d'images
    });

    await dish.save();
    res.status(201).json(dish);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
};

// Mettre à jour un plat avec possibilité de gérer plusieurs images
exports.updateDish = async (req, res) => {
  try {
    const { name, description, price, category, existingImages } = req.body;

    const dish = await Dish.findById(req.params.id);
    if (!dish) return res.status(404).json({ message: 'Plat non trouvé.' });

    // Mettre à jour les champs de base
    dish.name = name || dish.name;
    dish.description = description || dish.description;
    dish.price = price || dish.price;
    dish.category = category || dish.category;

    // Gestion des images
    let images = existingImages ? JSON.parse(existingImages) : []; // images conservées
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => file.path); // nouvelles images uploadées
      images = images.concat(newImages);
    }
    dish.images = images;

    await dish.save();
    res.json(dish);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
};

// Supprimer un plat
exports.deleteDish = async (req, res) => {
  try {
    await Dish.findByIdAndDelete(req.params.id);
    res.json({ message: 'Plat supprimé' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
