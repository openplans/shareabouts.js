/*global chai describe it beforeEach Shareabouts */
(function (S) {
  'use strict';

  var assert = chai.assert;

  describe('models.js', function () {
    describe('PaginatedCollection', function () {
      var collection;

      beforeEach(function() {
        collection = new S.PaginatedCollection(S.Data.submissions, {
          parse: true
        });
      });

      it('should should have metadata', function () {
        assert.property(collection, 'metadata');
      });

      it('should should have 1 result', function () {
        assert.equal(collection.size(), 1);
      });

    });
  });

})(Shareabouts);
