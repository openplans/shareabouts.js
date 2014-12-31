/* global _, Backbone, jQuery */

var Shareabouts = Shareabouts || {};

(function(NS, $) {
  'use strict';

  NS.CartoDBBackend = function(options) {
    /* Options
     * -------
     * - username
     * - sqlurl
     * - apikey
     *
     * Either username or sqlurl must be specified.
     */
    options = options || {};

    this.username = options.username;
    this.apikey = options.apikey;
    this.sqlurl = options.sqlurl;

    this.tables = _.defaults(options.tables || {}, {
      places: 'shareabouts_places'
    });
  };

  NS.CartoDBBackend.prototype = {
    sync: function(method, model, options) {
      // Interpret the request
      if (model instanceof NS.PlaceCollection) {
        options.url = this.getSQLURL();
        options.type = 'GET';
        _.extend(options.data, {
          q: encodeURIComponent('SELECT * FROM ' + this.tables.places + ';'),
          format: 'GeoJSON'
        });
      }

      return Backbone.sync.apply(this, [method, model, options]);
    },
    getSQLURL: function() {
      return this.sqlurl || ('http://' + this.username + '.cartodb.com/api/v2/sql/');
    },
    runSQL: function(sql, options) {
      var url = this.getSQLURL() +
          '?q=' + encodeURIComponent(sql) +
          (this.apikey ? '&api_key=' + this.apikey : '') +
          (options.geojson ? '&format=GeoJSON' : '');
      return $.getJSON(url, options.success, options.error);
    }
  };
}(Shareabouts, jQuery));