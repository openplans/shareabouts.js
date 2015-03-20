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
    }
  }
};