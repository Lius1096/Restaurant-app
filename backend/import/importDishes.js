const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const Dish = require('../models/Dish');

const MONGO_URI = 'mongodb://localhost:27017/food-order';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connecté à MongoDB');
  importCSV();
})
.catch((err) => {
  console.error(' Erreur de connexion à MongoDB :', err);
});

function importCSV() {
  const results = [];
  const csvFilePath = path.join(__dirname, '../dishes.csv');

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (data) => {
      results.push(data);
    })
    .on('end', async () => {
      try {
        // Optional: vider la collection avant insertion
        await Dish.deleteMany({});
        await Dish.insertMany(results);
        console.log(`✅ ${results.length} plats importés avec succès.`);
        mongoose.connection.close();
      } catch (err) {
        console.error(' Erreur lors de l\'importation :', err);
      }
    });
}
