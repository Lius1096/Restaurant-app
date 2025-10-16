const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const orderController = require('../controllers/orderController');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');

// --- Validation création de commande ---
const validateOrderCreation = [
  body('customerName').isString().notEmpty().withMessage('Nom client requis'),
  body('customerPhone').isMobilePhone('fr-FR').withMessage('Téléphone invalide'),
  body('pickupTime').isISO8601().withMessage('Date/heure de retrait invalide'),
  body('items').isArray({ min: 1 }).withMessage('Au moins un item requis'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
];

// --- Validation mise à jour partielle ---
const validatePartialUpdate = [
  body('notes').optional().isString(),
  body('pickupTime').optional().isISO8601(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
];

// ----------------- ROUTES USER -----------------
router.get('/my', authenticate, orderController.getMyOrders);
router.post('/', authenticate, validateOrderCreation, orderController.createOrder);
router.patch('/:orderId', authenticate, validatePartialUpdate, orderController.updatePartialOrder);
router.delete('/:orderId', authenticate, orderController.deleteOrder); // Contrôle des droits dans le controller

// ----------------- ROUTES ADMIN -----------------
router.get('/', authenticate, requireRole('admin'), orderController.getAllOrders);
router.get('/:orderId', authenticate, requireRole('admin'), orderController.getOrderById);
router.put('/:orderId', authenticate, requireRole('admin'), orderController.updateOrder);
router.put('/:orderId/status', authenticate, requireRole('admin'), orderController.updateOrderStatus);
router.delete('/:orderId', authenticate, requireRole('admin'), orderController.deleteOrder);

module.exports = router;
