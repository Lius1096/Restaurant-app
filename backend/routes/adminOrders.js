const express = require('express');
const router = express.Router();
const Order = require('../models/Order'); // adapte ce chemin si nécessaire

// 1. ✅ Récupérer toutes les commandes
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération des commandes.' });
  }
});

// 2. ✅ Récupérer une commande par ID
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande non trouvée.' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération de la commande.' });
  }
});

// 3. ✅ Modifier une commande (détails généraux)
router.put('/:id', async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updatedOrder) return res.status(404).json({ message: 'Commande non trouvée.' });
    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la commande.' });
  }
});

// 4. ✅ Modifier uniquement le statut d'une commande
router.put('/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!updatedOrder) return res.status(404).json({ message: 'Commande non trouvée.' });
    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du statut.' });
  }
});

// 5. ✅ Annuler une commande
router.delete('/:id', async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder) return res.status(404).json({ message: 'Commande non trouvée.' });
    res.json({ message: 'Commande annulée avec succès.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de l\'annulation de la commande.' });
  }
});

module.exports = router;
