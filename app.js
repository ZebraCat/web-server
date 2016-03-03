var http = require('http');
var fs = require('fs');
var mysql = require('mysql');
var express = require('express');
var app = express();

var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'influencers',
    port: 3307
});

app.get('/', function(req, res) {
    connection.query('SELECT * from influencers', function(err, rows, fields) {
        if(!err) {
            res.send(rows);
        }else {
            console.log(err);
        }
    });
});

app.get('/influeners/:handle', function(req, res) {

});

app.listen(3000);