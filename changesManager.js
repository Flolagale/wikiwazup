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

    setInterval(this.removeOldChanges, 60 * 1000);
    setInterval(this.checkForInterestingChanges, 60 * 1000);

    /* For debug only. */
    var _this = this;
    setInterval(function () {
        require('fs').writeFile('dump.json', JSON.stringify(_this.changes, undefined, 2),
            function (err) {
                if (err) return util.log(err);
                util.log('Changes dumped.');
            });
    }, 60 * 1000);
};
util.inherits(ChangesManager, EventEmitter);

/** Add a wikipedia edit.
 * @param articleId article unique id got from wikidata.
 * @param wikipediaShort the 2 letters language of the edited wikipedia.
 * @param timestamp the edit timestamp.
 * @param diffUrl where to find the edit diff.
 * @param title the title of the article in the edited language. */
ChangesManager.prototype.addChange = function (articleId, wikipediaShort, timestamp, diffUrl, title) {
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
        title: title
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
    var limitTimestamp = Date.now() - (15 * 60 * 1000); /* 15min in milisecond. */
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
            if (this.changes[id].modifications.length > 2) {
                this.emit('interestingChange', id);
                hasInterestingChange = true;
            }
        }
    }

    return hasInterestingChange;
};

var changesManager = new ChangesManager();

module.exports = changesManager;
