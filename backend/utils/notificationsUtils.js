const { io, connectedUsers } = require('../server'); // exemple, dépend de ton setup

function notifyUser(userId, notification) {
  const socketId = connectedUsers[userId];
  if (socketId) {
    io.to(socketId).emit('new_notification', notification);
    console.log(`Notification envoyée à ${userId}:`, notification);
    return true;
  } else {
    console.log(`Utilisateur ${userId} non connecté`);
    return false;
  }
}

module.exports = { notifyUser };
