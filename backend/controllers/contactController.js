const Contact = require('../models/Contact');

exports.submitContactForm = async (req, res) => {
  try {
    const contact = new Contact(req.body);
    await contact.save();
    res.status(201).json({ message: 'Message envoyé' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
