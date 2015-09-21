/* global chai, describe, it, beforeEach, $, Shareabouts, _ */
'use strict';
(function () {

  var assert = chai.assert;
  var stubLayer = {
    url: 'http://{s}.tiles.mapbox.com/v3/openplans.map-dmar86ym/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, CC-BY-SA. <a href="http://mapbox.com/about/maps" target="_blank">Terms &amp; Feedback</a>'
  };

  describe('Shareabouts Map', function () {
    describe('dataset url', function() {
      var mapOptions;

      beforeEach(function() {
        $('#testbed').empty();
        mapOptions = {
          templates: Shareabouts.Templates,
          el: '#testbed',
          layers: [stubLayer]
        };
      });

      it('should be required', function() {
        try {
          Shareabouts.Map(mapOptions);
        } catch (e) {
          assert.include(e.message, 'dataset');
          assert.include(e.message, ' must ');
          return;
        }
        assert.fail('Shareabouts.Map should require a dataset URL');
      });

      it('can be specified in camelCase', function() {
        Shareabouts.Map(_.extend({
          datasetUrl: 'http://localhost:8000'
        }, mapOptions));
      });

      it('can be specified in underscore_case', function() {
        Shareabouts.Map(_.extend({
          dataset_url: 'http://localhost:8000'
        }, mapOptions));
      });
    });

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
        Shareabouts.Map(_.extend(mapOptions, { layers: [stubLayer] }));
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
          layers: [stubLayer]
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

    describe('enableAddSurveys flag', function () {
      var mapOptions;

      beforeEach(function() {
        $('#testbed').empty();
        mapOptions = {
          templates: Shareabouts.Templates,
          el: '#testbed',
          datasetUrl: 'http://localhost:8000',
          layers: [stubLayer],
          placeStyles: [{'condition': 'true', 'icon': ''}]
        };
      });

      var openPlaceDetail = function(map) {
        map.placeCollection.add({'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [0,0]}, 'id': 1, 'properties': {'id': 1}});
        map.showPlaceDetail(1);
      };

      it('should show the add survey template when true', function () {
        var map = new Shareabouts.Map(_.extend(mapOptions, { enableAddSurveys: true }));
        openPlaceDetail(map);
        assert.equal($('#testbed .survey-form').length, 1);
      });

      it('should hide the add survey template when false', function () {
        var map = new Shareabouts.Map(_.extend(mapOptions, { enableAddSurveys: false }));
        openPlaceDetail(map);
        assert.equal($('#testbed .survey-form').length, 0);
      });

      it('should default to true', function () {
        var map = new Shareabouts.Map(mapOptions);
        openPlaceDetail(map);
        assert.equal($('#testbed .survey-form').length, 1);
      });
    });


    describe('enableAddSupport flag', function () {
      var mapOptions;

      beforeEach(function() {
        $('#testbed').empty();
        mapOptions = {
          templates: Shareabouts.Templates,
          el: '#testbed',
          datasetUrl: 'http://localhost:8000',
          layers: [stubLayer],
          placeStyles: [{'condition': 'true', 'icon': ''}]
        };
      });

      var openPlaceDetail = function(map) {
        map.placeCollection.add({'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [0,0]}, 'id': 1, 'properties': {'id': 1}});
        map.showPlaceDetail(1);
      };

      it('should show the add support template when true', function () {
        var map = new Shareabouts.Map(_.extend(mapOptions, { enableAddSupport: true }));
        openPlaceDetail(map);
        assert.equal($('#testbed form.user-support').length, 1);
      });

      it('should hide the add support template when false', function () {
        var map = new Shareabouts.Map(_.extend(mapOptions, { enableAddSupport: false }));
        openPlaceDetail(map);
        assert.equal($('#testbed form.user-support').length, 0);
      });

      it('should default to true', function () {
        var map = new Shareabouts.Map(mapOptions);
        openPlaceDetail(map);
        assert.equal($('#testbed form.user-support').length, 1);
      });
    });
  });
})();
