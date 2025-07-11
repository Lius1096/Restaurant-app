// socket.js
const connectedUsers = {};

function setupSocket(io) {
  io.on('connection', socket => {
    console.log(` Socket connecté: ${socket.id}`);

    // Accueil
    socket.emit('new_notification', {
      title: 'Bienvenue',
      message: 'Vous êtes connecté au serveur.',
      timestamp: new Date()
    });

    // Enregistrement utilisateur (avec userId + rôle)
    socket.on('register', ({ userId, role }) => {
      if (userId) {
        connectedUsers[userId] = socket.id;
        socket.userId = userId;
        console.log(`Utilisateur enregistré: ${userId} avec socket ${socket.id}`);
      }
      if (role === 'admin') {
        socket.join('admins');
      }
    });

    // Rejoindre la room d'une commande
    socket.on('joinOrder', orderId => {
      socket.join(orderId);
      console.log(`Socket ${socket.id} rejoint la room order_${orderId}`);
    });

    // Messages admin -> clients
    socket.on('adminMessage', ({ orderId, text, proposedItems }) => {
      io.to(orderId).emit('newAdminMessage', { orderId, text, proposedItems });
    });

    // Messages client -> admin & client
    socket.on('clientMessage', ({ orderId, text }) => {
      io.to(orderId).emit('newClientMessage', { text });
      io.to('admins').emit('notifyAdminNewClientMessage', { orderId, text });
    });

    // Mise à jour commande
    socket.on('orderUpdated', ({ orderId }) => {
      io.to(orderId).emit('orderUpdated');
    });

    // Envoi notification ciblée
    socket.on('sendNotification', ({ toUserIds, notification }) => {
      if (!toUserIds || !notification) return;

      if (Array.isArray(toUserIds)) {
        toUserIds.forEach(userId => {
          const targetSocketId = connectedUsers[userId];
          if (targetSocketId) io.to(targetSocketId).emit('new_notification', notification);
        });
      } else {
        const targetSocketId = connectedUsers[toUserIds];
        if (targetSocketId) io.to(targetSocketId).emit('new_notification', notification);
      }
    });

    // Message privé (ex admin -> client)
    socket.on('privateMessage', ({ toUserId, text }) => {
      const targetSocketId = connectedUsers[toUserId];
      if (targetSocketId) io.to(targetSocketId).emit('privateMessage', { text, from: socket.userId });
    });

    // Liste utilisateurs connectés
    socket.on('getConnectedUsers', () => {
      socket.emit('connectedUsers', Object.keys(connectedUsers));
    });

    // Déconnexion : suppression de l'utilisateur connecté
    socket.on('disconnect', () => {
      console.log(` Socket déconnecté: ${socket.id}`);
      for (const [userId, id] of Object.entries(connectedUsers)) {
        if (id === socket.id) {
          delete connectedUsers[userId];
          break;
        }
      }
    });
  });

  return connectedUsers;
}

module.exports = setupSocket;
