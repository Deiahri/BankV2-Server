const express = require('express');
const Router = express.Router();
const pg = require('../postgresModule');
const tools = require('../tools');
const middleWareModule = require('../middleware');

Router.post('/login', (requestObj, responseObj) => {
    const { username, password } = requestObj.body;
    if(username && password) {
        if(username.length > 1 && password.length > 1) {
            pg.getMembershipPassword(username.trim()).then((passResponse) => {
                if(passResponse === null || passResponse.password !== passResponse.password) {
                    tools.sendWithCookies(requestObj, responseObj, {
                        'message': `Username or password is invalid`,
                        'inputs': [
                            {
                                'text': 'Okay',
                                'type': 'a',
                                'classList': 'btn btn-lg background-color-theme-second-lightest-hoverable'
                            }
                        ],
                    });
                }
                else if(passResponse.password === password) {
                    const token = tools.sign({ userID: passResponse.customerid }, { expiresIn: '1hr'});
                    responseObj.send({
                        'redirect': 'Pages/accounts.html',
                        'cookie': {
                            'userToken': tools.createCookie(token, '1hr')
                        }
                    });
                }
                else {
                    tools.sendWithCookies(requestObj, responseObj, {
                        'message': `Username or password is invalid`,
                        'inputs': [
                            {
                                'text': 'Okay',
                                'type': 'a',
                                'classList': 'btn btn-lg background-color-theme-second-lightest-hoverable'
                            }
                        ],
                    });
                }
            });
        }
        else {
            tools.sendWithCookies(requestObj, responseObj, {
                'message': `Login information is invalid`,
                'inputs': [
                    {
                        'text': 'Okay',
                        'type': 'a',
                        'classList': 'btn btn-lg background-color-theme-second-lightest-hoverable'
                    }
                ],
            });
        }
    } else {
        tools.sendWithCookies(requestObj, responseObj, {
            'message': `Login information is incomplete`,
            'inputs': [
                {
                    'text': 'Okay',
                    'type': 'a',
                    'classList': 'btn btn-lg background-color-theme-second-lightest-hoverable'
                }
            ],
        });
    }
    return;
});

Router.post('/sign-up', (requestObj, responseObj) => {
    pg.addMembershipInfo(requestObj.body).then((data)=> {
        tools.sendWithCookies(requestObj, responseObj, data);
    });
});


Router.use(middleWareModule.requireUser);

Router.post('/getInfo', (requestObj, responseObj) => {
    // console.log(requestObj.userID, 'user!');
    pg.getMembershipInfo(`customerID = ${requestObj.userID}`).then((data)=> {
        tools.sendWithCookies(requestObj, responseObj, data);
    });
});

Router.post('/setInfo', (requestObj, responseObj) => {
    pg.setMembershipInfo(`customerID = ${requestObj.userID}`, requestObj.body).then((data)=> {
        tools.sendWithCookies(requestObj, responseObj, data);
    });
});

module.exports = Router;
