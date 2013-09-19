/*global chai describe it beforeEach Shareabouts Backbone */
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
    });


    describe('SubmissionCollection', function() {
      it('should throw an error without a submission type option', function () {
        var collection = new S.SubmissionCollection(S.Data.submissions, {
          parse: true,
          placeModel: new Backbone.Model({id: 7})
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
          placeModel: new Backbone.Model({id: 17}),
          submissionType: 'comments'
        });

        assert.equal(collection.url(), '/api/places/17/comments');
      });

      it('should generate a good url for the submission item', function () {
        var collection = new S.SubmissionCollection(S.Data.submissions, {
          parse: true,
          placeModel: new Backbone.Model({id: 17}),
          submissionType: 'comments'
        });

        assert.equal(collection.at(0).url(), '/api/places/17/comments/18');
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

    });


  });
})(Shareabouts);
