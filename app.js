'use strict';

var http = require('http');
var express = require('express');
var winston = require('winston');
var influencerManager = require('./src/influencer-mysql-manager');
var usersManager = require('./src/users-mysql-manager');

var logger = new(winston.Logger)({
    transports: [
        new(winston.transports.Console)(),
        new(winston.transports.File)({filename: '/home/ec2-user/web-server.log'})
    ]
});
var app = express();

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

app.post('/newUser', function(req, res) {
    var user = req.body;
    if (user && user.hasOwnProperty('username') && user.hasOwnProperty('password') && user.hasOwnProperty('email')) {
        usersManager.insertNewUser(user, res);
    } else {
        res.status(500).send('Bad Request');
    }
});

app.listen(3000);