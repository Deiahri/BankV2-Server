const s_sds_zeros = '0000000000000000';
const coreHandler = require('./important/coreHandler');
const jwt = require('jsonwebtoken');

/**
 * Recieves a BIN and card number to generate a sixteen digit card number.
 * @param {STRING} cardNumber The card Number
 * @param {STRING} BIN The BIN
 * @returns 
 */
function generateFullCardNumber(cardNumber, BIN, spacing = false) {
    cardNumber = String(cardNumber);
    BIN = String(BIN);
    let cardNumPartial = BIN+s_sds_zeros.substring(BIN.length, s_sds_zeros.length-cardNumber.length-1) + cardNumber;
    let cardFull = cardNumPartial+generateLuhnCheckNumber(cardNumPartial);
    if (!spacing) {
        return cardFull;
    }
    let cardFullSpaced = '';
    for(let index = 0; index < cardFull.length; index++) {
        if(index%4 === 0 && index > 0) {
            cardFullSpaced += ' ';
        }
        cardFullSpaced += cardFull[index];
    }
    return cardFullSpaced;
}

function reverseFullCardNumber(fullCardNumber, BIN) {
    let fullCardNumberStr = String(fullCardNumber);
    if(fullCardNumber.length != 16 || isNaN(fullCardNumber)) {
        console.log('This is not a full card number:', fullCardNumber);
        return fullCardNumber
    }
    BIN = String(BIN);
    let cardNum = fullCardNumberStr.substring(BIN.length, fullCardNumberStr.length-1);
    return Number(cardNum);
}

function generateLuhnCheckNumber(cardNumber) {
    if(cardNumber.length === 16) {
        cardNumber = cardNumber.substring(0, cardNumber.length-1);
    }
    else if(cardNumber.length != 15) {
        console.log('card number', cardNumber, 'has a length of', cardNumber.length, 'which cannot be used to calculate Luhn Algorithm Number.');
        return null;
    }
    if (cardNumber.length === 15) {
        let sum = 0;
        let mode = false;
        for(let index = cardNumber.length - 1; index >= 0; index--) {
            let add = 0;
            let currentNum = Number(cardNumber[index]);
            if(mode) {
                add = currentNum;
            }
            else {
                add = (currentNum*2)%10 + Math.floor((currentNum*2)/10);
            }
            mode = !mode;
            sum += add;
        }
        
        return (10-(sum%10))%10;
        
    }
}

function formatMoney(number) {
    return number.toLocaleString('en-US', { style: 'currency', currency: 'USD' }).substring(1);
}

function calculateMonthlyPayment(principal, termYears, paymentsPerYear, annualInterestRate) {
    termYears = Number(termYears);
    principal = Number(principal);
    annualInterestRate = Number(annualInterestRate);
    paymentsPerYear = Number(paymentsPerYear);
    
    return (( principal*(annualInterestRate/paymentsPerYear) ) / (1 - Math.pow((1 + annualInterestRate/paymentsPerYear), -termYears*paymentsPerYear) )).toFixed(2);
}

function aprToMpr(apr) {
    if(Number(apr) != NaN) {
        return Math.pow(1+Number(apr)/100, 1/12) - 1;
    }
    console.log(apr, 'is not a number');
    return null;
}

function reverseStr(str) {
    let r = '';
    for(let character of str) {
        r = character+r;
    }
    return r;
}

/**
 * Recieves a value and expiration date, then returns a an object containing the key value and the expiration date
 * in the same way a cookie is formatted
 * @param {String} value 
 * @param {String} expiresIn 
 */
function createCookie(value, expiresIn) {
    let cookie = { value: value };
    if(expiresIn) {
        expiresIn = expiresIn.trim();
        let amount = '';
        let unit = '';
        for(let char of expiresIn) {
            if(!isNaN(Number(char))) {
                amount += char;
            }
            else {
                unit += char;
            }
        }
        unit = unit.trim();
        amount = Number(amount);
        const d = new Date();
        
        if(unit === 'd') {
            d.setTime(d.getTime() + (amount*24*60*60*1000));
        }
        else if(unit === 'hr') {
            d.setTime(d.getTime() + (amount*60*60*1000));
        }
        else if(unit === 'm') {
            d.setTime(d.getTime() + (amount*60*1000));
        }
        else if(unit === 's') {
            d.setTime(d.getTime() + (amount*1000));
        }
        else if(unit === 'ms') {
            d.setTime(d.getTime() + (amount));
        }
        cookie.expires = d.toUTCString();
    }  
    return cookie; 
}

function sign(object, objectSettings = {}) {
    return jwt.sign(object, coreHandler.secretCode, objectSettings);
}

function unsign(code) {
    try {
        return jwt.verify(code, coreHandler.secretCode);
    }
    catch(err) {
        console.log('expired?');
        return null;
    }
}


/**
 * Recieves a JSON and an array. Returns true if the JSON contains every key, 
 * and false otherwise
 * @param {Object} json Javascript Object
 * @param {Array} keys Keys the javascript object should contain
 * @returns {Boolean}
 */
function hasKeys(json, keys) {
    if(typeof(json) != 'object') {
        return false;
    }
    let jsonKeys = Object.keys(json);
    for(let key of keys) {
        if(!jsonKeys.includes(key)) {
            return false;
        }
    }
    return true;
}


function sqlDateToStr(sqlDate) {
    try {
        if(sqlDate.constructor.name === 'Date') {
            dateStr = ``+sqlDate;
            let split = dateStr.split(' '); // 0 = day of week | 1 = month | 2 = day | 3 = year | 4 = time | 5 = timezone | 6 = ???
            let sqlDateToStr = `${split[3]}-${monthToDigit(split[1])}-${split[2]} ${split[4]}`;
            return sqlDateToStr;
        }
    } catch {

    }
    // non-date detected
    return null;
}

const compareOrder = [3, 1, 2, 4];
/**
 * Recieves two dates. Returns 1 if the first date is greater (further into future) than second, -1 if second is greater than 1st, and 0 if they are equal.
 * @param {Date} Date1 
 * @param {Date} Date2 
 * @returns {Number}
 */
function compareDates(Date1, Date2) {
    let split1 = `${Date1}`.split(' '); // 0 = day of week | 1 = month | 2 = day | 3 = year | 4 = time | 5 = timezone | 6 = ???
    let split2 = `${Date2}`.split(' '); // 0 = day of week | 1 = month | 2 = day | 3 = year | 4 = time | 5 = timezone | 6 = ???
    for(let index of compareOrder) {
        if(index === 4) {
            let timeSplit1 = split1[index].split(':');
            let timeSplit2 = split2[index].split(':');
            for(let index2 in timeSplit1) {
                if(timeSplit1[index2] !== timeSplit2[index2]) {
                    // console.log(timeSplit1[index2], timeSplit2[index2], timeSplit1, timeSplit2, index2);
                    if(timeSplit1[index2] > timeSplit2[index2]) {
                        return 1;
                    }
                    return -1;
                }
            }
        } else if (index === 1) {
            if (monthToDigit(split1[index]) != monthToDigit(split2[index])) {
                if(monthToDigit(split1[index]) > monthToDigit(split2[index])) {
                    return 1;
                }
                return -1;
            }
        } else {
            if (split1[index] != split2[index]) {
                if(split1[index] > split2[index]) {
                    return 1;
                }
                return -1;
            }
        }
    }
    return 0;
}


/**
 * 
 * @param {Date} time 
 * @param {int} amount 
 * @param {string} type 
 * @returns 
 */
function addTime(time, amount, type) {
    if(time.constructor.name !== 'Date' || isNaN(Number(amount))) {
        return null;
    }
    type = type.substring(0, 2).toLowerCase();
    amount = Number(amount);
    type = type.toLowerCase();
    switch (type) {
        case 'se':
            time = new Date(time.getTime()+amount*1000);
            break;
        case 'mi':
            console.log('bruh');
            time = new Date(time.getTime()+amount*1000*60);
            break;
        case 'ho':
            time = new Date(time.getTime()+amount*1000*60*60);
            break;
        case 'da':
            time = new Date(time.getTime()+amount*1000*60*60*24);
            break;
        case 'mo':
            if(time.getMonth() + amount > 11) {
                time.setFullYear(time.getFullYear() + Number(((time.getMonth()+1+amount)/12).toFixed()));
                time.setMonth((time.getMonth() + amount)%12);
            } else {
                time.setMonth(time.getMonth() + amount);
            }
            break;
        case 'ye':
            time.setFullYear(time.getFullYear()+amount);
            break;
        default:
            return null;
    }
    return time;
}


function monthToDigit(month) {
    let digit = -1;
    if(!(typeof(month) === 'string') || month.length < 3) {
        return digit;
    }
    let firstTwoChar = month.substring(0, 3).toLowerCase();
    switch(firstTwoChar) {
        case 'jan':
            digit = 1; break;
        case 'feb':
            digit = 2; break;
        case 'mar':
            digit = 3; break;
        case 'apr':
            digit = 4; break;
        case 'may':
            digit = 5; break;
        case 'jun':
            digit = 6; break;
        case 'jul':
            digit = 7; break;
        case 'aug':
            digit = 8; break;
        case 'sep':
            digit = 9; break;
        case 'oct':
            digit = 10; break;
        case 'nov':
            digit = 11; break;
        case 'dec':
            digit = 12; break;
    }
    return digit;
}


/**
 * NOT IMPLEMENTED YET
 * @param {Object} obj1  This is the object we are comparing the contents of
 * @param {Object} obj2  This is the reference object. Obj1's contents need to match obj2's content for the specified keys
 * @param {Array} keys   These are the keys that are to be checked. If null, all keys are compared. (null by default)
 * @param {Boolean} strict if true, EVERY key needs to match (true by default)
 * @param {Boolean} caseSensitive if true, case is considered (true by default)
 * @returns {Boolean}
 */
function compareObjects(obj1, obj2, keys = null, strict = true, caseSensitive = true, trimValues = true) {
    if(keys != null) {
        if(strict && (!hasKeys(obj1, keys) || !hasKeys(obj2, keys))) {
            // strict mode requires both objects to contain the keys
            return false;
        }
    } else {
        if(strict && !hasKeys(obj1, Object.keys(obj2))) {
            // object 1 doesn't contain the keys of object 2
            return false;
        }
        keys = Object.keys(obj1);
    }

    console.log('COMPARING OBJECTS');
    for(let key of keys) {
        if(!obj1[key] || !obj2[key]) {
            if(strict) {
                return false;
            }
        } else {
            if(!compareValues(obj1[key], obj2[key], caseSensitive, trimValues)) {
                return false;
            }
        }
    }
    return true;
}


function compareValues(value1, value2, caseSensitive = true, trimValues = true) {
    if(!caseSensitive) {
        value1 = `${value1}`.toLowerCase();
        value2 = `${value2}`.toLowerCase();
    }
    if (trimValues) {
        value1 = `${value1}`.trim();
        value2 = `${value2}`.trim();
    }
    console.log(`${value1} == ${value2} ??`);
    return value1 == value2;   
}

/**
 * Used to send responses along with updated cookies.
 * @param {Response} res 
 * @param {Object} obj 
 */
function sendWithCookies(req, res, obj) {
    cookies = req.headers.cookies;
    obj.cookie = cookies;
    res.send(obj);
}

module.exports = { 
    generateFullCardNumber, reverseFullCardNumber, formatMoney, calculateMonthlyPayment, reverseStr, 
    createCookie, sign, unsign, hasKeys, sqlDateToStr, compareObjects, sendWithCookies, compareDates,
    aprToMpr, addTime
};
