const express = require('express');    // express package
const router = express.Router();
const pg = require('../postgresModule');
const tools = require('../tools');
const coreHandler = require('../important/coreHandler');
const middleWareModule = require('../middleware');

router.use(middleWareModule.requireUser);

router.post('/sumbitLoanForm', (requestObj, responseObj) => {
    // // console.log(requestObj.body.loanAmount);
    pg.getLoans().then((data) => {
        tools.sendWithCookies(requestObj, responseObj, 
            data
        );
    });
});

router.post('/getCardNames', (requestObj, responseObj) => {
    /* NOTE: The customer ID used in the request is hardcoded. */ 
    pg.getCardNames(requestObj.userID).then((data) => {
        tools.sendWithCookies(requestObj, responseObj, data);
    });
});

router.post('/addDebitCard', (requestObj, responseObj) => {
    /* NOTE: The customer ID used in the request is hardcoded. */ 
    pg.addDebitCard(requestObj.body, requestObj.userID).then((data)=> {
        tools.sendWithCookies(requestObj, responseObj, data);
    });
});

router.post('/getDebitCards', (requestObj, responseObj) => {
    /* NOTE: The customer ID used in the request is hardcoded. */ 
    pg.getDebitCards(`accountNumber IN (SELECT accountNumber FROM ACCOUNT WHERE customerID = ${requestObj.userID})`).then((data) => {
        for(let card of data) {
            card.cardnumberformatted = tools.generateFullCardNumber(card.cardnumber, coreHandler.bankBIN, true);
        }
        tools.sendWithCookies(requestObj, responseObj, data);
    });
});


router.post('/getCreditCard', async (requestObj, responseObj) => {
    if(!(await pg.userOwns('creditcard', requestObj.body.cardNumber, requestObj.userID))) {
        tools.sendWithCookies(requestObj, responseObj, {
            'message': 'no access'
        });
        return;
    }
    pg.getCreditCards(`customerID = ${requestObj.userID} AND cardNumber = ${requestObj.body.cardNumber}`, requestObj.userID).then((data) => {
        for(let card of data) {
            card.cardnumberformatted = tools.generateFullCardNumber(card.cardnumber, coreHandler.bankBIN, true);
        }
        tools.sendWithCookies(requestObj, responseObj, data);
    });
});

router.post('/getCreditCards', (requestObj, responseObj) => {
    /* NOTE: The customer ID used in the request is hardcoded. */ 
    pg.getCreditCards(`customerID = ${requestObj.userID}`).then((data) => {
        for(let card of data) {
            card.cardnumberformatted = tools.generateFullCardNumber(card.cardnumber, coreHandler.bankBIN, true);
        }
        tools.sendWithCookies(requestObj, responseObj, data);
    });
});

router.post('/addCreditCard', (requestObj, responseObj) => {
    /* NOTE: The customer ID used in the request is hardcoded. */ 
    pg.addCreditCard(requestObj.body, requestObj.userID).then((data)=> {
        tools.sendWithCookies(requestObj, responseObj, data);
    });
});



router.post('/getCreditCardDesigns', (requestObj, responseObj) => {
    /* NOTE: The customer ID used in the request is hardcoded. */ 
    pg.getCardDesigns('credit').then((data) => {
        tools.sendWithCookies(requestObj, responseObj, data);
    });
});

router.post('/getDebitCardDesigns', (requestObj, responseObj) => {
    /* NOTE: The customer ID used in the request is hardcoded. */ 
    pg.getCardDesigns('debit').then((data) => {
        tools.sendWithCookies(requestObj, responseObj, data);
    });
});

module.exports = router;
