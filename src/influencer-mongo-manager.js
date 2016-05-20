'use strict';

var mongoose = require('mongoose');

var dbURI = 'mongodb://localhost/influencers';

mongoose.connect(dbURI);

mongoose.connection.on('connected', function () {
    console.log('Mongoose default connection open to ' + dbURI);
});

// If the connection throws an error
mongoose.connection.on('error',function (err) {
    console.log('Mongoose default connection error: ' + err);
});

// When the connection is disconnected
mongoose.connection.on('disconnected', function () {
    console.log('Mongoose default connection disconnected');
});

var timeAnalyticsSchema= mongoose.Schema({
    user_id: Number,
    analytics: []
});
var TimeAnalyticsModel = mongoose.model('influencer_analytics', timeAnalyticsSchema);

var getTimeAnalytics = function (user_id, callback) {
    TimeAnalyticsModel.find({user_id: user_id}, callback);
};

module.exports = getTimeAnalytics;
