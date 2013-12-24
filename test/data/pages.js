var Shareabouts = Shareabouts || {};
Shareabouts.Data = Shareabouts.Data || {};

Shareabouts.Data.pages = [
    {
        "metadata": {
            "length": 8,
            "next": "http://example.com/api/data?page=2",
            "previous": null,
            "page": 1
        },
        "results": [
            {
                "id": 1,
                "key1": "val1",
                "key2": "val2"
            },
            {
                "id": 2,
                "key1": "val1",
                "key2": "val2"
            }
        ]
    },
    {
        "metadata": {
            "length": 8,
            "next": "http://example.com/api/data?page=3",
            "previous": "http://example.com/api/data?page=1",
            "page": 2
        },
        "results": [
            {
                "id": 3,
                "key1": "val1",
                "key2": "val2"
            },
            {
                "id": 4,
                "key1": "val1",
                "key2": "val2"
            }
        ]
    },
    {
        "metadata": {
            "length": 8,
            "next": "http://example.com/api/data?page=2",
            "previous": "http://example.com/api/data?page=4",
            "page": 3
        },
        "results": [
            {
                "id": 5,
                "key1": "val1",
                "key2": "val2"
            },
            {
                "id": 6,
                "key1": "val1",
                "key2": "val2"
            }
        ]
    },
    {
        "metadata": {
            "length": 8,
            "next": "http://example.com/api/data?page=3",
            "previous": null,
            "page": 4
        },
        "results": [
            {
                "id": 7,
                "key1": "val1",
                "key2": "val2"
            },
            {
                "id": 8,
                "key1": "val1",
                "key2": "val2"
            }
        ]
    }
];