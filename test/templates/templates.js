var Shareabouts = Shareabouts || {};
Shareabouts.Data = Shareabouts.Data || {};

Shareabouts.Templates = {
  'add-button': function(data) {
    return '<a href="#" class="shareabouts-add-button button expand"><span>Add a Place</span></a>';
  },
  'place-detail': function(data) {
    return '<h2>' + data.name + '</h2>' +
      '<div class="support-region"></div>' +
      '<p>' + data.description + '</p>' +
      '<p>' + data.description + '</p>' +
      '<p>' + data.description + '</p>' +
      '<p>' + data.description + '</p>' +
      '<p>' + data.description + '</p>' +
      '<p>' + data.description + '</p>' +
      '<p>' + data.description + '</p>' +
      '<p>' + data.description + '</p>' +
      '<p>' + data.description + '</p>' +
      '<p>' + data.description + '</p>' +
      '<div class="survey-region"></div>';
  },
  'place-support': function(data) {
    'use strict';

    var userToken = Shareabouts.auth && Shareabouts.auth.getUserToken(),
        isUserLoaded = !!userToken,
        userSupport = _.find(data.items, function(support) { return support['user_token'] === userToken; }),
        isSupporting = !!userSupport;

    return data._options.enableAddSupport ? (
        '<form action="#" method="post" class="btn btn-block btn-small user-support">' +
          '<input type="hidden" name="user_token" value="' + userToken + '">' +
          '<input type="hidden" name="visible" value="true">' +
          '<input type="checkbox" id="support"' +
            (isSupporting ? ' checked="checked"' : '') +
            (isUserLoaded ? '' : ' disabled="disabled"') +
            '>' +
          '<label for="support"><span class="support-count">' + data.items.length + '</span> Support</label>' +
        '</form>'
      ) : (
        '<label for="support"><span class="support-count">' + data.items.length + '</span> Support</label>'
      );
  },
  'place-survey': function(data) {
    // anonymous user
    var submitter = '<label>Name <input name="submitter_name" type="text" value="'+(data.submitter_name||'')+'"></input></label>';
    if (data.submitter) {
      submitter = 'Comment by <strong>'+data.submitter.name+'</strong>'
    }

    return '<ul class="survey-items"></ul>' + (
      data._options.enableAddSurveys ? (
        '<form class="survey-form"><p>'+submitter+'</p>'+
        '<p><label>Comment <textarea name="comment" type="text">'+(data.comment||'')+'</textarea></label></p>'+
        '<button>Save</button></form>') : '');
  },
  'place-survey-item': function(data) {
    return '<p>'+ data.comment +'</p>';
  },
  'place-form': function(data) {
    // anonymous user
    var submitter = '<label>Your Name<input type="text" name="submitter_name" required value="'+(data.submitter_name||'')+'" /></label>';
    if (data.submitter) {
      submitter = 'Submitted by <strong>'+data.submitter.name+'</strong>'
    }

    return '<p class="form-instructions">Drag the marker to the place you want to share.</p>' +
      '<h2>Add a Place</h2>' +
      '<form novalidate>' +
      '<p>'+submitter+'</p>' +
      '<p><label>Your Email<input type="text" name="private-email" value="'+(data['private-email']||'')+'"/></label></p>' +
      '<p><label>Title<input type="text" name="name" required  value="'+(data.name||'')+'"/></label></p>' +
      '<p><label>Description<textarea name="description" required>'+(data.description||'')+'</textarea></label></p>' +
      '<p><input type="submit" value="Add to Map"></p>'
      '</form>'
  },
  'auth-actions': function(data) {
    if (!data) {
      return '<a href="#" class="shareabouts-auth-button button"><img class="shareabouts-auth-avatar" src="images/user-50.png"><small>Sign In</small></a>' +
        '<div class="shareabouts-auth-menu is-exposed">' +
          '<a class="shareabouts-auth-twitter-button" href="#">Twitter</a><br>' +
          '<a class="shareabouts-auth-facebook-button" href="#">Facebook</a>' +
        '</div>';
    } else {
      return '<a href="#" class="shareabouts-auth-button button"><img class="shareabouts-auth-avatar" src="' + data.avatar_url + '"><small>' + data.name + '</small></a>' +
        '<div class="shareabouts-auth-menu is-exposed">' +
          '<a class="shareabouts-auth-logout-button" href="#">Logout</a>' +
        '</div>';
    }
  }
}