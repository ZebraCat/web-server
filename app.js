var http = require('http');
var fs = require('fs');
var mysql = require('mysql');
var express = require('express');
var app = express();

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
            console.log(err);
        }
    });
});

app.listen(3000);