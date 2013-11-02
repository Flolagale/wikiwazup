var request = require('request');
var wikichanges = require('wikichanges');

/* In memory db containing the last changes. */
var changes = {};

var w = new wikichanges.WikiChanges({ircNickname: 'wikiwazup'});

w.listen(function (change) {
    if (!change.robot && change.namespace === 'Article') {
        // console.log(change);

        /* Get wikidata entry. */
        var title = change.page.replace(' ', '_');
        var wiki = change.wikipediaShort + 'wiki';
        var timestamp = Date.now();
        request('http://www.wikidata.org/w/api.php?action=wbgetentities&sites=' +
            wiki + '&titles=' + title + '&props=labels&format=json',
            function (err, response, body) {
                if (err) throw err;

                var data = JSON.parse(body).entities;

                /* Pretty print. */
                console.log(JSON.stringify(data, undefined, 2));

                for (var entity in data) {
                    if (data.hasOwnProperty(entity)) {
                        if (!changes[entity]) {
                            changes[entity] = {
                                lastModificationTime: timestamp,
                                modifications: []
                            };
                        }

                        changes[entity].modifications.push({
                            wikipediaShort: change.wikipediaShort,
                            title: title,
                            diffUrl: change.url
                        });
                    }
                }

                console.log(JSON.stringify(changes, undefined, 2));
            });
    }
});
