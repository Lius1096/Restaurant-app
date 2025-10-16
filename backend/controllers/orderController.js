const Order = require('../models/Order');
const Notification = require('../models/Notification');
const generateOrderId = require('../utils/orderIdGenerator');
const connectedUsers = require('../utils/socketState');
const { io } = require('../server');

const allowedStatusTransitions = require('../utils/orderStatusTransitions');

// --- Utilitaire pour envoyer notification Socket + DB ---
const sendNotification = async ({ userId, message }) => {
  if (!userId) return console.warn('sendNotification : userId manquant');

  const notif = await Notification.create({
    type: 'client',
    userId,
    message,
  });

  const socketId = connectedUsers[userId.toString()];
  if (socketId) io.to(socketId).emit('new_notification', notif);
  else console.warn(`Aucun socketId trouvé pour userId ${userId} - notification stockée`);
};

// --- DTO pour éviter d'exposer _id, __v, etc. ---
const toOrderDTO = (order) => ({
  orderId: order.orderId,
  customerName: order.customerName,
  customerPhone: order.customerPhone,
  pickupTime: order.pickupTime,
  notes: order.notes,
  items: order.items,
  status: order.status,
  paymentStatus: order.paymentStatus || 'pending'
});

// --- GET toutes les commandes ---
exports.getAllOrders = async (req, res) => {
  try {
    const orders = req.user.role === 'admin'
      ? await Order.find()
      : await Order.find({ userId: req.user._id });

    res.status(200).json(orders.map(toOrderDTO));
  } catch (error) {
    console.error('getAllOrders error:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des commandes.' });
  }
};

// --- GET commande par orderId ---
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ message: "Commande introuvable." });

    if (req.user.role !== 'admin' && order.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Accès refusé à cette commande." });

    res.status(200).json(toOrderDTO(order));
  } catch (err) {
    console.error('getOrderById error:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de la commande.' });
  }
};




// --- POST créer une commande ---
exports.createOrder = async (req, res) => {
  try {
    const { customerName, customerPhone, pickupTime, notes, items } = req.body;

    if (!customerName || !customerPhone || !pickupTime || !items?.length)
      return res.status(400).json({ message: "Champs requis manquants ou invalides." });

    const newOrder = new Order({
      orderId: await generateOrderId(),
      userId: req.user._id,
      customerName,
      customerPhone,
      pickupTime: new Date(pickupTime),
      notes,
      items,
      status: 'pending'
    });

    await newOrder.save();
    res.status(201).json({ message: 'Commande créée avec succès.', orderId: newOrder.orderId });
  } catch (err) {
    console.error('createOrder error:', err);
    res.status(500).json({ message: 'Erreur lors de la création de la commande.' });
  }
};


exports.updatePartialOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ message: "Commande introuvable." });

    if (req.user.role !== 'admin' && order.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Accès refusé." });

    ['notes', 'pickupTime'].forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'pickupTime') {
          const date = new Date(req.body[field]);
          if (isNaN(date)) return res.status(400).json({ message: "pickupTime invalide." });
          order[field] = date;
        } else order[field] = req.body[field];
      }
    });

    await order.save();
    res.status(200).json(toOrderDTO(order));
  } catch (err) {
    console.error('updatePartialOrder error:', err);
    res.status(500).json({ message: 'Erreur lors de la mise à jour partielle.' });
  }
};


// --- PUT update commande entière (admin uniquement) ---
exports.updateOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ message: "Commande introuvable." });

    if (req.user.role !== 'admin')
      return res.status(403).json({ message: "Accès refusé : admin uniquement." });

    const { status: newStatus, items } = req.body;

    // Si on modifie les items, on passe automatiquement le statut en 'modified' si la commande était encore pending
    let statusToSave = newStatus || order.status;
    if (Array.isArray(items) && items.length && order.status === 'pending') {
      statusToSave = 'modified';
    }

    // Validation statut
    if (!allowedStatusTransitions[order.status].includes(statusToSave))
      return res.status(400).json({
        message: `Transition de statut invalide de ${order.status} à ${statusToSave}.`
      });

    // Mise à jour des champs autorisés
    ['status', 'paymentStatus', 'notes', 'pickupTime'].forEach(field => {
      if (req.body[field] !== undefined) {
        order[field] = field === 'pickupTime' ? new Date(req.body[field]) : req.body[field];
      }
    });

    // Mise à jour des items si fournis
    if (Array.isArray(items)) {
      const validItems = items.filter(i => i.name && i.quantity > 0 && i.price >= 0)
                              .map(i => ({
                                name: i.name,
                                quantity: i.quantity,
                                price: i.price
                              }));
      order.items = validItems;
    }

    // Mettre à jour le statut final
    order.status = statusToSave;

    await order.save();

    // Notification et socket
    const socketId = connectedUsers[order.userId.toString()];
    if (socketId) io.to(socketId).emit(`order-status-${order.orderId}`, { status: order.status });

    await sendNotification({
      userId: order.userId,
      message: `Votre commande n°${order.orderId} a été mise à jour (statut : ${order.status}).`
    });

    res.status(200).json(toOrderDTO(order));
  } catch (err) {
    console.error('updateOrder error:', err);
    res.status(400).json({ message: 'Erreur lors de la mise à jour de la commande.' });
  }
};

// --- PATCH update partiel (user ou admin) ---

// --- PUT update statut (admin uniquement) ---
exports.updateOrderStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Accès refusé : admin uniquement." });

    const { status } = req.body;
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ message: "Commande introuvable." });

    if (!allowedStatusTransitions[order.status].includes(status))
      return res.status(400).json({ message: `Transition de statut invalide de ${order.status} à ${status}.` });

    order.status = status;
    await order.save();

    const socketId = connectedUsers[order.userId.toString()];
    if (socketId) io.to(socketId).emit(`order-status-${order.orderId}`, { status });

    await sendNotification({
      userId: order.userId,
      message: `Le statut de votre commande n°${order.orderId} a été mis à jour : ${status}.`
    });

    res.status(200).json(toOrderDTO(order));
  } catch (err) {
    console.error('updateOrderStatus error:', err);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du statut.' });
  }
};

// --- DELETE commande (admin ou user) ---
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ message: "Commande introuvable." });

    const isOwner = order.userId.toString() === req.user._id.toString();
    if (req.user.role !== 'admin' && !isOwner) {
      return res.status(403).json({ message: "Vous n'avez pas accès à cette commande." });
    }

    // Limite annulation pour user à 2 minutes après création
    if (req.user.role === 'user') {
      const diffMinutes = (Date.now() - order.createdAt.getTime()) / 60000;
      if (diffMinutes > 2) {
        return res.status(403).json({ message: "Délai d’annulation dépassé (2 minutes)." });
      }
    }

    await order.deleteOne();

    try {
      await sendNotification({
        userId: order.userId,
        message:
          req.user.role === 'admin'
            ? `Votre commande n°${order.orderId} a été annulée par un administrateur.`
            : `Votre commande n°${order.orderId} a été annulée.`,
      });
    } catch (notifErr) {
      console.error('Erreur notification après suppression de commande:', notifErr);
    }

    res.status(200).json({ message: 'Commande supprimée avec succès.' });
  } catch (err) {
    console.error('deleteOrder error:', err);
    res.status(500).json({ message: 'Erreur lors de la suppression de la commande.' });
  }
};


exports.getMyOrders = async (req, res) => {
  try {
    console.log('[ORDER] Récupération des commandes de :', req.user._id);

    const orders = await Order.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    console.log(`[ORDER] ${orders.length} commande(s) trouvée(s)`);
    res.json(orders);
  } catch (err) {
    console.error('[ORDER] Erreur getMyOrders :', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};