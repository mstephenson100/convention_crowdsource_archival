import config
import base64
import jwt
import os
import uuid

from flask import Flask
from flask_cors import CORS
from moderation import moderation_bp
from admin import admin_bp
from profile import profile_bp
from accolades import accolades_bp
from editor import editor_bp
from collectibles import collectibles_bp
from guests import guests_bp
from years import years_bp
from vendors import vendors_bp

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)
app.register_blueprint(moderation_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(profile_bp)
app.register_blueprint(accolades_bp)
app.register_blueprint(editor_bp)
app.register_blueprint(collectibles_bp)
app.register_blueprint(guests_bp)
app.register_blueprint(years_bp)
app.register_blueprint(vendors_bp)
CORS(app)

if __name__ == '__main__':
    from flask import url_for
    app.testing = True
    with app.test_request_context():
        print("\nRegistered routes:")
        for rule in app.url_map.iter_rules():
            print(rule)
    app.run(debug=True)

