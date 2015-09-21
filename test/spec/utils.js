/* global chai, describe, it, beforeEach, $, Shareabouts, _ */

(function() {
  'use strict';

  var assert = chai.assert;

  describe('Shareabouts Util', function () {
    describe('pathJoin', function() {

      it('should allow trailing slash', function() {
        var joined = Shareabouts.Util.pathJoin('parta/', 'partb');
        assert.equal(joined, 'parta/partb');
      });

      it('should insert missing slash', function() {
        var joined = Shareabouts.Util.pathJoin('parta', 'partb');
        assert.equal(joined, 'parta/partb');
      });

    });
  });
}());
