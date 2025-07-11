const User = require('../models/User'); // ton modèle mongoose User

// Récupérer le profil utilisateur connecté
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mettre à jour le profil utilisateur (avec gestion photo, password hashé, etc.)
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    if (req.body.username && req.body.username.trim() !== '') {
      user.username = req.body.username.trim();
    }
    if (req.body.email && req.body.email.trim() !== '') {
      user.email = req.body.email.trim();
    }
    if (req.body.password && req.body.password.trim() !== '') {
      user.password = req.body.password; // hash fait par mongoose pre-save
    }

    if (req.file) {
      user.photo = `/uploads/${req.file.filename}`;
    }

    await user.save();

    res.json({ message: 'Profil mis à jour', user: { 
      username: user.username, 
      email: user.email, 
      photo: user.photo 
    }});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

