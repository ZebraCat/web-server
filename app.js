'use strict';

var http = require('http');
var express = require('express');
var winston = require('winston');
var influencerManager = require('./influencer-mysql-manager');

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
    }else {
        try {
            influencerManager.getInfluencers(userQuery, pageNum, res);
        } catch(e) {
            connectionErrorResponse(res);
        }
    }
});

app.post('/insert', function(req, res) {
    var influencer = req.body;
    if(influencer && influencer.hasOwnProperty('username') && influencer.username) {
        try {
            influencerManager.insertInfluencer(influencer, res);
        }
        catch(e) {
            logger.log('ERROR', e);
            res.status(500).send('<div><label>Something went wrong in mysql, try again!</label></div>');
        }
    }else {
        logger.log('WARN', 'Did not receive influencer name');
        res.send('<div><label>No Influencer Name!</label></div>');
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
    }
});

app.get('/get_campaigns', function(req, res) {

});

app.post('/set_new_campaign', function(req, res) {

});

app.listen(3000);