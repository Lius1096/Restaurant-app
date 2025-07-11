// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const { createCheckoutSession } = require('../controllers/paymentController');
const { getSessionDetails } = require('../controllers/paymentController');

router.post('/create-checkout-session', createCheckoutSession);

router.get('/session/:id', getSessionDetails);


module.exports = router;
