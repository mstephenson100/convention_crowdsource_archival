import jwt
import config
import uuid
import os
from flask import Blueprint, request, jsonify, g
from werkzeug.utils import secure_filename
from utils import require_role, get_db_connection, capitalize_guest_name, encode_base64_fields, allowed_file
from config import SECRET_KEY, UPLOAD_FOLDER

editor_bp = Blueprint('editor', __name__)

@editor_bp.route('/api/guests/<int:guest_id>/<int:year>', methods=['PUT'])
@require_role(["editor", "moderator", "admin"])
def submit_guest_moderation(guest_id, year):
    data = request.json or {}

    # Decode and verify JWT token before DB connection
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = decoded.get('user_id')
        if not user_id:
            return jsonify({'error': 'Missing user_id in token'}), 401
    except Exception as e:
        return jsonify({'error': 'Invalid or missing token', 'details': str(e)}), 401

    data.setdefault('blurb', None)
    data.setdefault('biography', None)

    encode_base64_fields(data, ['blurb', 'biography'])

    con = get_db_connection()
    try:
        with con.cursor() as cur:
            cur.execute(
                "SELECT guest_name FROM yearly_guests WHERE guest_id = %s AND year = %s",
                (guest_id, year)
            )
            guest = cur.fetchone()
            if not guest:
                return jsonify({'error': 'Guest not found'}), 404

            guest_name = guest[0]

            cur.execute("""
                SELECT MAX(version) FROM moderation_yearly_guests
                WHERE guest_name = %s AND year = %s AND state = 1
            """, (guest_name, year))
            row = cur.fetchone()
            current_version = row[0] if row and row[0] is not None else 0
            new_version = current_version + 1

            insert_sql = """
                INSERT INTO moderation_yearly_guests
                (year, guest_id, url, guest_name, blurb, biography, guest_type, guest_category,
                 accolades_1, accolades_2, version, user_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            values = (
                year,
                guest_id,
                data.get('url'),
                guest_name,
                data.get('blurb'),
                data.get('biography'),
                data.get('guest_type'),
                data.get('guest_category'),
                data.get('accolades_1'),
                data.get('accolades_2'),
                new_version,
                user_id
            )

            try:
                debug_sql = cur.mogrify(insert_sql, values)
                print("[SQL INSERT]", debug_sql.decode() if isinstance(debug_sql, bytes) else debug_sql)
            except Exception as e:
                print("[SQL INSERT] Error formatting query for debug:", e)

            cur.execute(insert_sql, values)

        con.commit()
    except Exception as e:
        con.rollback()
        print("[ERROR]", str(e))
        return jsonify({"error": str(e)}), 500
    finally:
        con.close()

    return jsonify({'message': 'Update submitted for moderation', 'version': new_version})


@editor_bp.route('/api/guests/add', methods=['POST'])
@require_role(["editor", "moderator", "admin"])
def add_guest_submission():
    data = request.json
    if not data:
        return jsonify({'error': 'Invalid or missing JSON body'}), 400

    year = data.get('year')
    guest_name = data.get('guest_name')

    if not guest_name or not year:
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        year = int(year)
    except (TypeError, ValueError):
        return jsonify({'error': 'Year must be an integer'}), 400

    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = decoded.get('user_id')
        if not user_id:
            raise Exception("Missing user_id in token")
    except Exception as e:
        return jsonify({'error': 'Invalid or missing token', 'details': str(e)}), 401

    encode_base64_fields(data, ['blurb', 'biography'])

    con = get_db_connection()
    try:
        with con.cursor() as cur:
            cur.execute("START TRANSACTION")

            cur.execute("""
                SELECT MAX(version)
                FROM moderation_yearly_guests
                WHERE guest_name = %s AND year = %s AND state = 1
                FOR UPDATE
            """, (guest_name, year))
            row = cur.fetchone()
            current_version = row[0] or 0
            new_version = current_version + 1

            insert_sql = """
                INSERT INTO moderation_yearly_guests
                (year, guest_name, blurb, biography, accolades_1, accolades_2, guest_type, user_id, version)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            insert_values = (
                year,
                guest_name,
                data.get('blurb'),
                data.get('biography'),
                data.get('accolades_1') or None,
                data.get('accolades_2') or None,
                data.get('guest_type') or None,
                user_id,
                new_version
            )

            try:
                debug_sql = cur.mogrify(insert_sql, insert_values)
                print("[SQL INSERT]", debug_sql.decode() if isinstance(debug_sql, bytes) else debug_sql)
            except Exception as e:
                print("[SQL INSERT] Error formatting query for debug:", e)

            cur.execute(insert_sql, insert_values)
            con.commit()

        return jsonify({'message': 'Guest submission added for moderation', 'version': new_version})

    except Exception as e:
        con.rollback()
        return jsonify({'error': 'Database error', 'details': str(e)}), 500

    finally:
        con.close()


@editor_bp.route('/api/collectibles/<collectible_id>')
@require_role(["editor", "moderator", "admin"])
def get_collectible_detail(collectible_id):
    if not collectible_id or len(collectible_id) > 64:
        return jsonify({"error": "Invalid collectible_id"}), 400

    con = None
    try:
        con = get_db_connection()
        with con.cursor() as cur:
            cur.execute("""
                SELECT collectible_id, year, guest_id, guest_name, name, category, notes_1, notes_2, filename
                FROM collectibles
                WHERE collectible_id = %s
            """, (collectible_id,))
            row = cur.fetchone()
            if not row:
                return jsonify({"error": "Collectible not found"}), 404
            columns = [desc[0] for desc in cur.description]
            collectible = dict(zip(columns, row))
            if 'guest_name' in collectible and collectible['guest_name']:
                collectible['guest_name'] = capitalize_guest_name(collectible['guest_name'])
        return jsonify(collectible)
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500
    finally:
        if con:
            con.close()


@editor_bp.route('/api/collectibles/<collectible_id>', methods=['PUT'])
@require_role(["editor", "moderator", "admin"])
def submit_collectible_moderation(collectible_id):
    data = request.json

    con = get_db_connection()
    cur = con.cursor()
    try:
        cur.execute("""
            SELECT year, guest_id, guest_name, filename
            FROM collectibles
            WHERE collectible_id = %s
        """, (collectible_id,))
        collectible = cur.fetchone()
        if not collectible:
            cur.close()
            con.close()
            return jsonify({'error': 'Collectible not found'}), 404

        year, guest_id, original_guest_name, filename = collectible

        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        try:
            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_id = decoded.get('user_id')
            if not user_id:
                raise Exception("Missing user_id in token")
        except Exception:
            cur.close()
            con.close()
            return jsonify({'error': 'Invalid or missing token'}), 401

        guest_name_to_use = data.get('guest_name', original_guest_name)

        cur.execute("""
            SELECT MAX(version) FROM moderation_collectibles
            WHERE collectible_id = %s AND state = 1
        """, (collectible_id,))
        row = cur.fetchone()
        current_version = row[0] if row and row[0] is not None else 0
        new_version = current_version + 1

        insert_sql = """
            INSERT INTO moderation_collectibles
            (collectible_id, year, guest_id, guest_name, name, category, notes_1, notes_2, filename, version, user_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        values = (
            collectible_id,
            year,
            guest_id,
            guest_name_to_use,
            data.get('name'),
            data.get('category'),
            data.get('notes_1'),
            data.get('notes_2'),
            filename,
            new_version,
            user_id
        )

        print("[SQL INSERT]", cur.mogrify(insert_sql, values))

        # Execute insert
        cur.execute(insert_sql, values)
        con.commit()
        cur.close()
        con.close()

        return jsonify({'message': 'Collectible update submitted for moderation', 'version': new_version})

    except Exception as e:
        con.rollback()
        cur.close()
        con.close()
        return jsonify({"error": str(e)}), 500


@editor_bp.route('/api/collectibles/add', methods=['POST'])
@require_role(["editor", "moderator", "admin"])
def add_collectible():
    from app import app

    # Validate file presence in request
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']

    # Validate filename is not empty
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    # Validate file type whitelist
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400

    # Secure and make unique filename
    filename = secure_filename(file.filename)
    unique_filename = f"{uuid.uuid4().hex}_{filename}"

    # Check upload folder config
    upload_folder = app.config.get('UPLOAD_FOLDER')
    if not upload_folder:
        return jsonify({'error': 'Upload folder not configured'}), 500

    # Ensure upload folder exists and save file safely
    try:
        os.makedirs(upload_folder, exist_ok=True)
        file_path = os.path.join(upload_folder, unique_filename)
        file.save(file_path)
    except Exception as e:
        return jsonify({'error': f'Failed to save file: {str(e)}'}), 500

    # Generate a UUID string for collectible_id (as string, since collectible_id isn't int)
    collectible_id = str(uuid.uuid4())

    year = request.form.get('year')
    name = request.form.get('name')
    guest_name = request.form.get('guest_name')
    category = request.form.get('category')
    notes_1 = request.form.get('notes_1')
    notes_2 = request.form.get('notes_2')
    mod_unique_filename = f"uploads/{unique_filename}"

    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = decoded.get('user_id')
        if not user_id:
            raise Exception("Missing user_id in token")
    except Exception:
        return jsonify({'error': 'Invalid or missing token'}), 401

    con = get_db_connection()
    try:
        with con.cursor() as cur:
            insert_mod_sql = """
                INSERT INTO moderation_collectibles
                (collectible_id, year, guest_name, name, category, notes_1, notes_2, filename, version, user_id, state)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 1, %s, 1)
            """
            mod_values = (
                collectible_id,
                year,
                guest_name,
                name,
                category,
                notes_1,
                notes_2,
                mod_unique_filename,
                user_id,
            )
            query2 = cur.mogrify(insert_mod_sql, mod_values)
            if isinstance(query2, bytes):
                query2 = query2.decode('utf-8')
            print("[SQL INSERT moderation_collectibles]", query2)
            cur.execute(insert_mod_sql, mod_values)

        con.commit()
    except Exception as e:
        con.rollback()
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    finally:
        con.close()

    return jsonify({
        'message': 'Collectible submitted for moderation successfully',
        'collectible_id': collectible_id
    })


@editor_bp.route('/api/guests/delete/<int:guest_id>/<int:year>', methods=['POST'])
@require_role(["editor", "moderator", "admin"])
def delete_guest_moderation(guest_id, year):
    con = get_db_connection()
    try:
        with con.cursor() as cur:
            cur.execute("""
                SELECT year, guest_id, url, guest_name, blurb, biography, guest_type, guest_category, accolades_1, accolades_2
                FROM yearly_guests
                WHERE guest_id = %s AND year = %s
            """, (guest_id, year))
            guest = cur.fetchone()

            if not guest:
                return jsonify({"error": "Guest not found"}), 404

            token = request.headers.get('Authorization', '').replace('Bearer ', '')
            try:
                decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
                user_id = decoded.get('user_id')
                if not user_id:
                    raise Exception("Missing user_id in token")
            except Exception:
                return jsonify({'error': 'Invalid or missing token'}), 401

            guest_name = guest[3]

            cur.execute("""
                SELECT MAX(version) FROM moderation_yearly_guests
                WHERE guest_name = %s AND year = %s AND state = 1
            """, (guest_name, year))
            row = cur.fetchone()
            current_version = row[0] if row and row[0] is not None else 0
            new_version = current_version + 1

            # Prepare insert SQL - setting deleted=1 and state=1 for pending deletion
            insert_sql = """
                INSERT INTO moderation_yearly_guests
                (year, guest_id, url, guest_name, blurb, biography, guest_type, guest_category,
                 accolades_1, accolades_2, version, user_id, deleted, state)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1, 1)
            """
            values = (
                guest[0], guest[1], guest[2], guest_name, guest[4], guest[5], guest[6], guest[7],
                guest[8], guest[9], new_version, user_id
            )

            try:
                debug_sql = insert_sql
                for v in values:
                    debug_sql = debug_sql.replace('%s', repr(v), 1)
                print("[SQL INSERT]", debug_sql)
            except Exception as e:
                print("[SQL INSERT] Error formatting query for debug:", e)

            cur.execute(insert_sql, values)
        con.commit()
        return jsonify({'message': 'Guest deletion submitted for moderation', 'version': new_version})

    except Exception as e:
        con.rollback()
        print(f"[ERROR] delete_guest_moderation: {str(e)}")
        return jsonify({'error': 'Database error', 'details': str(e)}), 500

    finally:
        con.close()


@editor_bp.route('/api/collectibles/delete/<collectible_id>', methods=['POST'])
@require_role(["editor", "moderator", "admin"])
def delete_collectible_moderation(collectible_id):
    con = get_db_connection()
    try:
        with con.cursor() as cur:
            # Fetch existing collectible data from collectibles table
            cur.execute("""
                SELECT collectible_id, year, guest_id, guest_name, name, category,
                       notes_1, notes_2, filename
                FROM collectibles
                WHERE collectible_id = %s
            """, (collectible_id,))
            collectible = cur.fetchone()

            if not collectible:
                return jsonify({"error": "Collectible not found"}), 404

            token = request.headers.get('Authorization', '').replace('Bearer ', '')
            try:
                decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
                user_id = decoded.get('user_id')
                if not user_id:
                    raise Exception("Missing user_id in token")
            except Exception:
                return jsonify({'error': 'Invalid or missing token'}), 401

            guest_name = collectible[3]
            year = collectible[1]

            cur.execute("""
                SELECT MAX(version) FROM moderation_collectibles
                WHERE collectible_id = %s AND state = 1
            """, (collectible_id,))
            row = cur.fetchone()
            current_version = row[0] if row and row[0] is not None else 0
            new_version = current_version + 1

            # Insert into moderation_collectibles with deleted=1, state=1 for moderation queue
            insert_sql = """
                INSERT INTO moderation_collectibles
                (collectible_id, year, guest_id, guest_name, name, category,
                 notes_1, notes_2, filename, version, user_id, deleted, state)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1, 1)
            """
            values = (
                collectible[0], collectible[1], collectible[2], guest_name, collectible[4], collectible[5],
                collectible[6], collectible[7], collectible[8], new_version, user_id
            )

            try:
                debug_sql = insert_sql
                for v in values:
                    debug_sql = debug_sql.replace('%s', repr(v), 1)
                print("[SQL INSERT]", debug_sql)
            except Exception as e:
                print("[SQL INSERT] Error formatting query for debug:", e)

            cur.execute(insert_sql, values)
        con.commit()
        return jsonify({'message': 'Collectible deletion submitted for moderation', 'version': new_version})

    except Exception as e:
        con.rollback()
        print(f"[ERROR] delete_collectible_moderation: {e}")
        return jsonify({'error': 'Database error', 'details': str(e)}), 500

    finally:
        con.close()
