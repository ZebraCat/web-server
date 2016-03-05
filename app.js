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
    connection.query('SELECT * from influencers', function(err, rows, fields) {
        if(!err) {
            res.send(rows);
        }else {
            logger.log('ERROR', err);
        }
    });
});

app.post('/insert', function(req, res) {
    var influencer = req.body;
    if(influencer) {
        if(influencer.hasOwnProperty('username') && influencer.username) {
            connection.query('"SELECT 1 FROM influencers WHERE user = "' + influencer.username + '" ORDER BY user LIMIT 1', function(err, rows, fields) {
                if(!err) {
                    if(rows.length > 0) {
                        res.send('<div><label>Influencer Already Exists in DB!</label></div>');
                        logger.log('INFO', 'Influencer: ' + influencer.username + ' Already Exists in DB!')
                    }else {
                        //insert
                        connection.query('INSERT INTO influencers SET ?', influencer, function(err, result) {
                            if(err) {
                                res.send('<div><label>Could not insert influencer to Database! Try again</label></div>');
                                logger.log('ERROR', 'Could not insert influencer: '+influencer.username + ' to Database! Try again');
                            }else {
                                res.send('<div><label>Influencer Inserted Successfuly!</label></div>');
                                logger.log('INFO', 'Influencer:' + influencer.username + 'Inserted Successfuly!');
                            }
                        })
                    }
                }else {
                    logger.log('ERROR', err);
                }
            })
        }
    }
});

app.listen(3000);