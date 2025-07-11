// controllers/webhookController.js
const Stripe = require('stripe');
const Order = require('../models/Order');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(' Signature invalide du webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const orderId = session.metadata?.orderId;

    if (!orderId) {
      console.warn(' orderId absent dans metadata Stripe');
      return res.status(400).send('orderId manquant');
    }

    try {
      const order = await Order.findOne({ orderId });

      if (order) {
        order.paymentStatus = 'paid';
        order.status = 'confirmed';
        await order.save();

        console.log(` Paiement confirmé pour la commande ${orderId}`);
      } else {
        console.warn(` Commande non trouvée pour l'orderId : ${orderId}`);
      }
    } catch (error) {
      console.error(' Erreur mise à jour commande :', error.message);
    }
  }

  res.status(200).json({ received: true });
};
