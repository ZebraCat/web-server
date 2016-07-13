'use strict';

var request = require('request');
// TODO - cyclic reference, no techincal problem but ugly so resolve using middle-man class

var klout_api_key = '22ekv525xxzna2tzxjzc5dqm';
var instagram_id_to_klout_id_url = 'http://api.klout.com/v2/identity.json/ig/';
var klout_user_to_score_url = 'http://api.klout.com/v2/user.json/';

var KloutScoreManager = {};

KloutScoreManager.getKloutIdFromUser = function(user, callback, errCallback) {
    if (user && user.hasOwnProperty('user_id')) {
        var url = instagram_id_to_klout_id_url + user['user_id'] + "?key=" + klout_api_key;
        request(url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                callback(body, user);
            } else {
                errCallback(error);
            }
        });
    } else {
        errCallback('error, bad user');
    }
};

KloutScoreManager.getKloutScore = function(user, rows, res, callback) {
    var success = function(res) {
        return function(kloutUser, myUser) {
            var url = klout_user_to_score_url + JSON.parse(kloutUser)['id'] + '/score?key=' + klout_api_key;
            request(url, function (error, response, body) {
                // insert klout score to mysql to cache request to klout
                if (!error && response.statusCode == 200) {
                    var kloutResponse = JSON.parse(body);
                    if (kloutResponse['unscored'] && kloutResponse['unscored'] == true) {
                        console.log("Unscored");
                        res.status(200).send(rows);
                    } else {
                        callback(kloutResponse['score'], JSON.parse(kloutUser)['id'], myUser, res);
                    }
                } else {
                    res.status(200).send(rows);
                }
            });
        }
    };

    var err = function(res) {
        return function(err) {
            console.log(err);
            res.status(200).send(rows);
        }
    };

    KloutScoreManager.getKloutIdFromUser(user, success(res), err(res));
};

module.exports = KloutScoreManager;