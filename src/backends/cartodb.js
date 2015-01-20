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
      places: 'shareabouts_places',
      surveys: 'shareabouts_surveys',
      support: 'shareabouts_support'
    });

    this.fields = _.defaults(options.fields || {}, {
      places: ['user_token'],
      surveys: ['user_token'],
      support: ['user_token']
    });

    this.privatefields = _.defaults(options.privatefields || {}, {
      places: [],
      surveys: [],
      support: []
    });
  };

  NS.CartoDBBackend.prototype = {
    sync: function(method, obj, options) {
      var self = this, sql, successFunc = options.success;

      options.url = this.getSQLURL();
      options.type = 'POST';
      options.data = options.data || {};
      options.contentType = 'application/x-www-form-urlencoded; charset=UTF-8';
      options.processData = true;

      // Interpret the request
      // =====================
      //
      if (obj instanceof NS.PlaceCollection) {
        //
        // Read a place collection
        //
        if (method === 'read') {
          sql = this.getPlaceCollectionReadSQL({table: this.tables.places});
        }
        _.extend(options.data, {q: sql, format: 'GeoJSON'});

        options.success = function(data) {
          _.map(data.features, _.bind(self._parsePlace, self));
          return successFunc.apply(this, arguments);
        };
      }
      else if (obj instanceof NS.PlaceModel) {
        //
        // Create a place
        //
        if (method === 'create') {
          sql = this.getPlaceCreateSQL({data: obj.toJSON()});
        }
        _.extend(options.data, {q: sql, format: 'GeoJSON'});

        options.success = function(data) {
          data = self._parsePlace(data.features[0]);
          var newargs = Array.prototype.slice.call(arguments, 0);
          newargs.splice(0, 1, data);
          return successFunc.apply(this, newargs);
        };
      }
      else if (obj instanceof NS.SubmissionCollection) {
        //
        // Read a submission collection
        //
        if (method === 'read') {
          sql = this.getSubmissionCollectionReadSQL({
            table: this.tables[obj.options.submissionType],
            placeid: obj.options.placeModel.get('id')
          });
        }
        _.extend(options.data, {q: sql});

        options.success = function(data) {
          _.map(data.rows, _.bind(self._parseSubmission, self));
          data = {'results': data.rows};
          var newargs = Array.prototype.slice.call(arguments, 0);
          newargs.splice(0, 1, data);
          return successFunc.apply(this, newargs);
        };
      }

      return Backbone.sync.apply(this, [method, obj, options]);
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
    },

    _parsePlace: function(data) {
      this._parseDates(data.properties);
      this._parseId(data.properties);
      data.id = data.properties.id;
      return data;
    },

    _parseSubmission: function(data) {
      this._parseDates(data);
      this._parseId(data);
      return data;
    },

    _parseId: function(data) {
      _.defaults(data, {
        id: data.cartodb_id,
      });
      return data;
    },

    _parseDates: function(data) {
      _.defaults(data, {
        created_datetime: data.created_at,
        updated_datetime: data.updated_at
      });
      return data;
    },

    getSQLURL: function() {
      return this.sqlurl || ('http://' + this.username + '.cartodb.com/api/v2/sql/');
    },

    runSQL: function(options) {
      _.extend(options, {
        url: this.getSQLURL(),
        type: 'POST',
        data: {
          q: options.sql,
          api_key: options.key || this.apikey,
          format: (options.geojson ? 'GeoJSON' : undefined)
        }
      });
      return $.ajax(options);
    },

/* ============================================================
 *
 *  Methods to construct the necessary SQL to read and write
 *  objects to a set of CartoDB tables.
 *
 * ============================================================ */

    getPlaceCollectionReadSQL: function(options) {
      return 'SELECT * FROM ' + options.table + ';';
    },

    getSubmissionCollectionReadSQL: function(options) {
      return 'SELECT * FROM ' + options.table + ' WHERE place_id=' + options.placeid + ';';
    },

    getPlaceCreateSQL: function(options) {
      var data = options.data.properties || options.data,
          geom = options.data.geometry,
          values = [], value;

      if (geom.type.toLowerCase() === 'point') {
        values[0] = 'ST_SetSRID(ST_Point(' + geom.coordinates[0] + ',' + geom.coordinates[1] + '),4326)';
      }

      _.each(this.fields.places, function(field) {
        value = data[field] || '';
        value = '\'' + value.replace('\'', '\'\'') + '\'';
        values.push(value);
      });

      _.each(this.privatefields.places, function(field) {
        value = data[field] || '';
        value = '\'' + value.replace('\'', '\'\'') + '\'';
        values.push(value);
      });

      return 'SELECT * FROM create_place(' + values.join(',') + ');';
    },

/* ============================================================
 *
 *  Methods to initialize the tables and functions in a CartDB
 *  account.
 *
 * ============================================================ */

    makeCreatePlaceFunction: function(key) {
      var fieldNames = this.fields.places.slice(0),
          fieldDefs = _.map(this.fields.places, function(fieldName) { return fieldName + ' text'; }),
          fieldVars = _.map(this.fields.places, function(fieldName) { return 'create_place.' + fieldName; }),
          sql;

      fieldNames.unshift('the_geom');
      fieldDefs.unshift('the_geom geometry');
      fieldVars.unshift('create_place.the_geom');

      sql =
        'CREATE OR REPLACE FUNCTION create_place(' + fieldDefs.join(', ') + ') RETURNS ' + this.tables.places + ' AS $$\n' +
          'INSERT INTO ' + this.tables.places + ' (' + fieldNames.join(',') + ') VALUES (' + fieldVars.join(',') + ') RETURNING *;\n' +
        '$$ LANGUAGE SQL ' +
        'SECURITY DEFINER; ' +
        'GRANT EXECUTE ON FUNCTION create_place(' + fieldDefs.join(', ') + ') TO publicuser;';

      this.runSQL({sql: sql, key: key});
    },

    makePlacesTable: function(key) {
      var fieldDefs = _.map(this.fields.places, function(fieldName) { return fieldName + ' text'; });

      // First, create the table.
      this.runSQL({
        key: key,
        sql: 'CREATE TABLE ' + this.tables.places + ' (' + fieldDefs.join(',') + ');'
      });

      // A few seconds later, CartoDBfy it.
      _.delay(function() {
        this.runSQL({
          key: key,
          sql: 'SELECT cdb_cartodbfytable(\'' + this.tables.places + '\');'
        });
      }, 5000);
    }

  };
}(Shareabouts, jQuery));