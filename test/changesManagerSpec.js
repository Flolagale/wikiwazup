/* jshint expr: true */
'use strict';

var should = null;
should = require('should');
var changesManager = require('../changesManager');

describe('The changesManager', function () {
    it('should allow to add changes.', function () {
        var changeCount = changesManager.getChangeCount();
        changeCount.should.eql(0);

        changesManager.addChange('foo', 'en', Date.now(),
            'http://foo.bar/diff', 3, 'fix typo', 'FooBar', 'http://foo.bar');

        changeCount = changesManager.getChangeCount();
        changeCount.should.eql(1);

        changesManager.removeChange('foo');
    });

    it('should allow to remove changes that are more than changesManager.changeLifetime  old', function () {
        var timestamp = Date.now() - changesManager.changeLifetime - 3 * 60 * 1000;
        changesManager.addChange('foo18', 'en', timestamp,
            'http://foo.bar/diff', 3, 'fix typo', 'FooBar', 'http://foo.bar');

        timestamp = Date.now() - changesManager.changeLifetime - 1 * 60 * 1000;
        changesManager.addChange('foo16', 'en', timestamp,
            'http://foo.bar/diff', 3, 'fix typo', 'FooBar', 'http://foo.bar');

        timestamp = Date.now() - changesManager.changeLifetime + 1 * 60 * 100;
        changesManager.addChange('foo14', 'en', timestamp,
            'http://foo.bar/diff', 3, 'fix typo', 'FooBar', 'http://foo.bar');

        var changeCount = changesManager.getChangeCount();
        changeCount.should.eql(3);

        changesManager.removeOldChanges();

        changeCount = changesManager.getChangeCount();
        changeCount.should.eql(1);
    });

    describe('should allow to find interesting changes and fires an event accordingly', function () {
        it('should not fire when change comment says its typo fixing', function () {
            changesManager.clear();
            var timestamp = Date.now() - 18 * 60 * 1000; // 18min ago.
            changesManager.addChange('foo18', 'en', timestamp,
                'http://foo.bar/diff', 5, 'fix typo', 'FooBar', 'http://foo.bar');

            timestamp = Date.now() - 16 * 60 * 1000; // 16min ago.
            changesManager.addChange('foo16', 'en', timestamp,
                'http://foo.bar/diff', 5, 'fix typo', 'FooBar', 'http://foo.bar');

            timestamp = Date.now() - 14 * 60 * 1000; // 14min ago.
            changesManager.addChange('foo14', 'en', timestamp,
                'http://foo.bar/diff', 5, 'fix typo', 'FooBar', 'http://foo.bar');

            /* Make an interesting change, that is, an edit of the same
             * article but in another wiki/language. */
            changesManager.addChange('foo14', 'fr', timestamp,
                'http://foo.bar/diff', 5, 'fix typo', 'FooBar', 'http://foo.bar');

            changesManager.addChange('foo14', 'es', timestamp,
                'http://foo.bar/diff', 5, 'fix typo', 'FooBar', 'http://foo.bar');

            var hasInterestingChange = changesManager.checkForInterestingChanges();
            hasInterestingChange.should.be.false;
        });

        it('should not fire when change diff is less or equal to 3 characters', function () {
            changesManager.clear();
            var timestamp = Date.now() - 18 * 60 * 1000; // 18min ago.
            changesManager.addChange('foo18', 'en', timestamp,
                'http://foo.bar/diff', 3, 'hi guys', 'FooBar', 'http://foo.bar');

            timestamp = Date.now() - 16 * 60 * 1000; // 16min ago.
            changesManager.addChange('foo16', 'en', timestamp,
                'http://foo.bar/diff', 3, 'hi guys', 'FooBar', 'http://foo.bar');

            timestamp = Date.now() - 14 * 60 * 1000; // 14min ago.
            changesManager.addChange('foo14', 'en', timestamp,
                'http://foo.bar/diff', 3, 'hi guys', 'FooBar', 'http://foo.bar');

            /* Make an interesting change, that is, an edit of the same
             * article but in another wiki/language. */
            changesManager.addChange('foo14', 'fr', timestamp,
                'http://foo.bar/diff', 3, 'hi guys', 'FooBar', 'http://foo.bar');

            changesManager.addChange('foo14', 'es', timestamp,
                'http://foo.bar/diff', 3, 'hi guys', 'FooBar', 'http://foo.bar');

            var hasInterestingChange = changesManager.checkForInterestingChanges();
            hasInterestingChange.should.be.false;
        });

        it('should not fire when change is really interesting', function (done) {
            changesManager.clear();
            var timestamp = Date.now() - 18 * 60 * 1000; // 18min ago.
            changesManager.addChange('foo18', 'en', timestamp,
                'http://foo.bar/diff', 5, 'hi guys', 'FooBar', 'http://foo.bar');

            timestamp = Date.now() - 16 * 60 * 1000; // 16min ago.
            changesManager.addChange('foo16', 'en', timestamp,
                'http://foo.bar/diff', 5, 'hi guys', 'FooBar', 'http://foo.bar');

            timestamp = Date.now() - 14 * 60 * 1000; // 14min ago.
            changesManager.addChange('foo14', 'en', timestamp,
                'http://foo.bar/diff', 5, 'hi guys', 'FooBar', 'http://foo.bar');

            /* Make an interesting change, that is, an edit of the same
             * article but in another wiki/language. */
            changesManager.addChange('foo14', 'fr', timestamp,
                'http://foo.bar/diff', 5, 'hi guys', 'FooBar', 'http://foo.bar');

            changesManager.addChange('foo14', 'es', timestamp,
                'http://foo.bar/diff', 5, 'hi guys', 'FooBar', 'http://foo.bar');

            changesManager.on('interestingChange', function (modifications) {
                modifications.length.should.eql(3);
                done();
            });

            var hasInterestingChange = changesManager.checkForInterestingChanges();
            hasInterestingChange.should.be.true;
        });
    });
});
