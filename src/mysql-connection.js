'use strict';

var fs = require('fs');
var mysql = require('mysql');

var password;

try {
    password = fs.readFileSync('/home/omri/mysqlcreds', 'utf8').replace(/\n$/, '');
}catch(e) {
    // file does not exist
    password = 'root';
}

var pool = mysql.createPool({
    connectionLimit : 100, //important
    host     : 'localhost',
    user     : 'root',
    password : password,
    database : 'influencers',
    port     : 3306
});

module.exports = pool;