// const Order = require('../models/Order');
// const Notification = require('../models/Notification');
// const generateOrderId = require('../utils/orderIdGenerator');
// const { connectedUsers, io } = require('../server');
// const allowedStatusTransitions = require('../utils/orderStatusTransitions');


// // Utilitaire pour envoyer notification socket + base
// const sendNotification = async ({ userId, message }) => {
//   if (!userId) {
//     console.warn('sendNotification : userId est null ou undefined');
//     return;
//   }

//   const notif = await Notification.create({
//     type: 'client',
//     userId,
//     message,
//   });

//   const userIdStr = userId.toString();
//   const socketId = connectedUsers[userIdStr];

//   if (socketId) {
//     io.to(socketId).emit('new_notification', notif);
//   } else {
//     console.warn(`Aucun socketId trouvé pour userId ${userIdStr} - notification stockée`);
//   }
// };

// // GET toutes les commandes (admin : toutes / user : ses commandes)
// exports.getAllOrders = async (req, res) => {
//   try {
//     const orders = req.user.role === 'admin'
//       ? await Order.find()
//       : await Order.find({ userId: req.user._id });

//     res.status(200).json(orders);
//   } catch (error) {
//     console.error('getAllOrders error:', error);
//     res.status(500).json({ message: 'Erreur serveur lors de la récupération des commandes.' });
//   }
// };

// // GET une commande par orderId
// exports.getOrderById = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const order = await Order.findOne({ orderId });
//     if (!order) return res.status(404).json({ message: "Commande introuvable." });

//     if (req.user.role === 'user' && order.userId.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ message: "Accès refusé à cette commande." });
//     }

//     res.status(200).json(order);
//   } catch (err) {
//     console.error('getOrderById error:', err);
//     res.status(500).json({ message: 'Erreur serveur lors de la récupération de la commande.' });
//   }
// };

// // POST créer une commande
// exports.createOrder = async (req, res) => {
//   try {
//     const { customerName, customerPhone, pickupTime, notes, items } = req.body;

//     // Validation côté controller (complémentaire à express-validator côté route)
//     if (!customerName || !customerPhone || !pickupTime || !items || !items.length) {
//       return res.status(400).json({ error: "Champs requis manquants ou invalides." });
//     }

//     const orderId = await generateOrderId();

//     const newOrder = new Order({
//       orderId,
//       userId: req.user._id,
//       customerName,
//       customerPhone,
//       pickupTime: new Date(pickupTime),
//       notes,
//       items,
//       status: 'pending',
      
//     });

//     await newOrder.save();

//     res.status(201).json({ message: 'Commande créée avec succès.', orderId });
//   } catch (err) {
//     console.error('createOrder error:', err);
//     res.status(500).json({ error: 'Erreur lors de la création de la commande.' });
//   }
// };

// // PUT update commande entière (admin uniquement)
// exports.updateOrder = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const order = await Order.findOne({ orderId });
//     if (!order) return res.status(404).json({ message: "Commande introuvable." });

    

//     const newStatus = req.body.status;
//     if (newStatus && !allowedStatusTransitions[order.status].includes(newStatus)) {
//       return res.status(400).json({
//         message: `Transition de statut invalide de ${order.status} à ${newStatus}.`
//       });
//     }

//     const updatableFields = ['status', 'paymentStatus', 'notes', 'pickupTime'];
//     updatableFields.forEach(field => {
//       if (req.body[field] !== undefined) {
//         if (field === 'pickupTime') {
//           order[field] = new Date(req.body[field]);
//         } else {
//           order[field] = req.body[field];
//         }
//       }
//     });

//     await order.save();

//     // Socket ciblé si changement status
//     if (newStatus) {
//       const socketId = connectedUsers[order.userId.toString()];
//       if (socketId) {
//         io.to(socketId).emit(`order-status-${order.orderId}`, { status: order.status });
//       }
//     }

//     await sendNotification({
//       userId: order.userId,
//       message: `Votre commande n°${order.orderId} a été mise à jour (statut : ${order.status}).`
//     });

//     res.status(200).json(order);
//   } catch (error) {
//     console.error('updateOrder error:', error);
//     res.status(400).json({ message: 'Erreur lors de la mise à jour de la commande.' });
//   }
// };
// // PATCH update partiel par user (ex: notes, pickupTime)
// exports.updatePartialOrder = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const order = await Order.findOne({ orderId }); // ou findById(orderId)

//     if (!order) return res.status(404).json({ message: "Commande introuvable." });

//     // Vérification des droits : admin ou propriétaire
//     if (req.user.role !== 'admin' && order.userId.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ message: "Accès refusé." });
//     }

//     const allowedUserFields = ['notes', 'pickupTime'];

//     for (const field of allowedUserFields) {
//       if (req.body[field] !== undefined) {
//         if (field === 'pickupTime') {
//           const newDate = new Date(req.body[field]);
//           if (isNaN(newDate)) {
//             return res.status(400).json({ message: "pickupTime invalide." });
//           }
//           order[field] = newDate;
//         } else {
//           order[field] = req.body[field];
//         }
//       }
//     }

//     await order.save();

//     // Optionnel : retourner un DTO filtré (ex: éviter userId, __v, etc.)
//     const orderDto = {
//       orderId: order.orderId,
//       customerName: order.customerName,
//       customerPhone: order.customerPhone,
//       pickupTime: order.pickupTime,
//       notes: order.notes,
//       items: order.items,
//       status: order.status
//     };

//     res.status(200).json(orderDto);
//   } catch (err) {
//     console.error(`updatePartialOrder error for user ${req.user._id}, order ${req.params.orderId}:`, err);
//     res.status(500).json({ message: 'Erreur lors de la mise à jour partielle.' });
//   }
// };


// // PUT update uniquement le statut d'une commande (admin uniquement)
// exports.updateOrderStatus = async (req, res) => {
//   try {
//     if (req.user.role !== 'admin') {
//       return res.status(403).json({ message: "Accès refusé : admin uniquement." });
//     }

//     const { orderId } = req.params;
//     const { status } = req.body;

//     const order = await Order.findOne({ orderId });
//     if (!order) return res.status(404).json({ message: "Commande introuvable." });


//     if (!allowedStatusTransitions[order.status].includes(status)) {
//       return res.status(400).json({ message: `Transition de statut invalide de ${order.status} à ${status}.` });
//     }

//     order.status = status;
//     await order.save();

//     // Socket ciblé
//     const socketId = connectedUsers[order.userId.toString()];
//     if (socketId) {
//       io.to(socketId).emit(`order-status-${order.orderId}`, { status });
//     }

//     await sendNotification({
//       userId: order.userId,
//       message: `Le statut de votre commande n°${order.orderId} a été mis à jour : ${status}.`
//     });

//     res.status(200).json(order);
//   } catch (error) {
//     console.error('updateOrderStatus error:', error);
//     res.status(500).json({ message: 'Erreur lors de la mise à jour du statut.' });
//   }
// };

// // DELETE commande (admin ou user)
// exports.deleteOrder = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const userId = req.user._id.toString();
//     const userRole = req.user.role;

//     const order = await Order.findOne({ orderId });
//     if (!order) return res.status(404).json({ message: "Commande introuvable." });

//     if (userRole === 'user' && order.userId.toString() !== userId) {
//       return res.status(403).json({ message: "Vous n'avez pas accès à cette commande." });
//     }

//     if (userRole === 'user') {
//       const now = new Date();
//       const createdAt = order.createdAt;
//       if (!createdAt) return res.status(400).json({ message: "Date de création manquante." });

//       const diffMinutes = (now - createdAt) / 60000;
//       if (diffMinutes > 2) {
//         return res.status(403).json({ message: "Délai d’annulation dépassé (2 minutes)." });
//       }
//     }

//     await order.deleteOne();

//     await sendNotification({
//       userId: order.userId,
//       message: userRole === 'admin'
//         ? `Votre commande n°${order.orderId} a été annulée par un administrateur.`
//         : `Votre commande n°${order.orderId} a été annulée.`,
//     });

//     res.status(200).json({ message: 'Commande supprimée avec succès.' });
//   } catch (error) {
//     console.error("deleteOrder error:", error);
//     res.status(500).json({ message: 'Erreur lors de la suppression de la commande.' });
//   }
// };



const Order = require('../models/Order');
const Notification = require('../models/Notification');
const generateOrderId = require('../utils/orderIdGenerator');
const { connectedUsers, io } = require('../server');
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

// --- PUT update commande entière (admin uniquement) ---
exports.updateOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ message: "Commande introuvable." });

    const { status: newStatus } = req.body;
    if (newStatus && !allowedStatusTransitions[order.status].includes(newStatus))
      return res.status(400).json({ message: `Transition de statut invalide de ${order.status} à ${newStatus}.` });

    ['status', 'paymentStatus', 'notes', 'pickupTime'].forEach(field => {
      if (req.body[field] !== undefined) order[field] = field === 'pickupTime' ? new Date(req.body[field]) : req.body[field];
    });

    await order.save();

    if (newStatus) {
      const socketId = connectedUsers[order.userId.toString()];
      if (socketId) io.to(socketId).emit(`order-status-${order.orderId}`, { status: order.status });
    }

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

    // Notification (si fonction dispo)
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

// // User
// exports.getMyOrders = async (req, res) => {
//   try {
//     const orders = await Order.find({ userId: req.user._id }); // req.user ajouté par authenticate
//     res.json(orders);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Erreur serveur' });
//   }
// };

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