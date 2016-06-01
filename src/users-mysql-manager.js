var pool = require('./mysql-connection');

var UsersMysqlManager = {};

var userExistsQuery = 'SELECT * FROM users WHERE user_id = ?';
var campaignExistsQuery = 'SELECT * FROM campaigns WHERE campaign_name = ?';
var allCampaignsQuery = 'SELECT * FROM campaigns WHERE user_id = ?';
var influencerInCampaignQuery = 'SELECT * FROM campaign_influencers WHERE campaign_id = ? AND influencer_id = ?';

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

UsersMysqlManager.setNewCampaign = function(campaign, res) {
    pool.query(campaignExistsQuery, [campaign.campaign_name], function(err, rows, fields) {
        if (err) {
            console.log(err);
            res.status(500).send('Could not register new campaign!');
        } else {
            if (rows.length === 0) {
                pool.query('INSERT INTO campaigns SET ?', [campaign], function(err, result) {
                    if (err) {
                        console.log(err);
                        res.status(500).send('Could not register new campaign!');
                    } else {
                        console.log('successfuly registered new campaign!');
                        res.status(200).send('New campaign registered!');
                    }
                });
            } else {
                console.log('Campaign already Exists!');
                res.status(400).send('Campaign already exists!');
            }
        }
    });
};

UsersMysqlManager.getCampaigns = function(profile, res) {
    var user_id = (JSON.parse(profile)).user_id;
    pool.query(allCampaignsQuery, [user_id], function(err, rows, fields) {
        if (err) {
            console.log(err);
            res.status(500).send('Could not retrieve user campaigns, not logged in?');
        } else {
            res.status(200).send(rows);
        }
    });
};


// TODO - client validates max influencers, should be here as well.
UsersMysqlManager.addInfluencerToCampaign = function(profile, influencer, campaign, res) {
    var influencer_id = influencer.user_id;
    var campaign_id = campaign.campaign_id;
    var insert = {
        influencer_id: influencer_id,
        campaign_id: campaign_id
    };

    // check that influencer isn't already added to campaign
    pool.query(influencerInCampaignQuery, [campaign_id, influencer_id], function(err, rows, fields) {
        if(err) {
            console.log(err);
            res.status(500).send('Could not perform influencer in campaign query!');
        } else {
            if (rows.length === 0) {
                // insert the influencer
                pool.query('INSERT INTO campaign_influencers SET ?', [insert], function(err, results) {
                    if (err) {
                        console.log(err);
                        res.status(500).send('Could not register influencer to campaign!');
                    } else {
                        // increment added count
                        pool.query('UPDATE campaigns SET influencer_added = influencer_added + 1 WHERE campaign_id = ?', [campaign_id], function(err, results) {
                            if (err) {
                                // TODO - if this fails, influencer will be added but no incremented, flush two queries after success somehow
                                console.log(err);
                                res.status(500).send('Could not increment added Count!')
                            } else {
                                res.status(200).send('Influencer registered on campaign');
                            }
                        });
                    }
                });
            } else {
                res.status(404).send('influencer already registered to campaign!');
            }
        }
    });
};

module.exports = UsersMysqlManager;

