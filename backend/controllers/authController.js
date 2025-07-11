// const User = require('../models/User');
// const jwt = require('jsonwebtoken');

// // Connexion
// exports.login = async (req, res) => {
//   const { email, password, role } = req.body;
//   try {
//     const user = await User.findOne({ email, role });
//     if (!user) return res.status(401).json({ message: 'Email ou mot de passe invalide' });

//     const isMatch = await user.comparePassword(password);
//     if (!isMatch) return res.status(401).json({ message: 'Email ou mot de passe invalide' });

//     const token = jwt.sign(
//       { _id: user._id, role: user.role },
//       process.env.JWT_SECRET,
//       { expiresIn: '1d' }
//     );

//     res.json({
//       message: 'Connexion réussie',
//       token,
//       user: { _id: user._id, username: user.username, role: user.role }
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Erreur serveur' });
//   }
// };



// // Inscription
// exports.register = async (req, res) => {
//   const { username, email, password, role } = req.body;
//   try {
//     const user = new User({ username, email, password, role });
//     await user.save();
//     res.status(201).json({ message: 'Utilisateur créé' });
//   } catch (err) {
//     res.status(500).json({ message: 'Erreur serveur', error: err.message });
//   }
// };


const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Connexion
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Email ou mot de passe invalide' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Email ou mot de passe invalide' });

    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Connexion réussie',
      token,
      user: { _id: user._id, username: user.username, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Inscription
exports.register = async (req, res) => {
  const { username, email, password, role } = req.body;

  // Validation role
  const validRoles = ['user', 'admin', 'livreur'];
  const userRole = validRoles.includes(role) ? role : 'user';

  try {
    // Vérifier unicité email/username
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Email ou nom d\'utilisateur déjà utilisé' });
    }

    const user = new User({ username, email, password, role: userRole });
    await user.save();
    res.status(201).json({ message: 'Utilisateur créé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
