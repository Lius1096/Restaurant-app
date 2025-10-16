const { cloudinary } = require('../config/cloudinary'); // ← ton fichier cloudinary.js
const User = require('../models/User');

// // Récupérer le profil utilisateur connecté
// exports.getProfile = async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id).select('-password');
//     if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
//     res.json(user);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Mettre à jour le profil utilisateur (avec gestion photo, password hashé, etc.)
// exports.updateProfile = async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id);
//     if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

//     if (req.body.username && req.body.username.trim() !== '') {
//       user.username = req.body.username.trim();
//     }
//     if (req.body.email && req.body.email.trim() !== '') {
//       user.email = req.body.email.trim();
//     }
//     if (req.body.password && req.body.password.trim() !== '') {
//       user.password = req.body.password; // hash fait par mongoose pre-save
//     }

//     if (req.file) {
//       user.photo = `/uploads/${req.file.filename}`;
//     }

//     await user.save();

//     res.json({ message: 'Profil mis à jour', user: { 
//       username: user.username, 
//       email: user.email, 
//       photo: user.photo 
//     }});
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// Récupérer le profil utilisateur connecté
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    // DTO pour le front
    const userDTO = {
      username: user.username || 'Utilisateur',
      email: user.email || '',
      photo: user.photo || null, 
    };

    res.json(userDTO);
  } catch (error) {
    console.error('[PROFILE] getProfile error:', error);
    res.status(500).json({ message: error.message });
  }
};


exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    // Mise à jour des champs texte
    if (req.body.username && req.body.username.trim() !== '') {
      user.username = req.body.username.trim();
    }
    if (req.body.email && req.body.email.trim() !== '') {
      user.email = req.body.email.trim();
    }
    if (req.body.password && req.body.password.trim() !== '') {
      user.password = req.body.password; // hash via pre-save
    }

    // Si une image est uploadée, l’envoyer sur Cloudinary
    if (req.file) {
      console.log('[PROFILE] Upload Cloudinary en cours...');
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'users', // dossier dans ton Cloudinary
        transformation: [{ width: 800, height: 800, crop: 'limit' }],
      });

      // Supprimer l’ancienne photo Cloudinary si elle existe
      if (user.photo && user.photo.includes('res.cloudinary.com')) {
        const publicId = user.photo.split('/').pop().split('.')[0];
        try {
          await cloudinary.uploader.destroy(`users/${publicId}`);
          console.log('[PROFILE] Ancienne photo supprimée de Cloudinary');
        } catch (err) {
          console.warn('[PROFILE] Erreur suppression ancienne photo:', err.message);
        }
      }

      // Stocker l’URL Cloudinary
      user.photo = result.secure_url;
    }

    await user.save();

    res.json({
      message: 'Profil mis à jour',
      user: {
        username: user.username,
        email: user.email,
        photo: user.photo,
      },
    });
  } catch (error) {
    console.error('[PROFILE] Erreur updateProfile:', error);
    res.status(500).json({ message: error.message });
  }
};

