
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerName: String,
  customerPhone: String,
pickupTime: { type: Date },
  notes: String,
  items: [
    {
      id: String,
      name: String,
      price: Number,
      quantity: Number
    }
  ],
  status: {
  type: String,
  enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
  default: 'pending'
},

  paymentStatus: { type: String, default: 'unpaid' },
}, { timestamps: true });


module.exports = mongoose.model('Order', orderSchema);
