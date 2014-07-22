/*global _ L jQuery Backbone Gatekeeper */

var Shareabouts = Shareabouts || {};

(function(NS, $, console){
  'use strict';

  var focusLayer = function(layer, styleRule) {
    if (styleRule.focusIcon) {
      layer.setIcon(L.icon(styleRule.focusIcon));
    } else if (styleRule.focusStyle) {
      layer.setStyle(styleRule.focusStyle);
    }
  };

  var unfocusLayer = function(layer, styleRule) {
    if (styleRule.icon) {
      layer.setIcon(L.icon(styleRule.icon));
    } else if (styleRule.style) {
      layer.setStyle(styleRule.style);
    }
  };

  NS.Map = function(options) {
    var self = this,
        modelIdToLayerId = {},
        $el = $(options.el),
        layoutHtml, i, layerOptions, panelLayout;

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
        '<div class="shareabouts-centerpoint">' +
          '<span class="shadow"></span><span class="x"></span><span class="marker"></span>' +
        '</div>' +
      '</div>' +
      '<div class="shareabouts-auth-container"></div>' +
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

    // Init the map
    this.map = L.map($el.find('.shareabouts-map').get(0), options.map);
    for (i = 0; i < options.layers.length; ++i) {
      layerOptions = options.layers[i];
      L.tileLayer(layerOptions.url, layerOptions).addTo(this.map);
    }

    // Init the place collection
    this.placeCollection = new NS.PlaceCollection();
    // This has to be set directly, not via the options
    this.placeCollection.url = options.datasetUrl;

    // Init an empty geoJson layer and add it to the map
    // Add data to it for it to appear on the map
    this.geoJsonLayer = L.geoJson(null, {
      style: function(featureData) {
        // Get the style for non-point geometries
        return NS.Util.getStyleRule(featureData.properties, options.placeStyles).style;
      },
      pointToLayer: function(featureData, latLng) {
        // Get style or icon settings for point geometries
        var styleRule = NS.Util.getStyleRule(featureData.properties, options.placeStyles);
        if (styleRule.icon) {
          return L.marker(latLng, {icon: L.icon(styleRule.icon)});
        } else {
          return L.circleMarker(latLng, styleRule.style);
        }
      }
    }).on('layeradd', function(evt) {
      // Map model ids to leaflet layer ids
      modelIdToLayerId[evt.layer.feature.properties.id] = evt.layer._leaflet_id;
    }).addTo(this.map);

    // Listen for map moves, and update the geometry on the place form view
    // if it is open.
    this.map.on('dragend', function(evt) {
      var center = evt.target.getCenter();

      if (self.placeFormView) {
        self.placeFormView.setGeometry({
          type: 'Point',
          coordinates: [center.lng, center.lat]
        });
      }

      // Log user map bounds changes
      NS.Util.log('USER', 'map', 'drag', self.map.getBounds().toBBoxString(), self.map.getZoom());
    });

    // Log app map bounds changes
    this.map.on('moveend', function(evt) {
      NS.Util.log('APP', 'center-lat', self.map.getCenter().lat);
      NS.Util.log('APP', 'center-lng', self.map.getCenter().lng);
    });

    // Log user zoom changes
    $(self.map.zoomControl._zoomInButton).click(function() {
      NS.Util.log('USER', 'map', 'zoom', self.map.getBounds().toBBoxString(), self.map.getZoom());
    });
    $(self.map.zoomControl._zoomOutButton).click(function() {
      NS.Util.log('USER', 'map', 'zoom', self.map.getBounds().toBBoxString(), self.map.getZoom());
    });

    // Log app zoom changes
    self.map.on('zoomend', function(evt) {
      NS.Util.log('APP', 'zoom', self.map.getZoom());
    });


    // Render the place detail template
    this.geoJsonLayer.on('click', function(evt) {
      var tpl = options.templates['place-detail'],
          featureData = evt.layer.feature,
          model = self.placeCollection.get(featureData.properties.id);

      // Show the place details in the panel
      self.placeDetailView = new NS.PlaceDetailView({
        template: tpl,
        model: model,
        umbrella: self,
        submitter: self.currentUser,

        // Templates for the survey views that are rendered in a region
        surveyTemplate: options.templates['place-survey'],
        surveyItemTemplate: options.templates['place-survey-item'],

        // Template for the support view
        supportTemplate: options.templates['place-support']
      });
      panelLayout.showContent(self.placeDetailView);

      NS.Util.log('USER', 'map', 'place-marker-click', model.getLoggingDetails());

      // Pan the map to the selected layer
      // TODO: handle non-point geometries
      self.map.panTo(evt.layer.getLatLng());
    });

    // Listen for when a place is shown
    $(this).on('showplace', function(evt, view){
      var styleRule = NS.Util.getStyleRule(view.model.toJSON(), options.placeStyles),
          layer = self.geoJsonLayer.getLayer(modelIdToLayerId[view.model.id]);

      // Focus/highlight the layer
      focusLayer(layer, styleRule);
    });

    // Listen for when a place is closed
    $(this).on('closeplace', function(evt, view){
      var styleRule = NS.Util.getStyleRule(view.model.toJSON(), options.placeStyles),
          layer = self.geoJsonLayer.getLayer(modelIdToLayerId[view.model.id]);

      // Revert the layer
      unfocusLayer(layer, styleRule);
    });

    // Listen for when a form is shown
    $(this).on('showplaceform', function(evt, view) {
      view.$el.parent().parent().parent().addClass('panel-form-open');
    });

    // Listen for when a form is hidden
    $(this).on('closeplaceform', function(evt, view) {
      view.$el.parent().parent().parent().removeClass('panel-form-open');
    });

    // Init add button object
    $el.on('click', '.shareabouts-add-button', function(evt) {
      evt.preventDefault();
      var tpl = options.templates['place-form'];

      // Show the place details in the panel
      self.placeFormView = new NS.PlaceFormView({
        template: tpl,
        collection: self.placeCollection,
        umbrella: self,
        submitter: self.currentUser
      });

      panelLayout.showContent(self.placeFormView);

      NS.Util.log('USER', 'map', 'new-place-btn-click');
    });

    // Tell the map to resize itself when its container changes width
    $el.on('showpanel closepanel', function() {
      self.map.invalidateSize(true);
    });

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

    // Get all of the places, all at once.
    // TODO: How do we make Sharebouts handle very large datasets?
    this.placeCollection.fetchAllPages({
      // So we can add the geojson in bulk, not on add
      silent: true,
      // Explicitly set this. IE9 forgets sometimes.
      crossDomain: true,
      pageSuccess: function(collection, data) {
        self.geoJsonLayer.addData(data);
      }
    });

    this.placeCollection.on('add', function(model) {
      // This is for when a user adds a new place, not page load
      self.geoJsonLayer.addData(model.toGeoJSON());

      // TODO: this may not be the best place for this in the long run
      // Show the place details in the panel
      self.placeDetailView = new NS.PlaceDetailView({
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
      panelLayout.showContent(self.placeDetailView);
    });

    // Init the user to a signed in user or an anonymous user
    this.setUser(options.currentUser);
  };

}(Shareabouts, jQuery, Shareabouts.Util.console));
