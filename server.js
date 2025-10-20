// --------------------------------------
// Add new entries to existing .json file
// --------------------------------------

const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));

const animalsFile = path.join(__dirname, 'animals.json');
const treesFile = path.join(__dirname, 'trees.json');

app.post('/add', (req, res) => {
  const { type, species, note, lat, lon } = req.body;
  if (!type || !species || typeof lat !== 'number' || typeof lon !== 'number') {
    return res.status(400).json({ message: '❌ Invalid or missing fields.' });
  }

  const filePath = type === 'animal' ? animalsFile : treesFile;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  data.push({ species, note, lat, lon });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  res.json({ message: `✅ ${type} entry saved successfully!` });
});

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
