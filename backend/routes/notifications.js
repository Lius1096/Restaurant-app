const express = require('express');
const router = express.Router();
const {
   sendNotification,
  getNotifications,
  markAsRead,
  deleteNotification
} = require('../controllers/notificationController');
const authenticate = require('../middleware/authenticate');
router.post('/notify', sendNotification);

router.get('/', authenticate, getNotifications);
router.put('/:id/read', authenticate, markAsRead);
router.delete('/:id', authenticate, deleteNotification);

module.exports = router;
