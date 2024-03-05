// imported Client class from pg module.
const { Pool } = require('pg'); // see 'practice/3 - importing.js' for more information on this kind of import.
const tools = require('./tools');

const yearlyInterestPercent = 6;
const savingsInterestRate = 0.49;

// specify connection stuff.
const connectionParameters = {
    host: 'localHost',
    user: 'postgres',
    port: 5432,
    password: 'root21!',
    database: 'banktest'
};

// create client object and pass connection information
const PGPool = new Pool(connectionParameters);
// connect to the database

PGPool.connect();
// now we can query.
// query takes two parameters: a query, and a callback function with parameters error and result


// PGClient.query(`Select * from customer`, (error, result) => {
//     if(error) {
//         console.log(error);
//     }
//     else {
//         console.log(result.rows);
//     }
// });

async function getMembershipInfo(condition) {
    let conditionStr = '';
    if(condition) {
        conditionStr = ' WHERE '+condition;
    }
    let res = await Query(`SELECT * FROM Customer${conditionStr}`).then((data)=> { return data; });
    if(res.name === 'error') {
        console.log(conditionStr);
        return {
            'message': 'something went very wrong'
        };
    }
    else {
        res[0].password = '';
        res[0].personid = '';
        return res;
    }
}


async function verifyMembershipInfo(membershipInfo) {
    let aquireUserCommand = 'select * from customer WHERE ';
    if(membershipInfo.username) {
        aquireUserCommand += `username = '${membershipInfo.username}'`;
    } 
    else if (membershipInfo.personID) {
        aquireUserCommand += `personID = '${membershipInfo.personID}'`;
    }
    else if (membershipInfo.email) {
        aquireUserCommand += `email = '${membershipInfo.email}'`;
    }
    else if (membershipInfo.customerID) {
        aquireUserCommand += `customerID = '${membershipInfo.customerID}'`;
    } else {
        console.log('verifyMembershipInfo: Could not verify user information with current data', membershipInfo);
        return false;
    }
    let membershipRequest = await Query(aquireUserCommand);
    if (membershipRequest.name === 'error') {
        console.log('verifyMembershipInfo: Something went wrong while fetching user info with command: ', aquireUserCommand);
        return false;
    } else if (membershipRequest.length == 0) {
        console.log('verifyMembershipInfo: no customers could be retrieved with command: ', aquireUserCommand);
        return false;
    }
    let membershipCompareTo = membershipRequest[0];
    console.log('membership compare', membershipInfo, membershipCompareTo);
    return tools.compareObjects(membershipInfo, membershipCompareTo, null, false, false);
}

async function getMembershipPassword(username) {
    let res = await Query(`select password, customerid from customer WHERE username = '${username}'`);
    if(res.name === 'error') {
        console.log(`Something went wrong while retriving ${username}'s password`);
    }
    else {
        if(res.length === 1) {
            return res[0];
        }
        else {
            console.log(`While retrieving user ${username}, retrieved a list with ${res.length}`);
            return null;
        }
    }
}

async function getMembershipPersonID(username) {
    let res = await Query(`select personid, customerid from customer WHERE username = '${username}'`);
    if(res.name === 'error') {
        console.log(`Something went wrong while retriving ${username}'s personid`);
    }
    else {
        if(res.length === 1) {
            return res[0];
        }
        else {
            console.log(`While retrieving user ${username}, retrieved a list with ${res.length}`);
            return null;
        }
    }
}

async function setMembershipInfo(condition, information) {
    let conditionStr = '';
    delete information.joinDate;
    if(condition) {
        conditionStr = ' WHERE '+condition;
        let res = await Query(`UPDATE Customer SET ${jsonToString(information)} ${conditionStr}`).then((data)=> { return data; });
        console.log(res);
        if(res.name === 'error') {
            return {
                'message': `We are sorry, something went wrong on our side.`,
                'inputs': [
                    {
                        'text': 'Okay',
                        'type': 'a',
                        'classList': 'btn btn-lg btn-success mt-1',
                        'href': './accounts.html'
                    }
                ],
            };
        }
    }
    else {
        console.log('VERY DANGEROUS set membership request was posted without any conditions');
    }
    return {
        'message': `Successfully updated your account information`,
        'inputs': [
            {
                'text': 'Okay',
                'type': 'a',
                'classList': 'btn btn-lg btn-success mt-1',
                'href': ''
            }
        ],
    };
}

let customerValues = 'fName, mName, lName, address, city, state, zipcode, sex, personID, username, password, email';
const membershipFieldsUnique = ['email', 'username', 'personID'];
async function addMembershipInfo(information) {
    let formCheckMessage = await formCheck(information);
    if(formCheckMessage) {
        return {
            'message': formCheckMessage,
            'inputs': [
                {
                    'text': 'Okay',
                    'type': 'a',
                    'classList': 'btn btn-lg btn-success mt-1'
                }
            ],
        };
    }
    if (information.email === undefined || information.email === null) {
        information.email = null;
    }
    
    // checks if any fields within membershipFieldsUnique are not unique
    for(let uniqueField of membershipFieldsUnique) {
        if(await checkValueExists('customer', uniqueField, information[uniqueField], true)) {
            return {
                'message': `${uniqueField} ${information[uniqueField]} is already taken.`,
                'inputs': [
                    {
                        'text': 'Okay',
                        'type': 'a',
                        'classList': 'btn btn-lg btn-success mt-1'
                    }
                ],
            };
        }
    }
    
    if(information.email == null || information.email == undefined || information.email.trim() === '') {
        information.email = null;
    } else {
        information.email = `'${information.email}'`;
    }
    let values = `
        '${information.fName}', '${information.mName}', '${information.lName}', '${information.address}', '${information.city}',
        '${information.state}', '${information.zipcode}', '${information.sex}', '${information.personID}', '${information.username}',
        '${information.password}', ${information.email}
    `;
    return await Query(`INSERT INTO Customer(${customerValues}) VALUES(${values})`).then((data)=> { 
        if(data.severity === 'ERROR') {
            rollback('Customer');
            console.log('error: ', data);
            return {
                'message': `Something went wrong`,
                'inputs': [
                    {
                        'text': 'Okay',
                        'type': 'a',
                        'classList': 'btn btn-lg btn-success mt-1'
                    }
                ],
            };
        }
        else {
            return {
                'message': `Successfully created your account!\nYou may sign-in now.`,
                'inputs': [
                    {
                        'text': 'Okay',
                        'type': 'a',
                        'classList': 'btn btn-lg btn-success mt-1',
                        'href': './login.html'
                    }
                ],
            };
        }
        return data; 
    });
}

async function getLoans(condition) {
    let conditionStr = '';
    if(condition) {
        conditionStr = ' WHERE '+condition;
    }
    return await Query(`SELECT * FROM Loan${conditionStr}`).then((data)=> { return data; });
}

const loanValues = 'customerID, Amount, AmountLeft , InterestPercent, InterestPeriod, interestPeriodQuantity, dueDate, amountDue';
async function addLoan(loanData, customerID) {
    let vPW = await verifyPassword(loanData.verifyPassword, customerID);
    if(!vPW.match) {
        return {
            'message': `PersonID or Password does not match.`,
            'inputs': [
                {
                    'text': 'Okay',
                    'type': 'a',
                    'classList': 'btn btn-lg btn-warning mt-1'
                }
            ],
        };
    }

    let vPID = await verifyPersonID(loanData.verifyPersonID, customerID);
    if(!vPID.match) {
        return {
            'message': `PersonID or Password does not match.`,
            'inputs': [
                {
                    'text': 'Okay',
                    'type': 'a',
                    'classList': 'btn btn-lg btn-warning mt-1'
                }
            ],
        };
    }

    if(!validLoanAmountAndTermLength(loanData.loanAmount, loanData.termLength)) {
        return {
            'message': `Loan amount or term length are invalid.`,
            'inputs': [
                {
                    'text': 'Okay',
                    'type': 'a',
                    'classList': 'btn btn-lg btn-warning mt-1'
                }
            ],
        };
    }
    let response = await Query(`INSERT INTO Loan(${loanValues}) 
        VALUES(${customerID}, ${loanData.loanAmount}, ${tools.calculateMonthlyPayment(loanData.loanAmount, loanData.termLength/12, 12, yearlyInterestPercent/100)*Number(loanData.termLength)}, ${yearlyInterestPercent}, 'MONTH', ${loanData.termLength}, 
        CURRENT_DATE + interval '1 month', ${tools.calculateMonthlyPayment(loanData.loanAmount, loanData.termLength/12, 12, yearlyInterestPercent/100)})`).then((data)=> { return data; });

    if (response.name === 'error') {
        console.log(response);
        return {
            'message': `Something went wrong.`,
            'inputs': [
                {
                    'text': 'Okay',
                    'type': 'a',
                    'classList': 'btn btn-lg btn-warning mt-1',
                    'href': '.'
                }
            ],
        };
    }

    return {
        'message': `Congrats, you were approved for your $${tools.formatMoney(Number(loanData.loanAmount))} loan!`,
        'inputs': [
            {
                'text': 'Okay',
                'type': 'a',
                'classList': 'btn btn-lg btn-success mt-1',
                'href': '../loans.html'
            }
        ],
    };
    
}

function getLoanInterestRate() {
    return yearlyInterestPercent
}

function validLoanAmountAndTermLength(loanAmount, termLength) {
    let termLengthValues = getTermLength();
    for(let loanAmountKey of Object.keys(termLengthValues)) {
        if(Number(loanAmount) <= Number(loanAmountKey)) {
            let range = termLengthValues[loanAmountKey];
            if(range === null) {
                return false;
            }
            else {
                if(range[0]<=termLength && termLength<=range[1]) {
                    return true;
                }
                return false;
            }
        }
    }
}


function getTermLength() {
    return {
        99: null,
        300: [1, 8],
        1000: [2, 24],
        5000: [3, 48],
        15000: [6, 120],
        30000: [9, 180],
        100000: [12, 360],
        250000: [18, 480],
        500000: [24, 600]

    }
}

async function getCardNames(customerID) {
    return await Query(`select cardName from creditcard WHERE customerID = ${customerID} AND cardName is NOT NULL UNION 
    select cardName from debitcard WHERE cardName is NOT null AND accountNumber IN (SELECT accountNumber FROM ACCOUNT WHERE customerID = ${customerID})
    `).then((data)=> { return data; });
}

async function cardNameTaken(customerID, givenCardName) {
    console.log(customerID, 'here');
    console.log(`getting cards owned by user ${customerID}`);

    let cardNames = await getCardNames(customerID);
    console.log(cardNames);
    for(let cardName of cardNames) {
        if(cardName.cardname === givenCardName) {
            return true;
        }
    }
    return false;
}

async function accountNameTaken(customerID, givenAccountName) {
    console.log(`getting account owned by user ${customerID}`);

    let accounts = await getAccountNames(`customerID = ${customerID}`);
    for(let account of accounts) {
        if(account.accountname === givenAccountName) {
            return true;
        }
    }
    return false;
}

async function getCards(condition) {
    let conditionStr = '';
    if(condition) {
        conditionStr = ' WHERE '+condition;
    }
    return await Query(`SELECT * FROM card${conditionStr}`).then((data)=> { return data; });
}

async function getCreditCards(condition) {
    let conditionStr = '';
    if(condition) {
        conditionStr = ' WHERE '+condition;
    }
    return await Query(`SELECT * FROM creditcard${conditionStr}`).then((data)=> { return data; });
}

let creditCardValues = 'customerid, securitycode, cardname, fname, mname, lname, address, city, state, zipcode, designID, expirationdate, creditlimit, interestpercent';
async function addCreditCard(creditCardInfo, customerID) {
    let cNT = await cardNameTaken(customerID, creditCardInfo.cardName);
    if (cNT) {
        return {
            'message': `Card name is already taken.`,
            'inputs': [
                {
                    'text': 'Okay',
                    'type': 'a',
                    'classList': 'btn btn-lg btn-warning mt-1'
                }
            ],
        };
    }


    let vPW = await verifyPassword(creditCardInfo.verifyPassword, customerID)
    if (!vPW.match) {
        return {
            'message': `Password or PersonID does not match.`,
            'inputs': [
                {
                    'text': 'Okay',
                    'type': 'a',
                    'classList': 'btn btn-lg btn-warning mt-1'
                }
            ],
        };
    }
    

    let vPID = await verifyPersonID(creditCardInfo.verifyPersonID, customerID)
    if (!vPID.match) {
        return {
            'message': `Password or PersonID does not match.`,
            'inputs': [
                {
                    'text': 'Okay',
                    'type': 'a',
                    'classList': 'btn btn-lg btn-warning mt-1'
                }
            ],
        };
    }


    let cardDesignInfo = await Query(`SELECT designName, baseLimit, baseInterestRate FROM CreditCardDesign WHERE DesignID = ${creditCardInfo.cardDesign}`);
    if(cardDesignInfo.severity === 'ERROR') {
        return {
            'message': `Something went wrong, reloading page.`,
            'inputs': [
                {
                    'text': 'Okay',
                    'type': 'a',
                    'classList': 'btn btn-lg btn-warning mt-1',
                    'href': ''
                }
            ],
        };
    }
    let values = `
        ${customerID}, '932', '${creditCardInfo.cardName}', '${creditCardInfo.fName}', '${creditCardInfo.mName}', '${creditCardInfo.lName}', '${creditCardInfo.address}', '${creditCardInfo.city}',
        '${creditCardInfo.state}', '${creditCardInfo.zipcode}', '${creditCardInfo.cardDesign}', CURRENT_DATE + interval '48 months', '${cardDesignInfo[0].baselimit}', 
        '${cardDesignInfo[0].baseinterestrate}'
    `;
    
    return await Query(`INSERT INTO CreditCard(${creditCardValues}) VALUES(${values}) RETURNING cardNumber, expirationDate`).then((data)=> { 
        if(data.severity === 'ERROR') {
            rollback('Card', true);
        }
        else {
            applyCVC(data[0].cardnumber, generateCVC(data[0].cardnumber, data[0].expirationdate));
            return {
                'message': `You have been approved for your ${cardDesignInfo[0].designname} credit card!`,
                'inputs': [
                    {
                        'text': 'Okay',
                        'type': 'a',
                        'classList': 'btn btn-lg btn-success mt-1',
                        'href': '../cards.html'
                    }
                ],
            };
        }
        return data; 
    });
    
}

let debitCardValues = 'accountnumber, securitycode, cardname, fname, mname, lname, address, city, state, zipcode, designID, expirationdate';
async function addDebitCard(debitCardInfo, customerID) {
    console.log(debitCardInfo);
    let cNT = await cardNameTaken(customerID, debitCardInfo.cardName);
    if (cNT) {
        return {
            'message': `Card name is already taken.`,
            'inputs': [
                {
                    'text': 'Okay',
                    'type': 'a',
                    'classList': 'btn btn-lg btn-warning mt-1'
                }
            ],
        };
    }


    let vPW = await verifyPassword(debitCardInfo.verifyPassword, customerID)
    if (!vPW.match) {
        return {
            'message': `Password or PersonID does not match.`,
            'inputs': [
                {
                    'text': 'Okay',
                    'type': 'a',
                    'classList': 'btn btn-lg btn-warning mt-1'
                }
            ],
        };
    }
    

    let vPID = await verifyPersonID(debitCardInfo.verifyPersonID, customerID)
    if (!vPID.match) {
        return {
            'message': `Password or PersonID does not match.`,
            'inputs': [
                {
                    'text': 'Okay',
                    'type': 'a',
                    'classList': 'btn btn-lg btn-warning mt-1'
                }
            ],
        };
    }

    let cardDesignInfo = await Query(`SELECT designName FROM DebitCardDesign WHERE DesignID = ${debitCardInfo.cardDesign}`);
    if(cardDesignInfo.severity === 'ERROR') {
        return {
            'message': `Something went wrong, reloading page.`,
            'inputs': [
                {
                    'text': 'Okay',
                    'type': 'a',
                    'classList': 'btn btn-lg btn-warning mt-1',
                    'href': ''
                }
            ],
        };
    }
    
    let values = `
        ${debitCardInfo.checkingAccount}, '000', '${debitCardInfo.cardName}', '${debitCardInfo.fName}', '${debitCardInfo.mName}', '${debitCardInfo.lName}', '${debitCardInfo.address}', '${debitCardInfo.city}',
        '${debitCardInfo.state}', '${debitCardInfo.zipcode}', '${debitCardInfo.cardDesign}', CURRENT_DATE + interval '48 months'
    `;
    console.log(`INSERT INTO DebitCard(${debitCardValues}) VALUES(${values})`);
    return await Query(`INSERT INTO DebitCard(${debitCardValues}) VALUES(${values}) RETURNING cardNumber, expirationDate`).then((data)=> { 
        if(data.severity === 'ERROR') {
            rollback('Card', true);
            console.log(data);
            return {
                'message': `Something went wrong while ordering your debit card. Reloading page.`,
                'inputs': [
                    {
                        'text': 'Okay',
                        'type': 'a',
                        'classList': 'btn btn-lg btn-warning mt-1',
                        'href': ''
                    }
                ],
            };
        }
        else {
            applyCVC(data[0].cardnumber, generateCVC(data[0].cardnumber, data[0].expirationdate));
            return {
                'message': `You have been approved for your ${cardDesignInfo[0].designname} debit card!`,
                'inputs': [
                    {
                        'text': 'Okay',
                        'type': 'a',
                        'classList': 'btn btn-lg btn-success mt-1',
                        'href': '../cards.html'
                    }
                ],
            };
        }
    });
}

async function getDebitCards(condition) {
    let conditionStr = '';
    if(condition) {
        conditionStr = ' WHERE '+condition;
    }
    let cards = await Query(`SELECT * FROM debitcard${conditionStr}`).then((data)=> { return data; });
    if (cards.length === 0) {
        return [];
    }

    let currentDate = (await Query(`SELECT NOW()`))[0].now;
    let currentYear = currentDate.getFullYear();
    let currentMonth = currentDate.getMonth()+1;
    for(let card of cards) {
        let total = 0;
        let transactions = await getDebitCardAmountSpent(card.cardnumber, `EXTRACT(MONTH FROM date)=${currentMonth} AND EXTRACT (YEAR FROM date)=${currentYear}`);
        for(let transaction of transactions) {
            total += Number(transaction.amount);
        }
        card.amountspentthismonth = tools.formatMoney(total);
    }
    return cards;
}

async function getDebitCardAmountSpent(cardnumber, condition) {
    let conditionStr = '';
    if(condition) {
        conditionStr = ' AND '+condition;
    }
    return await Query(`select amount from accounttransaction WHERE cardNumber = ${cardnumber}${conditionStr}`).then((data)=> { return data; });
}

async function getCardDesigns(cardType, condition) {
    let conditionStr = '';
    if(condition) {
        conditionStr = ' WHERE '+condition;
    }
    return await Query(`SELECT * FROM ${cardType}CardDesign${conditionStr}`).then((data)=> { return data; });
}

const accountValues = 'customerID, accountType, accountName, interestRate, allowOverdraw';
async function addAccount(accountInfo, customerID) {
    let aNT = await accountNameTaken(customerID, accountInfo.accountName.trim());
    if(aNT) {
        return {
            'message': 'Account name is already taken.',
            'inputs': [
                {
                    'text': 'Okay',
                    'type': 'a',
                    'classList': 'btn btn-lg btn-warning mt-1'
                }
            ],
        };
    }
    let vPW = await verifyPassword(accountInfo.verifyPassword, customerID);
    if(!vPW.match) {
        return {
            'message': 'Password does not match',
            'inputs': [
                {
                    'text': 'Okay',
                    'type': 'a',
                    'classList': 'btn btn-lg btn-warning mt-1'
                }
            ],
        };
    }
    else {
        let accountType = ''
        if(accountInfo.accountType === 1) {
            accountType = 'CHECKING';
        }
        else if (accountInfo.accountType === 2) {
            accountType = 'SAVING';
        }
        else {
            return {
                'message': 'Something went wrong. Reload page.',
                'inputs': [
                    {
                        'text': 'Okay',
                        'type': 'a',
                        'classList': 'btn btn-lg btn-warning mt-1'
                    }
                ],
            };
        }

        return await Query(`INSERT INTO ACCOUNT(${accountValues}) VALUES
        (${customerID}, '${accountType}', '${accountInfo.accountName}', ${savingsInterestRate}, ${accountInfo.allowOverdraw})`).then((data)=> {
            if(data.name === 'error') {
                console.log(data);
                return {
                    'message': 'Something went wrong. Reload page.',
                    'inputs': [
                        {
                            'text': 'Okay',
                            'type': 'a',
                            'classList': 'btn btn-lg btn-warning mt-1',
                            'href': '',
                        }
                    ],
                };
            }
            return {
                'message': 'Successfully created Account!',
                'inputs': [
                    {
                        'text': 'Okay',
                        'type': 'a',
                        'classList': 'btn btn-lg btn-success mt-1',
                        'href': '../accounts.html'
                    }
                ],
            };
        });
    }
}
//     'message': 'yo', 
//     'inputs': [
//         {
//             'text': '',
//             'type': 'a',
//             'classList': 'input',
//             'break-line': true
//         },
//         {
//             'text': 'sad22',
//             'type': 'a',
//             'classList': 'btn btn-lg btn-success mt-1',
//             'onclick': () => { console.log('yawza'); }
//         },
//         {
//             'text': 'sad',
//             'type': 'a',
//             'classList': 'btn btn-lg btn-success mt-1',
//             'href': '../'
//         }
//     ]
// }

async function getAccountNames(condition) {
    let conditionStr = '';
    if(condition) {
        conditionStr = ' WHERE '+condition;
    }
    return await Query(`select accountName, accountNumber from account${conditionStr}`).then((data)=> { return data; });
}

async function getCheckingAccounts(condition) {
    let conditionStr = '';
    if(condition) {
        conditionStr = ' WHERE '+condition;
    }
    console.log(`SELECT * FROM account${conditionStr}`);
    return await Query(`SELECT * FROM account${conditionStr}`).then((data)=> { return data; });
}


async function getSavingsAccounts(condition) {
    let conditionStr = '';
    if(condition) {
        conditionStr = ' WHERE '+condition;
    }
    return await Query(`SELECT * FROM account${conditionStr}`).then((data)=> { return data; });
}

async function getAccountHistory(accountNumber, month, year) {
    // console.log(`select * from accounttransaction WHERE accountNumber = ${accountNumber} AND EXTRACT(MONTH FROM date)=${month} AND EXTRACT (YEAR FROM date)=${year} ORDER BY date`);
    return await Query(`select * from accounttransaction WHERE accountNumber = ${accountNumber} AND EXTRACT(MONTH FROM date)=${month} AND EXTRACT (YEAR FROM date)=${year} ORDER BY date DESC`);
}

async function getCreditCardHistory(cardNumber, month, year) {
    return await Query(`select * from creditcardtransaction WHERE cardNumber = ${cardNumber} AND EXTRACT(MONTH FROM date)=${month} AND EXTRACT (YEAR FROM date)=${year} ORDER BY date DESC`);
}

async function getDebitCardHistory(cardNumber, month, year) {
    return await Query(`select * from accountTransaction where cardNumber = ${cardNumber} AND EXTRACT(MONTH FROM date)=${month} AND EXTRACT (YEAR FROM date)=${year} ORDER BY date DESC`);
}

async function getLoanHistory(loanID, month, year) {
    return await Query(`select * from loanTransaction where loanID = ${loanID} AND EXTRACT(MONTH FROM date)=${month} AND EXTRACT (YEAR FROM date)=${year} ORDER BY date DESC`);
}

async function getAccountTransactionDates(ID) {
    dates = await Query(`select date from accounttransaction WHERE accountNumber = ${ID} ORDER BY date`);
    return dates;
}

async function getCreditCardTransactionDates(ID) {
    dates = await Query(`select date from creditcardtransaction WHERE cardNumber = ${ID} ORDER BY date`);
    return dates;
}

async function getDebitCardTransactionDates(ID) {
    dates = await Query(`select date from accounttransaction WHERE cardNumber = ${ID} ORDER BY date`);
    return dates;
}

async function getLoanTransactionDates(ID) {
    dates = await Query(`select * from loanTransaction WHERE loanID = ${ID} ORDER BY date`);
    return dates;
}

async function processPayment(transactionObject) {
    // make sure payment amount is greater than 0
    console.log('Processing payment for ', transactionObject);
    if(!(transactionObject.paymentAmount > 0) || !transactionObject.paymentAmount) {
        return 'Payment amount is invalid';
    }
    let transactionReason = transactionObject.transactionReason;
    let paymentAmount = Number(transactionObject.paymentAmount);

    console.log('transaction object:', transactionObject);
    // processing payment object
    if (!tools.hasKeys(transactionObject, ['paymentAmount', 'paymentType', 'paymentObject', 
    'destinationType', 'destinationObject'])) {
        return 'all keys are not present in the transaction object';
    }

    if(transactionObject.paymentType == transactionObject.destinationType && transactionObject.paymentType == 'credit') {
        return 'cannot pay a credit card with a credit card';
    }

    asset = await acquireAsset(transactionObject.paymentType, transactionObject.paymentObject);
    if(transactionObject.paymentType === 'debit') {
        transactionObject.paymentType = 'account';
        transactionObject.paymentObject = {
            accountNumber: asset.accountnumber
        };
        let cardNumberTemp = asset.cardnumber;
        asset = await acquireAsset('account', transactionObject.paymentObject);
        asset.cardnumber = cardNumberTemp;
    }

    let destination = await acquireAsset(transactionObject.destinationType, transactionObject.destinationObject);
    if(!destination) {
        return 'could not get destination';
    }
    if(transactionObject.destinationType === 'debit') {
        transactionObject.destinationType = 'account';
        transactionObject.destinationObject = {
            accountNumber: destination.accountnumber
        };
        let cardNumberTemp = destination.cardnumber;
        destination = await acquireAsset('account', transactionObject.destinationObject);
        destination.cardnumber = cardNumberTemp;
    }
    // processing target object
    console.log('asset:', asset);
    console.log('destination:', destination);
    // `UPDATE card SET securityCode = '${cvc}' WHERE cardNumber = ${cardNumber}`
    let sufficientFunds = false;

    if(transactionObject.destinationType === 'credit') {
        if(Number(destination.creditused) <= 0) {
            return 'This card has already been paid off.';
        }
        destination.creditused -= paymentAmount;
        if(Number(destination.minimumpayment) <= paymentAmount) {
            destination.minimumpayment = 0;
        } else {
            destination.minimumpayment = Number(destination.minimumpayment) - paymentAmount;
        }
        if(destination.creditused < 0) {
            paymentAmount = destination.creditused + paymentAmount;
            destination.creditused = 0;
        }
    } else if(transactionObject.destinationType === 'loan') {
        if(Number(destination.amountdue) <= 0) {
            return 'There is no balance for this loan.';
        }
        destination.amountdue -= paymentAmount;
        destination.amountleft -= paymentAmount;
        if(destination.amountdue < 0) {
            paymentAmount = destination.amountdue + paymentAmount;
            destination.amountdue = 0;
            destination.amountleft = 0;
        }
    } else if (transactionObject.destinationType === 'account') {
        destination.balance = Number(destination.balance) + paymentAmount;
    } else {
        console.log("PROBLEM!!! Couldn\'t take money out of asset because type is not handled");
        return 'uhhhh something went very wrong : 858334';
    }

    if(transactionObject.paymentType === 'credit') {
        sufficientFunds = (asset.creditlimit - asset.creditused > paymentAmount);
        asset.creditused = Number(asset.creditused) + Number(paymentAmount);
        console.log('CHARGING CREDIT CARD');
    } else if (transactionObject.paymentType === 'account') {
        sufficientFunds = (Number(asset.balance) > paymentAmount);
        asset.balance = Number(asset.balance) - paymentAmount;
    } else {
        console.log("PROBLEM!!! Couldn\'t take money out of asset because type is not handled");
    }

    if(!sufficientFunds) {
        return `insufficient funds.`;
    }

    // updates the info on the assets involved with the transactions
    await updateAsset(transactionObject.paymentType, asset, true, transactionReason, -paymentAmount);
    await updateAsset(transactionObject.destinationType, destination, true, transactionReason, paymentAmount);

    return `Transaction successful`;
}

async function updateAsset(assetType, assetObject, addTransaction = false, transactionSource = 'unknown', transactionAmount = 0) {
    let updateCommand = null;
    let transactionCommand = null;
    console.log('updating asset:', assetObject);
    switch (assetType) {
        case 'account': {
            let cardNumber = null;
            if(assetObject.cardnumber) {
                cardNumber = assetObject.cardnumber;
                delete assetObject.cardnumber;
            }
            updateCommand = `UPDATE account SET ${jsonToString(assetObject)} WHERE accountNumber = ${assetObject.accountnumber}`;
            if(addTransaction) {
                transactionCommand = `INSERT INTO AccountTransaction(accountNumber, source, amount, date, cardNumber) 
                VALUES(${assetObject.accountnumber}, '${transactionSource}', ${transactionAmount}, NOW(), ${cardNumber})`;
            }
            break;
        }
        case 'credit': {
            updateCommand = `UPDATE creditCard SET ${jsonToString(assetObject)} WHERE cardNumber = ${assetObject.cardnumber}`;
            if(addTransaction) {
                transactionCommand = `INSERT INTO CreditCardTransaction(cardNumber, source, amount, date) 
                VALUES(${assetObject.cardnumber}, '${transactionSource}', ${transactionAmount}, NOW())`;
            }
            break;
        }
        case 'loan': {
            updateCommand = `UPDATE loan SET ${jsonToString(assetObject)} WHERE loanid = ${assetObject.loanid}`;
            if(addTransaction) {
                transactionCommand = `INSERT INTO LoanTransaction(loanID, source, amount, Date) 
                VALUES(${assetObject.loanid}, '${transactionSource}', ${transactionAmount}, NOW())`;
            }
            break;
        }
        case 'debit': {
            console.log('not ready yet');
        }
    }
    console.log('asd', updateCommand);
    let response = await Query(updateCommand);
    console.log(response);
    if (addTransaction) {
        console.log('transaction thing:', transactionCommand);
        let transactionResponse = await Query(transactionCommand);
        console.log(transactionResponse);
    }
}

async function acquireAsset(assetType, assetObject) {
    console.log('acquireAssetData:', assetType, assetObject);
    let aquisitionCommand = null;
    switch (assetType) {
        case 'account': {
            if (!tools.hasKeys(assetObject, ['accountNumber'])) {
                console.log('object does not have accountNumber');
                break;
            }
            aquisitionCommand = `select * from account WHERE accountNumber = ${assetObject.accountNumber}`;
            break;
        }
        case 'credit': {
            if (!tools.hasKeys(assetObject, ['cardNumber'])) {
                console.log('object does not have card type');
                break;
            }
            aquisitionCommand = `select * from creditCard WHERE cardNumber = ${assetObject.cardNumber}`;
            break;
        }
        case 'debit': {
            aquisitionCommand = `select * from debitCard WHERE cardNumber = ${assetObject.cardNumber}`;
            break;
        }
        case 'loan': {
            aquisitionCommand = `select * from loan WHERE loanid = ${assetObject.loanID}`;
            break;
        }
    }

    if (aquisitionCommand) {
        let assetResponse = await Query(aquisitionCommand);
        if(assetResponse.length == 0) {
            console.log(`${transactionObject.paymentType} does not exist`);
            return null;
        }
        else {
            return assetResponse[0];
        }
    }
    return null; 
}

async function rollback(relationName, useNumber = false) {
    let postfix = 'ID';
    if (useNumber) {
        postfix = 'Number';
    } 
    await Query(`SELECT setval('${relationName}_${relationName}${postfix}_seq', MAX(${relationName}${postfix}), true) FROM ${relationName};`).then((data)=> { 
        if(data.severity === 'ERROR') {
            console.log('ERROR ERROR ERROR: ', data);
        }
        else {
            console.log(`Rollback on ${relationName} successful`);
        }
    });
}

async function verifyPassword(password, customerID) {
    // compare password
    let actualPassword = (await Query(`Select password from Customer WHERE customerID = ${customerID}`));
    if(actualPassword.name === 'error') {
        return { 
            'message': 'could not access current user\'s password',
            'match': false
        };
    }
    else {
        console.log(actualPassword[0].password);
        if (actualPassword[0].password === password) {
            return {
                'match': true
            };
        }
        return {
            'message': 'password does not match',
            'match': false
        };
    }
}

async function verifyPersonID(personID, customerID) {
    // compare password
    let actualPersonID = (await Query(`Select personID from Customer WHERE customerID = ${customerID}`));
    if(actualPersonID.name === 'error') {
        return { 
            'message': 'could not access current user\'s personID',
            'match': false
        };
    }
    else {
        console.log(actualPersonID[0].personid);
        if (actualPersonID[0].personid === personID) {
            return {
                'match': true
            };
        }
        return {
            'message': 'personID does not match',
            'match': false
        };
    }
}

async function usernameTaken(username) {
    let matchingUsername = await Query(`Select username from Customer WHERE username = '${username}'`);
    if(matchingUsername.length >= 1) {
        console.log('down here');
        return true;
    }
    return false;
}

async function emailTaken(email) {
    let matchingEmail = await Query(`Select email from Customer WHERE email = '${email}'`);
    if(matchingEmail.length >= 1) {
        return true;
    }
    return false;
}

async function personIDTaken(personID) {
    let matchingEmail = await Query(`Select personID from Customer WHERE personID = '${personID}'`);
    if(matchingEmail.length >= 1) {
        return true;
    }
    return false;
}

async function userOwns(assetType, assetID, customerID) {
    if(customerID === undefined) {
        console.log('UserOwns: CustomerID is undefined');
        return false;
    }
    assetType = assetType.toLowerCase();
    queryStr = ''
    switch(assetType) {
        case 'account':
            queryStr = `SELECT COUNT(*) FROM ${assetType} WHERE accountNumber = ${assetID} AND customerID = ${customerID}`;
            break;
        case 'creditcard':
            queryStr = `SELECT COUNT(*) FROM ${assetType} WHERE cardNumber = ${assetID} AND customerID = ${customerID}`;
            break;
        case 'loan':
            queryStr = `SELECT COUNT(*) FROM ${assetType} WHERE loanID = ${assetID} AND customerID = ${customerID}`;
            break;
        case 'debitcard':
            queryStr = `select COUNT(*) from debitcard where cardnumber = ${assetID} AND accountNumber IN (Select accountNumber FROM account WHERE customerID = ${customerID})`;
            break;
        case 'card':
            queryStr = `select COUNT(*) from debitcard where cardnumber = ${assetID} AND accountNumber IN (Select accountNumber FROM account WHERE customerID = ${customerID}) UNION select COUNT(*) from creditcard WHERE customerID = ${customerID}`;
            break;
        default:
            console.log('UserOwns: assetType does not exist.');
            return false;     
    }
    return await Query(queryStr).then((data) => {
        console.log(data);
        if(data.name === 'error') {
            console.log('something went wrong in userOwns:', data, queryStr);
            return false;
        } else if (data.length == 0) {
            return false;
        }
        else if (assetType == 'card') {
            if(data[0].count == 0 && data[1].count == 0) {
                return false;
            }
        } else if (data[0].count == 0) {
            return false;
        }
        return true;
    });
}


const verifyAssetAccountKeys = {
    'fName': 'fname', 'mName': 'mname', 'lName': 'lname', 'address': 'address', 'state': 'state', 
    'city': 'city', 'zipcode': 'zipcode', 'personID': 'personid'
};

async function verifyAsset(assetType, assetData) {
    console.log(assetType, assetData);
    if(!assetType || !assetData) {
        console.log('VerifyAsset: Missing assetType or assetData');
        console.log('assetType:', assetType);
        console.log('assetData:', assetData);
        
        return false;
    }
    assetType = assetType.toLowerCase();

    if(assetType === 'account') {
        if(!assetData.accountNumber) {
            console.log('VerifyAsset: Cannot verify account without account number');
            return false;
        }
        let accountResponse = await Query(`select * from account WHERE accountnumber = ${assetData.accountNumber}`);
        if(accountResponse.name === 'error') {
            console.log('VerifyAsset: Something went wrong while fetching account', accountResponse);
            return false;
        }
        let account = accountResponse[0];
        if(!account) {
            console.log('Verify Asset: Account does not exist');
            return false;
        }
        let accountOwnerResponse = await Query(`select * from customer WHERE customerid = ${account.customerid}`);
        if(accountOwnerResponse.name === 'error') {
            console.log('VerifyAsset: Something went wrong while fetching account owner', accountOwnerResponse);
            return false;
        }
        let accountOwner = accountOwnerResponse[0];

        account.fname = accountOwner.fname;
        account.mname = accountOwner.mname;
        account.lname = accountOwner.lname;
        account.address = accountOwner.address;
        account.state = accountOwner.state;
        account.city = accountOwner.city;
        account.zipcode = accountOwner.zipcode;
        account.personid = accountOwner.personid;
        
        for (let key of Object.keys(verifyAssetAccountKeys)) {
            if(assetData[key]) {
                if(!account[verifyAssetAccountKeys[key]] ) {
                    console.log(key, verifyAssetAccountKeys[key]);
                    return false;
                }
                if(assetData[key].toLowerCase().trim() !== account[verifyAssetAccountKeys[key]].toLowerCase().trim()) {
                    return false;
                }
            }
        }
    }
    else {
        console.log('VerifyAsset: currently not processing any other type than account');
        return false;
    }
    return true;
}

/**
 * Searches a given relation for a entry where Key = Value. If one or more results is returned, this function returns true.
 * 
 * If it returns 0 results, this returns false
 * 
 * In some cases, it can return NULL when the value searched doesn't exist.
 * 
 * @param {String} relation Relation that the key and value will be searched from
 * @param {String} key The key that will be seached
 * @param {String} value The value that will be searched
 * @param {Boolean} caseInsensitive If true, case of the value will be unimportant
 * @returns Boolean or Null. Boolean if the relation, key, and value are valid, and null otherwise.
 */
async function checkValueExists(relation, key, value, caseInsensitive = false) {
    let caseInsensitiveModification = (caseInsensitive && isNaN(Number(value)))? `UPPER(${key})`:key;
    
    let results = await Query(`select ${key} from ${relation} where ${caseInsensitiveModification} = '${value.toUpperCase()}';`);
    console.log(`unique results for ${key}: ${results}`);
    if(results.message == 'error') {
        console.log('something went wrong in checkValueExists:', results);
        return null;
    } else if (results.length == 0) {
        console.log(`${key} = '${value}' does not exist in relation ${relation}, returning false`);
        return false;
    } else {
        return true;
    }
}

const formKeys = ['email', 'username', 'personID', 'verifyPassword'];
async function formCheck(form, userID) {
    let res = null;
    let currentMessage = null;
    for(let key of formKeys) {
        if(form[key]) {
            switch (key) {
                case 'email':
                    res = await emailTaken(form[key]);
                    if(res) {
                        currentMessage = 'email is taken';
                    }
                    break;
                case 'verifyPassword':
                    res = await verifyPassword(form[key], userID);
                    if(!res.match) {
                        currentMessage = 'password does not match';
                    }
                    break;
                case 'personID':
                    res = await personIDTaken(form[key]);
                    if(res) {
                        currentMessage = 'PersonID is taken';
                    }
                    break;
                case 'username':
                    res = await usernameTaken(form[key]);
                    if(res) {
                        currentMessage = 'Username is taken';
                    }
                    break;
            }
        }

        if(currentMessage) {
            return currentMessage;
        }
    }
    return null;
}

async function Query(query) {
    try {
        const queryResults = await PGPool.query(query);
        return queryResults.rows;
    }
    catch (err) { return err; }
}

function applyCVC(cardNumber, cvc) {
    Query(`UPDATE card SET securityCode = '${cvc}' WHERE cardNumber = ${cardNumber}`).then((data) => {
        console.log(data);
    });
}

function generateCVC(cardNumber, expirationDate) {
    let year = Number(expirationDate.getFullYear());
    let month = Number(expirationDate.getMonth());
    let day = Number(expirationDate.getDay());
    let total = `${Math.abs(10442 + year-Math.pow(month, 2)+Math.round(Math.pow(day, 1.5))-cardNumber)}`.substring(2, 5);
    return tools.reverseStr(total);
}

function jsonToString(jsonData, allowBlank = false) {
    let returnStr = ''
    let processed = false;
    if(typeof(jsonData) === 'object') {
        for(let key of Object.keys(jsonData)) {
            processed = false;
            if(jsonData[key] === '') {
                if(!allowBlank) { continue; }
            }
            else if (jsonData === undefined || jsonData === null) { continue; }
            try {
                switch(jsonData[key].constructor.name) {
                    case 'Date':
                        processed = true;
                        returnStr += `${key} = '${tools.sqlDateToStr(jsonData[key])}', `;
                        break;
                }
            }
            catch {} 
            if(!processed) {
                switch(typeof(jsonData[key])) {
                    case 'object':
                        returnStr += `${key} = `;
                        returnStr += jsonData[key];
                        returnStr += `, `;
                        break;
                    case 'number':
                        returnStr += `${key} = ${jsonData[key]}, `;
                        break;
                    default:
                        returnStr += `${key} = \'${jsonData[key]}\', `;
                        break;
                }
            }
        }
        return returnStr.substring(0, returnStr.length-2);
    }
    else {
        console.log(jsonData);
        return null;
    }
}

module.exports = {
    getLoans, getCreditCards, getDebitCards, getCheckingAccounts, getSavingsAccounts, getMembershipInfo, setMembershipInfo,
    addMembershipInfo, verifyMembershipInfo, getCardDesigns, getCards, addCreditCard, getCardNames, getAccountNames, getAccountHistory, getAccountTransactionDates,
    getDebitCardAmountSpent, getCreditCardTransactionDates, getCreditCardHistory, getDebitCardHistory, getDebitCardTransactionDates,
    getLoanTransactionDates, getLoanHistory, addLoan, getLoanInterestRate, getTermLength, addAccount, addDebitCard, getMembershipPassword,
    getMembershipPersonID, processPayment, verifyAsset, updateAsset, userOwns, Query
};


