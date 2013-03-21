/*global L */

var Shareabouts = Shareabouts || {};

(function(S, L) {
  'use strict';

  S.Heatmap = function(data, options) {
    var shareaboutsFormatToHeatCanvasFormat = function(sd, valueFn) {
      var hcd = [],
          i, len, val;

      for(i=0, len=sd.length; i<len; i++) {
        if (Object.prototype.toString.call(valueFn) === '[object Function]') {
          val = valueFn(sd[i]);
        } else {
          val = 1;
        }

        hcd[i] = [[sd[i].location.lat, sd[i].location.lng], val];
      }

      return hcd;
    };

    this.options = L.extend({
      valueFn: null,
      bgcolor: [0, 0, 0, 0],
      bufferPixels: 100,
      step: 0.05,
      colorscheme: function(value){
        var h = (1 - value);
        var l = 0.5;
        var s = 1;
        var a = value + 0.03;
        return [h, s, l, a];
      }
    }, options);

    this.layer = new L.ImageOverlay.HeatCanvas(
      (shareaboutsFormatToHeatCanvasFormat(data, this.options.valueFn)),
      this.options
    );

    this.setData = function(data) {
      this.layer.setData(shareaboutsFormatToHeatCanvasFormat(data, this.options.valueFn));
    };
  };

  S.heatmap = function(data, options) {
    return new S.Heatmap(data, options);
  };
}(Shareabouts, L));