const express = require('express');
const coreHandler = require('../important/coreHandler');
const pg = require('../postgresModule');
const tools = require('../tools');
const Router = express.Router();
const middleWareModule = require('../middleware');

Router.use(middleWareModule.requireUser);

Router.post('/submit', async (req, res) => {
    let transactionObject = {};
    let paymentType = req.body.paymentType;
    let destinationType = req.body.destinationType;
    let formData = req.body;  // will contain req.body
    // console.log('form Data', formData);
    // tools.sendWithCookies(requestObj, responseObj, {
    //     'message': `Recieved`,
    //     'inputs': [
    //         {
    //             'text': 'Okay',
    //             'type': 'a',
    //             'classList': 'btn btn-lg btn-success mt-1'
    //         }
    //     ],
    // });
    // return;
    
    // makes sure the amount being paid is specified
    if(!req.body.paymentAmount || isNaN(req.body.paymentAmount)) {
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
    
    transactionObject.paymentAmount = req.body.paymentAmount;
    transactionObject.paymentType = paymentType;
    transactionObject.transactionReason = formData.transactionReason;
    
    // verifies payment source information and sets transactionObject.paymentObject
    if(paymentType === 'account') {
        if(!tools.hasKeys(formData, ['accountNumber', 'fName', 'mName', 'lName', 'address', 'state', 'city', 'zipcode'])) {
            tools.sendWithCookies(requestObj, responseObj, {
                'message': `Origin Missing keys`,
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

        transactionObject.paymentType = 'account';
        transactionObject.paymentObject = {
            paymentType: 'account',
            accountNumber: formData.accountNumber,
            fName: formData.fName,
            mName: formData.mName,
            lName: formData.lName,
            address: formData.address,
            state: formData.state,
            city: formData.city,
            zipcode: formData.zipcode,
            personID: formData.verifyPersonID
        };
    } else {
        // console.log('Specified payment type is invalid', paymentType);
        tools.sendWithCookies(requestObj, responseObj, {
            'message': `Specified payment type is invalid ${paymentType}`,
            'inputs': [
                {
                    'text': 'Okay',
                    'type': 'a',
                    'classList': 'btn btn-lg btn-success mt-1'
                }
            ]
        });
        return;
    }

    // determines if payment type is valid
    let paymentAssetValid = await pg.verifyAsset(paymentType, transactionObject.paymentObject);
    if (!paymentAssetValid) {
        tools.sendWithCookies(requestObj, responseObj, {
            'message': `From account information is invalid`,
            'inputs': [
                {
                    'text': 'Okay',
                    'type': 'a',
                    'classList': 'btn btn-lg btn-success mt-1'
                }
            ]
        });
        return;
    }
    // console.log('payment asset valid? :', paymentAssetValid);

    if(destinationType === 'account') {
        if(!tools.hasKeys(formData, ['destinationID', 'destinationFName', 'destinationMName', 'destinationLName'])) {
            tools.sendWithCookies(requestObj, responseObj, {
                'message': `Destination Missing keys`,
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
        transactionObject.destinationType = 'account';
        transactionObject.destinationObject = {
            accountNumber: formData.destinationID,
            fname: formData.destinationFName,
            mname: formData.destinationMName,
            lname: formData.destinationLName
        };
    } else if (destinationType === 'user') {
        // destination will not be the user, but rather the user's primary checking account.
    }

    let destinationAssetValid = null;
    if(destinationType === 'user') {
        transactionObject.transactionReason = `Direct Account Transfer to user ${formData.destinationID}`;
        destinationAssetValid = await pg.verifyMembershipInfo({
            username: formData.destinationID,
            fname: formData.destinationFName,
            mname: formData.destinationMName,
            lname: formData.destinationLName
        });
        
        if(!destinationAssetValid) {
            tools.sendWithCookies(requestObj, responseObj, {
                'message': `Transfer target information is invalid.`,
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

        let userData = await pg.getMembershipInfo(`username='${formData.destinationID}'`);
        if(userData.message == 'error' || !userData || !userData[0]) {
            tools.sendWithCookies(requestObj, responseObj, {
                'message': `Error while processing username info`,
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
        let userPrimaryAccountResponse = await pg.getCheckingAccounts(`customerid = ${userData[0].customerid} AND accountType= 'CHECKING'; `);
        
        if(userPrimaryAccountResponse.message == 'error' || !userPrimaryAccountResponse || !userPrimaryAccountResponse[0]) {
            tools.sendWithCookies(requestObj, responseObj, {
                'message': `Error while processing locating ${formData.destinationID}'s account information`,
                'inputs': [
                    {
                        'text': 'Okay',
                        'type': 'a',
                        'classList': 'btn btn-lg btn-success mt-1'
                    }
                ],
            });
            return;
        } else if (!userPrimaryAccountResponse[0]) {
            // console.log('perhaps try to retrieve user\'s savings account'); 
            tools.sendWithCookies(requestObj, responseObj, {
                'message': `${formData.destinationID} does not have checking accounts`,
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

        destinationAssetValid = true;
        let primaryAccount = userPrimaryAccountResponse[0];
        // console.log('primary: ', primaryAccount);
        transactionObject.destinationObject = {
            accountNumber: primaryAccount.accountnumber,
            fName: userData[0].fname,
            mName: userData[0].mname,
            lName: userData[0].lname
        };
        transactionObject.destinationType = 'account';
    } else {
        destinationAssetValid = await pg.verifyAsset(transactionObject.destinationType, transactionObject.destinationObject);
    }
    // console.log('destination asset valid? :', destinationAssetValid);

    if (!destinationAssetValid) {
        tools.sendWithCookies(requestObj, responseObj, {
            'message': `To account information is invalid`,
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

    let processPaymentResponse = await pg.processPayment(transactionObject);
    tools.sendWithCookies(requestObj, responseObj, {
        'message': processPaymentResponse,
        'inputs': [
            {
                'text': 'Okay',
                'type': 'a',
                'classList': 'btn btn-lg btn-success mt-1',
                'href': './accounts.html'
            }
        ],
    });
    return;

    if(true) {}
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
                'href': '../../cards.html'
            }
        ],
    });
    return;
})

module.exports = Router;
