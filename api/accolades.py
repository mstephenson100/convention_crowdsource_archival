import jwt
import config
from flask import Blueprint, request, jsonify
from utils import get_db_connection

accolades_bp = Blueprint('accolades', __name__)

@accolades_bp.route('/api/accolades/categories')
def get_accolade_categories():
    try:
        con = get_db_connection()
        with con.cursor() as cur:
            cur.execute("""
                SELECT DISTINCT accolades
                FROM yearly_guests
                WHERE accolades IS NOT NULL AND TRIM(accolades) != ''
            """)
            rows = cur.fetchall()

        # Extract and sort non-empty trimmed accolades
        categories = sorted(row[0].strip() for row in rows if row[0] and row[0].strip())

        return jsonify(categories)

    except Exception as e:
        # Optional: log error here
        return jsonify({"error": str(e)}), 500

    finally:
        if con:
            con.close()


@accolades_bp.route('/api/accolades/category/<category>')
def get_guests_by_accolade_category(category):
    category = category.strip()  # sanitize input

    try:
        con = get_db_connection()
        with con.cursor() as cur:
            cur.execute("""
                SELECT guest_id, guest_name, year, accolades
                FROM yearly_guests
                WHERE accolades = %s
                ORDER BY year ASC
            """, (category,))
            rows = cur.fetchall()
            columns = [col[0] for col in cur.description]
            results = [dict(zip(columns, row)) for row in rows]

        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if con:
            con.close()


@accolades_bp.route('/api/accolades/distinct')
def get_distinct_accolades():
    try:
        con = get_db_connection()
        with con.cursor() as cur:
            cur.execute("""
                SELECT DISTINCT accolades FROM (
                    SELECT accolades_1 AS accolades FROM yearly_guests WHERE accolades_1 IS NOT NULL AND accolades_1 != ''
                    UNION
                    SELECT accolades_2 AS accolades FROM yearly_guests WHERE accolades_2 IS NOT NULL AND accolades_2 != ''
                ) AS combined
                ORDER BY accolades ASC
            """)
            accolades = [row[0] for row in cur.fetchall() if row[0]]
        return jsonify(accolades)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if con:
            con.close()


@accolades_bp.route('/api/accolades/<string:accolade>')
def get_accolade_detail(accolade):
    accolade = accolade.strip()  # normalize input

    try:
        con = get_db_connection()
        with con.cursor(dictionary=True) as cur:
            query = """
                SELECT guest_id, guest_name, year, accolades_1, accolades_2
                FROM yearly_guests
                WHERE accolades_1 = %s OR accolades_2 = %s
                ORDER BY year DESC, guest_name
            """
            cur.execute(query, (accolade, accolade))
            guests = cur.fetchall()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if con:
            con.close()

    return jsonify({
        "accolade": accolade,
        "guests": guests
    })

