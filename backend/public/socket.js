import { io } from "https://cdn.socket.io/4.6.1/socket.io.esm.min.js";

let socket = null;

function getToken() {
  return localStorage.getItem('token');
}

export function connectSocket(orderId) {
  if (socket) socket.disconnect();
  const token = getToken();
  if (!token) return console.error('Token JWT manquant');

  socket = io({ auth: { token } });

  socket.on('connect', () => {
    console.log('Socket connecté:', socket.id);
    socket.emit('joinOrder', orderId);
  });

  socket.on('disconnect', () => console.log('Socket déconnecté'));

  socket.on('newClientMessage', ({ text, orderId: msgOrderId }) => {
    if (msgOrderId !== orderId) return;
    const event = new CustomEvent('socketMessage', {
      detail: { message: text, orderId: msgOrderId },
    });
    window.dispatchEvent(event);
  });
}

export function sendMessage({ orderId, message }) {
  if (!socket) return console.error('Socket non connecté');
  socket.emit('adminMessage', { orderId, text: message });
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
