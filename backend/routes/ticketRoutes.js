const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');

// Envoi mail + PDF
router.post('/ticket/send', ticketController.generateTicketAndSend);

// Génération PDF en téléchargement
router.post('/ticket/generate', ticketController.generateTicketPdf);

// Récupérer PDF par orderId
router.get('/ticket/:orderId', ticketController.getTicketByOrderId);

module.exports = router;
