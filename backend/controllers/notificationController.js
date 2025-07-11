// const Notification = require('../models/Notification');

// exports.getAllNotifications = async (req, res) => {
//   try {
//     const notifications = await Notification.find().sort({ createdAt: -1 });
//     res.json(notifications);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.createNotification = async (req, res) => {
//   try {
//     const notif = new Notification(req.body);
//     await notif.save();
//     res.status(201).json(notif);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// exports.deleteNotification = async (req, res) => {
//   try {
//     await Notification.findByIdAndDelete(req.params.id);
//     res.json({ message: 'Notification supprimée' });
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };
 
// on importe la fonction notifyUser (à définir ou injecter)
const { notifyUser } = require('../utils/notificationsUtils'); 

exports.sendNotification = (req, res) => {
  const { userId, notification } = req.body;
  if (!userId || !notification) {
    return res.status(400).json({ error: 'userId et notification requis' });
  }

  const success = notifyUser(userId, notification);
  if (success) {
    return res.json({ message: `Notification envoyée à ${userId}` });
  } else {
    return res.status(404).json({ error: `Utilisateur ${userId} non connecté` });
  }
};


const Notification = require('../models/Notification');

// Récupérer les notifications (déjà existant)
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { type: 'client', userId: req.user._id },
        { type: 'admin', userId: null }
      ]
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Marquer une notification comme lue
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification non trouvée' });
    }

    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Supprimer une notification
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification non trouvée' });
    }

    res.json({ message: 'Notification supprimée' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

