/* global _, Backbone */

var Shareabouts = Shareabouts || {};

(function(NS) {
  'use strict';

  NS.ShareaboutsAPIBackend = function() {};

  NS.ShareaboutsAPIBackend.prototype = {
    sync: function(method, model, options) {
      var origBeforeSend = options.beforeSend;

      // Sync with credentials
      _.defaults(options || (options = {}), {
        xhrFields: {withCredentials: true}
      });

      // Add custom headers and such
      options.beforeSend = function ($xhr, inneroptions) {
        var delim;

        origBeforeSend($xhr, inneroptions);

        // Add custom headers
        $xhr.setRequestHeader('X-Shareabouts-Silent', !!options.silent);

        // Add 'include_invisible' so that we can nicely save invisible places,
        // but only if the user says it's okay via the options.
        if (options.include_invisible) {
          delim = inneroptions.url.indexOf('?') !== -1 ? '&' : '?';
          options.url = options.url + delim + 'include_invisible';
        }

        // Remind the browser to send credentials
        $xhr.withCredentials = true;
      };

      return Backbone.sync.apply(this, [method, model, options]);
    },

    prepareSync: function(obj) {
      obj.sync = _.bind(this.sync, this);
    },

    preparePlaceCollection: function(collection/*, attrs, options*/) {
      this.prepareSync(collection);
    },

    preparePlaceModel: function(model/*, attrs, options*/) {
      this.prepareSync(model);
    },

    prepareSubmissionCollection: function(collection/*, attrs, options*/) {
      this.prepareSync(collection);
    },

    prepareSubmissionModel: function(model/*, attrs, options*/) {
      this.prepareSync(model);
    }
  };
}(Shareabouts));