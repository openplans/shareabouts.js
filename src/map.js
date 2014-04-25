/*global _ L jQuery Backbone */

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
      if (this.currentView) {
        this.currentView.onClose();
      }

      this.currentView = view;
      this.$content.html(view.render().el);
      this.$el.parent().addClass('panel-open');
      view.onShow();
    },
    handleCloseClick: function() {
      this.$el.parent().removeClass('panel-open');
      this.currentView.onClose();
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

  NS.App = new Backbone.Marionette.Application();

  NS.Map = function(options) {
    var self = this,
        modelIdToLayerId = {},
        $el = $(options.el),
        map, layoutHtml, i, layerOptions, panelLayout;

    // Set any default options
    options = options || {};
    _.defaults(options, {
      addButtonLabel: 'Add a Place'
    });

    // Initialize the Shareabouts DOM structure
    layoutHtml =
      '<div class="shareabouts-map"></div>' +
      '<div class="shareabouts-add-button-container">' +
        '<a href="#" class="shareabouts-add-button"><span>'+options.addButtonLabel+'</span></a>' +
      '</div>' +
      '<div class="shareabouts-panel">' +
        '<span class="shareabouts-close-button">&times;</span>' +
        '<div class="shareabouts-panel-content"></div>' +
      '</div>';
    $el.html(layoutHtml);

    // Init the panel layout
    panelLayout = new NS.PanelLayout({el: $el.find('.shareabouts-panel').get(0)});

    // Init the map
    map = L.map($el.find('.shareabouts-map').get(0), options.map);
    for (i = 0; i < options.layers.length; ++i) {
      layerOptions = options.layers[i];
      L.tileLayer(layerOptions.url, layerOptions).addTo(map);
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
        return getStyleRule(featureData.properties, options.placeStyles).style;
      },
      pointToLayer: function(featureData, latLng) {
        // Get style or icon settings for point geometries
        var styleRule = getStyleRule(featureData.properties, options.placeStyles);
        if (styleRule.icon) {
          return L.marker(latLng, {icon: L.icon(styleRule.icon)});
        } else {
          return L.circleMarker(latLng, styleRule.style);
        }
      }
    }).on('layeradd', function(evt) {
      // Map model ids to leaflet layer ids
      modelIdToLayerId[evt.layer.feature.properties.id] = evt.layer._leaflet_id;
    }).addTo(map);

    // Render the place detail template
    this.geoJsonLayer.on('click', function(evt) {
      var tpl = options.templates['place-detail'],
          featureData = evt.layer.feature,
          model = self.placeCollection.get(featureData.properties.id);

      // Show the place details in the panel
      panelLayout.showContent(new NS.PlaceDetailView({
        template: tpl,
        model: model
      }));

      // Pan the map to the selected layer
      // TODO: handle non-point geometries
      map.panTo(evt.layer.getLatLng());
    });

    // Listen for when a place is shown
    this.placeCollection.on('showplace', function(model){
      var styleRule = getStyleRule(model.toJSON(), options.placeStyles),
          layer = self.geoJsonLayer.getLayer(modelIdToLayerId[model.id]);

      // Focus/highlight the layer
      focusLayer(layer, styleRule);
      // Tell the map that the size of its container has changed
      map.invalidateSize(true);
    });

    // Listen for when a place is closed
    this.placeCollection.on('closeplace', function(model){
      var styleRule = getStyleRule(model.toJSON(), options.placeStyles),
          layer = self.geoJsonLayer.getLayer(modelIdToLayerId[model.id]);

      // Revert the layer
      unfocusLayer(layer, styleRule);
      // Tell the map that the size of its container has changed
      map.invalidateSize(true);
    });

    // Get all of the places, all at once.
    // TODO: How do we make Sharebouts handle very large datasets?
    this.placeCollection.fetchAllPages({
      pageSuccess: function(collection, data) {
        self.geoJsonLayer.addData(data);
      }
    });
  };

}(Shareabouts, jQuery, Shareabouts.Util.console));
