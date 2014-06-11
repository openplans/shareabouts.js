/*global chai, describe, it, beforeEach, afterEach, Shareabouts, Backbone, jQuery, sinon */

(function (S) {
  'use strict';

  var assert = chai.assert;

  describe('models.js', function () {


    describe('PaginatedCollection', function () {
      var collection;

      beforeEach(function() {
        collection = new S.PaginatedCollection(S.Data.submissions, {
          parse: true
        });
      });

      it('should have metadata', function () {
        assert.property(collection, 'metadata');
      });

      it('should have 1 model', function () {
        assert.equal(collection.size(), 1);
      });

      describe('fetchNextPage', function() {
        var ajax;
        beforeEach(function() {
          ajax = sinon.stub(jQuery, 'ajax', function() {});
        });

        afterEach(function() {
          jQuery.ajax.restore();
        });

        it('should use next page url', function() {
          collection.fetchNextPage();

          assert.equal(ajax.callCount, 1);
          assert.equal('http://127.0.0.1:8000/api/v2/demo-user/datasets/demo-data/support?page_size=1&page=2', ajax.getCall(0).args[0].url);
        });

        it('should not remove existing places by default', function() {
          var fetchSpy = sinon.spy(collection, 'fetch');

          collection.fetchNextPage();

          assert.equal(fetchSpy.callCount, 1);
          assert.equal(false, fetchSpy.getCall(0).args[0].remove);

          collection.fetch.restore();
        });

      });

      describe('fetchAllPages with success responses', function() {
        var collection,
            pageComplete, fetchComplete,
            pageSuccess, fetchSuccess,
            pageError, fetchError,
            ajax;

        beforeEach(function() {
          ajax = sinon.stub(jQuery, 'ajax', function(options) {
            var pageNum = (options.data && options.data.page ? options.data.page : 1);
            options.success(Shareabouts.Data.pages[pageNum - 1]);
            options.complete();
          });

          collection = new S.PaginatedCollection();
          pageComplete = sinon.spy();
          fetchComplete = sinon.spy();
          pageSuccess = sinon.spy();
          fetchSuccess = sinon.spy();
          pageError = sinon.spy();
          fetchError = sinon.spy();

          collection.url = 'http://example.com/api';
          collection.fetchAllPages({
            pageComplete: pageComplete,
            complete: fetchComplete,
            pageSuccess: pageSuccess,
            success: fetchSuccess,
            pageError: pageError,
            error: fetchError
          });
        });

        afterEach(function() {
          jQuery.ajax.restore();
        });

        it('should call pageComplete for each page', function() {
          assert.equal(pageComplete.callCount, 4);
        });

        it('should call complete once', function() {
          assert.equal(fetchComplete.callCount, 1);
        });

        it('should call pageSuccess for each page', function() {
          assert.equal(pageSuccess.callCount, 4);
        });

        it('should call success once', function() {
          assert.equal(fetchSuccess.callCount, 1);
        });

        it('should not call pageError', function() {
          assert.equal(pageError.callCount, 0);
        });

        it('should not call error', function() {
          assert.equal(fetchError.callCount, 0);
        });

        it('should load all data', function() {
          assert.equal(collection.pluck('id').toString(), [1, 2, 3, 4, 5, 6, 7, 8].toString());
        });
      });

      describe('fetchAllPages with errors', function() {
        var collection,
            pageComplete, fetchComplete,
            pageSuccess, fetchSuccess,
            pageError, fetchError,
            ajax;

        beforeEach(function() {
          ajax = sinon.stub(jQuery, 'ajax', function(options) {
            var pageNum = (options.data && options.data.page ? options.data.page : 1);
            if (pageNum % 2 === 0) { options.error(); }
            else { options.success(Shareabouts.Data.pages[pageNum - 1]); }
            options.complete();
          });

          collection = new S.PaginatedCollection();
          pageComplete = sinon.spy();
          fetchComplete = sinon.spy();
          pageSuccess = sinon.spy();
          fetchSuccess = sinon.spy();
          pageError = sinon.spy();
          fetchError = sinon.spy();

          collection.url = 'http://example.com/api';
          collection.fetchAllPages({
            pageComplete: pageComplete,
            complete: fetchComplete,
            pageSuccess: pageSuccess,
            success: fetchSuccess,
            pageError: pageError,
            error: fetchError
          });
        });

        afterEach(function() {
          jQuery.ajax.restore();
        });

        it('should call pageComplete for each page', function() {
          assert.equal(pageComplete.callCount, 4);
        });

        it('should call complete once', function() {
          assert.equal(fetchComplete.callCount, 1);
        });

        it('should call pageSuccess for each successful page', function() {
          assert.equal(pageSuccess.callCount, 2);
        });

        it('should not call success', function() {
          assert.equal(fetchSuccess.callCount, 0);
        });

        it('should call pageError for each errored page', function() {
          assert.equal(pageError.callCount, 2);
        });

        it('should call error once', function() {
          assert.equal(fetchError.callCount, 1);
        });
      });
    });

    describe('SubmissionCollection', function() {
      var TestPlaceModel = Backbone.Model.extend({
        urlRoot: '/api/places'
      });

      it('should throw an error without a submission type option', function () {
        var collection = new S.SubmissionCollection(S.Data.submissions, {
          parse: true,
          placeModel: new TestPlaceModel({id: 7})
        });

        assert.throw(function() {
           collection.url();
        }, Error, 'submission');
      });

      it('should throw an error when trying to get the url without a place', function () {
        var collection = new S.SubmissionCollection(S.Data.submissions, {
          parse: true,
          submissionType: 'comments'
        });

        assert.throw(function() {
           collection.url();
        }, Error, 'place');
      });

      it('should generate a good url for the submission list', function () {
        var collection = new S.SubmissionCollection(S.Data.submissions, {
          parse: true,
          placeModel: new TestPlaceModel({id: 17}),
          submissionType: 'comments'
        });

        assert.equal(collection.url(), '/api/places/17/comments');
      });

      it('should generate a good url for the submission item', function () {
        var collection = new S.SubmissionCollection(S.Data.submissions, {
          parse: true,
          placeModel: new TestPlaceModel({id: 17}),
          submissionType: 'comments'
        });

        assert.equal(collection.at(0).url(), '/api/places/17/comments/18');
      });

      it('should order submissions by created_datetime', function () {
        var collection = new S.SubmissionCollection([], {
          parse: true,
          placeModel: new TestPlaceModel({id: 7})
        });

        collection.add({created_datetime: '2013-11-14'});
        collection.add({created_datetime: '2013-11-13'});
        collection.add({created_datetime: '2013-11-15'});

        assert.equal(collection.at(0).get('created_datetime'), '2013-11-13');
      });


    });


    describe('AttachmentCollection', function() {

      it('should generate a good url for the attachment list on a place', function () {
        var placeCollection = new S.PlaceCollection([{id: 1}]),
            collection = new S.AttachmentCollection([], {
              thingModel: placeCollection.at(0)
            });

        assert.equal(collection.url(), placeCollection.at(0).url() +'/attachments');
      });

      it('should generate a good url for the attachment list on a submission', function () {
        var placeCollection = new S.PlaceCollection([{id: 1}]),
            submissionCollection = new S.SubmissionCollection([{id: 10}], {
              placeModel: placeCollection.at(0),
              submissionType: 'comments'
            }),
            collection = new S.AttachmentCollection([], {
              thingModel: submissionCollection.at(0)
            });

        assert.equal(collection.url(), submissionCollection.at(0).url() +'/attachments');
      });
    });

    describe('PlaceCollection', function () {
      var collection;

      beforeEach(function() {
          collection = new S.PlaceCollection(S.Data.places, {
          parse: true
        });
      });

      it('should have metadata', function () {
        assert.property(collection, 'metadata');
      });

      it('should have 4 models', function () {
        assert.equal(collection.size(), 4);
      });

      it('should not have models with a property called "properties"', function () {
        collection.each(function(model) {
          assert.notProperty(model.toJSON(), 'properties');
        });
      });

      describe('fetchByIds', function() {
        var ajax;
        beforeEach(function() {
          ajax = sinon.stub(jQuery, 'ajax', function() {});
        });

        afterEach(function() {
          jQuery.ajax.restore();
        });

        it('should make a url of joined ids', function() {
          collection.fetchByIds([1,2,3]);

          assert.equal(ajax.callCount, 1);
          assert.equal('/api/places/1,2,3', ajax.getCall(0).args[0].url);
        });

        it('should make a url of a single id', function() {
          var fetchByIdSpy = sinon.spy(collection, 'fetchById');

          collection.fetchByIds([1]);

          assert.equal(fetchByIdSpy.callCount, 1);
          assert.equal('/api/places/1', ajax.getCall(0).args[0].url);

          collection.fetchById.restore();
        });

        it('should not remove existing places by default', function() {
          var fetchSpy = sinon.spy(collection, 'fetch');

          collection.fetchByIds([1, 2]);

          assert.equal(fetchSpy.callCount, 1);
          assert.equal(false, fetchSpy.getCall(0).args[0].remove);

          collection.fetch.restore();
        });

      });
    });



    describe('Existing PlaceModel', function() {
      var model;

      beforeEach(function() {
        model = new S.PlaceModel(S.Data.places.features[0], {'parse': true});
      });

      it('should have a "geometry" property', function() {
        assert.property(model.toJSON(), 'geometry');
      });

      it('should not have a "properties" property', function() {
        assert.notProperty(model.toJSON(), 'properties');
      });

      it('should have a "type" property not equal to "Feature"', function() {
        assert.notEqual(model.toJSON().type, 'intersection');
      });
    });

    describe('Full Submission Sets on PlaceModels', function() {
      var model;

      beforeEach(function() {
        model = new S.PlaceModel(S.Data.placesIncludeSubmissions.features[0], {'parse': true});
      });

      it('should have a "support" submission_set', function() {
        assert.property(model.submissionSets, 'support');
        assert.instanceOf(model.submissionSets.support, S.SubmissionCollection);
      });

      it('should have one model in the "support" submission_set we have data and not a summary.', function() {
        assert.equal(model.submissionSets.support.size(), 1);
      });
    });



    describe('Summary Submission Sets on PlaceModels', function() {
      var model;

      beforeEach(function() {
        model = new S.PlaceModel(S.Data.places.features[0], {'parse': true});
      });

      it('should have a "support" submission_set', function() {
        assert.property(model.submissionSets, 'support');
        assert.instanceOf(model.submissionSets.support, S.SubmissionCollection);
      });

      it('should have no models in the "support" submission_set because it is a summary.', function() {
        assert.equal(model.submissionSets.support.size(), 0);
      });

    });


    describe('Saving a new PlaceModel', function() {
      var model, ajax;

      beforeEach(function() {
        model = new S.PlaceModel(S.Data.newPlace);
        model.urlRoot = 'http://www.example.com/api/';
        ajax = sinon.stub(jQuery, 'ajax', function() {});

        model.save();
      });

      afterEach(function() {
        jQuery.ajax.restore();
      });

      it('should call the jQuery ajax method', function() {
        assert.equal(ajax.callCount, 1);
      });

      it('should pass a GeoJSON feature to the server', function() {
        var syncedData = ajax.args[0][0].data,
            syncedType = ajax.args[0][0].contentType,
            obj;

        assert.isDefined(syncedData);
        assert.equal(syncedType, 'application/json');

        obj = JSON.parse(syncedData);

        assert.property(obj, 'type');
        assert.equal(obj.type, 'Feature');
        assert.property(obj, 'properties');
        assert.property(obj, 'geometry');
      });
    });

    describe('Saving an existing PlaceModel', function() {
      var model, ajax;

      beforeEach(function() {
        model = new S.PlaceModel(S.Data.places.features[0], {'parse': true});
        model.urlRoot = 'http://www.example.com/api/';
        ajax = sinon.stub(jQuery, 'ajax', function() {});

        model.save();
      });

      afterEach(function() {
        jQuery.ajax.restore();
      });

      it('should call the jQuery ajax method', function() {
        assert.equal(ajax.callCount, 1);
      });

      it('should pass a GeoJSON feature to the server', function() {
        var syncedData = ajax.args[0][0].data,
            syncedType = ajax.args[0][0].contentType,
            obj;

        assert.isDefined(syncedData);
        assert.equal(syncedType, 'application/json');

        obj = JSON.parse(syncedData);

        assert.property(obj, 'type');
        assert.equal(obj.type, 'Feature');
        assert.property(obj, 'properties');
        assert.property(obj, 'geometry');
      });
    });

    describe('Saving an AttachmentModel', function() {
      var model, ajax;

      beforeEach(function() {
        var place;
        place = new S.PlaceModel(S.Data.places.features[0], {'parse': true});
        place.urlRoot = 'http://www.example.com/api/';

        ajax = sinon.stub(jQuery, 'ajax', function(options) {
          options.success({
              'created_datetime': '2012-12-21T15:04:03.771Z',
              'updated_datetime': '2012-12-21T15:04:03.771Z',
              'file': 'attachments/6D4wJCWPQ.png',
              'name': 'test_name'
          });
        });

        model = place.attachmentCollection.get('test_name');
        model.unset('saved');
        model.save();
      });

      afterEach(function() {
        jQuery.ajax.restore();
      });

      it('should always POST to root URL', function() {
        assert.equal(ajax.callCount, 1);
        assert.equal(ajax.getCall(0).args[0].url, model.collection.url());
        assert.equal(ajax.getCall(0).args[0].type, 'POST');
      });

      it('should have saved set to true', function() {
        assert.equal(model.get('saved'), true);
      });
    });

  });
})(Shareabouts);
