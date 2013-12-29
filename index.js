'use strict';

var request = require('request');
var wikichanges = require('wikichanges');
var changesManager = require('./changesManager.js');
var util = require('util');


var w = new wikichanges.WikiChanges({
    ircNickname: 'wikiwazup'
});

w.listen(function (change) {
    if (!change.robot && change.namespace === 'Article') {
        // console.log(change);

        /* Get wikidata entry. */
        var title = change.page.replace(/\s/g, '_');
        var wiki = change.wikipediaShort + 'wiki';
        var timestamp = Date.now();
        request('http://www.wikidata.org/w/api.php?action=wbgetentities&sites=' +
            wiki + '&titles=' + title + '&props=labels&format=json',
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
                            timestamp, change.url, title);
                    }
                }

                // console.log(JSON.stringify(changesManager, undefined, 2));
            });
    }
});

changesManager.on('interestingChange', function (articleId, languages) {
    util.log('Found interesting change, edited in ' + languages.length +
    ' languages in the last ' + changesManager.changeLifetime / 60 * 1000 + ' minutes:');
    util.log(util.inspect(changesManager.changes[articleId], {depth: 5}));
    require('fs').writeFile(articleId, JSON.stringify(changesManager.changes[articleId], undefined, 2), function () {});
});
