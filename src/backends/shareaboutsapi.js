/* global _, Backbone */

var Shareabouts = Shareabouts || {};

(function(NS) {
  'use strict';

  NS.ShareaboutsAPIBackend = function() {};

  NS.ShareaboutsAPIBackend.prototype = {
    sync: function(method, model, options) {
      // Sync with credentials
      _.defaults(options || (options = {}), {
        xhrFields: {withCredentials: true}
      });
      return Backbone.sync.apply(this, [method, model, options]);
    }
  };
}(Shareabouts));