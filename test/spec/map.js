/* global chai, describe, it, beforeEach, $, Shareabouts, _ */
'use strict';
(function () {

  var assert = chai.assert;

  describe('Shareabouts Map', function () {
    describe('layers option', function() {
      var mapOptions;

      beforeEach(function() {
        $('#testbed').empty();
        mapOptions = {
          templates: Shareabouts.Templates,
          el: '#testbed',
          datasetUrl: 'http://localhost:8000'
        };
      });

      it('should be noticed if not present', function() {
        try {
          Shareabouts.Map(mapOptions);
        } catch (e) {
          assert.include(e.message, 'layers');
          assert.include(e.message, 'at least one');
          return;
        }
        assert.fail('Shareabouts.Map should have noticed missing layers option');
      });

      it('should raise no error with one or more layers', function() {
        Shareabouts.Map(_.extend(mapOptions, { layers: [
          {
            url: 'http://{s}.tiles.mapbox.com/v3/openplans.map-dmar86ym/{z}/{x}/{y}.png',
            attribution: '&copy; OpenStreetMap contributors, CC-BY-SA. <a href="http://mapbox.com/about/maps" target="_blank">Terms &amp; Feedback</a>'
          }
        ] }));
      });
    });

    describe('enableAddPlaces flag', function () {
      var mapOptions;

      beforeEach(function() {
        $('#testbed').empty();
        mapOptions = {
          templates: Shareabouts.Templates,
          el: '#testbed',
          datasetUrl: 'http://localhost:8000',
          layers: [
            {
              url: 'http://{s}.tiles.mapbox.com/v3/openplans.map-dmar86ym/{z}/{x}/{y}.png',
              attribution: '&copy; OpenStreetMap contributors, CC-BY-SA. <a href="http://mapbox.com/about/maps" target="_blank">Terms &amp; Feedback</a>'
            }
          ]
        };
      });

      it('should show the add button template when true', function () {
        Shareabouts.Map(_.extend(mapOptions, { enableAddPlaces: true }));
        assert.equal($('#testbed .shareabouts-add-button').length, 1);
      });

      it('should hide the add button template when false', function () {
        Shareabouts.Map(_.extend(mapOptions, { enableAddPlaces: false }));
        assert.equal($('#testbed .shareabouts-add-button').length, 0);
      });

      it('should default to true', function () {
        Shareabouts.Map(mapOptions);
        assert.equal($('#testbed .shareabouts-add-button').length, 1);
      });
    });
  });
})();
