// utils/orderStatusTransitions.js
const allowedStatusTransitions = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed'],
  completed: [],
  cancelled: []
};

module.exports = allowedStatusTransitions;
