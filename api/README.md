# Steps to install Api

Follow these steps to install the API server

# Install pyenv

Pyenv is required for this to work.

## Prerequisites

This documentation assumes you already have a pre-loaded MySQL Database with user privileges configured. You can find the bare schema in schema.sql

Configure config.py:
~~~
MYSQL_USER = 'user'
MYSQL_PASSWORD = 'pass'
MYSQL_HOST = '127.0.0.1'
MYSQL_PORT = '3306'
MYSQL_DB = 'dbname'
SECRET_KEY = 'secret_key'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
UPLOAD_FOLDER  = "www-data/uploads"
~~~

## Configure pyenv environment
From the current working directory:
~~~
$ python -m venv venv
$ source venv/bin/activate
(venv) $
~~~
Install packages
~~~
(venv) $ pip install -r requirements.txt
~~~
The remaining configs should already be good enough to make this run.

## Test some stuff

You should probably test to make sure your environment is working. Verify that app.py runs without error. The following command should not return an error:
~~~
(venv) $ python app.py
* Serving Flask app 'server'
* Debug mode: off
**WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.**
* Running on http://127.0.0.1:5000
Press CTRL+C to quit
~~~

### Try making an API call

This will only work if you have a copy of the fully indexed MySQL data loaded on a locally hosted node with credentials correctly configured in config.py. Run the following curl command from another shell instance on the node where app.py is currently running:

~~~
$ curl http://localhost:5000/api/years
[
1987,
1988,
1989
]
~~~

## Continue configuring uwsgi

CTL-C out of app.py and try running with uwsgi

~~~
(env) $ uwsgi --socket 0.0.0.0:5000 --protocol=http -w wsgi:app
Starting uWSGI 2.0.30 (64bit) on [Tue Jul  8 12:15:01 2025]
....
spawned uWSGI worker 1 (and the only) (pid: 63038, cores: 1)
~~~

If uwsgi runs without an error then try running the previous curl command and verify that data returns. If so then you are ready to move to the next steps of enabling the API as a service.

## Enable uWSGI as a service

You can now stop both app.py and uWSGI and deactivate the pyenv environment:
~~~
(venv) $ deactivate
~~~
Make a new file called /etc/systemd/system/myapi.service:
~~~
$ sudo vi /etc/systemd/system/myapi.service
[Unit]
Description=uWSGI instance to serve myapi
After=network.target

[Service]
User=api
Group=www-data
WorkingDirectory=/app/convention_crowdsource_archival/api
Environment="PATH=/app/convention_crowdsource_archival/api/venv/bin"
ExecStart=/app/convention_crowdsource_archival/api/venv/bin/uwsgi --ini api.ini  

[Install]
WantedBy=multi-user.target
~~~
This should point at the correct path for wherever you have the apiserver code installed.

### Set some permissions

Go back to wherever you have the api code installed and fix it's permissions to be accessible by the www-data group. This will make it accessible to nginx:
~~~
$ sudo chgrp www-data /app/convention_crowdsource_archival/api
~~~

### Enable uWSGI to run as a service

Start the api service which you configured two steps earlier:
~~~
$ sudo systemctl start myapi
~~~
Enable myapi to start on boot:
~~~
$ sudo systemctl enable myapi
$ sudo systemctl status myapi
**â—** myapi.service - uWSGI instance to serve myproject
Loaded: loaded (/etc/systemd/system/myapi.service; disabled; vendor preset: enabled)
Active: **active (running)** since Sat 2023-07-22 19:41:55 UTC; 2h 4min ago
Main PID: 3514335 (uwsgi)
Tasks: 6 (limit: 9508)
Memory: 34.7M
CGroup: /system.slice/myapi.service
â”œâ”€3514335 /app/convention_crowdsource_archival/api/venv/bin/uwsgi --ini api.ini
â”œâ”€3514348 /app/convention_crowdsource_archival/api/venv/bin/uwsgi --ini api.ini
â”œâ”€3514349 /app/convention_crowdsource_archival/api/venv/bin/uwsgi --ini api.ini
â”œâ”€3514350 /app/convention_crowdsource_archival/api/venv/bin/uwsgi --ini api.ini
â”œâ”€3514351 /app/convention_crowdsource_archival/api/venv/bin/uwsgi --ini api.ini
â””â”€3514352 /app/convention_crowdsource_archival/api/venv/bin/uwsgi --ini api.ini
~~~

You should now be able to run that curl command again and it should respond. For now you can also tail /var/log/syslog to watch the api log.
