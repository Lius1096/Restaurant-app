const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.createCheckoutSession = async (req, res) => {
  const { amount, orderData } = req.body;

  try {
    const orderId = orderData.orderId; // ✅ Utiliser celui transmis par le front-end

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Commande de ${orderData.name}`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      metadata: {
        orderId, // ✅ maintenant bien défini
      },
    });

res.json({ url: session.url, sessionId: session.id, orderId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur de paiement Stripe' });
  }
};

exports.getSessionDetails = async (req, res) => {
  const sessionId = req.params.id;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    res.json({
      amount_total: session.amount_total,
      currency: session.currency,
      orderId: session.metadata.orderId,  
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération de la session Stripe' });
  }
};
