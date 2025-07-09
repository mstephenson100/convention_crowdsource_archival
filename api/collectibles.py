import jwt
import config
from flask import Blueprint, request, jsonify, g
from utils import get_db_connection

collectibles_bp = Blueprint('collectibles', __name__)

@collectibles_bp.route('/api/guest_merch/<int:guest_id>', methods=['GET'])
def get_guest_merch(guest_id):
    tables = ['yearly_guests', 'badges', 'programs', 'clothing', 'hotel_keys']
    response = {}

    con = get_db_connection()
    try:
        with con.cursor(pymysql.cursors.DictCursor) as cur:
            cur.execute("SELECT * FROM yearly_guests WHERE guest_id = %s", (guest_id,))
            response['yearly_guests'] = cur.fetchall()

            # Fetch other tables
            for table in tables[1:]:
                cur.execute(f"SELECT * FROM {table} WHERE guest_id = %s", (guest_id,))
                response[table] = cur.fetchall()

        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        con.close()


@collectibles_bp.route('/api/collectibles/unsorted')
def get_collectibles_unsorted():
    con = get_db_connection()
    try:
        with con.cursor() as cur:
            cur.execute("""
                SELECT collectible_id, year, guest_name, guest_id, name, category, notes_1, notes_2, filename
                FROM collectibles
                ORDER BY year, guest_name, name
            """)
            columns = [col[0] for col in cur.description]
            rows = cur.fetchall()
            collectibles = [dict(zip(columns, row)) for row in rows]

        con.commit()
        return jsonify(collectibles)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        con.close()


@collectibles_bp.route('/api/collectibles/categories')
def search_categories():
    q = request.args.get('q', '').strip()
    con = get_db_connection()
    try:
        with con.cursor() as cur:
            if q:
                cur.execute("""
                    SELECT DISTINCT category FROM collectibles
                    WHERE category LIKE %s
                    ORDER BY category
                    LIMIT 100
                """, (f'%{q}%',))
            else:
                cur.execute("""
                    SELECT DISTINCT category FROM collectibles
                    ORDER BY category
                    LIMIT 100
                """)
            rows = cur.fetchall()

        categories = [row[0] for row in rows if row[0]]
        return jsonify(categories)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        con.close()


@collectibles_bp.route('/api/collectibles/by_year/<int:year>')
def get_collectibles_by_year(year):
    con = get_db_connection()
    try:
        with con.cursor() as cur:
            cur.execute("""
                SELECT collectible_id, year, guest_name, guest_id, name, category, notes_1, notes_2, filename
                FROM collectibles
                WHERE year = %s
                ORDER BY guest_name, name
            """, (year,))
            columns = [col[0] for col in cur.description]
            rows = cur.fetchall()
            collectibles = [dict(zip(columns, row)) for row in rows]

        return jsonify(collectibles)

    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500

    finally:
        con.close()

