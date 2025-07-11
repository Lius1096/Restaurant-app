const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const ticketRoutes = require('./routes/ticketRoutes');

const app = express();

// Webhook Stripe (avant express.json)
app.use('/api/webhook/stripe',
  express.raw({ type: 'application/json' }),
  require('./routes/webhook')
);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes API
app.use('/api/dishes', require('./routes/dishes'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/contact', require('./routes/contacts'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api', ticketRoutes);

app.get('/success', (req, res) => res.sendFile(path.join(__dirname, 'public', 'success.html')));
app.get('/cancel', (req, res) => res.sendFile(path.join(__dirname, 'public', 'cancel.html')));
app.get('/user-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'user-dashboard.html')));

// Serveur HTTP + Socket.IO
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Import et config Socket.IO
const setupSocket = require('./socket');
const connectedUsers = setupSocket(io);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connecté à MongoDB');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Serveur en écoute sur le port ${PORT}`));
  })
  .catch(err => console.error('Erreur de connexion à MongoDB:', err));

module.exports = { server, io, connectedUsers };
