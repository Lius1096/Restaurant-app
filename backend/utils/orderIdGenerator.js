const Order = require('../models/Order');

async function generateOrderId() {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const count = await Order.countDocuments({
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  const countPart = (count + 1).toString().padStart(3, '0');

  return `CMD-${datePart}-${countPart}`;
}

module.exports = generateOrderId;
