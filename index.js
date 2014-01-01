'use strict';

var changesManager = require('./changesManager.js');
var fs = require('fs');
var request = require('request');
var Twit = require('twit');
var util = require('util');
var wikichanges = require('wikichanges');


/* Set up twitter broadcasting if necessary. */
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
if (config.useTwitterBroadcasting) {
    var twit = new Twit({
        consumer_key: config.consumer_key,
        consumer_secret: config.consumer_secret,
        access_token: config.access_token,
        access_token_secret: config.access_token_secret
    });
}

var w = new wikichanges.WikiChanges({
    ircNickname: 'wikiwazup'
});

w.listen(function (change) {
    if (!change.robot && change.namespace === 'Article') {
        // console.log(change);

        /* Get wikidata entry. */
        var titleSlug = change.page.replace(/\s/g, '_');
        var wiki = change.wikipediaShort + 'wiki';
        var timestamp = Date.now();
        request('http://www.wikidata.org/w/api.php?action=wbgetentities&sites=' +
            wiki + '&titles=' + titleSlug + '&props=labels&format=json',
            function (err, response, body) {
                if (err) {
                    return util.log(err.stack ? err.stack : util.inspect(err));
                } else if (response.statusCode !== 200) {
                    return util.log(new Error('Wikidata request failed.\n' +
                        util.inspect(response)));
                }

                var data = JSON.parse(body).entities;

                /* Pretty print. */
                // console.log(JSON.stringify(data, undefined, 2));

                for (var entity in data) {
                    if (entity !== '-1' && data.hasOwnProperty(entity)) {
                        changesManager.addChange(entity, change.wikipediaShort,
                            timestamp, change.url, change.delta, change.comment,
                            change.page, change.pageUrl);
                    }
                }

                // console.log(JSON.stringify(changesManager, undefined, 2));
            });
    }
});

changesManager.on('interestingChange', function (modifications) {
    var languages = modifications.getEditedLanguages();
    util.log('Found interesting change, edited in ' + languages.length +
        ' languages in the last ' + changesManager.changeLifetime / (60 * 1000) + ' minutes:');
    util.log(util.inspect(modifications, {
        depth: 5
    }));

    /* Tweet if necessary. */
    if (config.useTwitterBroadcasting) {
        /* Try to get an english inter-wiki modification, if it is not
         * possible, simply get the first modification there is. */
        var modification = modifications.getLastEnglishModificationIfAny();
        modification = modification || modifications[0];

        var status = modification.title + ': ' + modification.comment + ' ' +
            modification.pageUrl + '. Diff: ' + modification.diffUrl;
        util.log('Tweeting:\n' + status);
        twit.post('statuses/update', {
            status: status
        }, function (err, reply) {
            if (err) return util.log(err.stack);
            util.log('Twitter reply:\n' + util.inspect(reply, {
                depth: 5
            }));
        });
    }
});
