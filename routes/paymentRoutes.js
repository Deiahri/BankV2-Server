const express = require('express');
const coreHandler = require('../important/coreHandler');
const pg = require('../postgresModule');
const tools = require('../tools');
const Router = express.Router();
const middleWareModule = require('../middleware');

Router.use(middleWareModule.requireUser);

Router.post('/submit', async (requestObj, responseObj) => {
    let transactionObject = {};
    let paymentType = requestObj.body.paymentType;
    let destinationType = requestObj.body.destinationType;
    let formData = requestObj.body;  // will contain requestObj.body

    let dest = '../../cards.html';
    if (destinationType == 'loan') {
        dest = '../../loans.html';
    }

    // makes sure the amount being paid is specified
    if(requestObj.body.paymentAmount && !isNaN(requestObj.body.paymentAmount)) {
        transactionObject.paymentAmount = requestObj.body.paymentAmount;
    }
    else {
        tools.sendWithCookies(requestObj, responseObj, {
            'message': `Payment amount not specified`,
            'inputs': [
                {
                    'text': 'Okay',
                    'type': 'a',
                    'classList': 'btn btn-lg btn-success mt-1'
                }
            ],
        });
        return;
    }

    transactionObject.paymentType = paymentType
    
    // verifies payment source information and sets transactionObject.paymentObject
    if(paymentType === 'account') {
        // verifies sender account information
        transactionObject.paymentObject = {
            bankRoutingNumber: requestObj.body.bankRoutingNumber,
            accountNumber: requestObj.body.accountNumber
        }
        if(requestObj.body.bankRoutingNumber === coreHandler.bankRoutingNumber) {
            let accountInfo = null;
            let customerInfo = null;
            await pg.getCheckingAccounts(`accountNumber = ${Number(requestObj.body.accountNumber)}`).then((data) => {
                if (data.length == 0) {
                    tools.sendWithCookies(requestObj, responseObj, {
                        'message': `Account number doesn't exist.`,
                        'inputs': [
                            {
                                'text': 'Okay',
                                'type': 'a',
                                'classList': 'btn btn-lg btn-success mt-1'
                            }
                        ],
                    });
                    return;
                }
                else {
                    accountInfo = data[0];
                }
            });
            if(!accountInfo) {
                return;
            }
            // console.log('accountInfo:',accountInfo);
            // console.log('formData:', formData);
            await pg.getMembershipInfo(`customerid=${accountInfo.customerid}`).then((data)=>{
                if(data.length == 0) {
                    // console.log('Account number doesn\'t exist.', accountInfo);
                    tools.sendWithCookies(requestObj, responseObj, {
                        'message': `Something went wrong on our end.`,
                        'inputs': [
                            {
                                'text': 'Okay',
                                'type': 'a',
                                'classList': 'btn btn-lg btn-success mt-1',
                                'href': dest
                            }
                        ],
                    });
                    return;
                }
                customerInfo = data[0];
            });
            if(!customerInfo) {
                return;
            }

            try {
                let VPID = await pg.getMembershipPersonID(customerInfo.username);
                customerInfo.personid = VPID.personid;
            }
            catch {
                // console.log('Something went wrong while fetching customer personID. Customer:', customerInfo);
                tools.sendWithCookies(requestObj, responseObj, {
                    'message': `Something went wrong on our end.`,
                    'inputs': [
                        {
                            'text': 'Okay',
                            'type': 'a',
                            'classList': 'btn btn-lg btn-success mt-1',
                            'href': dest
                        }
                    ],
                });
                return;
            }
            // console.log('customer info', customerInfo);

            if(formData.verifyPersonID != customerInfo.personid) {
                tools.sendWithCookies(requestObj, responseObj, {
                    'message': `PersonID wrong`,
                    'inputs': [
                        {
                            'text': 'Okay',
                            'type': 'a',
                            'classList': 'btn btn-lg btn-success mt-1'
                        }
                    ],
                });
                return
            }

            if(formData.fName.toLowerCase().trim() != customerInfo.fname.toLowerCase().trim() || 
            formData.mName.toLowerCase().trim() != customerInfo.mname.toLowerCase().trim() || 
            formData.lName.toLowerCase().trim() != customerInfo.lname.toLowerCase().trim()) 
            {
                tools.sendWithCookies(requestObj, responseObj, {
                    'message': `Name wrong`,
                    'inputs': [
                        {
                            'text': 'Okay',
                            'type': 'a',
                            'classList': 'btn btn-lg btn-success mt-1'
                        }
                    ],
                });
                return
            }
            else if(formData.address.toLowerCase().trim() != customerInfo.address.toLowerCase().trim() ||
            formData.state.toLowerCase().trim() != customerInfo.state.toLowerCase().trim() ||
            formData.city.toLowerCase().trim() != customerInfo.city.toLowerCase().trim() ||
            formData.zipcode != customerInfo.zipcode) {
                tools.sendWithCookies(requestObj, responseObj, {
                    'message': `Address wrong`,
                    'inputs': [
                        {
                            'text': 'Okay',
                            'type': 'a',
                            'classList': 'btn btn-lg btn-success mt-1'
                        }
                    ],
                });
                return;
            }
            else {
                // console.log('EVERYTHING RITE!!!!!!!!!!!!!!!!!!!!!!!');
            }
        }
        else {
            tools.sendWithCookies(requestObj, responseObj, {
                'message': `Account payment information is invalid.`,
                'inputs': [
                    {
                        'text': 'Okay',
                        'type': 'a',
                        'classList': 'btn btn-lg btn-success mt-1'
                    }
                ],
            });
            return;
        }
    }
    else if(paymentType === 'card') {
        tools.hasKeys(formData, ['cardNumber', 'cardCVC', 'paymentType', 'fName', 'mName', 'lName', 'address', 'city', 'state', 'zipcode']);
        let cardResponse = await pg.getCards(`cardnumber = ${tools.reverseFullCardNumber(formData.cardNumber)}`);
        if(!cardResponse[0]) {
            tools.sendWithCookies(requestObj, responseObj, {
                'message': `Given card is not a valid card number`,
                'inputs': [
                    {
                        'text': 'Okay',
                        'type': 'a',
                        'classList': 'btn btn-lg btn-success mt-1'
                    }
                ],
            });
            return;
        }
        let card = cardResponse[0];

        // console.log('form data', formData);
        // console.log('card data', card);
        
        // security code check
        if(card.securitycode != formData.cardCVC)  {
            tools.sendWithCookies(requestObj, responseObj, {
                'message': `CVC does not match.`,
                'inputs': [
                    {
                        'text': 'Okay',
                        'type': 'a',
                        'classList': 'btn btn-lg btn-success mt-1'
                    }
                ],
            });
            return;
        }
        // name check
        if(card.fname.toLowerCase() != formData.fName.toLowerCase().trim() || card.mname.toLowerCase() != formData.mName.toLowerCase().trim() ||
        card.lname.toLowerCase() != formData.lName.toLowerCase().trim()) {
            tools.sendWithCookies(requestObj, responseObj, {
                'message': `Name doesn't match`,
                'inputs': [
                    {
                        'text': 'Okay',
                        'type': 'a',
                        'classList': 'btn btn-lg btn-success mt-1'
                    }
                ],
            });
            return;
        }

        // address check
        if(card.city.toLowerCase() != formData.city.toLowerCase().trim() || card.state.toLowerCase() != formData.state.toLowerCase().trim() ||
        card.address.toLowerCase() != formData.address.toLowerCase().trim() || card.zipcode != formData.zipcode.trim() ||
        card.city.toLowerCase() != formData.city.toLowerCase().trim()) {
            tools.sendWithCookies(requestObj, responseObj, {
                'message': `Address doesn't match.`,
                'inputs': [
                    {
                        'text': 'Okay',
                        'type': 'a',
                        'classList': 'btn btn-lg btn-success mt-1'
                    }
                ],
            });
            return;
        }   

        transactionObject.paymentType = card.type;
        transactionObject.paymentObject = {
            cardNumber: card.cardnumber,
            cardType: card.type
        };
    }
    else {
        // console.log('Wasn\'t expecting payment type:', paymentType);
        tools.sendWithCookies(requestObj, responseObj, {
            'message': `Wasn\'t expecting payment type:', ${paymentType}`,
            'inputs': [
                {
                    'text': 'Okay',
                    'type': 'a',
                    'classList': 'btn btn-lg btn-success mt-1'
                }
            ],
        });
        return;
    }

    // verifies destination data

    if(destinationType) {
        destinationType = destinationType.toLowerCase();
        if(destinationType == 'card') {
            // makes sure destination card has required supporting information
            if(tools.hasKeys(formData, ['destinationID', 'destinationFName', 'destinationMName', 'destinationLName'])) {
                let cardNumber = tools.reverseFullCardNumber(formData.destinationID, coreHandler.bankBIN);
                let card = await pg.getCards(`cardnumber=${cardNumber}`);
                if(!card[0]) {
                    tools.sendWithCookies(requestObj, responseObj, {
                        'message': `Card not found. Cardnumber: ${formData.destinationID}`,
                        'inputs': [
                            {
                                'text': 'Okay',
                                'type': 'a',
                                'classList': 'btn btn-lg btn-success mt-1'
                            }
                        ],
                    });
                    return
                }
                
                card = card[0];
                // console.log('card data:', card);
                transactionObject.destinationType = card.type;
                transactionObject.destinationObject = {
                    cardNumber: cardNumber,
                    cardType: card.type
                };
                if(card.fname.toLowerCase().trim() != formData.destinationFName.toLowerCase().trim() ||
                card.mname.toLowerCase().trim() != formData.destinationMName.toLowerCase().trim() ||
                card.lname.toLowerCase().trim() != formData.destinationLName.toLowerCase().trim()) {
                    tools.sendWithCookies(requestObj, responseObj, {
                        'message': `Card DOESNT check out!`,
                        'inputs': [
                            {
                                'text': 'Okay',
                                'type': 'a',
                                'classList': 'btn btn-lg btn-success mt-1'
                            }
                        ],
                    });
                    return;
                }
            }
            else {
                tools.sendWithCookies(requestObj, responseObj, {
                    'message': `Missing some keys:`,
                    'inputs': [
                        {
                            'text': 'Okay',
                            'type': 'a',
                            'classList': 'btn btn-lg btn-success mt-1'
                        }
                    ],
                });
                return;
            }
        }
        else if(destinationType == 'account') {
            tools.sendWithCookies(requestObj, responseObj, {
                'message': `Expecting account destination data`,
                'inputs': [
                    {
                        'text': 'Okay',
                        'type': 'a',
                        'classList': 'btn btn-lg btn-success mt-1'
                    }
                ],
            });
            return;
        }
        else if(destinationType == 'loan') {
            // console.log('formData:', formData);
            
            let loanResponse = await pg.getLoans(`loanid = ${formData.destinationID}`);
            if(loanResponse.name === 'error') {
                tools.sendWithCookies(requestObj, responseObj, {
                    'message': `Couldn\'t retrieve requested loan`,
                    'inputs': [
                        {
                            'text': 'Okay',
                            'type': 'a',
                            'classList': 'btn btn-lg btn-success mt-1'
                        }
                    ],
                });
                return;
            }
            let destinationLoan = loanResponse[0];
            let personInfoResponse = await pg.getMembershipInfo(`customerid = ${destinationLoan.customerid}`);
            if(personInfoResponse.name === 'error') {
                tools.sendWithCookies(requestObj, responseObj, {
                    'message': `Couldn\'t retrieve loan owner info`,
                    'inputs': [
                        {
                            'text': 'Okay',
                            'type': 'a',
                            'classList': 'btn btn-lg btn-success mt-1'
                        }
                    ],
                });
                return;
            }
            let personInfo = personInfoResponse[0];
            // console.log('sadsas', destinationLoan, personInfo);
            if(formData.destinationFName.toLowerCase().trim() !== personInfo.fname.toLowerCase() || formData.destinationMName.toLowerCase().trim() !== personInfo.mname.toLowerCase() || 
            formData.destinationLName.toLowerCase().trim() !== personInfo.lname.toLowerCase()) {
                tools.sendWithCookies(requestObj, responseObj, {
                    'message': `Person loan info does not match`,
                    'inputs': [
                        {
                            'text': 'Okay',
                            'type': 'a',
                            'classList': 'btn btn-lg btn-success mt-1'
                        }
                    ],
                });
                return;
            }
            transactionObject.destinationType = 'loan';
            transactionObject.destinationObject = {
                loanID: destinationLoan.loanid
            };
        }
        else {
            // console.log('Wasn\'t expecting destination type:', destinationType);
            tools.sendWithCookies(requestObj, responseObj, {
                'message': `Wasn\'t expecting destination type:', ${destinationType}`,
                'inputs': [
                    {
                        'text': 'Okay',
                        'type': 'a',
                        'classList': 'btn btn-lg btn-success mt-1'
                    }
                ],
            });
            return;
        }
    }
    if(!formData.transactionReason) {
        transactionObject.transactionReason = 'Source unspecified';
    } else {
        transactionObject.transactionReason = formData.transactionReason
    }

    let paymentResponse = await pg.processPayment(transactionObject);
    
    tools.sendWithCookies(requestObj, responseObj, {
        'message': paymentResponse,
        'inputs': [
            {
                'text': 'Okay',
                'type': 'a',
                'classList': 'btn btn-lg btn-success mt-1',
                'href': dest
            }
        ],
    });
    return;
})

module.exports = Router;
