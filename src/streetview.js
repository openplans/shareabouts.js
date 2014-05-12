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

  var focusLayer = function(marker, styleRule) {
    marker.setIcon(styleRule.focusIcon);
  };

  var unfocusLayer = function(marker, styleRule) {
    marker.setIcon(styleRule.icon);
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

  NS.PlaceSurveyItemView = Backbone.Marionette.ItemView.extend({
    tagName: 'li'
  });

  NS.PlaceSurveyView = Backbone.Marionette.CompositeView.extend({
    initialize: function(options) {
      this.options = options;
    },
    itemView: NS.PlaceSurveyItemView,
    itemViewContainer: '.survey-items',
    itemViewOptions: function(model, index) {
      return {
        template: this.options.surveyItemTemplate
      };
    },
    ui: {
      form: 'form',
      submitButton: '[type="submit"], button'
    },
    events: {
      'submit @ui.form': 'handleFormSubmit'
    },
    handleFormSubmit: function(evt) {
      evt.preventDefault();

      // serialize the form
      var self = this,
          data = NS.Util.getAttrs(this.ui.form),
          model;

      // disable the submit button
      this.ui.submitButton.prop('disabled', true);
      // add loading/busy class
      this.$el.addClass('loading');

      model = this.collection.create(data, {
        wait: true,
        success: function(evt) {
          model.collection.trigger('create', model);
          // Reset the form after it is saved successfully
          self.ui.form.get(0).reset();
        },
        complete: function(evt) {
          // enable the submit button
          self.ui.submitButton.prop('disabled', false);

          // remove loading/busy class
          self.$el.removeClass('loading');
        }
      });
    },
    onShow: function() {
      this.collection.fetchAllPages();
    }
  });

  NS.PlaceDetailView = Backbone.Marionette.Layout.extend({
    initialize: function(options) {
      this.options = options;
    },
    regions: {
      surveyRegion: '.survey-region'
    },
    onClose: function() {
      this.model.collection.trigger('closeplace', this.model);
    },
    onShow: function() {
      if (this.options.surveyTemplate && this.options.surveyItemTemplate) {
        this.surveyRegion.show(new NS.PlaceSurveyView({
          model: this.model,
          collection: this.model.getSubmissionSetCollection('comments'),
          umbrella: this.options.umbrella,

          template: this.options.surveyTemplate,
          surveyItemTemplate: this.options.surveyItemTemplate
        }));
      }

      this.model.collection.trigger('showplace', this.model);
    }
  });

  NS.PlaceFormView = Backbone.Marionette.ItemView.extend({
    ui: {
      form: 'form',
      submitButton: '[type="submit"], button'
    },
    events: {
      'submit @ui.form': 'handleSubmit'
    },
    initialize: function(options) {
      this.options = options;
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

      // disable the submit button
      this.ui.submitButton.prop('disabled', true);
      // add loading/busy class
      this.$el.addClass('loading');

      model = this.collection.create(data, {
        wait: true,
        success: function(evt) {
          model.collection.trigger('create', model);

          // Reset the form after it is saved successfully
          self.ui.form.get(0).reset();
        },
        complete: function(evt) {
          // enable the submit button
          self.ui.submitButton.prop('disabled', false);

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
      $(this.options.umbrella).trigger('showplaceform', arguments);
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
      addButtonLabel: 'Add a Place'
    });

    // Initialize the Shareabouts DOM structure
    layoutHtml =
      '<div class="shareabouts-map-container">' +
        '<div class="shareabouts-map"></div>' +
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
            pitch: 0
          },
          visible: true
        }, options || {}),

        summaryOptions = _.extend({
          disableAutoPan: true
        }, options.summary || {}),
        summaryWindow = new google.maps.InfoWindow(summaryOptions),

        markers = {},
        panorama = new google.maps.StreetViewPanorama($el.find('.shareabouts-map').get(0), panoramaOptions),
        plusMarker = new google.maps.Marker({
          draggable: true,
          crossOnDrag: false
        });

    // for (i = 0; i < options.layers.length; ++i) {
    //   layerOptions = options.layers[i];
    //   L.tileLayer(layerOptions.url, layerOptions).addTo(map);
    // }

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
            panorama.getPosition(), plusMarker.getPosition()),
          panoPosition, heading, position;

      if (dist > options.maxDistance) {
        // origin
        panoPosition = panorama.getPosition();
        // from the origin to the new marker
        heading = google.maps.geometry.spherical.computeHeading(panoPosition, plusMarker.getPosition());
        // reposition the marker at exact maxDistance along it's current heading (like star trek)
        position = google.maps.geometry.spherical.computeOffsetOrigin(
              panoPosition, options.maxDistance, heading-180);

        // weeee
        plusMarker.setPosition(position);
      }
    });

    // Listen for when a place is shown
    this.placeCollection.on('showplace', function(model){
      var styleRule = getStyleRule(model.toJSON(), options.placeStyles),
          marker = markers[model.id];

      // Focus/highlight the layer
      focusLayer(marker, styleRule);

      // Hide the summary
      summaryWindow.close();
    });

    // Listen for when a place is closed
    this.placeCollection.on('closeplace', function(model){
      var styleRule = getStyleRule(model.toJSON(), options.placeStyles),
          marker = markers[model.id];

      // Revert the layer
      unfocusLayer(marker, styleRule);
    });

    // Init add button object
    $el.on('click', '.shareabouts-add-button', function(evt) {
      evt.preventDefault();
      var tpl = options.templates['place-form'],
          styleRule = getStyleRule({}, options.placeStyles),
          position;

      if (tpl) {
         position = google.maps.geometry.spherical.computeOffsetOrigin(
          panorama.getPosition(), 10, panorama.getPov().heading-180);


        // Show the place details in the panel
        self.placeFormView = new NS.PlaceFormView({
          template: tpl,
          collection: self.placeCollection,
          umbrella: self
        });

        panelLayout.showContent(self.placeFormView);

        plusMarker.setOptions({
          map: panorama,
          icon: styleRule.newIcon,
          position: position
        });
      }
    });

    // Tell the map to resize itself when its container changes width
    $el.on('showpanel closepanel', function() {
      google.maps.event.trigger(panorama, 'resize');
    });

    $el.on('closepanel', function() {
      // Remove the plus marker if it exists
      plusMarker.setMap(null);
    });

    // Get all of the places, all at once.
    // TODO: How do we make Sharebouts handle very large datasets?
    this.placeCollection.fetchAllPages({
      data: {
        near: mapOptions.center[0] + ',' + mapOptions.center[1],
        distance_lt: mapOptions.maxDistance
      }
    });

    this.placeCollection.on('create', function(model) {
      // Remove the plus marker if it exists
      plusMarker.setMap(null);

      // Show the place details in the panel
      panelLayout.showContent(new NS.PlaceDetailView({
        template: options.templates['place-detail'],
        model: model,
        umbrella: self,

        // Templates for the survey views that are rendered in a region
        surveyTemplate: options.templates['place-survey'],
        surveyItemTemplate: options.templates['place-survey-item']
      }));
    });

    this.placeCollection.on('add', function(model) {
      var geom = model.get('geometry'),
          position = new google.maps.LatLng(geom.coordinates[1], geom.coordinates[0]),
          styleRule = getStyleRule(model.toJSON(), options.placeStyles),
          marker;

      var showPlace = function(model) {
        // Show the place details in the panel
        panelLayout.showContent(new NS.PlaceDetailView({
          template: options.templates['place-detail'],
          model: model,
          umbrella: self,

          // Templates for the survey views that are rendered in a region
          surveyTemplate: options.templates['place-survey'],
          surveyItemTemplate: options.templates['place-survey-item']
        }));
      };

      marker = new google.maps.Marker({
        position: position,
        map: panorama,
        icon: styleRule.icon
      });

      if (options.templates['place-detail']) {
        google.maps.event.addListener(marker, 'click', function(evt) {
          showPlace(model);
        });
      }

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

      markers[model.id] = marker;
    });
  };

}(Shareabouts, jQuery, Shareabouts.Util.console));
