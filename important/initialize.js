// imported Client class from pg module.
const { Pool } = require('pg'); // see 'practice/3 - importing.js' for more information on this kind of import.
const fs = require('node:fs');
    
const yearlyInterestPercent = 6;
const savingsInterestRate = 0.49;

const doInitialize = true;
const pSQLUsername = 'postgres';
// specify connection stuff.
const connectionParameters = {
    host: 'localHost',
    user: pSQLUsername,
    port: 5432,
    password: 'root21!',
    database: 'tester'
};

const PGPool = new Pool(connectionParameters);
// connect to the database

PGPool.connect();

if(doInitialize) {
    let res = null;
    fs.readFile('./important/initializeQuiries.txt', 'utf8', async (err, data) => {
        for(let command of data.split(';')) {
            if(command.trim() !== '') {
                res = await Query(command+";");
                if(res.message) {
                    console.log(command, res);
                    break;
                }
            }
        } 
    });
}


async function Query(query) {
    try {
        const queryResults = await PGPool.query(query);
        return queryResults.rows;
    }
    catch (err) { return err; }
}

console.log('initialization complete');
