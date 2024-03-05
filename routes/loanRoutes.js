const express = require('express');    // express package
const router = express.Router();
const pg = require('../postgresModule');
const middleWareModule = require('../middleware');
const tools = require('../tools');

router.use(middleWareModule.requireUser);

router.post('/sumbitLoanForm', (requestObj, responseObj) => {
    // // console.log(requestObj.body.loanAmount);
    pg.getLoans().then((data) => {
        tools.sendWithCookies(requestObj, responseObj, 
            data
        );
    });
});

router.post('/getLoan', async (requestObj, responseObj) => {
    if(!(await pg.userOwns('loan', requestObj.body.loanID, requestObj.userID))) {
        tools.sendWithCookies(requestObj, responseObj, {
            'message': 'no access'
        });
        return;
    }
    let loanResponse = null;
    await pg.getLoans(`customerID = ${requestObj.userID} AND loanID = ${requestObj.body.loanID}`).then((data) => {
        loanResponse = data;
    });
    if(loanResponse.name == 'error') {
        tools.sendWithCookies(requestObj, responseObj, {
            'message': 'requested loan does not exist, or loan information is incomplete.'
        });
    }
    else {
        // appends fname, mname, and lname of the given loan to the payload
        for(let loan of loanResponse) {
            await pg.getMembershipInfo(`customerid = ${loan.customerid}`).then((data) => {
                if(data.name === 'error') {
                    loan.fname = '';
                    loan.mname = '';
                    loan.lname = '';
                }
                else {
                    loan.fname = data[0].fname;
                    loan.mname = data[0].mname;
                    loan.lname = data[0].lname;
                }
            });
        }
        tools.sendWithCookies(requestObj, responseObj, loanResponse);
    }
    
});
router.post('/getLoans', (requestObj, responseObj) => {
    let loanResponse = null;
    pg.getLoans(`customerID = ${requestObj.userID}`).then((data) => {
        loanResponse = data;
        if(loanResponse.name === 'error') {
            tools.sendWithCookies(requestObj, responseObj, {
                'message': 'requested loan does not exist, or loan information is incomplete.'
            });
        }
        tools.sendWithCookies(requestObj, responseObj, loanResponse);
    });
});


router.post('/addLoan', (requestObj, responseObj) => {
    /* NOTE: The customer ID used in the request is hardcoded. */ 
    /*
        INSERT INTO LOAN()
    */
    pg.addLoan(requestObj.body, requestObj.userID).then((data)=> {
        
        tools.sendWithCookies(requestObj, responseObj, data);
    });
});

router.post('/getTermLengthFunction', (requestObj, responseObj) => {
    /* NOTE: The customer ID used in the request is hardcoded. */ 
    tools.sendWithCookies(requestObj, responseObj, {
        termLengths: pg.getTermLength()
    });
});

router.post('/getLoanInterestRate', (req, res) => {
    res.send({
        'rate': pg.getLoanInterestRate()
    });
});



module.exports = router;
