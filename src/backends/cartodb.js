/* global _, Backbone, jQuery */

var Shareabouts = Shareabouts || {};

(function(NS, $) {
  'use strict';

  var _escapedAndQuotedValues = function(data, fields) {
    var values = [];
    var value;

    _.each(fields, function(field) {
      value = data[field.name] || '';
      value = '\'' + value.replace('\'', '\'\'') + '\'';
      values.push(value);
    });

    return values;
  };

  var _fieldType = function(field) {
    return field.type || 'text';
  };

  var _fieldDefs = function(fields) {
    return _.map(fields, function(field) { return field.name + ' ' + _fieldType(field); });
  };

  var _fieldTypes = function(fields) {
    return _.map(fields, _fieldType);
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

    this.tables.places.methods = this.tables.places.methods || ['list', 'create', 'retrieve'];
    this.tables.surveys.methods = this.tables.surveys.methods || ['list', 'create', 'retrieve'];
    this.tables.support.methods = this.tables.support.methods || ['list', 'create', 'retrieve', 'destroy'];
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

    getTableConfig: function(key) {
      var tables = tables || this.tables;
      var config = tables[key] || {name: 'shareabouts_' + key};
      config.fields = config.fields || [{name: 'user_token'}];
      tables[key] = config;
      return config;
    },

    getPlaceCollectionReadSQL: function() {
      return this.getSubmissionCollectionReadSQL('places');
    },

    getSubmissionCollectionReadSQL: function(setname, placeid) {
      var table = this.getTableConfig('places');
      var funcName = table.name + '_list';
      placeid = placeid || '';
      return 'SELECT * FROM ' + funcName + '(' + placeid + ');';
    },

    getPlaceCreateSQL: function(data) {
      return this.getSubmissionCreateSQL('places', data);
    },

    getSubmissionCreateSQL: function(setname, data) {
      var table = this.getTableConfig(setname);
      var funcName = table.name + '_create';
      var values = [];
      var geom;

      if (setname === 'places') {
        geom = data.geometry;
        data = data.properties;
        if (!geom || !data) {
          throw 'Place data must contain geometry and properties.';
        }
      }

      values = _escapedAndQuotedValues(data, table.fields);

      if (setname === 'places') {
        values.unshift('ST_SetSRID(ST_GeomFromGeoJSON(' + JSON.stringify(geom) + '),4326)');
      }

      return 'SELECT * FROM ' + funcName + '(' + values.join(',') + ');';
    },

/* ============================================================
 *
 *  Methods to initialize the tables and functions in a CartDB
 *  account.
 *
 * ============================================================ */

    makeCreatePlaceFunction: function(apikey, done) {
      this.makeCreateSubmissionFunction(apikey, 'places', done);
    },

    makeCreateSurveyFunction: function(apikey, done) {
      this.makeCreateSubmissionFunction(apikey, 'surveys', done);
    },

    makeCreateSupportFunction: function(apikey, done) {
      this.makeCreateSubmissionFunction(apikey, 'support', done);
    },

    makeCreateSubmissionFunction: function(apikey, setname, done) {
      var table = this.getTableConfig(setname),
          funcName = table.name + '_create',
          fieldNames = _.pluck(table.fields.slice(0), 'name'),
          fieldDefs = _fieldDefs(table.fields),
          fieldVars = _fieldVars(funcName, table.fields),
          sql;

      if (setname === 'places') {
        fieldNames.unshift('the_geom');
        fieldDefs.unshift('the_geom geometry');
        fieldVars.unshift(funcName + '.the_geom');
      } else {
        fieldNames.unshift('place_id');
        fieldDefs.unshift('place_id integer');
        fieldVars.unshift(funcName + '.place_id');
      }

      sql =
        'DROP FUNCTION IF EXISTS ' + funcName + '(' + fieldDefs.join(', ') + ');' +
        'CREATE OR REPLACE FUNCTION ' + funcName + '(' + fieldDefs.join(', ') + ') RETURNS ' + table.name + ' AS $$ ' +
          'INSERT INTO ' + table.name + ' (' + fieldNames.join(',') + ') VALUES (' + fieldVars.join(',') + ') RETURNING *;' +
        '$$ LANGUAGE SQL ' +
        'SECURITY DEFINER; ' +
        'GRANT EXECUTE ON FUNCTION ' + funcName + '(' + fieldDefs.join(', ') + ') TO publicuser;';

      this.runSQL({sql: sql, key: apikey, success: done});
    },

    makeUpdateSubmissionFunction: function(apikey, setname, done) {
      var table = this.getTableConfig(setname),
          funcName = table.name + '_update',
          fieldNames = _.pluck(table.fields.slice(0), 'name'),
          fieldDefs = _fieldDefs(table.fields),
          fieldVars = _fieldVars(funcName, table.fields),
          sql;

      if (setname === 'places') {
        fieldNames.unshift('the_geom');
        fieldDefs.unshift('the_geom geometry');
        fieldVars.unshift(funcName + '.the_geom');
      } else {
        fieldNames.unshift('place_id');
        fieldDefs.unshift('place_id integer');
        fieldVars.unshift(funcName + '.place_id');
      }

      fieldNames.unshift('cartodb_id');
      fieldDefs.unshift('cartodb_id integer');

      sql =
        'DROP FUNCTION IF EXISTS ' + funcName + '(' + fieldDefs.join(', ') + ');' +
        'CREATE OR REPLACE FUNCTION ' + funcName + '(' + fieldDefs.join(', ') + ') RETURNS ' + table.name + ' AS $$ ' +
          'UPDATE ' + table.name + ' (' + fieldNames.join(',') + ') VALUES (' + fieldVars.join(',') + ') RETURNING *;' +
        '$$ LANGUAGE SQL ' +
        'SECURITY DEFINER; ' +
        'GRANT EXECUTE ON FUNCTION ' + funcName + '(' + fieldDefs.join(', ') + ') TO publicuser;';

      this.runSQL({sql: sql, key: apikey, success: done});
    },

    makeDestroySupportFunction: function(apikey, done) {
      this.makeCreateSubmissionFunction(apikey, 'support', done);
    },

    makeDestroySubmissionFunction: function(apikey, setname, done) {
      var table = this.getTableConfig(setname),
          funcName = table.name + '_destroy',
          sql;

      sql =
        'DROP FUNCTION IF EXISTS ' + funcName + '(_id integer);' +
        'CREATE OR REPLACE FUNCTION ' + funcName + '(_id integer) ' +
        'RETURNS integer AS $$ ' +
          'DELETE FROM ' + table.name + ' WHERE cartodb_id = _id RETURNING cartodb_id;' +
        '$$ LANGUAGE SQL ' +
        'SECURITY DEFINER; ' +
        'GRANT EXECUTE ON FUNCTION ' + funcName + '(_id integer) TO publicuser;';

      this.runSQL({sql: sql, key: apikey, success: done});
    },

    makeListPlacesFunction: function(apikey, done) {
      this.makeListSubmissionsFunction(apikey, 'places', done);
    },

    makeListSurveysFunction: function(apikey, done) {
      this.makeListSubmissionsFunction(apikey, 'surveys', done);
    },

    makeListSupportFunction: function(apikey, done) {
      this.makeListSubmissionsFunction(apikey, 'support', done);
    },

    makeListSubmissionsFunction: function(apikey, setname, done) {
      var table = this.getTableConfig(setname),
          funcName = table.name + '_list',
          fields = _.filter(table.fields, function(field) { return !field.private; }),
          fieldNames = _.pluck(fields, 'name'),
          fieldDefs = _fieldDefs(fields),
          fieldTypes = _fieldTypes(fields),
          sql, functionBuilder;

      if (setname === 'places') {
        fieldNames.unshift('the_geom');
        fieldDefs.unshift('the_geom geometry');
        fieldTypes.unshift('geometry');
      } else {
        fieldNames.unshift('place_id');
        fieldDefs.unshift('place_id integer');
        fieldTypes.unshift('integer');
      }

      fieldNames.unshift('cartodb_id');
      fieldDefs.unshift('cartodb_id integer');

      functionBuilder = function(place) {
        return (
          'DROP FUNCTION IF EXISTS ' + funcName + '(' + (place ? '_place_id integer' : '') + ');' +
          'CREATE FUNCTION ' + funcName + '(' + (place ? '_place_id integer default NULL' : '') + ') ' +
          'RETURNS TABLE(' + fieldDefs.join(', ') + ') AS $$ ' +
            'SELECT ' + fieldNames.join(', ') + ' FROM ' + table.name + (place ? ' WHERE place_id = _place_id' : '') + ';' +
          '$$ LANGUAGE SQL ' +
          'SECURITY DEFINER; ' +
          'GRANT EXECUTE ON FUNCTION ' + funcName + '(' + (place ? '_place_id integer' : '') + ') TO publicuser;');
      };

      sql = functionBuilder();
      // For non-places submission sets we want to build two listing
      // function: one to get all the submissions and one to get the
      // submissions for a particular place.
      if (setname !== 'places') {
        sql += functionBuilder(true);
      }

      this.runSQL({sql: sql, key: apikey, success: done});
    },

    makePlacesTable: function(apikey, done) {
      this.makeSubmissionsTable(apikey, 'places', done);
    },

    makeSurveysTable: function(apikey, done) {
      this.makeSubmissionsTable(apikey, 'surveys', done);
    },

    makeSupportTable: function(apikey, done) {
      this.makeSubmissionsTable(apikey, 'support', done);
    },

    makeSubmissionsTable: function(apikey, setname, done) {
      var table = this.getTableConfig(setname),
          fieldDefs = _fieldDefs(table.fields),
          sql;

      if (setname !== 'places') {
        fieldDefs.unshift('place_id integer references ' + this.tables.places.name + '(cartodb_id) ON DELETE CASCADE');
      }

      // QUESTION FOR CARTODB: How can I create a hidden table?
      sql = 'CREATE TABLE IF NOT EXISTS ' + table.name + ' (' + fieldDefs.join(', ') + ');\n';

      _.forEach(table.fields, _.bind(function(field) {
        sql +=
          'DO $$ BEGIN ' +
            'ALTER TABLE ' + table.name + ' ADD COLUMN ' + field.name + ' ' + _fieldType(field) + ';' +
          'EXCEPTION WHEN duplicate_column THEN NULL;' +
          'END $$;';
      }, this));

      // First, create the table.
      this.runSQL({
        key: apikey,
        sql: sql,
        success: _.bind(function() {
          this.runSQL({
            key: apikey,
            sql: 'SELECT cdb_cartodbfytable(\'' + table.name + '\');',
            success: done
          });
        }, this)
      });
    },

    makeTables: function(apikey, done) {
      var setnames = _.without(_.keys(this.tables), 'places');
      var alldone = _.after(setnames.length + 1, done);

      this.makeSubmissionsTable(apikey, 'places', alldone);
      _.each(setnames, _.bind(function(setname) {
        this.makeSubmissionsTable(apikey, setname, alldone);
      }, this));
    },

    makeFunctions: function(apikey, setname, done) {
      var table = this.getTableConfig(setname);
      var alldone = _.after(table.methods.length, done);

      _.each(table.methods, _.bind(function(method) {
        switch (method) {
          case 'list':
            this.makeListSubmissionsFunction(apikey, setname, alldone);
            break;
          case 'create':
            this.makeCreateSubmissionFunction(apikey, setname, alldone);
            break;
          case 'retrieve':
            break;
          case 'update':
            this.makeUpdateSubmissionFunction(apikey, setname, alldone);
            break;
          case 'destroy':
            this.makeDestroySubmissionFunction(apikey, setname, alldone);
            break;
        }
      }, this));
    },

    initTablesAndFunctions: function(apikey, done) {
      this.makeTables(apikey, _.bind(function() {
        var setnames = _.keys(this.tables);
        var alldone = _.after(setnames.length, done);

        _.each(setnames, _.bind(function(setname) {
          this.makeFunctions(apikey, setname, alldone);
        }, this));

      }, this));
    }
  };
}(Shareabouts, jQuery));