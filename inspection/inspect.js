const pg = require('../postgresModule');
const tools = require('../tools');
var intervalID = -1;
/**
 * Starts inspection process with the delay passed
 * @param {Number} delay 
 * @returns 
*/
function startInspect(delay) {
    if(intervalID == -1) {
        intervalID = setInterval(inspect, delay);
    } else {
        // console.log('Tried to start inspect interval, but server is currently already inspecting.');
    }
}

function stopInspect() {
    if(intervalID == -1) {
        // console.log('Tried to stop inspect interval, but server is currently not inspecting.');
    } else {
        clearInterval(intervalID);
        intervalID = -1;
    }
}

/**
 * Limits the number of quieries being handled during asset inspection
 */
const queriesPerQuery = 50;


async function inspect() {
    // apply interest rate bonus to savings accounts
    // inspectSavingsInterest();
    // inspectCreditCards();
    inspectLoans();
}

const minimumLoanLateFee = 35;
const loanLatePercentage = 0.05;
async function inspectLoans() {
    let currentTime = new Date(Date.now());
    let currentData = [];
    let numLoans = 0;
    await pg.Query(`select COUNT(*) from loan`).then((data)=> {
        numLoans = data[0].count;
    });
    
    let fee = 0;
    let dueDate = null;
    for(let loansProcessed = 0; loansProcessed < numLoans; loansProcessed += queriesPerQuery) {
        currentData = await pg.Query(`select loanid, amount, amountdue, amountleft, duedate, openDate, interestPeriodQuantity FROM loan LIMIT(${queriesPerQuery}) OFFSET(${loansProcessed})`);
        for(let currentLoan of currentData) {
            dueDate = currentLoan.duedate;
            // // console.log(currentLoan.lastinterestdate, currentTime, tools.compareDates(currentLoan.lastinterestdate, currentTime));
            // // console.log(currentTime);
            
            
            // if the current date is passed the due date, apply interest
            if(tools.compareDates(dueDate, currentTime) == -1) {
                
                // console.log(currentTime);
                dueDate = new Date(currentTime.getTime());
                dueDate = tools.addTime(dueDate, 1, 'month');
                dueDate.setDate(currentLoan.opendate.getDate() > 28 ? 28:currentLoan.opendate.getDate());
                currentLoan.duedate = dueDate;
                // customer did not pay off monthly due
                if(Number(currentLoan.amountdue) > 0) {
                    currentLoan.amountdue = tools.calculateMonthlyPayment(currentLoan.amount, currentLoan.interestperiodquantity/12, 12, pg.getLoanInterestRate()/100);
                    fee = (currentLoan.amountdue > minimumLoanLateFee) ? minimumLoanLateFee: Number((currentLoan.amountdue*loanLatePercentage).toFixed(2));
                    currentLoan.amountleft = Number(currentLoan.amountleft) + fee;
                    pg.updateAsset('loan', currentLoan, true, 'Late Fee', fee);
                } else {
                    currentLoan.amountdue = tools.calculateMonthlyPayment(currentLoan.amount, currentLoan.interestperiodquantity/12, 12, pg.getLoanInterestRate()/100);
                    pg.updateAsset('loan', currentLoan, false);
                }
            }
        }
    }
}


const minimumPaymentAmount = 35;
const maxLateFee = 300;
const lateFeePercentage = 0.08;
async function inspectCreditCards() {
    let currentTime = new Date(Date.now());
    let currentData = [];
    let numCreditCard = 0;
    await pg.Query(`select COUNT(*) from creditcard`).then((data)=> {
        numCreditCard = data[0].count;
    });
    
    let dueDate = null;
    let interestAmount = 0;
    let reason = 'Credit Interest';
    for(let creditCardsProcessed = 0; creditCardsProcessed < numCreditCard; creditCardsProcessed += queriesPerQuery) {
        currentData = await pg.Query(`select cardNumber, creditUsed, minimumPayment, duedate, dateOfCard, interestpercent FROM creditcard LIMIT(${queriesPerQuery}) OFFSET(${creditCardsProcessed})`);
        for(let currentCreditCard of currentData) {
            dueDate = currentCreditCard.duedate;
            // minimumDay = currentCreditCard.dateofcard.getDay()
            // minimumDateForInterest = new Date(currentCreditCard.lastinterestdate.getTime());
            // minimumDateForInterest.setDate(currentCreditCard.dateofcard.getDate() >= 28 ? 28: currentCreditCard.dateofcard.getDate());
            // minimumDateForInterest.setMonth(minimumDateForInterest.getMonth()+1);
            // // console.log(currentCreditCard.lastinterestdate, currentTime, tools.compareDates(currentCreditCard.lastinterestdate, currentTime));
            // // console.log(currentTime);
            
            
            // if the due date has passed the current date, apply interest
            if(tools.compareDates(dueDate, currentTime) == -1) {
                interestAmount = Number((Number(currentCreditCard.creditused) * (currentCreditCard.interestpercent)/100).toFixed(2));
                // user has not paid off this card
                if(Number(currentCreditCard.minimumpayment) > 0) {
                    reason = 'Credit Interest + Late Fee';
                    
                    // adds a late fee of 8% up to maxLateFee IF the minimumPayment balance was not paid by the due date.
                    interestAmount += (Number(currentCreditCard.creditused*lateFeePercentage) >= maxLateFee ? maxLateFee:Number((currentCreditCard.creditused*lateFeePercentage).toFixed(2)));
                }

                dueDate = currentCreditCard.duedate;
                
                tools.addTime(dueDate, 1, 'month');
                dueDate.setDate(currentCreditCard.dateofcard.getDate() > 28 ? 28:currentCreditCard.dateofcard.getDate());
                currentCreditCard.creditused = (Number(currentCreditCard.creditused) + Number(interestAmount));
                currentCreditCard.duedate = dueDate;
                if(currentCreditCard.creditused > minimumPaymentAmount) {
                    currentCreditCard.minimumpayment = (3*currentCreditCard.creditused*(Number(currentCreditCard.interestpercent)/100)) >= minimumPaymentAmount ? 
                        (3*currentCreditCard.creditused*(Number(currentCreditCard.interestpercent)/100)) : minimumPaymentAmount;
                } else {
                    currentCreditCard.minimumpayment = currentCreditCard.creditused;
                }
                    

                if(interestAmount > 0) {
                    pg.updateAsset('credit', currentCreditCard, true, reason, interestAmount);
                } else {
                    pg.updateAsset('credit', currentCreditCard, false);
                }

                // console.log('new creditused', currentCreditCard.creditused);
                reason = 'Credit Interest';
            }
            // // console.log(tools.compareDates(currentCreditCard.lastinterestdate, Date.now()));
        }
    }
}

async function inspectSavingsInterest() {
    let currentTime = new Date(Date.now());
    let currentData = [];
    let numSavings = 0;
    await pg.Query(`select COUNT(*) from account WHERE accountType = 'SAVING'`).then((data)=> {
        numSavings = data[0].count;
    });
    
    let minimumDateForInterest = null; 
    let minimumDay = null;
    let interestAmount = 0;
    for(let accountsProcessed = 0; accountsProcessed < numSavings; accountsProcessed += queriesPerQuery) {
        currentData = await pg.Query(`select accountNumber, balance, lastInterestDate, openDate, interestrate FROM account WHERE accountType = 'SAVING' LIMIT(${queriesPerQuery}) OFFSET(${accountsProcessed})`);
        
        for(let currentAccount of currentData) {
            minimumDay = currentAccount.opendate.getDay()
            minimumDateForInterest = new Date(currentAccount.lastinterestdate.getTime());
            minimumDateForInterest.setDate(currentAccount.opendate.getDate() >= 28 ? 28: currentAccount.opendate.getDate());
            tools.addTime(minimumDateForInterest, 1, 'month');
            // // console.log(currentAccount.lastinterestdate, currentTime, tools.compareDates(currentAccount.lastinterestdate, currentTime));
            // // console.log(currentTime);
            
            
            // if the date we can apply interest is less than the current date, apply interest
            if(tools.compareDates(minimumDateForInterest, currentTime) == -1) {
                interestAmount = (Number(currentAccount.balance) * Number(tools.aprToMpr(currentAccount.interestrate))).toFixed(2);
                currentAccount.balance = (Number(currentAccount.balance) + Number(interestAmount));
                currentAccount.lastinterestdate = currentTime;
                // console.log('new balance', currentAccount.balance);
                pg.updateAsset('account', currentAccount, true, 'Savings Interest', interestAmount);
            }
            // // console.log(tools.compareDates(currentAccount.lastinterestdate, Date.now()));
        }
    }
}



module.exports = {
    startInspect, stopInspect, inspect
};
