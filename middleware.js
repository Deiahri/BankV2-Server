const tools = require('./tools');


function validateUser(req, res, next) {
    let user = null;
    if(req.headers.cookies) {
        let userToken = req.headers.cookies.userToken;
        let unSigned = tools.unsign(userToken);
        if(unSigned) {
            // console.log('unsigned:', unSigned);
            user = unSigned.userID;
            let expDate = new Date(parseInt(unSigned.exp)*1000);
            // console.log('expDate:', expDate, new Date(Date.now()));
            // updates cookie
            const token = tools.sign({ userID: unSigned.userID }, { expiresIn: '2hr'});
            req.headers.cookies.userToken = tools.createCookie(token, '1s');
        }
    }
    
    req.userID = user;
    next();
}

function requireUser(req, res, next) {
    if(req.userID === null) {
        res.send({
            'message': 'unauthorized'
        });
    }
    else {
        next();
    }
}

module.exports = {
    validateUser, requireUser
};
