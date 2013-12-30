'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

/** ChangesManager allows to manage the wikipedia recent changes or edits. It
 * is an instance of EventEmitter. It checks periodically for significant
 * changes (edits that mean that something interesting happened in the world).
 * For instance, when similar edits are made to the same article in several
 * different languages in the last minutes. It also remove the least recent
 * changes after a while. */
var ChangesManager = function () {
    EventEmitter.call(this);

    this.changes = {};

    /* Lifetime of a change. During that period of time, it will be checked for
     * being sgnificant. After that period of time, the change will be deleted. */
    this.changeLifetime = 15 * 60 * 1000; /* 15min in milisecond. */

    var _this = this;
    setInterval(function() {
        _this.removeOldChanges();
    }, 60 * 1000);

    setInterval(function () {
        _this.checkForInterestingChanges();
    }, 60 * 1000);

    setInterval(function() {
        util.log('Changes manager contains ' + _this.getChangeCount() + ' changes.');
    }, 30 * 1000);

    /* For debug only. */
    /* setInterval(function () {
        require('fs').writeFile('dump.json', JSON.stringify(_this.changes, undefined, 2),
            function (err) {
                if (err) return util.log(err);
                util.log('Changes dumped.');
            });
    }, 60 * 1000); */
};
util.inherits(ChangesManager, EventEmitter);

/** Add a wikipedia edit.
 * @param articleId article unique id got from wikidata.
 * @param wikipediaShort the 2 letters language of the edited wikipedia.
 * @param timestamp the edit timestamp.
 * @param diffUrl where to find the edit diff.
 * @param diffDelta the count of changed characters for this edit.
 * @param comment the edit comment.
 * @param title the title of the article in the edited language.
 * @param pageUrl the url of the edited page on Wikipedia. */
ChangesManager.prototype.addChange = function (articleId, wikipediaShort,
        timestamp, diffUrl, diffDelta, comment, title, pageUrl) {
    /* Make here a first analysis of the edit. Save it only if it seems
     * relevant for us. Mainly, discard typo fixing and minor changes. */
    var minorChangeMarkerWords = ['typo', 'fix', 'clean', 'misc'];
    var isMinorChange = minorChangeMarkerWords.some(function (markerWord) {
        return comment.indexOf(markerWord) !== -1;
    });
    if (isMinorChange) {
        return;
    }

    if (!this.changes[articleId]) {
        this.changes[articleId] = {
            lastModificationTime: timestamp,
            modifications: []
        };
    } else {
        this.changes[articleId].lastModificationTime = timestamp;
    }

    this.changes[articleId].modifications.push({
        wikipediaShort: wikipediaShort,
        timestamp: timestamp,
        diffUrl: diffUrl,
        diffDelta: diffDelta,
        comment: comment,
        title: title,
        pageUrl: pageUrl
    });
};

ChangesManager.prototype.removeChange = function (articleId) {
    delete this.changes[articleId];
};

ChangesManager.prototype.getChangeCount = function () {
    return Object.keys(this.changes).length;
};

ChangesManager.prototype.removeOldChanges = function () {
    util.log('Removing old changes.');
    var removedCount = 0;
    var limitTimestamp = Date.now() - this.changeLifetime; /* 15min in milisecond. */
    for (var id in this.changes) {
        if (this.changes.hasOwnProperty(id)) {
            if (this.changes[id].lastModificationTime < limitTimestamp) {
                delete this.changes[id];
                ++removedCount;
            }
        }
    }

    util.log('Removed ' + removedCount + ' entries.');
};

ChangesManager.prototype.checkForInterestingChanges = function () {
    util.log('Check for interesting changes.');
    var hasInterestingChange = false;
    for (var id in this.changes) {
        if (this.changes.hasOwnProperty(id)) {

            if (this.changes[id].modifications.length >= 2) {
                /* This article has at least two modifications (edits) in the last
                 * this.changeLifetime minutes, now check that these changes where
                 * made at least in two different languages by getting a set
                 * (a list without duplicates) of the modified languages. */
                 var modifications = this.changes[id].modifications;
                 var languages = modifications.map(function (modif) {
                    return modif.wikipediaShort;
                 }).filter(function (language, index, self) {
                     /* If it is the first occurence of language, return true. */
                     return index === self.indexOf(language);
                 });

                 if (languages.length >= 2) {
                    this.emit('interestingChange', id, languages);
                    hasInterestingChange = true;
                 }
            }
        }
    }

    return hasInterestingChange;
};

var changesManager = new ChangesManager();

module.exports = changesManager;
