// middleware/requireRole.js
module.exports = function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Utilisateur non authentifié." });
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({ 
      message: `Accès refusé. Rôle requis : ${allowedRoles.join(', ')}.` 
    });
  };
};
