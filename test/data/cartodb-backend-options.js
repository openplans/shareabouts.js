var Shareabouts = Shareabouts || {};
Shareabouts.Data = Shareabouts.Data || {};

Shareabouts.Data.cartoDBBackendDefaultOptions = {
  username: 'demo-user'
};

Shareabouts.Data.cartoDBBackendCustomOptions = {
  username: 'demo-user',
  tables: {
    places: {
      name: 'places',
      methods: ['create', 'retrieve', 'list'],
      fields: [
        {
          name: 'location_name',
        },
        {
          name: 'location_description',
        },
        {
          name: 'submitter_name',
        },
        {
          name: 'submitter_email',
          private: true
        },
        {
          name: 'submitter_home_zip',
          private: true
        },
        {
          name: 'submitter_age',
          private: true
        },
        {
          name: 'submitter_ethnicity',
          private: true
        },
        {
          name: 'user_token',
        }
      ]
    },
    comments: {
      name: 'comments',
      methods: ['create', 'retrieve', 'list'],
      fields: [
        {
          name: 'comment_text',
        },
        {
          name: 'submitter_name',
        },
        {
          name: 'user_token',
        }
      ]
    },
    support: {
      name: 'support',
      methods: ['create', 'retrieve', 'list', 'delete'],
      fields: [
        {
          name: 'user_token',
        }
      ]
    }
  }
};