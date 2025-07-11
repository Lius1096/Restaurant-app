const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  fullName: { type: String }, // Facultatif mais utile
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['user', 'admin', 'livreur'], // Ajout du rôle 'livreur'
    default: 'user'
  },
  photo: { type: String, default: '' } // URL ou chemin vers la photo de profil
}, { timestamps: true }); // Ajoute createdAt et updatedAt automatiquement

// Hash du mot de passe avant enregistrement
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Comparaison du mot de passe
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Vérifie si admin
userSchema.methods.isAdmin = function () {
  return this.role === 'admin';
};

module.exports = mongoose.model('User', userSchema);
