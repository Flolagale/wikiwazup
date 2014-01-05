'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

/** A Modification is an object representing a wikipedia edit and its
 * associated information. */
var Modification = function (articleId, wikipediaShort,
    timestamp, diffUrl, diffDelta, comment, title, pageUrl) {
    this.articleId = articleId;
    this.wikipediaShort = wikipediaShort;
    this.timestamp = timestamp;

    this.diffUrl = diffUrl;
    this.diffDelta = diffDelta;
    this.comment = comment;

    this.title = title;
    this.pageUrl = pageUrl;

    for (var prop in this) {
        if (this.hasOwnProperty(prop)) {
            if (this[prop] === undefined || this[prop] === null) {
                throw new Error('Undefined property ' + prop + ' in modification.');
            }
        }
    }
};

/** Check if the Modification seems to be a minor Modification. For instance,
 * if it is just a cleanup or a typo fixing. Will give satisfying results only
 * for english modification for now. */
Modification.prototype.isMinorModification = function () {
    var _this = this;
    var minorModificationMarkerWords = [
        'typo', 'fix', 'clean', 'misc', 'map', '+', 'picture', 'image', 'pic',
        'photo', 'jpg', 'jpeg', 'link', 'lien', 'enlace', 'add', 'gallery', 'footnote',
        'reference', 'ref', 'crop', 'recadr', '{{', '[[', 'script', 'undid', 'revert',
        'commons', 'correct', 'copyvio', 'source', 'see also'
    ];
    var isMinorModification = minorModificationMarkerWords.some(function (markerWord) {
        return _this.comment.toLowerCase().indexOf(markerWord) !== -1;
    });

    var minimalModificationLength = 3;
    return isMinorModification || this.diffDelta <= minimalModificationLength;
};

/** A collection of Modifications with some helper methods.
 * Inherits from Array. */
var ModificationCollection = function () {
    Array.call(this);
};
util.inherits(ModificationCollection, Array);

/** Get the list of all the edited languages (inter-wikis) for this collection
 * of modifications. */
ModificationCollection.prototype.getEditedLanguages = function () {
    return this.map(function (modif) {
        return modif.wikipediaShort;
    }).filter(function (language, index, self) {
        /* If it is the first occurence of language, return true. */
        return index === self.indexOf(language);
    });
};

/** Get the first english inter-wiki modification if any, return null if none
 * found. */
ModificationCollection.prototype.getFirstEnglishModificationIfAny = function () {
    return this._getFirstModificationIfAny('en');
};

ModificationCollection.prototype._getFirstModificationIfAny = function (language) {
    var modifications = this.filter(function (modif) {
        return modif.wikipediaShort === language;
    });

    if (modifications.length === 0) {
        return null;
    }

    var firstTimestamp = 0;
    var firstModifIndex = 0;
    modifications.forEach(function (modif, index) {
        if (modif.timestamp < firstTimestamp) {
            firstTimestamp = modif.timestamp;
            firstModifIndex = index;
        }
    });

    return modifications[firstModifIndex];
};

ModificationCollection.prototype.getMostAccessibleModification = function () {
    if (this.length === 0) {
        return null;
    }

    /* Try english, then french then spanish the whatever. */
    var mostAccessibleModification = this.getFirstEnglishModificationIfAny() ||
        this._getFirstModificationIfAny('fr') ||
        this._getFirstModificationIfAny('es') ||
        this._getFirstModificationIfAny('it') ||
        this._getFirstModificationIfAny('de') ||
        this[0];
    return mostAccessibleModification;
};

ModificationCollection.prototype.containsMinorModification = function () {
    return this.some(function (modification) {
        return modification.isMinorModification();
    });
};

/** ChangesManager allows to manage the wikipedia recent changes or edits. It
 * is an instance of EventEmitter. It checks periodically for significant
 * changes (edits that mean that something interesting happened in the world).
 * For instance, when similar edits are made to the same article in several
 * different languages in the first minutes. It also remove the least recent
 * changes after a while. */
var ChangesManager = function () {
    EventEmitter.call(this);

    this.changes = {};

    /* Lifetime of a change. During that period of time, it will be checked for
     * being sgnificant. After that period of time, the change will be deleted. */
    this.changeLifetime = 25 * 60 * 1000; /* 25min in milisecond. */

    var _this = this;
    setInterval(function () {
        _this.removeOldChanges();
    }, 30 * 60 * 1000);

    setInterval(function () {
        _this.checkForInterestingChanges();
    }, 15 * 60 * 1000);

    setInterval(function () {
        util.log('Changes manager contains ' + _this.getChangeCount() + ' changes.');
    }, 5 * 60 * 1000);

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
    if (!this.changes[articleId]) {
        this.changes[articleId] = {
            firstModificationTime: timestamp,
            modifications: new ModificationCollection()
        };
    } else {
        this.changes[articleId].firstModificationTime = timestamp;
    }

    this.changes[articleId].modifications.push(new Modification(articleId,
        wikipediaShort, timestamp, diffUrl, diffDelta, comment, title,
        pageUrl));
};

ChangesManager.prototype.removeChange = function (articleId) {
    delete this.changes[articleId];
};

ChangesManager.prototype.getChangeCount = function () {
    return Object.keys(this.changes).length;
};

/** Remove all the current changes. */
ChangesManager.prototype.clear = function () {
    this.changes = {};
};

ChangesManager.prototype.removeOldChanges = function () {
    util.log('Removing old changes.');
    var removedCount = 0;
    var limitTimestamp = Date.now() - this.changeLifetime; /* 15min in milisecond. */
    for (var id in this.changes) {
        if (this.changes.hasOwnProperty(id)) {
            if (this.changes[id].firstModificationTime < limitTimestamp) {
                delete this.changes[id];
                ++removedCount;
            }
        }
    }

    util.log('Removed ' + removedCount + ' entries.');
};

/** Based on edits history, determine if a change is interesting for us. The
 * main part of the wikiwazup algorithm is here. */
ChangesManager.prototype.checkForInterestingChanges = function () {
    util.log('Check for interesting changes.');
    var differentLanguageCount = 3;
    var hasInterestingChange = false;
    for (var id in this.changes) {
        if (this.changes.hasOwnProperty(id)) {
            if (this.changes[id].modifications.length >= 2) {
                /* This article has at least two modifications (edits) in the first
                 * this.changeLifetime minutes, now check that these changes where
                 * made at least in three different languages by getting a set
                 * (a list without duplicates) of the modified languages.
                 * Verify that the ModificationCollection does not contain any
                 * minor modification as well. */
                var modifications = this.changes[id].modifications;
                var languages = modifications.getEditedLanguages();
                if (languages.length >= differentLanguageCount && !modifications.containsMinorModification()) {
                    this.emit('interestingChange', modifications);
                    delete this.changes[id];
                    hasInterestingChange = true;
                }
            }
        }
    }

    return hasInterestingChange;
};

var changesManager = new ChangesManager();

module.exports = changesManager;
