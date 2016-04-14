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
var PAGE_SIZE = 20;

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

function makeQueryString(userQuery) {
    var queryString = "";
    if (typeof userQuery !== 'undefined') {
        var currentYear = new Date().getFullYear();
        queryString += queryStringIfExists(userQuery, 'a', 'followers', '>', 'followersAbove');
        queryString += queryStringIfExists(userQuery, 'a', 'avg_comments', '>', 'commentsAbove');
        queryString += queryStringIfExists(userQuery, 'a', 'avg_likes', '>', 'likesAbove');
        queryString += queryStringIfExists(userQuery, 'b', 'year_of_birth', '>=', 'toAge', function(year) {return (currentYear - parseInt(year)).toString()});
        queryString += queryStringIfExists(userQuery, 'b', 'year_of_birth', '<=', 'fromAge', function(year) {return (currentYear - parseInt(year)).toString()});
    }
    return queryString;
}

function queryStringIfExists(userQuery, tableName, tableField, sign ,field, transFunction) {

    transFunction = transFunction || function(x) {return x};
    if (containsField(userQuery, field)) {
        return ' AND ' + tableName + '.' + tableField + sign + transFunction(userQuery[field]);
    }
    return '';
}

function containsField(userQuery, field) {
    return typeof userQuery[field] !== 'undefined' && userQuery[field] && !isNaN(userQuery[field]);
}

app.get('/', function(req, res) {
    var userQuery = req.query;
    // join tables
    var pageNum = parseInt(userQuery['pageNum']);
    if (typeof pageNum === 'undefined' || isNaN(pageNum)){
        res.status(500).send('no page num specified!');
        logger.log('page num was sent undefined, request: ' + req.toString());
    }else {
        try {
            var queryString = makeQueryString(userQuery);
            var limitString =' LIMIT ' + ((pageNum - 1) * PAGE_SIZE).toString() + ',' + (PAGE_SIZE).toString();
            var tableString = 'SELECT * FROM influencers as a ';
            if (containsField(userQuery, 'toAge') || containsField(userQuery, 'fromAge')) {
                tableString += ',influencers_manual as b WHERE true AND a.username = b.username';
            }else {
                tableString += 'WHERE true';
            }

            connection.query(tableString + queryString + limitString + ';',
                function (err, rows, fields) {

                    if (!err) {
                        res.send(rows);
                    } else {
                        logger.log('ERROR', err);
                        console.log('ERROR', err);
                        res.status(500).send('Could not connect to database!');
                    }
                });
        } catch(e) {
            logger.log('ERROR', e);
            console.log('ERROR' + e.toString());
            res.status(500).send('Could not connect to database!');
        }
    }
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

app.post('/report', function(req, res) {
    var influencers = req.body;
    if (influencers && influencers.hasOwnProperty('handles') && influencers.handles.length > 0) {
        try {
            var handles = influencers.handles;
            var handlesString = handles.map(function(handle) {
                return "'" + handle + "'";
            }).join(',');
            connection.query('SELECT * FROM influencers WHERE username IN (' + handlesString + ')', function(err, rows, fields) {
                if (!err) {
                    res.send(rows);
                }else {
                    res.status(500).send('<div><label>Could not find any influencer in the DB!</label></div>');
                }
            })
        }catch(e) {
            logger.log('ERROR', e);
            res.status(500).send('<div><label>Could not get influencers from db</label></div>');
        }
    }
});

app.listen(3000);