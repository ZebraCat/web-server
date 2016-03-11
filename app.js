var http = require('http');
var fs = require('fs');
var mysql = require('mysql');
var express = require('express');
var winston = require('winston');
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

var password;
try {
    password = fs.readFileSync('/home/ec2-user/mysqlcreds', 'utf8').replace(/\n$/, '')
}catch(e) {
    // file does not exist
    password = 'root';
}

var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: password,
    database: 'influencers',
    port: 3306
});

app.get('/', function(req, res) {
    var userQuery = req.query;
    // get the year
    var currentYear = new Date().getFullYear();
    // join tables
    connection.query('SELECT * FROM influencers as a, influencers_manual as b WHERE a.username = b.username AND ' +
        'b.year_of_birth < ? AND b.year_of_birth > ? AND a.followers > ? AND a.avg_comments > ? AND a.avg_likes > ?',
        [currentYear - parseInt(userQuery['fromAge']), parseInt(currentYear - userQuery['toAge']), userQuery['followersAbove'],
        userQuery['commentsAbove'], userQuery['likesAbove']],
        function(err, rows, fields) {

        if(!err) {
            res.send(rows);
        }else {
            logger.log('ERROR', err);
            res.status(500).send('Could not connect to database!');
        }
    });
});

app.post('/insert', function(req, res) {
    var influencer = req.body;
    if(influencer && influencer.hasOwnProperty('username') && influencer.username) {
        try {
            connection.query('SELECT 1 FROM influencers_manual WHERE username = "' + influencer.username + '" ORDER BY username LIMIT 1', function(err, rows, fields) {
                if(!err) {
                    if(rows.length > 0) {
                        res.send('<div><label>Influencer Already Exists in DB!</label></div>');
                        logger.log('INFO', 'Influencer: ' + influencer.username + ' Already Exists in DB!')
                    }else {
                        if(influencer.hasOwnProperty('year_of_birth') && influencer.year_of_birth && influencer.year_of_birth < 1950) {
                            logger.log('WARNING', 'bad influencer year of birth: ' + influencer.year_of_birth);
                            res.send('<div><label>Bad influencer year of birth! (only year needed, ex: 1989)</label></div>');
                        }
                        connection.query('INSERT INTO influencers_manual SET ?', influencer, function(err, result) {
                            if(err) {
                                res.send('<div><label>Could not insert influencer ' + influencer.username + 'to Database! Try again</label></div>');
                                logger.log('ERROR', 'Could not insert influencer: '+influencer.username + ' to Database! Try again');
                            }else {
                                res.send('<div><label>Influencer ' + influencer.username + ' Inserted Successfuly!</label></div>');
                                logger.log('INFO', 'Influencer:' + influencer.username + 'Inserted Successfuly!');
                            }
                        })
                    }
                }else {
                    logger.log('ERROR', err);
                    res.status(500).send('<div><label>Could not connect to database!</label></div>');
                }
            })
        }
        catch(e) {
            logger.log('ERROR', e);
            res.status(500).send('<div><label>Something went wrong in mysql, try again!</label></div>');
        }
    }else {
        logger.log('WARN', 'Did not recieve influencer name');
        res.send('<div><label>No Influencer Name!</label></div>');
    }
});

app.listen(3000);