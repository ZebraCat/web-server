var pool = require('./mysql-connection');

var UsersMysqlManager = {};

var userExistsQuery = 'SELECT * FROM users WHERE user_id = ?';

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

UsersMysqlManager.login = function(profile, res) {
    var user = {
        "user_id": profile['profile']['user_id'],
        "email": profile['profile']['email']
    };
    pool.query(userExistsQuery, [user.user_id], function(err, rows, fields) {
        if (err) {
            res.status(500).send('Could not register new user!');
        } else {
            if (rows.length === 0) {
                pool.query('INSERT INTO users SET ?', [user], function(err, result) {
                    if(err) {
                        console.log(err);
                        res.status(500).send('Could not register new user!');
                    } else {
                        console.log('success');
                        res.status(200).send('New user registered!');
                    }
                });
            } else {
                console.log('else');
                res.status(200).send('User already exists!');
            }
        }
    });
};

module.exports = UsersMysqlManager;

