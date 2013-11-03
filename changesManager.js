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
    setInterval(this.checkForInterestingChanges, 10 * 1000);
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

ChangesManager.prototype.removeOldChanges = function () {
    util.log('Removing old changes.');
    var removedCount = 0;
    var timeDelta = 15 * 60 * 1000; /* 15min in milisecond. */
    var timestamp = Date.now();
    for (var id in this.changes) {
        if (this.changes.hasOwnProperty(id)) {
            if (timestamp - this.changes[id].lastModificationTime > timeDelta) {
                delete this.changes[id];
                ++removedCount;
            }
        }
    }

    util.log('Removed ' + removedCount + ' entries.');
};

ChangesManager.prototype.checkForInterestingChanges = function () {
    util.log('Check for interesting changes.');
    for (var id in this.changes) {
        if (this.changes.hasOwnProperty(id)) {
            if (this.changes[id].modifications.length > 2) {
                this.emit('interestingChange', id);
            }
        }
    }
};

var changesManager = new ChangesManager();

module.exports = changesManager;
