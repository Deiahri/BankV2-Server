// imported Client class from pg module.
const { Pool } = require('pg'); // see 'practice/3 - importing.js' for more information on this kind of import.
const fs = require('node:fs');

const doInitialize = true;
const pSQLUsername = 'bankapp';
// specify connection stuff.
const connectionParameters = {
    host: 'localhost',
    user: pSQLUsername, 
    port: 5432,
    password: 'root21!',
    database: 'tester'
};

const connectionString = `postgres://${pSQLUsername}:root21!@localhost:5432/banktest`;

// const PGPool = new Pool(connectionParameters);
const PGPool = new Pool(connectionParameters);
// connect to the database

PGPool.connect();

if(doInitialize) {
    let res = null;
    fs.readFile('./important/initializeQuiries.txt', 'utf8', async (err, data) => {
        if (err) {
            console.log(err);
        } else {
            for(let command of data.split(';')) {
                if(command.trim() !== '') {
                    res = await Query(command+";");
                    if(res.message) {
                        console.log(command, res);
                    } else {
                        console.log('good');
                    }
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
