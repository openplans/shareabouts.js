/*global _ L jQuery */

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

  NS.Map = function(options) {
    var self = this,
        el = $(options.el).get(0),
        $map = $('<div class="shareabouts-map"></div>'),
        // TODO: should this be its own widget?
        $panel = $('<div class="shareabouts-panel"></div>'),
        i, layerOptions;

    $map.appendTo(el);
    $panel.appendTo(el);

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
    }).addTo(this.map);

    // Render the place detail template
    this.geoJsonLayer.on('click', function(evt) {
      var tpl = options.templates['place-detail'],
          featureData = evt.layer.feature,
          styleRule = getStyleRule(featureData.properties, options.placeStyles),
          html = tpl(featureData);

      if (this.focusedLayer) {
        unfocusLayer(this.focusedLayer, styleRule);
      }

      this.focusedLayer = evt.layer;
      focusLayer(this.focusedLayer, styleRule);

      $panel.html(html);

    });

    this.placeCollection.fetchAllPages({
      pageSuccess: function(collection, data) {
        self.geoJsonLayer.addData(data);
      }
    });
  };

}(Shareabouts, jQuery, Shareabouts.Util.console));
