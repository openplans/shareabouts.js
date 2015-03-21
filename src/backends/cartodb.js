/* global _, Backbone, jQuery */

var Shareabouts = Shareabouts || {};

(function(NS, $) {
  'use strict';

  var _escapedAndQuotedValues = function(data, fields) {
    var values = [];
    var value;

    _.each(fields, function(field) {
      value = data[field] || '';
      value = '\'' + value.replace('\'', '\'\'') + '\'';
      values.push(value);
    });

    return values;
  };

  var _fieldType = function(field) {
    return 'text';
  };

  var _fieldDefs = function(fields) {
    return _.map(fields, function(field) { return field.name + ' ' + _fieldType(field); });
  };

  var _fieldVars = function(tableOrFunc, fields) {
    return _.map(fields, function(field) { return tableOrFunc + '.' + field.name; });
  };

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
      places: {'name': 'shareabouts_places'},
      surveys: {'name': 'shareabouts_surveys'},
      support: {'name': 'shareabouts_support'}
    });

    this.tables.places.fields = this.tables.places.fields || [{'name': 'user_token'}];
    this.tables.surveys.fields = this.tables.surveys.fields || [{'name': 'user_token'}];
    this.tables.support.fields = this.tables.support.fields || [{'name': 'user_token'}];
  };

  NS.CartoDBBackend.prototype = {
    sync: function(method, obj, options, modelSync) {
      var backend = this.backend,
          sql,
          successFunc = options.success;

      options.url = backend.getSQLURL();
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
          sql = backend.getPlaceCollectionReadSQL({table: backend.tables.places});
        }
        _.extend(options.data, {q: sql, format: 'GeoJSON'});

        options.success = function(data) {
          _.map(data.features, _.bind(backend._parsePlace, backend));
          return successFunc.apply(this, arguments);
        };
      }
      else if (obj instanceof NS.PlaceModel) {
        //
        // Create a place
        //
        if (method === 'create') {
          sql = backend.getPlaceCreateSQL({data: this.toJSON()});
        }
        _.extend(options.data, {q: sql, format: 'GeoJSON'});

        options.success = function(data) {
          data = backend._parsePlace(data.features[0]);
          var newargs = Array.prototype.slice.call(arguments, 0);
          newargs.splice(0, 1, data);
          return successFunc.apply(this, newargs);
        };
      }
      else if (this instanceof NS.SubmissionCollection) {
        //
        // Read a submission collection
        //
        if (method === 'read') {
          sql = backend.getSubmissionCollectionReadSQL({
            table: backend.tables[this.options.submissionType],
            placeid: this.options.placeModel.get('id')
          });
        }
        _.extend(options.data, {q: sql});

        options.success = function(data) {
          _.map(data.rows, _.bind(backend._parseSubmission, backend));
          data = {'results': data.rows};
          var newargs = Array.prototype.slice.call(arguments, 0);
          newargs.splice(0, 1, data);
          return successFunc.apply(this, newargs);
        };
      }

      return (modelSync || Backbone.sync).apply(this, [method, obj, options]);
    },

    prepareSync: function(obj) {
      var backendSync = _.bind(this.sync, obj);
      var modelSync = obj.sync;
      obj.sync = _.partial(backendSync, _, _, _, modelSync);
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

    getPlaceCollectionReadSQL: function() {
      return 'SELECT * FROM ' + this.tables.places.name + '_list();';
    },

    getSubmissionCollectionReadSQL: function() {
      return 'SELECT * FROM ' + this.table + ' WHERE place_id=' + this.placeid + ';';
    },

    getPlaceCreateSQL: function() {
      var data = this.data.properties || this.data,
          geom = this.data.geometry,
          values = [];

      values = _escapedAndQuotedValues(data, this.tables.places.fields);

      if (geom.type.toLowerCase() === 'point') {
        values.unshift('ST_SetSRID(ST_Point(' + geom.coordinates[0] + ',' + geom.coordinates[1] + '),4326)');
      }

      return 'SELECT * FROM create_place(' + values.join(',') + ');';
    },

/* ============================================================
 *
 *  Methods to initialize the tables and functions in a CartDB
 *  account.
 *
 * ============================================================ */

    makeCreatePlaceFunction: function(key) {
      var funcName = this.tables.places.name + '_create',
          fieldNames = _.pluck(this.tables.places.fields.slice(0), 'name'),
          fieldDefs = _fieldDefs(this.tables.places.fields),
          fieldVars = _fieldVars(funcName, this.tables.places.fields),
          sql;

      fieldNames.unshift('the_geom');
      fieldDefs.unshift('the_geom geometry');
      fieldVars.unshift(funcName + '.the_geom');

      sql =
        'DROP FUNCTION IF EXISTS ' + funcName + '(' + fieldDefs.join(', ') + ');' +
        'CREATE OR REPLACE FUNCTION ' + funcName + '(' + fieldDefs.join(', ') + ') RETURNS ' + this.tables.places.name + ' AS $$ ' +
          'INSERT INTO ' + this.tables.places.name + ' (' + fieldNames.join(',') + ') VALUES (' + fieldVars.join(',') + ') RETURNING *;' +
        '$$ LANGUAGE SQL ' +
        'SECURITY DEFINER; ' +
        'GRANT EXECUTE ON FUNCTION ' + funcName + '(' + fieldDefs.join(', ') + ') TO publicuser;';

      this.runSQL({sql: sql, key: key});
    },

    makeListPlacesFunction: function(key) {
      var funcName = this.tables.places.name + '_list',
          fields = _.filter(this.tables.places.fields, function(field) { return !field.private; }),
          fieldNames = _.pluck(fields, 'name'),
          fieldDefs = _fieldDefs(fields),
          sql;

      fieldNames.unshift('the_geom');
      fieldDefs.unshift('the_geom geometry');

      sql =
        'DROP FUNCTION IF EXISTS ' + funcName + '();' +
        'CREATE FUNCTION ' + funcName + '() RETURNS TABLE(' + fieldDefs.join(', ') + ') AS $$ ' +
          'SELECT ' + fieldNames.join(', ') + ' FROM ' + this.tables.places.name + ';' +
        '$$ LANGUAGE SQL ' +
        'SECURITY DEFINER; ' +
        'GRANT EXECUTE ON FUNCTION ' + funcName + '() TO publicuser;';

      this.runSQL({sql: sql, key: key});
    },

    makePlacesTable: function(key, done) {
      var fieldDefs = _fieldDefs(this.tables.places.fields),
          sql;

      // QUESTION FOR CARTODB: How can I create a hidden table?
      sql = 'CREATE TABLE IF NOT EXISTS ' + this.tables.places.name + ' (' + fieldDefs.join(', ') + ');\n';

      _.forEach(this.tables.places.fields, _.bind(function(field) {
        sql +=
          'DO $$ BEGIN ' +
            'ALTER TABLE ' + this.tables.places.name + ' ADD COLUMN ' + field.name + ' ' + _fieldType(field) + ';' +
          'EXCEPTION WHEN duplicate_column THEN NULL;' +
          'END $$;';
      }, this));

      // First, create the table.
      this.runSQL({
        key: key,
        sql: sql,
        success: _.bind(function() {
          this.runSQL({
            key: key,
            sql: 'SELECT cdb_cartodbfytable(\'' + this.tables.places.name + '\');',
            success: done
          });
        }, this)
      });
    }

  };
}(Shareabouts, jQuery));