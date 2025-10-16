
// const mongoose = require('mongoose');

// const orderSchema = new mongoose.Schema({
//   orderId: { type: String, unique: true, required: true },
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   customerName: String,
//   customerPhone: String,
// pickupTime: { type: Date },
//   notes: String,
//   items: [
//     {
//       id: String,
//       name: String,
//       price: Number,
//       quantity: Number
//     }
//   ],
//   status: {
//   type: String,
//   enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
//   default: 'pending'
// },

//   paymentStatus: { type: String, default: 'unpaid' },
// }, { timestamps: true });


// module.exports = mongoose.model('Order', orderSchema);


const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  pickupTime: { type: Date },
  notes: { type: String, default: '' },
  items: [
    {
      id: { type: String },
      name: { type: String, required: true },
      price: { type: Number, required: true, min: 0 },
      quantity: { type: Number, required: true, min: 1 }
    }
  ],
  status: {
    type: String,
    enum: ['pending', 'modified', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
    default: 'pending'
  },
  statusHistory: [
    {
      status: { type: String, enum: ['pending', 'modified', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'] },
      changedAt: { type: Date, default: Date.now },
      changedBy: { type: String, enum: ['admin', 'user', 'system'], default: 'system' }
    }
  ],
  paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
}, { timestamps: true });

// Pré-save middleware pour ajouter automatiquement l'historique de statut
orderSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      changedBy: this._statusChangedBy || 'system'
    });
  }
  next();
});

// Méthode pour changer le statut avec traçabilité
orderSchema.methods.setStatus = function(newStatus, changedBy = 'system') {
  this._statusChangedBy = changedBy;
  this.status = newStatus;
};

module.exports = mongoose.model('Order', orderSchema);
