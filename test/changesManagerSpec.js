/* jshint expr: true */
'use strict';

var should = null;
should = require('should');
var changesManager = require('../changesManager');

describe('The changesManager', function () {
    it('should allow to add changes.', function () {
        var changeCount = changesManager.getChangeCount();
        changeCount.should.eql(0);

        changesManager.addChange('foo', 'en', Date.now(), 'http://foo.bar', 'FooBar');

        changeCount = changesManager.getChangeCount();
        changeCount.should.eql(1);

        changesManager.removeChange('foo');
    });

    it('should allow to remove changes that are more than 15min old', function () {
        var timestamp = Date.now() - 18 * 60 * 1000; // 18min ago.
        changesManager.addChange('foo18', 'en', timestamp, 'http://foo.bar', 'FooBar');

        timestamp = Date.now() - 16 * 60 * 1000; // 16min ago.
        changesManager.addChange('foo16', 'en', timestamp, 'http://foo.bar', 'FooBar');

        timestamp = Date.now() - 14 * 60 * 1000; // 14min ago.
        changesManager.addChange('foo14', 'en', timestamp, 'http://foo.bar', 'FooBar');

        var changeCount = changesManager.getChangeCount();
        changeCount.should.eql(3);

        changesManager.removeOldChanges();

        changeCount = changesManager.getChangeCount();
        changeCount.should.eql(1);
    });

    it('should allow to find interesting changes and fires an event accordingly', function (done) {
        var timestamp = Date.now() - 18 * 60 * 1000; // 18min ago.
        changesManager.addChange('foo18', 'en', timestamp, 'http://foo.bar', 'FooBar');

        timestamp = Date.now() - 16 * 60 * 1000; // 16min ago.
        changesManager.addChange('foo16', 'en', timestamp, 'http://foo.bar', 'FooBar');

        timestamp = Date.now() - 14 * 60 * 1000; // 14min ago.
        changesManager.addChange('foo14', 'en', timestamp, 'http://foo.bar', 'FooBar');

        /* Make an interesting change, that is, an edit of the same article but in another wiki/language. */
        changesManager.addChange('foo14', 'fr', timestamp, 'http://foo.bar', 'FooBar');

        changesManager.on('interestingChange', function (id) {
            id.should.eql('foo14');
            done();
        });

        var hasInterestingChange = changesManager.checkForInterestingChanges();
        hasInterestingChange.should.be.true;
    });
});
