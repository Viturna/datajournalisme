import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
const port = 3000;
const dataFolderPath = path.join(process.cwd(), 'maj');

// Sert le fichier HTML pour afficher les données
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

app.get('/data', (req, res) => {
    fs.readdir(dataFolderPath, (err, files) => {
        if (err) {
            return res.status(500).send("Erreur lors de la lecture du dossier.");
        }

        const jsonFiles = files.filter(file => file.endsWith('.json'));
        const data = [];

        jsonFiles.forEach(file => {
            const filePath = path.join(dataFolderPath, file);
            const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            data.push({ fileName: file, content: fileContent });
        });

        res.json(data);
    });
});

app.listen(port, () => {
  console.log(`Serveur en écoute sur http://localhost:${port}`);
});
