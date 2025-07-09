import jwt
import pymysql
import base64
from datetime import datetime, timedelta
from flask import request, jsonify, g
from functools import wraps
from werkzeug.security import check_password_hash
from config import SECRET_KEY, ALLOWED_EXTENSIONS, MYSQL_USER, MYSQL_PASSWORD, MYSQL_HOST, MYSQL_PORT, MYSQL_DB


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def require_role(allowed_roles):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            auth_header = request.headers.get("Authorization", None)
            if not auth_header or not auth_header.startswith("Bearer "):
                return jsonify({"error": "Missing or invalid Authorization header"}), 401
            token = auth_header.split(" ")[1]

            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Token has expired"}), 401
            except jwt.InvalidTokenError:
                return jsonify({"error": "Invalid token"}), 401

            user_role = payload.get("role")
            user_id = payload.get("user_id")

            if user_role not in allowed_roles:
                return jsonify({"error": "Insufficient permissions"}), 403

            con = get_db_connection()
            with con.cursor() as cur:
                cur.execute("SELECT status FROM users WHERE id = %s", (user_id,))
                row = cur.fetchone()
            con.close()

            if not row or row[0] != 1:
                return jsonify({"error": "User is disabled"}), 401

            g.user = payload
            return f(*args, **kwargs)
        return wrapped
    return decorator

def log(msg):
    print(f"[{datetime.now().isoformat()}] {msg}")

def get_db_connection():
    return pymysql.connect(
        host=MYSQL_HOST,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DB,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.Cursor
    )

def encode_base64_fields(data, fields):
    for field in fields:
        if field in data and data[field] is not None:
            data[field] = base64.b64encode(data[field].encode('utf-8')).decode('utf-8')

def decode_base64_fields(data, fields):
    for field in fields:
        if field in data and data[field]:
            try:
                data[field] = base64.b64decode(data[field]).decode('utf-8')
            except Exception:
                data[field] = ''

def capitalize_guest_name(name: str) -> str:
    if not name:
        return name
    return " ".join(word.capitalize() for word in name.split())

