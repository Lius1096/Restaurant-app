const OrderModel = require('../models/Order');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const path = require('path');

// === Fonctions utilitaires ===
function calculateTotalAmount(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function buildTicketData(order) {
  return {
    orderId: order.orderId,
    customerName: order.customerName,
    amount: calculateTotalAmount(order.items) * 100, // en centimes
    date: new Date(order.createdAt).toLocaleString('fr-FR'),
    companyName: "TRIPLE SIEBEN",
    companyAddress: "Carré 350 Sénadé, Sènadé Von Copla, Cotonou",
    companyPhone: "01 96 29 41 81",
    logoPath: path.join(__dirname, '..', 'public/assets/logo.png'),
  };
}

// === Génération du PDF propre ===
function createTicketPdf(ticketData) {
  return new Promise(async (resolve, reject) => {
    try {
      const url = `https://tonsite.com/user-dashboard?order=${ticketData.orderId}`;
      const qrCodeDataUrl = await QRCode.toDataURL(url);
      const qrBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');

      const doc = new PDFDocument({ size: 'A5', margin: 40 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Logo
      if (ticketData.logoPath) {
        doc.image(ticketData.logoPath, { fit: [60, 60], align: 'center' });
        doc.moveDown();
      }

      // Entreprise
      doc
        .fontSize(16)
        .text(ticketData.companyName, { align: 'center' })
        .fontSize(10)
        .text(ticketData.companyAddress, { align: 'center' })
        .text(`Téléphone : ${ticketData.companyPhone}`, { align: 'center' })
        .moveDown(2);

      // Infos client & commande
      const amount = (Number(ticketData.amount) / 100).toFixed(2);
      doc
        .fontSize(12)
        .text(`Client : ${ticketData.customerName}`)
        .text(`Commande n° : ${ticketData.orderId}`)
        .text(`Montant : ${amount} €`)
        .text(`Date : ${ticketData.date}`)
        .moveDown(2);

      // QR Code
      // QR Code positionné proprement
const qrWidth = 100;
const qrX = (doc.page.width - qrWidth) / 2;
const qrY = doc.y;

doc.image(qrBuffer, qrX, qrY, { width: qrWidth });

// Texte juste en dessous du QR
const qrBottomY = qrY + qrWidth + 10;

doc
  .fontSize(10)
  .fillColor('gray')
  .text("Scannez ce code pour accéder à votre tableau de bord", qrX - 20, qrBottomY + 5, {
    width: qrWidth + 40,
    align: 'center',
  });

// Texte de remerciement bien plus bas
doc.moveDown(6); // grand espacement
doc
  .fontSize(9)
  .fillColor('black')
  .text("Merci pour votre commande !", { align: 'center' })
  .text("Ce ticket fait office de preuve de paiement.", { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// === Envoi du ticket par mail ===
exports.generateTicketAndSend = async (req, res) => {
  const { orderId, email } = req.body;

  try {
    const order = await OrderModel.findOne({ orderId });
    if (!order) return res.status(404).json({ error: "Commande introuvable." });

    const ticketData = buildTicketData(order);
    const pdfBuffer = await createTicketPdf(ticketData);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"TRIPLE SIEBEN" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Votre ticket de commande',
      text: 'Merci pour votre commande. Vous trouverez votre ticket en pièce jointe.',
      attachments: [{
        filename: `ticket-${orderId}.pdf`,
        content: pdfBuffer
      }],
    });

    res.status(200).json({ message: "Ticket envoyé par e-mail." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur lors de l'envoi du ticket." });
  }
};

// === Téléchargement direct (via POST) ===
exports.generateTicketPdf = async (req, res) => {
  const { orderId } = req.body;

  try {
    const order = await OrderModel.findOne({ orderId });
    if (!order) return res.status(404).json({ error: "Commande introuvable." });

    const ticketData = buildTicketData(order);
    const pdfBuffer = await createTicketPdf(ticketData);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ticket-${orderId}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur lors de la génération du ticket PDF." });
  }
};

// === Génération PDF depuis : /api/ticket/:orderId ===
exports.getTicketByOrderId = async (req, res) => {
  const orderId = req.params.orderId;

  try {
    const order = await OrderModel.findOne({ orderId });
    if (!order) return res.status(404).json({ error: "Commande introuvable." });

    const ticketData = buildTicketData(order);
    const pdfBuffer = await createTicketPdf(ticketData);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ticket-${orderId}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur lors de la récupération du ticket." });
  }
};
