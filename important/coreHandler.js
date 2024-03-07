const cors = require('cors');
const session = require('express-session');
const secretCode = '82141294912aaee';
const bankRoutingNumber = '051000024';
const bankBIN = '493955';

const corsOptions = {
    "origin": ['https://deiahri.github.io', 'http://127.0.0.1:5502'],
    credentials: true,
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Origin': true,
    optionsSuccessStatus: 200
};

module.exports = {
    cors, corsOptions, session, secretCode, bankRoutingNumber, bankBIN
};
