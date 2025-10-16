// // socket.js
// const connectedUsers = {};

// function setupSocket(io) {
//   io.on('connection', socket => {
//     console.log(` Socket connecté: ${socket.id}`);

//     // Accueil
//     socket.emit('new_notification', {
//       title: 'Bienvenue',
//       message: 'Vous êtes connecté au serveur.',
//       timestamp: new Date()
//     });

//     // Enregistrement utilisateur (avec userId + rôle)
//     socket.on('register', ({ userId, role }) => {
//       if (userId) {
//         connectedUsers[userId] = socket.id;
//         socket.userId = userId;
//         console.log(`Utilisateur enregistré: ${userId} avec socket ${socket.id}`);
//       }
//       if (role === 'admin') {
//         socket.join('admins');
//       }
//     });

//     // Rejoindre la room d'une commande
//     socket.on('joinOrder', orderId => {
//       socket.join(orderId);
//       console.log(`Socket ${socket.id} rejoint la room order_${orderId}`);
//     });

//     // Messages admin -> clients
//     socket.on('adminMessage', ({ orderId, text, proposedItems }) => {
//       io.to(orderId).emit('newAdminMessage', { orderId, text, proposedItems });
//     });

//     // Messages client -> admin & client
//     socket.on('clientMessage', ({ orderId, text }) => {
//       io.to(orderId).emit('newClientMessage', { text });
//       io.to('admins').emit('notifyAdminNewClientMessage', { orderId, text });
//     });

//     // Mise à jour commande
//     socket.on('orderUpdated', ({ orderId }) => {
//       io.to(orderId).emit('orderUpdated');
//     });

//     // Envoi notification ciblée
//     socket.on('sendNotification', ({ toUserIds, notification }) => {
//       if (!toUserIds || !notification) return;

//       if (Array.isArray(toUserIds)) {
//         toUserIds.forEach(userId => {
//           const targetSocketId = connectedUsers[userId];
//           if (targetSocketId) io.to(targetSocketId).emit('new_notification', notification);
//         });
//       } else {
//         const targetSocketId = connectedUsers[toUserIds];
//         if (targetSocketId) io.to(targetSocketId).emit('new_notification', notification);
//       }
//     });

//     // Message privé (ex admin -> client)
//     socket.on('privateMessage', ({ toUserId, text }) => {
//       const targetSocketId = connectedUsers[toUserId];
//       if (targetSocketId) io.to(targetSocketId).emit('privateMessage', { text, from: socket.userId });
//     });

//     // Liste utilisateurs connectés
//     socket.on('getConnectedUsers', () => {
//       socket.emit('connectedUsers', Object.keys(connectedUsers));
//     });

//     // Déconnexion : suppression de l'utilisateur connecté
//     socket.on('disconnect', () => {
//       console.log(` Socket déconnecté: ${socket.id}`);
//       for (const [userId, id] of Object.entries(connectedUsers)) {
//         if (id === socket.id) {
//           delete connectedUsers[userId];
//           break;
//         }
//       }
//     });
//   });

//   return connectedUsers;
// }

// module.exports = setupSocket;

// socket.js
/**
 * Gestion des connexions Socket.IO
 * - Enregistre les utilisateurs connectés
 * - Gère les messages admin/client
 * - Diffuse les notifications et mises à jour de commandes
 */

function setupSocket(io, connectedUsers) {
  io.on('connection', (socket) => {
    console.log(`🟢 Socket connecté : ${socket.id}`);

    // Envoi de message de bienvenue
    socket.emit('new_notification', {
      title: 'Bienvenue 👋',
      message: 'Connexion au serveur établie avec succès.',
      timestamp: new Date(),
    });

    // --- Enregistrement utilisateur (userId + role) ---
    socket.on('register', ({ userId, role }) => {
      if (userId) {
        connectedUsers[userId] = socket.id;
        socket.userId = userId;
        console.log(`✅ Utilisateur ${userId} enregistré avec le socket ${socket.id}`);
      }
      if (role === 'admin') {
        socket.join('admins');
        console.log(`👑 Admin ${userId || socket.id} a rejoint la room "admins"`);
      }
    });

    // --- Rejoindre la room d'une commande ---
    socket.on('joinOrder', (orderId) => {
      if (!orderId) return;
      socket.join(orderId);
      console.log(`🧾 Socket ${socket.id} a rejoint la room commande ${orderId}`);
    });

    // --- Message envoyé par l’admin vers une commande ---
    socket.on('adminMessage', ({ orderId, text, proposedItems = [] }) => {
      if (!orderId || !text) return;
      io.to(orderId).emit('newAdminMessage', { orderId, text, proposedItems });
      console.log(`📩 Message admin → commande ${orderId} : ${text}`);
    });

    // --- Message envoyé par le client ---
    socket.on('clientMessage', ({ orderId, text }) => {
      if (!orderId || !text) return;
      io.to(orderId).emit('newClientMessage', { orderId, text, from: socket.userId });
      io.to('admins').emit('notifyAdminNewClientMessage', { orderId, text, from: socket.userId });
      console.log(`💬 Message client → commande ${orderId} : ${text}`);
    });

    // --- Notification de mise à jour de commande ---
    socket.on('orderUpdated', ({ orderId }) => {
      if (!orderId) return;
      io.to(orderId).emit('orderUpdated');
      console.log(`🔄 Order ${orderId} mise à jour diffusée`);
    });

    // --- Notification ciblée (un ou plusieurs utilisateurs) ---
    socket.on('sendNotification', ({ toUserIds, notification }) => {
      if (!toUserIds || !notification) return;

      const userList = Array.isArray(toUserIds) ? toUserIds : [toUserIds];
      userList.forEach((userId) => {
        const targetSocketId = connectedUsers[userId];
        if (targetSocketId) {
          io.to(targetSocketId).emit('new_notification', notification);
          console.log(`📢 Notification envoyée à ${userId}`);
        } else {
          console.warn(`⚠️ Utilisateur ${userId} non connecté - notification stockée`);
        }
      });
    });

    // --- Message privé (admin → client ou client → admin) ---
    socket.on('privateMessage', ({ toUserId, text }) => {
      if (!toUserId || !text) return;
      const targetSocketId = connectedUsers[toUserId];
      if (targetSocketId) {
        io.to(targetSocketId).emit('privateMessage', { text, from: socket.userId });
        console.log(`✉️ Message privé envoyé à ${toUserId}`);
      } else {
        console.warn(`❌ Impossible d’envoyer un message à ${toUserId} (non connecté)`);
      }
    });

    // --- Liste des utilisateurs connectés ---
    socket.on('getConnectedUsers', () => {
      socket.emit('connectedUsers', Object.keys(connectedUsers));
    });

    // --- Déconnexion ---
    socket.on('disconnect', () => {
      for (const [userId, id] of Object.entries(connectedUsers)) {
        if (id === socket.id) {
          delete connectedUsers[userId];
          console.log(`🔴 Déconnexion : ${userId} (${socket.id})`);
          break;
        }
      }
    });
  });
}

module.exports = setupSocket;

