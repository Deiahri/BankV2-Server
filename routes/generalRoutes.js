const express = require('express');
const Router = express.Router();
const pg = require('../postgresModule');
const middleWareModule = require('../middleware');
const tools = require('../tools');

Router.use(middleWareModule.requireUser);

Router.post('/getHistory', (requestObj, responseObj) => {
    // console.log(requestObj.body);
    if(requestObj.body.type === 'account') {
        pg.getAccountHistory(requestObj.body.id, requestObj.body.month, requestObj.body.year).then((data) => {
            tools.sendWithCookies(requestObj, responseObj, data);
        });
    }
    else if(requestObj.body.type === 'creditcard') {
        pg.getCreditCardHistory(requestObj.body.id, requestObj.body.month, requestObj.body.year).then((data) => {
            tools.sendWithCookies(requestObj, responseObj, data);
        });
    }
    else if(requestObj.body.type === 'debitcard') {
        pg.getDebitCardHistory(requestObj.body.id, requestObj.body.month, requestObj.body.year).then((data) => {
            tools.sendWithCookies(requestObj, responseObj, data);
        });
    }
    else if(requestObj.body.type === 'loan') {
        pg.getLoanHistory(requestObj.body.id, requestObj.body.month, requestObj.body.year).then((data) => {
            tools.sendWithCookies(requestObj, responseObj, data);
        });
    }
});


Router.post('/getHistoryMonths', async (requestObj, responseObj) => {
    // console.log(requestObj.body);
    let type = requestObj.body.type;
    let owns = await pg.userOwns(type, requestObj.body.id, requestObj.userID);
    if(!owns) {
        responseObj.send({
            'message': 'You do not have access to this asset'
        });
        return;
    }
    if(type === 'account') {
        pg.getAccountTransactionDates(requestObj.body.id).then((data) => {
            responseObj.send(catagorizeDates(data));
        });
    }
    else if(type === 'creditcard') {
        pg.getCreditCardTransactionDates(requestObj.body.id).then((data) => {
            responseObj.send(catagorizeDates(data));
        });
    }
    else if(type === 'debitcard') {
        pg.getDebitCardTransactionDates(requestObj.body.id).then((data) => {
            responseObj.send(catagorizeDates(data));
        });
    }
    else if(type === 'loan') {
        pg.getLoanTransactionDates(requestObj.body.id).then((data) => {
            responseObj.send(catagorizeDates(data));
        });
    }
});


function catagorizeDates(data) {
    let dates = {};
    for (let dateData of data) {
        let date = dateData.date;
        if(dates[date.getFullYear()]) {
            dates[date.getFullYear()].add(date.getMonth()+1);
        }
        else {
            dates[date.getFullYear()] = new Set([date.getMonth()+1]);
        }
    }
    
    for (let year of Object.keys(dates)) {
        dates[year] = Array.from(dates[year]);
    }
    return dates;
}

module.exports = Router;
