'use strict';

var pool = require('./mysql-connection');
var KloutScoreManager = require('./klout-score-manager');
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
        queryString += this.queryStringIfExists(userQuery, 'a', 'username', '=', 'username', function(username){return ("'" + username + "'")});
        queryString += this.queryStringIfExists(userQuery, 'a', 'country', '=', 'country', function(country){return ("'" + country + "'")});
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
    return typeof userQuery[field] !== 'undefined' && userQuery[field];
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

    pool.query(tableString + queryString + limitString + ';', function (err, rows, fields) {
        if (!err) {
            res.send(rows);
        } else {
            self.connectionErrorResponse(res, err);
        }
    });
};

InfluencerMysqlManager.deleteInfluencer = function(influencer, res) {
    var username = influencer.username;
    pool.query("DELETE FROM influencers WHERE username=?",[username], function(err, result) {
        if(!err) {
            res.status(200).send('deleted influencer: ' + username + ' from db!');
        } else {
            res.status(500).send('Could not delete influencer: ' + username + ' from db!');
        }
    });
};

// TODO - if score does not exist in db - get klout score of user, save to db and then return score.
// TODO - if klout score does not exist, return influencer details and UI will calculate infashionista score
// TODO - re-calculate score every week (different process, TBD)
InfluencerMysqlManager.getInfluencerReport = function(handles, res, field) {
    var queryField = field || 'username';
    pool.query('SELECT * FROM influencers WHERE ' + queryField + ' IN ( ? )', [handles], function(err, rows, fields) {
        if (!err) {
            if (rows[0].hasOwnProperty('klout_score') && rows[0].klout_score) {
                res.send(rows)
            } else {
                KloutScoreManager.getKloutScore(rows[0], rows, res, InfluencerMysqlManager.updateScore);
            }
        }else {
            res.status(500).send('<div><label>Could not find any influencer in the DB!</label></div>');
        }
    })
};

InfluencerMysqlManager.getInfluencerMedia = function(user_id, res) {
    pool.query('SELECT * FROM media WHERE user_id IN ( ? )', [user_id], function(err, rows, fields) {
        if(err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(rows);
        }
    });
};

InfluencerMysqlManager.updateScore = function (klout_score, klout_id, influencer, res) {
    pool.query('UPDATE influencers SET klout_score=?, klout_id=? WHERE user_id=?', [klout_score, klout_id, influencer.user_id], function(err, rows, fields) {
        // TODO - pass influencer
        if (err)
            console.log(err);
        influencer.handles = influencer.username;
        InfluencerMysqlManager.getInfluencerReport(influencer.handles, res);
    });
};

InfluencerMysqlManager.connectionErrorResponse = function (res, e) {
    console.log('ERROR' + e.toString());
    res.status(500).send('Could not connect to database!');
};

InfluencerMysqlManager.getAvailableFasionTypes = function(res) {
    pool.query('DESCRIBE influencers fash_type', function(err, rows, fields) {
        if (err) {
            res.status(500).send('Could not retrieve fashion types');
        } else {
            res.status(200).send(rows);
        }
    })
};

InfluencerMysqlManager.updateFashionTypes = function (user_id, types, res) {
    var refinedTypes = "('" + types.join() + "')";
    pool.query('UPDATE influencers SET fash_type = ' + refinedTypes +  ' WHERE user_id = ?;', [user_id] , function(err, result) {
        if (err) {
            console.log(err);
            res.status(500).send('could not update types');
        } else {
            res.status(200).send('Updated Types!');
        }
    })
};

InfluencerMysqlManager.getInfluencerFashionTypes = function (user_id, res) {
    pool.query('SELECT fash_type FROM influencers WHERE user_id = ?', [user_id], function(err, rows, fields) {
        if (err) {
            console.log(err);
            res.status(500).send('could not get influencer types');
        } else {
            res.status(200).send(rows);
        }
    })
};


module.exports = InfluencerMysqlManager;