/*global _, L, jQuery, Backbone, Gatekeeper, google */

var Shareabouts = Shareabouts || {};

(function(NS, $, console){
  'use strict';

  var focusLayer = function(marker, styleRule) {
    marker.setIcon(styleRule.focusIcon);
  };

  var unfocusLayer = function(marker, styleRule) {
    marker.setIcon(styleRule.icon);
  };

  NS.StreetView = function(options) {
    var self = this,
        modelIdToLayerId = {},
        $el = $(options.el),
        map, layoutHtml, i, layerOptions, panelLayout;

    // For CORS in IE9 and below, we need to POST our requests and tell
    // the Shareabouts API what method to actually use in the header.
    if (!$.support.cors && window.XDomainRequest) {
      Backbone.emulateHTTP = true;
    }

    // Set any default options
    options = options || {};
    // _.defaults(options, {
    //   // TBD
    // });

    // Initialize the Shareabouts DOM structure
    layoutHtml =
      '<div class="shareabouts-map-container">' +
        '<div class="shareabouts-map"></div>' +
      '</div>' +
      '<div class="shareabouts-auth-container">' +
      '</div>' +
      '<div class="shareabouts-add-button-container">' +
      '</div>' +
      '<div class="shareabouts-panel">' +
        '<span class="shareabouts-close-button">&times;</span>' +
        '<div class="shareabouts-panel-content"></div>' +
      '</div>';
    $el.html(layoutHtml);

    // Render the Add button
    $el.find('.shareabouts-add-button-container').html(
      options.templates['add-button']()
    );

    // Init the panel layout
    panelLayout = new NS.PanelLayout({el: $el.find('.shareabouts-panel').get(0)});

    // Init the panorama
    var mapOptions = _.extend({
          center: [39.950769, -75.145535],
          maxDistance: '50m'
        }, options.map || {}),
        centerLatLng = new google.maps.LatLng(mapOptions.center[0], mapOptions.center[1]),

        panoramaOptions = _.extend({
          addressControl: false,
          clickToGo: false,
          scrollwheel: false,
          linksControl: false,
          disableDoubleClickZoom: false,
          zoomControlOptions: {
            style: google.maps.ZoomControlStyle.SMALL
          },
          position: centerLatLng,
          pov: {
            heading: 0,
            pitch: -15
          },
          visible: true
        }, options || {}),

        summaryOptions = _.extend({
          disableAutoPan: true
        }, options.summaryInfoWindow || {}),
        summaryWindow = new google.maps.InfoWindow(summaryOptions),

        markers = {},
        plusMarker = new google.maps.Marker({
          draggable: true,
          crossOnDrag: false
        }),
        newPlaceInfoWindowOptions = _.extend({
          disableAutoPan: true
        }, options.newPlaceInfoWindow || {}),
        plusMarkerInfoWindow,
        summaryWindowTid;

    if (options.newPlaceInfoWindow) {
      plusMarkerInfoWindow = new google.maps.InfoWindow(newPlaceInfoWindowOptions);
    }

    // Init the panorama
    this.panorama = new google.maps.StreetViewPanorama($el.find('.shareabouts-map').get(0), panoramaOptions);
    // Init the place collection
    this.placeCollection = new NS.PlaceCollection();
    // This has to be set directly, not via the options
    this.placeCollection.url = options.datasetUrl;

    // Listen for marker drag, and update the geometry on the place form view
    // if it is open.
    google.maps.event.addListener(plusMarker, 'dragend', function(evt) {
      if (self.placeFormView) {
        var center = plusMarker.getPosition();
        self.placeFormView.setGeometry({
          type: 'Point',
          coordinates: [center.lng(), center.lat()]
        });
      }
    });

    // Don't let the user place a marker beyond the maxDistance
    google.maps.event.addListener(plusMarker, 'drag', function(evt) {
      var dist = google.maps.geometry.spherical.computeDistanceBetween(
            self.panorama.getPosition(), plusMarker.getPosition()),
          panoPosition, heading, position;

      if (dist > options.maxDistance) {
        // origin
        panoPosition = self.panorama.getPosition();
        // from the origin to the new marker
        heading = google.maps.geometry.spherical.computeHeading(panoPosition, plusMarker.getPosition());
        // reposition the marker at exact maxDistance along it's current heading (like star trek)
        position = google.maps.geometry.spherical.computeOffsetOrigin(
              panoPosition, options.maxDistance, heading-180);

        // weeee
        plusMarker.setPosition(position);
      }
    });

    google.maps.event.addListener(plusMarker, 'dragstart', function(evt) {
      // Don't show the instructions after the user starts the drag
      if (plusMarkerInfoWindow) {
        plusMarkerInfoWindow.close();
      }
    });

    // Listen for when a place is shown
    $(this).on('showplace', function(evt, view){
      var styleRule = NS.Util.getStyleRule(view.model.toJSON(), options.placeStyles),
          marker = markers[view.model.id];

      // Focus/highlight the layer
      focusLayer(marker, styleRule);

      // Hide the summary
      summaryWindow.close();
    });

    // Listen for when a place is closed
    $(this).on('closeplace', function(evt, view){
      var styleRule = NS.Util.getStyleRule(view.model.toJSON(), options.placeStyles),
          marker = markers[view.model.id];

      // Revert the layer
      unfocusLayer(marker, styleRule);
    });

    // Listen for when a form is shown
    $(this).on('openplaceform', function(evt, view) {
      view.$el.parent().parent().parent().addClass('panel-form-open');
    });

    // Listen for when a form is hidden
    $(this).on('closeplaceform', function(evt, view) {
      view.$el.parent().parent().parent().removeClass('panel-form-open');
    });

    // Init add button object
    $el.on('click', '.shareabouts-add-button', function(evt) {
      evt.preventDefault();
      var tpl = options.templates['place-form'],
          styleRule = NS.Util.getStyleRule({}, options.placeStyles),
          position;

      if (tpl) {
         position = google.maps.geometry.spherical.computeOffsetOrigin(
          self.panorama.getPosition(), 10, self.panorama.getPov().heading-180);


        // Show the place details in the panel
        self.placeFormView = new NS.PlaceFormView({
          template: tpl,
          collection: self.placeCollection,
          umbrella: self,
          submitter: self.currentUser
        });

        panelLayout.showContent(self.placeFormView);

        NS.Util.log('USER', 'streetview', 'new-place-btn-click');

        plusMarker.setOptions({
          map: self.panorama,
          icon: styleRule.newIcon,
          position: position
        });

        // show the window
        if (plusMarkerInfoWindow) {
          plusMarkerInfoWindow.open(self.panorama, plusMarker);
        }

        // hide the summary, if visible
        summaryWindow.close();
      }
    });

    // Tell the map to resize itself when its container changes width
    $el.on('showpanel closepanel', function() {
      google.maps.event.trigger(self.panorama, 'resize');
    });

    $el.on('closepanel', function() {
      // Remove the plus marker if it exists
      plusMarker.setMap(null);
    });

    // Get all of the places near the center
    this.placeCollection.fetchAllPages({
      // Explicitly set this. IE9 forgets sometimes.
      crossDomain: true,
      data: {
        near: mapOptions.center[0] + ',' + mapOptions.center[1],
        distance_lt: mapOptions.maxDistance
      }
    });

    this.showPlace = function(model) {
      // Remove the plus marker if it exists
      plusMarker.setMap(null);

      if (!self.placeCollection.get(model.id)) {
        self.placeCollection.add(model);
      }

      this.placeDetailView = new NS.PlaceDetailView({
        template: options.templates['place-detail'],
        model: model,
        umbrella: self,
        submitter: self.currentUser,

        // Templates for the survey views that are rendered in a region
        surveyTemplate: options.templates['place-survey'],
        surveyItemTemplate: options.templates['place-survey-item'],

        // Template for the support view
        supportTemplate: options.templates['place-support']
      });

      // Show the place details in the panel
      panelLayout.showContent(this.placeDetailView);
    };

    this.setUser = function(userData) {
      var markup;
      if (options.templates['auth-actions']) {
        markup = options.templates['auth-actions'](userData);
        $el.find('.shareabouts-auth-container').html(markup);
      }

      // So we can pass this into view constructors
      this.currentUser = userData;

      // If the place form view is open, then rerender the form
      if (this.placeFormView) {
        this.placeFormView
          .setSubmitter(userData)
          .render();
      }

      if (this.placeDetailView) {
        this.placeDetailView.surveyRegion.currentView
          .setSubmitter(userData)
          .render();
        this.placeDetailView.supportRegion.currentView
          .setSubmitter(userData)
          .render();
      }
    };

    this.placeCollection.on('create', function(model) {
      // Show the place details in the panel
      self.showPlace(model);
    });

    this.placeCollection.on('add', function(model) {
      var geom = model.get('geometry'),
          position = new google.maps.LatLng(geom.coordinates[1],geom.coordinates[0]),
          panoPosition = self.panorama.getPosition(),
          distFromPano = google.maps.geometry.spherical.computeDistanceBetween(
            panoPosition, position),
          styleRule = NS.Util.getStyleRule(model.toJSON(), options.placeStyles),
          minDistFromPano = 4,
          marker, heading;

      // If the marker is really really close to the panorama location, then
      // calculate the heading and bump it out a few meters so people can see it.
      if (distFromPano < minDistFromPano) {
        heading = google.maps.geometry.spherical.computeHeading(panoPosition, position);
        position = google.maps.geometry.spherical.computeOffsetOrigin(
              panoPosition, minDistFromPano/2 + distFromPano, heading-180);
      }

      marker = new google.maps.Marker({
        position: position,
        map: self.panorama,
        icon: styleRule.icon
      });

      if (options.templates['place-detail']) {
        google.maps.event.addListener(marker, 'click', function(evt) {
          self.showPlace(model);
          NS.Util.log('USER', 'streetview', 'place-marker-click', model.getLoggingDetails());
        });
      }

      // Show an infowindow on marker hover if a summary template is defined
      if (options.templates['place-summary']) {

        google.maps.event.addListener(marker, 'mouseover', function(evt) {
          // Already planning to show another summary. Cancel it.
          if (summaryWindowTid) {
            clearTimeout(summaryWindowTid);
          }

          // Show the summary info window in 500ms
          summaryWindowTid = setTimeout(function() {
            // close the shared window if it's already open
            summaryWindow.close();

            // set the window content
            summaryWindow.setOptions({
              content: options.templates['place-summary'](model.toJSON())
            });

            // show the window
            summaryWindow.open(self.panorama, marker);

            NS.Util.log('USER', 'streetview', 'place-marker-hover', model.getLoggingDetails());

            // reset the timeout id
            summaryWindowTid = null;
          }, 500);
        });

        // I moused off a marker before it was shown, so cancel it.
        google.maps.event.addListener(marker, 'mouseout', function(evt) {
          if (summaryWindowTid) {
            clearTimeout(summaryWindowTid);
          }
        });
      }

      markers[model.id] = marker;

      $(self).trigger('addplace', [model]);
    });

    // Init the user to a signed in user or an anonymous user
    this.setUser(options.currentUser);
  };

}(Shareabouts, jQuery, Shareabouts.Util.console));
