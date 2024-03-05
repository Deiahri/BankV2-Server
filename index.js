const express = require('express');    // express package
const important = require('./important/coreHandler');
const middleWareModule = require('./middleware');
const inspect = require('./inspection/inspect');

// equivalent to 24 hours in milliseconds
const inspectionDelay = 1000*60*60*24;
// const inspectionDelay = 1000*10;

const expressApp = express();
const PORT = 8085;
expressApp.set('view engine', 'ejs');
expressApp.use(important.cors(important.corsOptions));
expressApp.use(express.json());
expressApp.use(prepareCookies);
expressApp.use(middleWareModule.validateUser);

// expressApp.use(inspect);

// function inspect(req, res, next) {
//     console.log('cookies:', req.headers.cookies);
//     console.log('user id:', req.userID);
//     next();
// }
/*
It’s the engine of shareholder capital. Eternal layoff cycles serve to depress workers market value, making labor weaker in the market. It makes it harder to unionize and depresses wages. 

Major corporations in every industry have this on lockdown. Cyclical layoffs and restructuring will save them money by forcing down wages and that savings exceeds the damage to efficiency and productivity. 

Tech has been less impacted by this cycle historically because it’s been dominated by Libertarian anti-union dudes from early on. However as these skill sets are becoming less niche and more mainstream the potential for unionization and labor advocacy has reared its head. 

The solution is what it has always been for corporate leadership. Create job insecurity, push mass layoff cycles, and create a job market hostile to the workers. 

The playbook is 200 years old.
*/


/**
 * Turns the cookies passed by the requester into cookie objects. 
 * 
 * The request header must have a key "cookies", and the cookie must be formatted as so: key=value; key2=value2... and so on.
 * @param {Object} req Request Object 
 * @param {*} res Response Object
 * @param {*} next Function to move on to the next request handler
 */
function prepareCookies(req, res, next) {
    let cookie = {};
    let cookieData = req.headers.cookies;
    if(cookieData) {
        let cookieSplit = cookieData.split(';');
        for(let cookieChunk of cookieSplit) {
            let cookieChunkSplit = cookieChunk.split('=');
            let cookieName = cookieChunkSplit[0].trim();
            let cookieData = cookieChunkSplit[1].trim();
            cookie[cookieName] = cookieData;
        }
    }
    req.headers.cookies = cookie;
    next();
}

const loanRoute = require('./routes/loanRoutes');
const cardRoute = require('./routes/cardRoutes');
const accountRoute = require('./routes/accountRoutes');
const membershipRoute = require('./routes/membershipRoutes');
const paymentRoute = require('./routes/paymentRoutes');
const transferRoute = require('./routes/transferRoutes');
const generalRoute = require('./routes/generalRoutes');
expressApp.use('/loan', loanRoute);
expressApp.use('/card', cardRoute);
expressApp.use('/account', accountRoute);
expressApp.use('/membership', membershipRoute);
expressApp.use('/payment', paymentRoute);
expressApp.use('/transfer', transferRoute);
expressApp.use('/general', generalRoute);


// takes in 1 mandatory parameter, and an optional call back parameter (executes once app has started).

// let intervalThing = setInterval(
//     () => console.log('herro'), 1000
// );

expressApp.listen(PORT, () => console.log(`The server is up. http://localhost:${PORT}`));


// runs an inspection immediately on server start
inspect.inspect();

// then runs inspections once every day
inspect.startInspect(inspectionDelay);