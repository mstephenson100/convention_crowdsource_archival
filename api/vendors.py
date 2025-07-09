import jwt
import config
from flask import Blueprint, request, jsonify, g
from utils import get_db_connection, encode_base64_fields, decode_base64_fields
from config import SECRET_KEY, ALLOWED_EXTENSIONS, MYSQL_USER, MYSQL_PASSWORD, MYSQL_HOST, MYSQL_PORT, MYSQL_DB, UPLOAD_FOLDER

vendors_bp = Blueprint('vendors', __name__)

@vendors_bp.route('/api/vendors', methods=['GET'])
def get_vendors():
    year = request.args.get('year', type=int)
    con = get_db_connection()
    try:
        with con.cursor() as cur:
            if year:
                cur.execute("""
                    SELECT year, guest_name, guest_id, url, blurb, biography,
                           guest_type, guest_category, accolades_1, accolades_2, modified
                    FROM yearly_guests
                    WHERE year = %s AND guest_type = 'vendor'
                    ORDER BY guest_name ASC
                """, (year,))
            else:
                cur.execute("""
                    SELECT year, guest_name, guest_id, url, blurb, biography,
                           guest_type, guest_category, accolades_1, accolades_2, modified
                    FROM yearly_guests WHERE guest_type = 'vendor'
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


@vendors_bp.route('/api/vendors/<int:guest_id>/<int:year>', methods=['GET'])
def get_vendor_year_detail(guest_id, year):
    con = get_db_connection()
    cur = con.cursor()
    try:
        cur.execute("""
            SELECT * FROM yearly_guests WHERE guest_id = %s AND year = %s AND guest_type = 'vendor'
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


@vendors_bp.route("/api/vendors/<int:guest_id>")
def get_vendor_all_years(guest_id):
    try:
        con = get_db_connection()
        with con:
            with con.cursor() as cur:
                cur.execute(
                    "SELECT year, blurb, biography FROM yearly_guests WHERE guest_id = %s AND guest_type = 'vendor' ORDER BY year",
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


@vendors_bp.route('/api/vendors/search')
def search_vendors():
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
                        FROM yearly_guests
                        WHERE guest_name LIKE %s AND guest_type = 'vendor'
                        ORDER BY guest_name
                        LIMIT %s OFFSET %s
                    """, (like_pattern, per_page, offset))
                    guests = cur.fetchall()

                    cur.execute("""
                        SELECT guest_id, guest_name, COUNT(*) AS count
                        FROM yearly_guests
                        WHERE guest_name like %s AND guest_type = 'vendor'
                        GROUP BY guest_id, guest_name
                        ORDER BY guest_name;
                    """, (like_pattern,))
                    total = cur.fetchone()[0]
                else:
                    cur.execute("""
                        SELECT guest_id, guest_name
                        FROM yearly_guests
                        WHERE guest_type = 'vendor'
                        GROUP BY guest_id, guest_name
                        ORDER BY guest_name
                        LIMIT %s OFFSET %s
                    """, (per_page, offset))
                    guests = cur.fetchall()

                    cur.execute("""
                        SELECT guest_id, guest_name, COUNT(*) AS count
                        FROM yearly_guests
                        WHERE guest_type = 'vendor'
                        GROUP BY guest_id, guest_name
                        ORDER BY guest_name
                    """)
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
