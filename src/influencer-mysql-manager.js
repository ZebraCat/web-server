'use strict';

var getConnection = require('./mysql-connection');
var mysql = require('mysql');
var PAGE_SIZE = 20;

var InfluencerMysqlManager = {};

InfluencerMysqlManager.makeQueryString = function(userQuery) {
    var queryString = "";
    if (typeof userQuery !== 'undefined') {
        var currentYear = new Date().getFullYear();
        queryString += this.queryStringIfExists(userQuery, 'a', 'followers', '>', 'followersAbove');
        queryString += this.queryStringIfExists(userQuery, 'a', 'avg_comments', '>', 'commentsAbove');
        queryString += this.queryStringIfExists(userQuery, 'a', 'avg_likes', '>', 'likesAbove');
        queryString += this.queryStringIfExists(userQuery, 'a', 'country', '=', 'country');
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

    getConnection(function(err, connection) {
        if(!err) {
            connection.query(tableString + queryString + limitString + ';',
                function (err, rows, fields) {
                    if (!err) {
                        res.send(rows);
                    } else {
                        self.connectionErrorResponse(res, err);
                    }
                });
        } else {
            console.log("Error: " + err.toString());
            self.connectionErrorResponse(res, err);
        }
    });
};

InfluencerMysqlManager.getInfluencerReport = function(influencers, res) {
    var handles = influencers.handles;
    getConnection(function(err, connection) {
        connection.query('SELECT * FROM influencers WHERE username IN ( ? )', [handles], function(err, rows, fields) {
            if (!err) {
                res.send(rows);
            }else {
                res.status(500).send('<div><label>Could not find any influencer in the DB!</label></div>');
            }
        })
    });
};

InfluencerMysqlManager.connectionErrorResponse = function (res, e) {
    console.log('ERROR' + e.toString());
    res.status(500).send('Could not connect to database!');
};

module.exports = InfluencerMysqlManager;