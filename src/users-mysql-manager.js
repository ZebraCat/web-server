var pool = require('./mysql-connection');
var influencerManager = require('./influencer-mysql-manager');


var UsersMysqlManager = {};

UsersMysqlManager.INFLUENCER_HIRED = 1;
UsersMysqlManager.INFLUENCER_PENDING = 0;
UsersMysqlManager.INFLUENCER_DECLINED = 2;

var INFLUENCER_HIRED = 1;
var INFLUENCER_PENDING = 0;
var INFLUENCER_DECLINED = 2;

var userExistsQuery = 'SELECT * FROM users WHERE user_id = ?';
var campaignExistsQuery = 'SELECT * FROM campaigns WHERE campaign_name = ?';
var allCampaignsQuery = 'SELECT * FROM campaigns WHERE user_id = ?';
var allInfluencersFromCampaignQuery = 'SELECT * FROM campaign_influencers WHERE campaign_id = ?';
var influencerInCampaignQuery = allInfluencersFromCampaignQuery + ' AND influencer_id = ?';
var allInfluencerCampaignsQuery = 'SELECT * FROM campaign_influencers WHERE influencer_id = ?';
var allInfluencerProposalsQuery = 'SELECT b.*, a.influencer_state FROM campaign_influencers as a JOIN proposals as b ' +
                                         'ON a.influencer_id = b.influencer_id WHERE a.influencer_id = ?';
var removeInfluencerFromCampaignQuery = 'DELETE FROM campaign_influencers WHERE campaign_id = ? AND influencer_id = ?';
var decrementInfluencerQuery = 'UPDATE campaigns SET influencer_added = influencer_added - 1, est_reach = est_reach - ? WHERE campaign_id = ?';
var incrementInfluencerQuery = 'UPDATE campaigns SET influencer_added = influencer_added + 1, est_reach = est_reach + ? WHERE campaign_id = ?';
var incrementHiredInfluencerQuery = 'UPDATE campaigns SET influencer_agreed = influencer_agreed + 1 WHERE campaign_id = ?';
var changeInfluencerStateQuery = 'UPDATE campaign_influencers SET influencer_state = ? WHERE campaign_id = ? AND influencer_id = ?';
var addInfluencerProposal = 'INSERT INTO proposals SET ?';
var influencerProposalNotExistsQuery = 'SELECT * FROM proposals WHERE brand_id =? AND influencer_id = ? AND campaign_id = ?';
var verifyProposalPendingState = allInfluencerCampaignsQuery + ' AND campaign_id = ? AND influencer_state = ' + INFLUENCER_PENDING;

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

    // TODO - check that influencer isn't already added to campaign
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
                        pool.query(incrementInfluencerQuery, [influencer.followers, campaign_id], function(err, results) {
                            if (err) {
                                // TODO - if this fails, influencer will be added but not incremented, flush two queries after success somehow
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

UsersMysqlManager.getCampaignInfluencers = function(campaign_id, res) {
    pool.query(allInfluencersFromCampaignQuery, [campaign_id], function(err, rows, fields) {
        if (err) {
            console.log(err);
            res.status(500).send('Connection or syntax error');
        } else {
            if (rows.length > 0) {
                var influencerIds = rows.map(function (row) {return row.influencer_id});
                influencerManager.getInfluencerReport(influencerIds, res, 'user_id');
            } else {
                res.status(200).send(rows);
            }
        }
    });
};

UsersMysqlManager.removeCampaignInfluencer = function(campaign_id, influencer, res) {

    pool.query(influencerInCampaignQuery, [campaign_id, influencer.user_id], function(err, rows, fields) {
        if (err) {
            console.log(err);
            res.status(500).send('Connection or syntax error');
        } else {
            if (rows.length > 0 && rows[0].hasOwnProperty('influencer_state') && rows[0].influencer_state === INFLUENCER_HIRED) {
                res.stats(403).send('Cannot remove hired influencer from campaign!');
            } else if (rows.length == 0) {
                res.status(404).send('Influencer not found in campaign!');
            } else {
                // delete actual influencer from campaign
                pool.query(removeInfluencerFromCampaignQuery, [campaign_id, influencer.user_id], function(err, results) {
                    if (err) {
                        console.log(err);
                        res.status(500).send('Error deleting the influencer from the campaign!');
                    } else {
                        // need to decrement added influencers and reach from campaigns table
                        pool.query(decrementInfluencerQuery, [influencer.followers, campaign_id], function (err, results) {
                            // TODO - if this fails, influencer will not be decremented but other tables will be updated. either flush or retry
                            if (err) {
                                console.log(err);
                                res.status(500).send('Error updating campaign details after deleting influencer! (fatal)');
                            } else {
                                res.status(200).send('Deleted influencer successfully from campaign!');
                            }
                        });
                    }
                })
            }
        }
    })
};

UsersMysqlManager.getInfluencerCamapgins = function(influencer, res) {

    pool.query(allInfluencerCampaignsQuery, [influencer.user_id], function(err, rows, fields) {
        if(err) {
            console.log(err);
            res.status(500).send('Connection or syntax error');
        } else {
            res.status(200).send(rows);
        }
    });
};

UsersMysqlManager.changeInfluencerState = function(influencerId, campaignId, state, res) {

    if (state < 0 || state > 2) {
        res.status(500).send('Illegal state');
    }

    pool.query(verifyProposalPendingState, [influencerId, campaignId], function(err, rows, fields) {
        if (rows.length === 0) {
            res.status(400).send('Cannot change influencer state');
        } else {
            pool.query(changeInfluencerStateQuery, [state, campaignId, influencerId], function(err, results) {
                if (err) {
                    console.log(err);
                    res.status(500).send('Error updating influencer state!');
                } else {
                    if (state === INFLUENCER_HIRED) {
                        // TODO - if this fails, not good.. should change campaign and proposal state together
                        pool.query(incrementHiredInfluencerQuery, [campaignId], function(err, results) {
                            if (err) {
                                console.log(err);
                                res.status(500).send('Error updating Hired state on campaign');
                            } else {
                                res.status(200).send('Changed influencer state to ' + state);
                            }
                        })
                    } else {
                        res.status(200).send('Changed influencer state to ' + state);
                    }
                }
            });
        }
    });
};

UsersMysqlManager.addInfluencerProposal = function(proposal, res) {

    proposal.due_date = new Date(proposal.due_date);
    pool.query(influencerProposalNotExistsQuery, [proposal['brand_id'], proposal['influencer_id'], proposal['campaign_id']], function(err, rows, fields) {
        if (err) {
            console.log(err);
            res.status(500).send('Error posting proposal');
        } else if (rows.length > 0) {
            res.status(403).send('Already proposed to influencer in this campaign!');
        } else {
            pool.query(addInfluencerProposal, proposal, function(err, results) {
                if (err) {
                    console.log(err);
                    res.status(500).send('Error posting proposal');
                } else {
                    res.status(200).send('Added influencer proposal!');
                }
            });
        }
    });
};

UsersMysqlManager.getInfluencerProposals = function(influencer_id, res) {
    pool.query(allInfluencerProposalsQuery, [influencer_id], function(err, rows, fields) {
        if (err) {
            console.log(err);
            res.status(500).send('Error getting proposals');
        } else {
            // TODO - need to get brand info (website and brand_image) so: add these to proposals and in insert proposal, set them for each row.
            res.status(200).send(rows);
        }
    });
};

module.exports = UsersMysqlManager;

