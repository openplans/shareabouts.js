/* global _, Backbone */

var Shareabouts = Shareabouts || {};

(function(NS) {
  'use strict';

  NS.ShareaboutsAPIBackend = function(options) {
    options = options || {};
    this.apiRoot = options.apiRoot || '';
  };

  NS.ShareaboutsAPIBackend.prototype = {
    sync: function(method, model, options) {
      var origBeforeSend = options.beforeSend,
          baseUrl;

      options = _.extend({
        url: (options || {}).url || _.result(model, 'url') || urlError(),

        // Sync with credentials
        xhrFields: {withCredentials: true}
      }, options);

      // Check whether we are fetching multiple specific ids
      if ('ids' in options) {
        baseUrl = options.url;
        options.url = baseUrl + (baseUrl.charAt(baseUrl.length - 1) === '/' ? '' : '/') + options.ids.join(',');
        delete options.ids;
      }

      // Add custom headers and such
      options.beforeSend = function ($xhr, inneroptions) {
        var delim;

        if (origBeforeSend) {
          origBeforeSend($xhr, inneroptions);
        }

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
      // obj.sync = this.sync;
    },

    preparePlaceCollection: function(collection/*, attrs, options*/) {
      this.prepareSync(collection);
      collection.url = this.makeCollectionUrl('/places');
    },

    preparePlaceModel: function(model/*, attrs, options*/) {
      this.prepareSync(model);
    },

    prepareSubmissionCollection: function(collection/*, attrs, options*/) {
      this.prepareSync(collection);
    },

    prepareSubmissionModel: function(model/*, attrs, options*/) {
      this.prepareSync(model);
    },

    makeCollectionUrl: function(path) {
      var apiRoot = this.apiRoot;
      var urlFunc = function() {
        return apiRoot + path;
      };
      return urlFunc;
    }
  };
}(Shareabouts));