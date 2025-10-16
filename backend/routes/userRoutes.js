// const express = require('express');
// const router = express.Router();
// const authenticate = require('../middleware/authenticate');
// const multer = require('multer');
// const { getProfile, updateProfile } = require('../controllers/userController');

// // Configure multer (exemple stockage local simple)
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/'); // dossier upload, créer-le à la racine
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + '-' + file.originalname);
//   }
// });
// const upload = multer({ storage });

// // Routes
// router.get('/me', authenticate, getProfile);

// // Pour PUT /me, ajoute upload.single('photo') avant authenticate ou après selon besoin
// router.put('/me', authenticate, upload.single('photo'), updateProfile);

// module.exports = router;


const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { getProfile, updateProfile } = require('../controllers/userController');
const { storage } = require('../config/cloudinary'); // ton storage Cloudinary
const multer = require('multer');

const upload = multer({ storage });

// --- Routes utilisateur ---
router.get('/me', authenticate, getProfile);
router.put('/me', authenticate, upload.single('photo'), updateProfile);

module.exports = router;
