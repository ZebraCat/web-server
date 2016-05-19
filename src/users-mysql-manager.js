var pool = require('./mysql-connection');

var UsersMysqlManager = {};

var userExistsQuery = 'SELECT * FROM users WHERE username = ?';

UsersMysqlManager.insertNewUser = function(user, res) {
    pool.query(userExistsQuery, [user.username], function(err, rows, fields) {
        if (err) {
            res.status(500).send('Could not register new user!');
        } else {
            if (rows.length === 0) {
                pool.query('INSERT INTO users SET ?', [user], function(err, result) {
                    if(err) {
                        res.status(500).send('Could not register new user!');
                    } else {
                        res.status(200).send('New user registered!');
                    }
                });
            } else {
                res.status(500).send('User already exists!');
            }
        }
    });

};

UsersMysqlManager.login = function(user, res) {
    var username = user['username'];
    var password = user['password'];
    pool.query(userExistsQuery + ' AND password = ?', [username], [password], function(err, rows, fields) {
        if(err) {
            res.status(404).send('User name + password not found!');
        } else {
            res.status(200).send(rows);
        }
    });
};

module.exports = UsersMysqlManager;

