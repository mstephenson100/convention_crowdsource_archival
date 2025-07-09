# Convention Crowdsource Archiver
This project was built to support a crowdsourcing effort to archive Dragon Con event data. There is 37 years of data that exists in electronic, paper, and word of mouth format that doesn't yet exist in a centralized repo. This project attempts to build a platform that allows people to come together and collect this data into a standardized format.


# Database

MySQL is used as the database engine for this project. All data is stored in MySQL with the exception of image files. The schema is available in the database directory.

# Archiver

The project begins with the archiver. The archiver is simply a series of python scripts that scrape Internet Archive snapshots of dragoncon.org going back to 1996. It extracts guest data and biographies for guests. Since web development changed many times between 1996 and 2024 then these snapshots all differ in various ways. For that reason I built a script for each individual year. There is a lot of redundant code in these scripts and they could have been broken into smaller components.

Each script scrapes the snapshot, extracts guest data, and inserts into a MySQL database. The scripts and schema.sql are all available in the archiver directory.

# API

The API service was built Flask and Python which points at a MySQL database.

These are the supported methods:

    /static/<path:filename>
    /api/moderation/guests/pending
    /api/moderation/guests/reject
    /api/moderation/guests/approve
    /api/moderation/collectibles/pending
    /api/moderation/collectibles/reject
    /api/moderation/collectibles/approve
    /api/users
    /api/users/<int:user_id>
    /api/users/<int:user_id>/password
    /api/users/<int:user_id>/role
    /api/user_metrics/<int:user_id>
    /api/auth/login
    /api/user/<int:user_id>/collectible_submissions
    /api/user/<int:user_id>/guest_submissions
    /api/accolades/categories
    /api/accolades/category/<category>
    /api/accolades/distinct
    /api/accolades/<string:accolade>
    /api/guests/<int:guest_id>/<int:year>
    /api/guests/add
    /api/collectibles/<collectible_id>
    /api/collectibles/<collectible_id>
    /api/collectibles/add
    /api/guests/delete/<int:guest_id>/<int:year>
    /api/collectibles/delete/<collectible_id>
    /api/guest_merch/<int:guest_id>
    /api/collectibles/unsorted
    /api/collectibles/categories
    /api/collectibles/by_year/<int:year>
    /api/guests
    /api/guests/<int:guest_id>/<int:year>
    /api/guest_profile/<int:guest_id>
    /api/guests/<int:guest_id>
    /api/guests/search
    /api/guests/accolades
    /api/years
    /api/vendor_years
    /api/vendors
    /api/vendors/<int:guest_id>/<int:year>
    /api/vendors/<int:guest_id>
    /api/vendors/search

There is a README in the api directory with instructions on how to run this code.

# React

The React code was mostly built with chatgpt. It has the following features:

### Regular Users
Search guests by name
View guests for a year
View guest biographies
Search vendors by name
View vendors for a year
View vendors biographies
View accolades by year
View accolades by category
View curated collectibles by year
View all collectibles by year

### Crowdsource Users
Includes all Regular features
Edit guest data
Add guest data
Edit collectibles data
Add collectibles data
View metrics on all submitted edits

### Moderator Users
Includes all Regular features
Includes all Crowdsource features
Approve or reject submitted guest edits
Approve or reject submitted collectible edits

### Admin Users
Includes all Regular features
Includes all Crowdsource features
Includes all Moderator features
Add or delete users
Assign roles
Set passwords

There is a README in the react directory with instructions on how to run this code.

