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
      'click button': 'handleCloseClick'
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
    }
  });

  NS.App = new Backbone.Marionette.Application();

  NS.Map = function(options) {
    var self = this,
        modelIdToLayerId = {},
        el = $(options.el).get(0),
        $map = $('<div class="shareabouts-map"></div>'),
        // TODO: should this be its own widget?
        $panel = $('<div class="shareabouts-panel"><button>Close</button><div class="shareabouts-panel-content"></div></div>'),
        i, layerOptions, panelLayout;

    $map.appendTo(el);
    $panel.appendTo(el);

    panelLayout = new NS.PanelLayout({el: $panel.get(0)});

    this.map = L.map($map.get(0), options.map);
    for (i = 0; i < options.layers.length; ++i) {
      layerOptions = options.layers[i];
      L.tileLayer(layerOptions.url, layerOptions).addTo(this.map);
    }

    NS.PlaceCollection.prototype.url = options.datasetUrl;

    this.placeCollection = new NS.PlaceCollection([], {
      url: options.datasetUrl
    });

    this.geoJsonLayer = L.geoJson(null, {
      style: function(featureData) {
        return getStyleRule(featureData.properties, options.placeStyles);
      },
      pointToLayer: function(featureData, latLng) {
        var styleRule = getStyleRule(featureData.properties, options.placeStyles);
        if (styleRule.icon) {
          return L.marker(latLng, {icon: L.icon(styleRule.icon)});
        } else {
          return L.circleMarker(latLng, styleRule.style);
        }
      }
    }).on('layeradd', function(evt) {
      modelIdToLayerId[evt.layer.feature.properties.id] = evt.layer._leaflet_id;
    }).addTo(this.map);

    // Render the place detail template
    this.geoJsonLayer.on('click', function(evt) {
      var tpl = options.templates['place-detail'],
          featureData = evt.layer.feature,
          model = self.placeCollection.get(featureData.properties.id),
          styleRule = getStyleRule(featureData.properties, options.placeStyles);

      panelLayout.showContent(new NS.PlaceDetailView({
        template: tpl,
        model: model
      }));

      self.map.panTo(evt.layer.getLatLng());
    });

    this.placeCollection.on('showplace', function(model){
      var styleRule = getStyleRule(model.toJSON(), options.placeStyles),
          layer = self.geoJsonLayer.getLayer(modelIdToLayerId[model.id]);

      focusLayer(layer, styleRule);
      self.map.invalidateSize(true);
    });

    this.placeCollection.on('closeplace', function(model){
      var styleRule = getStyleRule(model.toJSON(), options.placeStyles),
          layer = self.geoJsonLayer.getLayer(modelIdToLayerId[model.id]);

      unfocusLayer(layer, styleRule);
      self.map.invalidateSize(true);
    });

    this.placeCollection.fetchAllPages({
      pageSuccess: function(collection, data) {
        self.geoJsonLayer.addData(data);
      }
    });
  };

}(Shareabouts, jQuery, Shareabouts.Util.console));
