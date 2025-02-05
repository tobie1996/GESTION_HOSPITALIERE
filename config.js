// const { Pool } = require('pg'); //importation du pool de connection qui sera utilisé dans des requettes

// const pool = new Pool({
//     user: 'postgres',
//     password: 'postgres',
//     host: 'localhost',
//     port: 5432,
//     database: 'HOSPITALS'
//   });
//   module.exports = pool; // pour exporter les configuration de la 


const { Pool } = require('pg'); // Importation du pool de connexion
require('dotenv').config(); // Charger les variables d'environnement depuis le fichier .env

// Créer une nouvelle instance de Pool avec l'URL de connexion PostgreSQL
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL, // Utilisation de la variable d'environnement POSTGRES_URL
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false // SSL pour Vercel, si en production
});

module.exports = pool;
