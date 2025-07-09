import jwt
import config
from flask import Blueprint, request, jsonify, g
from utils import get_db_connection, encode_base64_fields, decode_base64_fields
from config import SECRET_KEY, ALLOWED_EXTENSIONS, MYSQL_USER, MYSQL_PASSWORD, MYSQL_HOST, MYSQL_PORT, MYSQL_DB, UPLOAD_FOLDER

guests_bp = Blueprint('guests', __name__)

@guests_bp.route('/api/guests', methods=['GET'])
def get_guests():
    year = request.args.get('year', type=int)
    con = get_db_connection()
    try:
        with con.cursor() as cur:
            if year:
                cur.execute("""
                    SELECT year, guest_name, guest_id, url, blurb, biography,
                           guest_type, guest_category, accolades_1, accolades_2, modified
                    FROM yearly_guests
                    WHERE year = %s
                    ORDER BY guest_name ASC
                """, (year,))
            else:
                cur.execute("""
                    SELECT year, guest_name, guest_id, url, blurb, biography,
                           guest_type, guest_category, accolades_1, accolades_2, modified
                    FROM yearly_guests
                    ORDER BY guest_name ASC
                """)
            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]

            guests = []
            for row in rows:
                guest = dict(zip(columns, row))
                decode_base64_fields(guest, ['blurb', 'biography'])
                guests.append(guest)

        return jsonify(guests)
    finally:
        con.close()


@guests_bp.route('/api/guests/<int:guest_id>/<int:year>', methods=['GET'])
def get_guest_year_detail(guest_id, year):
    con = get_db_connection()
    cur = con.cursor()
    try:
        cur.execute("""
            SELECT * FROM yearly_guests WHERE guest_id = %s AND year = %s
        """, (guest_id, year))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Guest not found'}), 404

        columns = [col[0] for col in cur.description]
        result = dict(zip(columns, row))
        decode_base64_fields(result, ['blurb', 'biography'])
        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        con.close()


@guests_bp.route('/api/guest_profile/<int:guest_id>')
def guest_profile(guest_id):
    con = get_db_connection()
    cur = con.cursor()
    result = {}

    try:
        # 1. Get core profile info from yearly_guests, including accolades_1 and accolades_2
        cur.execute("""
           SELECT year, guest_name, guest_id, url, blurb, biography,
                   guest_type, guest_category, accolades_1, accolades_2
            FROM yearly_guests
            WHERE guest_id = %s
            ORDER BY year
        """, (guest_id,))
        columns = [col[0] for col in cur.description]
        yearly_guests = []
        for row in cur.fetchall():
            row_dict = dict(zip(columns, row))
            # Remove keys with None values for cleaner frontend
            for field in ['url', 'guest_type', 'guest_category', 'accolades_1', 'accolades_2']:
                if row_dict.get(field) is None:
                    row_dict.pop(field, None)
            yearly_guests.append(row_dict)
        result['yearly_guests'] = yearly_guests

        # 2. Fetch collectibles for the guest
        collectible_cols = ['collectible_id', 'year', 'guest_name', 'guest_id', 'name', 'category',
                           'notes_1', 'notes_2', 'filename', 'modified']
        cols = ', '.join(collectible_cols)
        cur.execute(f"""
            SELECT {cols}
            FROM collectibles
            WHERE guest_id = %s
            ORDER BY year
        """, (guest_id,))
        result['collectibles'] = [dict(zip(collectible_cols, row)) for row in cur.fetchall()]

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        con.close()


@guests_bp.route("/api/guests/<int:guest_id>")
def get_guest_all_years(guest_id):
    try:
        con = get_db_connection()
        with con:
            with con.cursor() as cur:
                cur.execute(
                    "SELECT year, blurb, biography FROM yearly_guests WHERE guest_id = %s ORDER BY year",
                    (guest_id,)
                )
                rows = cur.fetchall()

        result = []
        for row in rows:
            result.append({
                "year": row[0],
                "blurb": row[1],
                "biography": row[2]
            })
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@guests_bp.route('/api/guests/search')
def search_guests():
    q = request.args.get('q', '').strip()
    page = request.args.get('page', 1, type=int)
    per_page = 100
    if page < 1:
        page = 1
    offset = (page - 1) * per_page

    try:
        con = get_db_connection()
        with con:
            with con.cursor() as cur:
                if q:
                    like_pattern = f"%{q}%"
                    cur.execute("""
                        SELECT guest_id, guest_name
                        FROM guests
                        WHERE guest_name LIKE %s
                        ORDER BY guest_name
                        LIMIT %s OFFSET %s
                    """, (like_pattern, per_page, offset))
                    guests = cur.fetchall()

                    cur.execute("""
                        SELECT COUNT(*) FROM guests WHERE guest_name LIKE %s
                    """, (like_pattern,))
                    total = cur.fetchone()[0]
                else:
                    cur.execute("""
                        SELECT guest_id, guest_name
                        FROM guests
                        ORDER BY guest_name
                        LIMIT %s OFFSET %s
                    """, (per_page, offset))
                    guests = cur.fetchall()

                    cur.execute("SELECT COUNT(*) FROM guests")
                    total = cur.fetchone()[0]

        result = [{"guest_id": g[0], "guest_name": g[1]} for g in guests]

        return jsonify({
            "guests": result,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@guests_bp.route('/api/guests/accolades', methods=['GET'])
def get_guests_with_accolades():
    con = get_db_connection()
    try:
        with con.cursor() as cur:
            cur.execute("""
                SELECT guest_id, guest_name, year, accolades_1, accolades_2
                FROM yearly_guests
                WHERE (accolades_1 IS NOT NULL AND accolades_1 != '')
                   OR (accolades_2 IS NOT NULL AND accolades_2 != '')
                ORDER BY guest_name, year
            """)
            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            guests = [dict(zip(columns, row)) for row in rows]
        return jsonify(guests)
    finally:
        con.close()
