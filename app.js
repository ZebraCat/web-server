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
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, authorization");
    next();
});

app.use('/', jwtCheck);


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
            influencerManager.getInfluencerReport(influencers.handles, res);
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
    var query = req.query;
    if (query.hasOwnProperty('profile') && query.profile) {
        var profile = query.profile;
        usersManager.getCampaigns(profile, res);
    } else {
        res.status(500).send('Bad request');
    }
});

app.post('/set_new_campaign', function(req, res) {
    var campaignDetails = req.body;
    var campaignObject = campaignDetails['campaign'];
    console.log(campaignObject);
    if (campaignDetails['profile'] && campaignObject) {
        campaignObject.user_id = campaignDetails['profile'].user_id;
        campaignObject.influencer_agreed = 0;
        campaignObject.influencer_added = 0;
        campaignObject.est_reach = 0;
        campaignObject.influencer_target = 10;
        campaignObject.due_date = new Date(campaignObject.due_date);

        usersManager.setNewCampaign(campaignObject, res);
    } else {
        res.status(500).send('bad request (user or campaign no exist)');
    }
});

app.post('/add_influencer_to_campaign', function(req, res) {

    var details = req.body;
    if (details.hasOwnProperty('profile') && details.hasOwnProperty('influencer') && details.hasOwnProperty('campaign')) {
        var profile = details['profile'];
        var influencer = details['influencer'];
        var campaign = details['campaign'];
        usersManager.addInfluencerToCampaign(profile, influencer, campaign, res);
    } else {
        returnBadRequest(res);
    }
});

app.post('/proposal_response', function(req, res) {
    var details = req.body;
    var campaignId = details['proposal']['campaign_id'];
    var profile = details['profile'];
    var response = details['response'];
    if (campaignId && isSocialProfile(profile) && (response === usersManager.INFLUENCER_HIRED || response === usersManager.INFLUENCER_DECLINED)) {
        usersManager.changeInfluencerState(getSocialUserId(profile), campaignId, response, res);
    } else {
        returnBadRequest(res);
    }
});

app.get('/campaign_influencers', function(req, res) {
    var details = req.query;
    console.log(details);
    if (details.hasOwnProperty('profile') && details.hasOwnProperty('campaign_id')) {
        usersManager.getCampaignInfluencers(details['campaign_id'], res);
    } else {
        res.status(500).send('bad request (no campaign id or bad profile)');
    }
});

app.get('/influencer_campaigns', function(req, res) {
    var details = req.query;
    console.log(details);
    if (details.hasOwnProperty('profile')) {
        res.status(200).send([]);
    } else {
        res.status(500).send('un-authorized');
    }
});

app.post('/new_influencer_proposal', function(req, res) {
    var details = req.body;
    if (details.hasOwnProperty('profile') && details.hasOwnProperty('proposal')) {
        usersManager.addInfluencerProposal(details['proposal'], res);
    } else {
        res.status(400).send('Bad Request');
    }
});

app.get('/influencer_proposals', function(req, res) {
    var profile = JSON.parse(req.query.profile);
    if (isSocialProfile(profile)) {
        usersManager.getInfluencerProposals(getSocialUserId(profile), res);
    } else {
        console.log(profile);
        res.status(400).send('Bad Request');
    }
});

app.post('/remove_campaign_influencer', function(req, res) {
    var details = req.body;
    console.log(details);
    if (details.hasOwnProperty('profile') && details.hasOwnProperty('campaign_id') && details.hasOwnProperty('influencer')) {
        usersManager.removeCampaignInfluencer(details.campaign_id, details.influencer, res);
    } else {
        res.status(500).send('bad request (no campaign id or bad profile)');
    }
});

app.post('/login', function(req, res) {
    var profile = req.body;
    usersManager.login(profile, res);
});

app.get('/media', function(req, res) {
    var user = req.query;
    if(user && user.hasOwnProperty('user_id')) {
        influencerManager.getInfluencerMedia(user['user_id'], res);
    } else {
        res.status(500).send('Bad Request');
    }
});

// FASHION TYPES

app.get('/fashion_types', function(req, res) {
    influencerManager.getAvailableFasionTypes(res);
});

app.post('/update_fashion_types', function(req, res) {
    var details = req.body;
    if (details && details.hasOwnProperty('user_id') && details.hasOwnProperty('types')) {
        influencerManager.updateFashionTypes(details['user_id'], details['types'], res);
    } else {
        res.status(500).send('bad request');
    }
});

app.get('/influencer_fashion_types', function(req, res) {
    influencerManager.getInfluencerFashionTypes(req.query['user_id'], res)
});

function returnBadRequest(res) {
    res.status(500).send('bad request');
}

function isSocialProfile(profile) {
    return profile && profile.hasOwnProperty('identities') && profile.identities[0].isSocial
}

function getSocialUserId(profile) {
    return profile.identities[0].user_id
}

app.listen(3000);