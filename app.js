'use strict';

var http = require('http');
var express = require('express');
var winston = require('winston');
var influencerManager = require('./src/influencer-mysql-manager');
var influencerRedisManager = require('./src/influencer-redis-manager');
var getTimeAnalytics = require('./src/influencer-mongo-manager');
var usersManager = require('./src/users-mysql-manager');

var logger = new(winston.Logger)({
    transports: [
        new(winston.transports.Console)(),
        new(winston.transports.File)({filename: '/home/omri/web-server.log'})
    ]
});
var app = express();

var jwt = require('express-jwt');

var jwtCheck = jwt({
    secret: new Buffer('zqFw5IjcPD59WQa2uhSxCIek89vak_f52ivBc_45xzoc4wCOY37RlBmmAvWQWXBx', 'base64'),
    audience: 'OyBgxN0YrFbw3Mk4jFom0grDbPDyVbHz'
});

var bodyParser = require('body-parser');
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use('/api/', jwtCheck);


app.get('/', function(req, res) {
    var userQuery = req.query;
    // join tables
    var pageNum = parseInt(userQuery['pageNum']);
    if (typeof pageNum === 'undefined' || isNaN(pageNum)){
        res.status(500).send('no page num specified!');
        logger.log('page num was sent undefined, request: ' + req.toString());
    } else {
        try {
            influencerManager.getInfluencers(userQuery, pageNum, res);
        } catch(e) {
            influencerManager.connectionErrorResponse(res, e);
        }
    }
});

app.post('/delete', function(req, res) {
    var influencer = req.body;
    if (influencer && influencer.hasOwnProperty('username')) {
        try {
            influencerRedisManager.deleteInfluencer(influencer);
            influencerManager.deleteInfluencer(influencer, res);

        } catch(e) {
            logger.error(e);
            res.status(500).send("Could not connect to DB!");
        }
    }
});

app.post('/report', function(req, res) {
    var influencers = req.body;
    if (influencers && influencers.hasOwnProperty('handles') && influencers.handles.length > 0) {
        try {
            influencerManager.getInfluencerReport(influencers, res);
        }catch(e) {
            logger.log('ERROR', e);
            res.status(500).send('<div><label>Could not get influencers from db</label></div>');
        }
    } else {
        res.status(500).send('<div><label>Bad Request</label></div>');
    }
});

app.get('/report_analytics', function(req, res){
    var userQuery = req.query;
    console.log(userQuery);
    if (userQuery.hasOwnProperty('user_id') && userQuery.user_id) {
        getTimeAnalytics(userQuery.user_id, function(error, results) {
            if (!error) {
                res.status(200).send(results);
            } else {
                res.status(500).send(error);
            }
        });
    } else {
        res.status(500).send("Query did not contain user_id!");
    }
});

app.get('/get_campaigns', function(req, res) {
    res.status(200).send('');
});

app.post('/set_new_campaign', function(req, res) {
    var campaignDetails = req.body;
});

app.post('/login', function(req, res) {
    var user = req.body;
    if (user && user.hasOwnProperty('username') && user.hasOwnProperty('password')) {
        usersManager.login(user, res);
    } else {
        res.status(500).send('Bad Request');
    }
});

app.get('/media', function(req, res) {
    var user = req.query;
    if(user && user.hasOwnProperty('user_id')) {
        influencerManager.getInfluencerMedia(user['user_id'], res);
    } else {
        res.status(500).send('Bad Request');
    }
});

app.post('/new_user', function(req, res) {
    var user = req.body;
    if (user && user.hasOwnProperty('username')) {
        usersManager.insertNewUser(user, res);
    } else {
        res.status(500).send('Bad Request');
    }
});

app.listen(3000);