/*global window _ */

var Shareabouts = Shareabouts || {};

(function(NS, $, console){
  'use strict';

  NS.Auth = function(options) {
    // Set any default options
    options = options || {};
    _.defaults(options, {
      twitter: '.shareabouts-auth-twitter-button',
      facebook: '.shareabouts-auth-facebook-button',
      successPage: '/success.html',
      errorPage: '/error.html'
    });

    var self = this;

    $(options.twitter).click(function(evt) {
      evt.preventDefault();

      window.open('http://data.shareabouts.org/api/v2/users/login/twitter?next=' +
        options.successPage);//+'&error_next=' + options.errorPage);
    });

    this.isAuthenticated = false;

    this.initUser = function() {
      $.ajax({
        url: 'http://data.shareabouts.org/api/v2/users/current',
        xhrFields: {
          withCredentials: true
        },
        success: function(userData) {
          if (userData) {
            // console.log(userData);
            self.isAuthenticated = true;
            $(self).trigger('authsuccess', [userData]);
          } else {
            // console.log('No user data');
            self.isAuthenticated = false;
            $(self).trigger('autherror');
          }
        }
      });
    };

  };
}(Shareabouts, jQuery, Shareabouts.Util.console));