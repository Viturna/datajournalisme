import cron from 'node-cron';
import fs from 'fs';
import googlePlay from 'google-play-scraper';
import path from 'path';

const dirPath = path.join(process.cwd(), 'maj');
if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function formatDate(timestamp) {
    return new Date(timestamp).toISOString().split('T')[0];
}

let jeuData;
try {
    jeuData = JSON.parse(fs.readFileSync('jeuData.json', 'utf-8'));
} catch (error) {
    console.log("Aucune donnée trouvée, initialisation des données.");
    jeuData = {};
}

function ajouterOuMettreAJourJeu(packageName, title, studio, updateDate, installs, version) {
    if (!jeuData[packageName]) {
        jeuData[packageName] = { title, studio, updates: [] };
    }

    const jeu = jeuData[packageName];
    const lastEntry = jeu.updates[jeu.updates.length - 1];

    if (!lastEntry || lastEntry.date !== updateDate || lastEntry.installs !== installs || lastEntry.version !== version) {
        jeu.updates.push({ date: updateDate, installs, version });
    }

    if (jeu.updates.length > 1) {
        const growth = jeu.updates.slice(1).map((update, index) => {
            const previousInstalls = parseInt(jeu.updates[index].installs.replace(/\D/g, ''));
            const currentInstalls = parseInt(update.installs.replace(/\D/g, ''));
            return { date: update.date, growth: currentInstalls - previousInstalls };
        });
        jeu.growth = growth;
    }
}

async function obtenirTopJeuxGooglePlay() {
    try {
        const apps = await googlePlay.list({
            collection: googlePlay.collection.TOP_FREE,
            category: googlePlay.category.GAME,
            num: 50,
            country: 'fr'
        });

        console.log(`Nombre de jeux récupérés: ${apps.length}`);
        for (const app of apps) {
            const appDetails = await googlePlay.app({ appId: app.appId, country: 'fr' });
            const formattedDate = formatDate(appDetails.updated);
            ajouterOuMettreAJourJeu(app.appId, app.title, app.developer, formattedDate, appDetails.installs, appDetails.version);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des jeux Google Play :", error);
    }
}

async function sauvegarderDonnees() {
    try {
        console.log("Démarrage de la récupération des données...");
        await obtenirTopJeuxGooglePlay();
        console.log("Données récupérées. Sauvegarde des données...");
        const date = new Date().toISOString().split('T')[0];
        const heure = new Date().toISOString().split('T')[1].split('.')[0];
        const filePath = path.join(dirPath, `jeuData_${date}_${heure}.json`);
        fs.writeFileSync(filePath, JSON.stringify(jeuData, null, 2));
        console.log(`Données sauvegardées dans le fichier: ${filePath}`);
    } catch (error) {
        console.error("Erreur lors de la sauvegarde des données", error);
    }
}

// Planifier l'exécution toutes les 5 minutes
cron.schedule('*/5 * * * *', async () => {
    console.log("Vérification des mises à jour...");
    await sauvegarderDonnees();
});

// Démarrer le processus de sauvegarde immédiatement
sauvegarderDonnees();
