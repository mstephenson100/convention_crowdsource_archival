import jwt
import config
from flask import Blueprint, request, jsonify, g
from datetime import datetime, timedelta
from werkzeug.security import check_password_hash
from utils import require_role, get_db_connection, decode_base64_fields
from config import SECRET_KEY

profile_bp = Blueprint('profile', __name__)

@profile_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    user_name = data.get('user_name')
    password = data.get('password')

    if not user_name or not password:
        return jsonify({'error': 'Missing username or password'}), 400

    con = get_db_connection()
    try:
        with con.cursor() as cur:
            cur.execute(
                "SELECT id, user_name, password_hash, role, status FROM users WHERE user_name = %s",
                (user_name,)
            )
            user_record = cur.fetchone()
    finally:
        con.close()

    if (
        user_record and
        user_record[4] == 1 and  # status == 1 means active
        check_password_hash(user_record[2], password)
    ):
        token = jwt.encode({
            'user_id': user_record[0],
            'user_name': user_record[1],
            'role': user_record[3],
            'exp': datetime.utcnow() + timedelta(hours=6)
        }, SECRET_KEY, algorithm="HS256")

        print(f"role: {user_record[3]}")
        return jsonify({'token': token})

    return jsonify({'error': 'Invalid login'}), 401


@profile_bp.route('/api/user/<int:user_id>/collectible_submissions')
@require_role(["admin", "moderator", "editor"])
def get_user_collectible_submissions(user_id):
    page = request.args.get('page', default=1, type=int)
    per_page = request.args.get('per_page', default=20, type=int)
    if page < 1:
        page = 1
    if per_page < 1:
        per_page = 20

    offset = (page - 1) * per_page

    con = get_db_connection()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM moderation_collectibles WHERE user_id = %s", (user_id,))
            total_count = cur.fetchone()[0]

            cur.execute("""
                SELECT
                    id, collectible_id, year, guest_name, name, category,
                    notes_1, notes_2, filename, state, timestamp
                FROM moderation_collectibles
                WHERE user_id = %s
                ORDER BY timestamp DESC
                LIMIT %s OFFSET %s
            """, (user_id, per_page, offset))
            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            submissions = [dict(zip(columns, row)) for row in rows]

    finally:
        con.close()

    return jsonify({
        'submissions': submissions,
        'total_count': total_count,
        'page': page,
        'per_page': per_page,
        'total_pages': (total_count + per_page - 1) // per_page
    })


@profile_bp.route('/api/user/<int:user_id>/guest_submissions')
@require_role(["admin", "moderator", "editor"])
def get_user_guest_submissions(user_id):
    page = request.args.get('page', default=1, type=int)
    per_page = request.args.get('per_page', default=20, type=int)
    if page < 1:
        page = 1
    if per_page < 1:
        per_page = 20

    offset = (page - 1) * per_page

    con = get_db_connection()
    try:
        with con.cursor() as cur:
            # Get total count for pagination
            cur.execute("""
                SELECT COUNT(*) FROM moderation_yearly_guests
                WHERE user_id = %s
            """, (user_id,))
            total_count = cur.fetchone()[0]
            total_pages = (total_count + per_page - 1) // per_page

            # Fetch paginated results
            cur.execute("""
                SELECT
                    id, year, guest_name, state, version, timestamp,
                    blurb, biography, guest_type, accolades_1, accolades_2
                FROM moderation_yearly_guests
                WHERE user_id = %s
                ORDER BY timestamp DESC
                LIMIT %s OFFSET %s
            """, (user_id, per_page, offset))
            rows = cur.fetchall()

            columns = [desc[0] for desc in cur.description]
            submissions = [dict(zip(columns, row)) for row in rows]

            for submission in submissions:
                decode_base64_fields(submission, ['blurb', 'biography'])

    finally:
        con.close()

    return jsonify({
        'submissions': submissions,
        'total_pages': total_pages,
        'current_page': page,
        'total_items': total_count,
        'per_page': per_page,
    })

