import jwt
from flask import Blueprint, request, jsonify
from utils import get_db_connection

years_bp = Blueprint('years', __name__)

@years_bp.route('/api/years', methods=['GET'])
def get_years():
    con = get_db_connection()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT DISTINCT year FROM yearly_guests ORDER BY year")
            rows = cur.fetchall()
            years = [row[0] for row in rows if row[0] is not None]
        return jsonify(years)
    finally:
        con.close()


@years_bp.route('/api/vendor_years', methods=['GET'])
def get_vendor_years():
    con = get_db_connection()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT DISTINCT year FROM yearly_guests WHERE guest_type = 'vendor' ORDER BY year")
            rows = cur.fetchall()
            years = [row[0] for row in rows if row[0] is not None]
        return jsonify(years)
    finally:
        con.close()

