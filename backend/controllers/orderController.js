const Order = require('../models/Order');
const Notification = require('../models/Notification');
const generateOrderId = require('../utils/orderIdGenerator');
const { connectedUsers, io } = require('../server');
const allowedStatusTransitions = require('../utils/orderStatusTransitions');


// Utilitaire pour envoyer notification socket + base
const sendNotification = async ({ userId, message }) => {
  if (!userId) {
    console.warn('sendNotification : userId est null ou undefined');
    return;
  }

  const notif = await Notification.create({
    type: 'client',
    userId,
    message,
  });

  const userIdStr = userId.toString();
  const socketId = connectedUsers[userIdStr];

  if (socketId) {
    io.to(socketId).emit('new_notification', notif);
  } else {
    console.warn(`Aucun socketId trouvé pour userId ${userIdStr} - notification stockée`);
  }
};

// GET toutes les commandes (admin : toutes / user : ses commandes)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = req.user.role === 'admin'
      ? await Order.find()
      : await Order.find({ userId: req.user._id });

    res.status(200).json(orders);
  } catch (error) {
    console.error('getAllOrders error:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des commandes.' });
  }
};

// GET une commande par orderId
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ message: "Commande introuvable." });

    if (req.user.role === 'user' && order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Accès refusé à cette commande." });
    }

    res.status(200).json(order);
  } catch (err) {
    console.error('getOrderById error:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de la commande.' });
  }
};

// POST créer une commande
exports.createOrder = async (req, res) => {
  try {
    const { customerName, customerPhone, pickupTime, notes, items } = req.body;

    // Validation côté controller (complémentaire à express-validator côté route)
    if (!customerName || !customerPhone || !pickupTime || !items || !items.length) {
      return res.status(400).json({ error: "Champs requis manquants ou invalides." });
    }

    const orderId = await generateOrderId();

    const newOrder = new Order({
      orderId,
      userId: req.user._id,
      customerName,
      customerPhone,
      pickupTime: new Date(pickupTime),
      notes,
      items,
      status: 'pending',
      
    });

    await newOrder.save();

    res.status(201).json({ message: 'Commande créée avec succès.', orderId });
  } catch (err) {
    console.error('createOrder error:', err);
    res.status(500).json({ error: 'Erreur lors de la création de la commande.' });
  }
};

// PUT update commande entière (admin uniquement)
exports.updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ message: "Commande introuvable." });

    

    const newStatus = req.body.status;
    if (newStatus && !allowedStatusTransitions[order.status].includes(newStatus)) {
      return res.status(400).json({
        message: `Transition de statut invalide de ${order.status} à ${newStatus}.`
      });
    }

    const updatableFields = ['status', 'paymentStatus', 'notes', 'pickupTime'];
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'pickupTime') {
          order[field] = new Date(req.body[field]);
        } else {
          order[field] = req.body[field];
        }
      }
    });

    await order.save();

    // Socket ciblé si changement status
    if (newStatus) {
      const socketId = connectedUsers[order.userId.toString()];
      if (socketId) {
        io.to(socketId).emit(`order-status-${order.orderId}`, { status: order.status });
      }
    }

    await sendNotification({
      userId: order.userId,
      message: `Votre commande n°${order.orderId} a été mise à jour (statut : ${order.status}).`
    });

    res.status(200).json(order);
  } catch (error) {
    console.error('updateOrder error:', error);
    res.status(400).json({ message: 'Erreur lors de la mise à jour de la commande.' });
  }
};
// PATCH update partiel par user (ex: notes, pickupTime)
exports.updatePartialOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId }); // ou findById(orderId)

    if (!order) return res.status(404).json({ message: "Commande introuvable." });

    // Vérification des droits : admin ou propriétaire
    if (req.user.role !== 'admin' && order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Accès refusé." });
    }

    const allowedUserFields = ['notes', 'pickupTime'];

    for (const field of allowedUserFields) {
      if (req.body[field] !== undefined) {
        if (field === 'pickupTime') {
          const newDate = new Date(req.body[field]);
          if (isNaN(newDate)) {
            return res.status(400).json({ message: "pickupTime invalide." });
          }
          order[field] = newDate;
        } else {
          order[field] = req.body[field];
        }
      }
    }

    await order.save();

    // Optionnel : retourner un DTO filtré (ex: éviter userId, __v, etc.)
    const orderDto = {
      orderId: order.orderId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      pickupTime: order.pickupTime,
      notes: order.notes,
      items: order.items,
      status: order.status
    };

    res.status(200).json(orderDto);
  } catch (err) {
    console.error(`updatePartialOrder error for user ${req.user._id}, order ${req.params.orderId}:`, err);
    res.status(500).json({ message: 'Erreur lors de la mise à jour partielle.' });
  }
};


// PUT update uniquement le statut d'une commande (admin uniquement)
exports.updateOrderStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Accès refusé : admin uniquement." });
    }

    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ message: "Commande introuvable." });


    if (!allowedStatusTransitions[order.status].includes(status)) {
      return res.status(400).json({ message: `Transition de statut invalide de ${order.status} à ${status}.` });
    }

    order.status = status;
    await order.save();

    // Socket ciblé
    const socketId = connectedUsers[order.userId.toString()];
    if (socketId) {
      io.to(socketId).emit(`order-status-${order.orderId}`, { status });
    }

    await sendNotification({
      userId: order.userId,
      message: `Le statut de votre commande n°${order.orderId} a été mis à jour : ${status}.`
    });

    res.status(200).json(order);
  } catch (error) {
    console.error('updateOrderStatus error:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du statut.' });
  }
};

// DELETE commande (admin ou user)
exports.deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id.toString();
    const userRole = req.user.role;

    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ message: "Commande introuvable." });

    if (userRole === 'user' && order.userId.toString() !== userId) {
      return res.status(403).json({ message: "Vous n'avez pas accès à cette commande." });
    }

    if (userRole === 'user') {
      const now = new Date();
      const createdAt = order.createdAt;
      if (!createdAt) return res.status(400).json({ message: "Date de création manquante." });

      const diffMinutes = (now - createdAt) / 60000;
      if (diffMinutes > 2) {
        return res.status(403).json({ message: "Délai d’annulation dépassé (2 minutes)." });
      }
    }

    await order.deleteOne();

    await sendNotification({
      userId: order.userId,
      message: userRole === 'admin'
        ? `Votre commande n°${order.orderId} a été annulée par un administrateur.`
        : `Votre commande n°${order.orderId} a été annulée.`,
    });

    res.status(200).json({ message: 'Commande supprimée avec succès.' });
  } catch (error) {
    console.error("deleteOrder error:", error);
    res.status(500).json({ message: 'Erreur lors de la suppression de la commande.' });
  }
};
