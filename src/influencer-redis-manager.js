'use strict';

var BLACK_LIST = 'black_list';
var DELIMITER = ':';
var redis = require("redis");
var client = redis.createClient();

var InfluencerRedisManager = {};

InfluencerRedisManager.deleteInfluencer = function(influencer) {
    client.del(influencer.username);
    client.sadd(BLACK_LIST, influencer.country + DELIMITER + influencer.username)
};

module.exports = InfluencerRedisManager;