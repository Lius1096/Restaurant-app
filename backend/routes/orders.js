const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const orderController = require('../controllers/orderController');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');

// Validation création
const validateOrderCreation = [
  body('customerName').isString().notEmpty(),
  body('customerPhone').isMobilePhone('fr-FR'),
  body('pickupTime').isISO8601(),
  body('items').isArray({ min: 1 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
];

// Validation mise à jour partielle
const validatePartialUpdate = [
  body('notes').optional().isString(),
  body('pickupTime').optional().isISO8601(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
];

// Routes
router.get('/', authenticate, orderController.getAllOrders);
router.get('/:orderId', authenticate, orderController.getOrderById);
router.post('/', authenticate, validateOrderCreation, orderController.createOrder);
router.patch('/:orderId', authenticate, validatePartialUpdate, orderController.updatePartialOrder);
router.put('/:orderId', authenticate, requireRole('admin'), orderController.updateOrder);
router.put('/:orderId/status', authenticate, requireRole('admin'), orderController.updateOrderStatus);
router.delete('/:orderId', authenticate, orderController.deleteOrder);

module.exports = router;
