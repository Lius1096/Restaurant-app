// // middleware/auth.js
// const jwt = require('jsonwebtoken');
// const User = require('../models/User');

// const authenticate = async (req, res, next) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader) return res.status(401).json({ message: 'Non autorisé' });

//   const token = authHeader.split(' ')[1];
//   if (!token) return res.status(401).json({ message: 'Non autorisé' });

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     // Ici on récupère decoded._id (pas decoded.id)
//     const user = await User.findById(decoded._id);
//     if (!user) throw new Error('Utilisateur non trouvé');

//     req.user = user;
//     next();
//   } catch (err) {
//     return res.status(401).json({ message: 'Veuillez-vous connectez ou créer un compte pour continuer' });
//   }
// };

// module.exports = authenticate;


// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    console.log('[AUTH] Vérification du header Authorization...');
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[AUTH] Header Authorization manquant ou mal formé');
      return res.status(401).json({ message: 'Accès non autorisé. Token manquant.' });
    }

    const token = authHeader.split(' ')[1];
    console.log('[AUTH] Token reçu :', token);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[AUTH] Token décodé :', decoded);

    const user = await User.findById(decoded._id);
    if (!user) {
      console.log('[AUTH] Utilisateur introuvable en base');
      return res.status(401).json({ message: 'Utilisateur introuvable.' });
    }

    req.user = {
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role
    };
    console.log('[AUTH] Utilisateur authentifié :', req.user);

    next();
  } catch (err) {
    console.log('[AUTH] Erreur lors de l\'authentification :', err.message);
    return res.status(401).json({ message: 'Token invalide ou expiré.' });
  }
};

module.exports = authenticate;
