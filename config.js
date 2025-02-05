const { Pool } = require('pg'); //importation du pool de connection qui sera utilisé dans des requettes

const pool = new Pool({
    user: 'postgres',
    password: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'HOSPITALS'
  });
  module.exports = pool; // pour exporter les configuration de la 