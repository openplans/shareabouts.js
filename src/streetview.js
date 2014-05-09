/*global _, L, jQuery, Backbone, Gatekeeper, google */

var Shareabouts = Shareabouts || {};

(function(NS, $, console){
  'use strict';

  // http://mir.aculo.us/2011/03/09/little-helpers-a-tweet-sized-javascript-templating-engine/
  var t = function t(s,d){
   for(var p in d)
     s=s.replace(new RegExp('{{'+p+'}}','g'), d[p]);
   return s;
  };

  // Get the style rule for this feature by evaluating the condition option
  var getStyleRule = function(properties, rules) {
    var self = this,
        len, i, condition;

    for (i=0, len=rules.length; i<len; i++) {
      // Replace the template with the property variable, not the value.
      // this is so we don't have to worry about strings vs nums.
      condition = t(rules[i].condition, properties);

      // Simpler code plus a trusted source; negligible performance hit
      if (eval(condition)) {
        return rules[i];
      }
    }
    return null;
  };

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

  NS.PanelLayout = Backbone.View.extend({
    events: {
      'click .shareabouts-close-button': 'handleCloseClick'
    },
    initialize: function() {
      this.$content = this.$('.shareabouts-panel-content');
    },
    showContent: function(view) {
      if (this.currentView && this.currentView.onClose) {
        this.currentView.onClose();
      }

      this.currentView = view;
      this.$content.html(view.render().el);
      this.$el.parent().addClass('panel-open');
      this.$el.parent().trigger('showpanel');

      if (this.currentView.onShow) {
        this.currentView.onShow();
      }
    },
    handleCloseClick: function() {
      this.$el.parent().removeClass('panel-open');
      this.$el.parent().trigger('closepanel');
      if (this.currentView.onClose) {
        this.currentView.onClose();
      }
    }
  });

  NS.PlaceDetailView = Backbone.Marionette.ItemView.extend({
    onClose: function() {
      this.model.collection.trigger('closeplace', this.model);
    },
    onShow: function() {
      this.model.collection.trigger('showplace', this.model);
      // TODO: is this necessary?
      // this.el.scrollIntoView();
    }
  });

  NS.PlaceFormView = Backbone.Marionette.ItemView.extend({
    ui: {
      form: 'form'
    },
    events: {
      'submit @ui.form': 'handleSubmit'
    },
    handleSubmit: Gatekeeper.onValidSubmit(function(evt) {
      evt.preventDefault();

      // serialize the form
      var self = this,
          data = NS.Util.getAttrs(this.ui.form),
          model;

      // Do nothing - can't save without a geometry
      if (!this.geometry) {
        return;
      }

      data.geometry = this.geometry;

      // add loading/busy class
      this.$el.addClass('loading');

      model = this.collection.create(data, {
        wait: true,
        complete: function(evt) {
          // remove loading/busy class
          self.$el.removeClass('loading');
        }
      });

    }, function(evt) {
      // window.alert('invalid!');
    }),
    setGeometry: function(geom) {
      this.geometry = geom;
      this.$el.addClass('shareabouts-geometry-set');
    },
    onClose: function() {
      // ick
      this.$el.parent().parent().parent().removeClass('panel-form-open');
    },
    onShow: function() {
      // ick
      this.$el.parent().parent().parent().addClass('panel-form-open');
    }
  });


  NS.StreetView = function(options) {
    var self = this,
        modelIdToLayerId = {},
        $el = $(options.el),
        // $addButton,
        map, layoutHtml, i, layerOptions, panelLayout;

    // Set any default options
    options = options || {};
    _.defaults(options, {
      addButtonLabel: 'Add a Place',
      map: {
        center: [39.950769, -75.145535],
        maxDistance: '50m'
      }
    });

    // Initialize the Shareabouts DOM structure
    layoutHtml =
      '<div class="shareabouts-map-container">' +
        '<div class="shareabouts-map"></div>' +
        '<div class="shareabouts-centerpoint">' +
          '<span class="shadow"></span><span class="x"></span><span class="marker"></span>' +
        '</div>' +
      '</div>' +
      '<div class="shareabouts-add-button-container">' +
        '<a href="#" class="shareabouts-add-button button expand"><span>'+options.addButtonLabel+'</span></a>' +
      '</div>' +
      '<div class="shareabouts-panel">' +
        '<span class="shareabouts-close-button">&times;</span>' +
        '<div class="shareabouts-panel-content"></div>' +
      '</div>';
    $el.html(layoutHtml);

    // Init the panel layout
    panelLayout = new NS.PanelLayout({el: $el.find('.shareabouts-panel').get(0)});

    // Init the panorama
    var centerLatLng = new google.maps.LatLng(options.map.center[0], options.map.center[1]);
    var panoramaOptions = _.extend({
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
        pitch: 0
      },
      visible: true
    }, options || {}),
    markers = [],
    summaryWindow = new google.maps.InfoWindow({ disableAutoPan: true }),
    panorama = new google.maps.StreetViewPanorama($el.find('.shareabouts-map').get(0), panoramaOptions);

    // map = L.map($el.find('.shareabouts-map').get(0), options.map);
    // for (i = 0; i < options.layers.length; ++i) {
    //   layerOptions = options.layers[i];
    //   L.tileLayer(layerOptions.url, layerOptions).addTo(map);
    // }

    // Init the place collection
    this.placeCollection = new NS.PlaceCollection();
    // This has to be set directly, not via the options
    this.placeCollection.url = options.datasetUrl;

    // Listen for map moves, and update the geometry on the place form view
    // if it is open.
    google.maps.event.addListener(panorama, 'pov_changed', function(evt) {
      console.log(arguments);
      // var center = evt.target.getCenter();

      // if (self.placeFormView) {
      //   self.placeFormView.setGeometry({
      //     type: 'Point',
      //     coordinates: [center.lng, center.lat]
      //   });
      // }
    });

    // Render the place detail template
    // TODO: Adapt for StreetView. When user clicks a marker, show the details.
    // this.geoJsonLayer.on('click', function(evt) {
    //   var tpl = options.templates['place-detail'],
    //       featureData = evt.layer.feature,
    //       model = self.placeCollection.get(featureData.properties.id);

    //   // Show the place details in the panel
    //   panelLayout.showContent(new NS.PlaceDetailView({
    //     template: tpl,
    //     model: model
    //   }));

    //   // Pan the map to the selected layer
    //   // TODO: handle non-point geometries
    //   map.panTo(evt.layer.getLatLng());
    // });

    // Listen for when a place is shown
    this.placeCollection.on('showplace', function(model){
      var styleRule = getStyleRule(model.toJSON(), options.placeStyles);

      // TODO: Select the marker to focus

      // Focus/highlight the layer
      // focusLayer(layer, styleRule);
    });

    // Listen for when a place is closed
    this.placeCollection.on('closeplace', function(model){
      var styleRule = getStyleRule(model.toJSON(), options.placeStyles);

      // TODO: Select the marker to focus

      // Revert the layer
      // unfocusLayer(layer, styleRule);
    });

    // Init add button object
    $el.on('click', '.shareabouts-add-button', function(evt) {
      evt.preventDefault();
      var tpl = options.templates['place-form'];

      // Show the place details in the panel
      self.placeFormView = new NS.PlaceFormView({
        template: tpl,
        collection: self.placeCollection
      });

      panelLayout.showContent(self.placeFormView);

    });

    // Tell the map to resize itself when its container changes width
    $el.on('showpanel closepanel', function() {
      google.maps.event.trigger(panorama, 'resize');
    });

    // Get all of the places, all at once.
    // TODO: How do we make Sharebouts handle very large datasets?
    this.placeCollection.fetchAllPages({
      data: {
        near: options.map.center[0] + ',' + options.map.center[1],
        distance_lt: options.map.maxDistance
      }
    });

    this.placeCollection.on('add', function(model) {
      var geom = model.get('geometry'),
          position = new google.maps.LatLng(geom.coordinates[1], geom.coordinates[0]),
          styleRule = getStyleRule(model.toJSON(), options.placeStyles),
          marker;

      marker = new google.maps.Marker({
        position: position,
        map: panorama,
        icon: styleRule.icon.url,
        title: 'hello'
      });

      // Show an infowindow on marker hover if a summary template is defined
      if (options.templates['place-summary']) {

        google.maps.event.addListener(marker, 'mouseover', function(evt) {
          // close the shared window if it's already open
          summaryWindow.close();

          // set the window content
          summaryWindow.setOptions({
            content: options.templates['place-summary'](model.toJSON())
          });

          // show the window
          summaryWindow.open(panorama, marker);
        });
      }

      markers.push(marker);
    });

    var showPlace = function(model) {
      // Show the place details in the panel
      panelLayout.showContent(new NS.PlaceDetailView({
        template: options.templates['place-detail'],
        model: model
      }));
    };
  };

}(Shareabouts, jQuery, Shareabouts.Util.console));
