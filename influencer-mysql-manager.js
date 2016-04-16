'use strict';

var fs = require('fs');
var mysql = require('mysql');
var PAGE_SIZE = 20;

var password;

try {
    password = fs.readFileSync('/home/ec2-user/mysqlcreds', 'utf8').replace(/\n$/, '')
}catch(e) {
    // file does not exist
    password = 'root';
}

var InfluencerMysqlManager = {};

InfluencerMysqlManager.getConnection = function() {
    return mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: password,
        database: 'influencers',
        port: 3306
    });
};

InfluencerMysqlManager.connection = InfluencerMysqlManager.getConnection();


InfluencerMysqlManager.makeQueryString = function(userQuery) {
    var queryString = "";
    if (typeof userQuery !== 'undefined') {
        var currentYear = new Date().getFullYear();
        queryString += this.queryStringIfExists(userQuery, 'a', 'followers', '>', 'followersAbove');
        queryString += this.queryStringIfExists(userQuery, 'a', 'avg_comments', '>', 'commentsAbove');
        queryString += this.queryStringIfExists(userQuery, 'a', 'avg_likes', '>', 'likesAbove');
        queryString += this.queryStringIfExists(userQuery, 'b', 'year_of_birth', '>=', 'toAge', function(year) {return (currentYear - parseInt(year)).toString()});
        queryString += this.queryStringIfExists(userQuery, 'b', 'year_of_birth', '<=', 'fromAge', function(year) {return (currentYear - parseInt(year)).toString()});
    }
    return queryString;
};

InfluencerMysqlManager.queryStringIfExists = function(userQuery, tableName, tableField, sign ,field, transFunction) {
    transFunction = transFunction || function(x) {return x};
    if (this.containsField(userQuery, field)) {
        return ' AND ' + tableName + '.' + tableField + sign + transFunction(userQuery[field]);
    }
    return '';
};

InfluencerMysqlManager.containsField = function (userQuery, field) {
    return typeof userQuery[field] !== 'undefined' && userQuery[field] && !isNaN(userQuery[field]);
};

InfluencerMysqlManager.getInfluencers = function (userQuery, pageNum, res) {
    var self = this;
    var queryString = this.makeQueryString(userQuery);
    var limitString =' LIMIT ' + ((pageNum - 1) * PAGE_SIZE).toString() + ',' + (PAGE_SIZE).toString();
    var tableString = 'SELECT * FROM influencers as a ';
    if (this.containsField(userQuery, 'toAge') || this.containsField(userQuery, 'fromAge')) {
        tableString += ',influencers_manual as b WHERE true AND a.username = b.username';
    }else {
        tableString += 'WHERE true';
    }

    this.connection.query(tableString + queryString + limitString + ';',
        function (err, rows, fields) {
            if (!err) {
                res.send(rows);
            } else {
                self.connectionErrorResponse(res, err);
            }
        });
};

InfluencerMysqlManager.insertInfluencer = function (influencer, res) {
    var self = this;
    self.connection.query('SELECT 1 FROM influencers_manual WHERE username = "' + influencer.username + '" ORDER BY username LIMIT 1', function(err, rows, fields) {
        if(!err) {
            if(rows.length > 0) {
                res.send('<div><label>Influencer Already Exists in DB!</label></div>');
            }else {
                if(influencer.hasOwnProperty('year_of_birth') && influencer.year_of_birth && influencer.year_of_birth < 1950) {
                    res.send('<div><label>Bad influencer year of birth! (only year needed, ex: 1989)</label></div>');
                }
                self.connection.query('INSERT INTO influencers_manual SET ?', influencer, function(err, result) {
                    if(err) {
                        res.send('<div><label>Could not insert influencer ' + influencer.username + 'to Database! Try again</label></div>');
                    }else {
                        res.send('<div><label>Influencer ' + influencer.username + ' Inserted Successfuly!</label></div>');
                    }
                })
            }
        }else {
            res.status(500).send('<div><label>Could not connect to database!</label></div>');
        }
    })
};

InfluencerMysqlManager.getInfluencerReport = function(influencers, res) {
    var handles = influencers.handles;
    var handlesString = handles.map(function(handle) {
        return "'" + handle + "'";
    }).join(',');
    this.connection.query('SELECT * FROM influencers WHERE username IN (' + handlesString + ')', function(err, rows, fields) {
        if (!err) {
            res.send(rows);
        }else {
            res.status(500).send('<div><label>Could not find any influencer in the DB!</label></div>');
        }
    })
};

InfluencerMysqlManager.connectionErrorResponse = function (res, e) {
    console.log('ERROR' + e.toString());
    res.status(500).send('Could not connect to database!');
};

module.exports = InfluencerMysqlManager;