const express = require('express');
const Router = express.Router();
const pg = require('../postgresModule');
const middleWareModule = require('../middleware');
const tools = require('../tools');

Router.use(middleWareModule.requireUser);

Router.post('/getAccountNames', (requestObj, responseObj) => {
    pg.getAccountNames(`customerID = ${requestObj.userID}`).then((data) => {
        tools.sendWithCookies(requestObj, responseObj, data);
    });
});

Router.post('/addAccount', (requestObj, responseObj) => {
    pg.addAccount(requestObj.body, requestObj.userID).then((data) => {
        tools.sendWithCookies(requestObj, responseObj, data);
    });
});

Router.post('/getCheckingAccounts', (requestObj, responseObj) => {
    pg.getCheckingAccounts(`accountType = \'CHECKING\' AND customerID = ${requestObj.userID}`).then((data) => {
        // created a anonymous method that will append additional membership info to data
        let appendCustomerInfo = async (myData) => {
            for (let da of myData) {
                // // console.log(da.customerid);
                let s = (await pg.getMembershipInfo(`customerid = ${da.customerid}`))[0];
                let personID = (await pg.getMembershipPersonID(s.username)).personid;
                // // console.log(s);
                da.personid = personID;
                da.fname = s.fname;
                da.mname = s.mname;
                da.lname = s.lname;
                da.address = s.address;
                da.city = s.city;
                da.state = s.state;
                da.zipcode = s.zipcode;
                da.username = s.username;
            }
            return myData;
        }
        appendCustomerInfo(data).then((modifiedData) => tools.sendWithCookies(requestObj, responseObj, modifiedData))
    });
});

Router.post('/getCheckingAccountNames', (requestObj, responseObj) => {
    pg.getAccountNames(`accountType = \'CHECKING\' AND customerID = ${requestObj.userID}`).then((data) => {
        tools.sendWithCookies(requestObj, responseObj, data);
    });
});


Router.post('/getSavingsAccounts', (requestObj, responseObj) => {
    pg.getSavingsAccounts(`accountType = \'SAVING\' AND customerID = ${requestObj.userID}`).then((data) => {
        tools.sendWithCookies(requestObj, responseObj, data);
    });
});


Router.post('/getHistory', (requestObj, responseObj) => {
    pg.getAccountHistory(requestObj.body.accountNumber, requestObj.body.month, requestObj.body.year).then((data) => {
        tools.sendWithCookies(requestObj, responseObj, data);
    });
});


Router.post('/getHistoryMonths', (requestObj, responseObj) => {
    pg.getTransactionDates(requestObj.body.accountNumber, requestObj.body.type).then((data) => {
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
        tools.sendWithCookies(requestObj, responseObj, dates);
    });
});


Router.post('/modifyAccount', async (requestObj, responseObj) => {
    let changes = {};
    // makes sure the user can't possibly change account balance through these means
    for(let key of Object.keys(requestObj.body)) {
        loweredKey = key.toLowerCase();
        if(loweredKey === 'balance') {
            continue;
        }
        changes[loweredKey] = requestObj.body[key];
    }
    // console.log('changes', changes);
    if(!changes.accountnumber) {
        // console.log('couldn\'t complete that request');
        tools.sendWithCookies(requestObj, responseObj, {
            'message': 'failure'
        });
        return;
    }
    let response = await pg.updateAsset('account', changes);
    // console.log('cjamge:sd', response);
    tools.sendWithCookies(requestObj, responseObj, {
        'message': 'success'
    });
});

module.exports = Router;
