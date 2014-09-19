/*globals _, jQuery, Handlebars */

var Shareabouts = Shareabouts || {};

(function(NS, $, console){

  Handlebars.registerHelper('userToken', function(typeName) {
    return NS.auth.getUserToken();
  });

  Handlebars.registerHelper('hasUserSubmitted', function(collection, options) {
    var userToken = NS.auth.getUserToken(),
        userSubmission = _.find(collection, function(model) { return model.user_token === userToken; });

    return (!!userSubmission ? options.fn(this) : options.inverse(this));
  });

}(Shareabouts, jQuery, Shareabouts.Util.console));