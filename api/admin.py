import jwt
import config
from flask import Blueprint, request, jsonify, g
from werkzeug.security import generate_password_hash
from utils import require_role, get_db_connection

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/api/users', methods=['GET'])
@require_role(["admin"])
def list_users():
    con = get_db_connection()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT id, user_name, full_name, role FROM users WHERE status = 1 ORDER BY id")
            rows = cur.fetchall()
            col_names = [desc[0] for desc in cur.description]
            users = [dict(zip(col_names, row)) for row in rows]

        return jsonify(users)
    finally:
        con.close()


@admin_bp.route('/api/users', methods=['POST'])
@require_role(["admin"])
def create_user():
    data = request.json or {}
    user_name = (data.get("user_name") or "").strip()
    password = (data.get("password") or "").strip()
    full_name = (data.get("full_name") or "").strip()
    role = data.get("role", "editor")

    if not user_name or not password:
        return jsonify({"error": "Missing required fields"}), 400

    password_hash = generate_password_hash(password, method='pbkdf2:sha256')
    modifying_user_id = g.user.get("user_id")

    con = None
    try:
        con = get_db_connection()
        with con.cursor() as cur:
            cur.execute("SELECT id, status FROM users WHERE user_name = %s", (user_name,))
            row = cur.fetchone()

            if row:
                user_id, status = row
                if status == 1:
                    return jsonify({"error": "Username already exists"}), 400
                else:
                    update_sql = """
                        UPDATE users
                        SET password_hash = %s,
                            full_name = %s,
                            role = %s,
                            status = 1,
                            modified_by = %s,
                            last_modified = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """
                    print("[SQL UPDATE]", cur.mogrify(update_sql, (password_hash, full_name, role, modifying_user_id, user_id)))
                    cur.execute(update_sql, (password_hash, full_name, role, modifying_user_id, user_id))
                    con.commit()
                    return jsonify({"message": "User reactivated"}), 200
            else:
                insert_sql = """
                    INSERT INTO users (user_name, password_hash, full_name, role, modified_by, status)
                    VALUES (%s, %s, %s, %s, %s, 1)
                """
                print("[SQL INSERT]", cur.mogrify(insert_sql, (user_name, password_hash, full_name, role, modifying_user_id)))
                cur.execute(insert_sql, (user_name, password_hash, full_name, role, modifying_user_id))
                con.commit()
                return jsonify({"message": "User created"}), 201

    except Exception as e:
        if con:
            con.rollback()
        print("❌ Error creating user:", str(e))
        return jsonify({"error": "Internal server error"}), 500

    finally:
        if con:
            con.close()


@admin_bp.route('/api/users/<int:user_id>', methods=['DELETE'])
@require_role(["admin"])
def delete_user(user_id):
    try:
        modified_by = g.user["user_id"]
    except Exception as e:
        return jsonify({"error": "Invalid token", "details": str(e)}), 401

    con = None
    try:
        con = get_db_connection()
        with con.cursor() as cur:
            sql = """
                UPDATE users
                SET status = 0, modified_by = %s
                WHERE id = %s
            """
            print("[SQL]", cur.mogrify(sql, (modified_by, user_id)))
            cur.execute(sql, (modified_by, user_id))
        con.commit()
        return jsonify({"message": f"User {user_id} deactivated"}), 200
    except Exception as e:
        if con:
            con.rollback()
        print("❌ Error deleting user:", str(e))
        return jsonify({"error": str(e)}), 500
    finally:
        if con:
            con.close()


@admin_bp.route('/api/users/<int:user_id>/password', methods=['POST'])
@require_role(["admin"])
def update_user_password(user_id):
    data = request.json
    new_password = data.get('password')
    if not new_password:
        return jsonify({'error': 'Password is required'}), 400

    password_hash = generate_password_hash(new_password, method='pbkdf2:sha256')
    modifying_user_id = g.user.get("user_id")
    if not modifying_user_id:
        return jsonify({"error": "Invalid token or missing user ID"}), 401

    con = None
    try:
        con = get_db_connection()
        with con.cursor() as cur:
            sql = """
                UPDATE users
                SET password_hash = %s,
                    modified_by = %s,
                    last_modified = CURRENT_TIMESTAMP
                WHERE id = %s
            """
            print("[SQL]", cur.mogrify(sql, (password_hash, modifying_user_id, user_id)))
            cur.execute(sql, (password_hash, modifying_user_id, user_id))
        con.commit()
        return jsonify({'success': True})
    except Exception as e:
        if con:
            con.rollback()
        print("❌ Error updating password:", str(e))
        return jsonify({"error": str(e)}), 500
    finally:
        if con:
            con.close()


@admin_bp.route('/api/users/<int:user_id>/role', methods=['POST'])
@require_role(["admin"])
def update_user_role(user_id):
    data = request.json
    new_role = data.get('role')

    if new_role not in ('admin', 'editor', 'moderator'):
        return jsonify({'error': 'Invalid role specified'}), 400

    modifying_user = getattr(g, 'user', None)
    if not modifying_user or modifying_user.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    modifying_user_id = modifying_user.get('user_id')
    if not modifying_user_id:
        return jsonify({'error': 'Invalid user context'}), 401

    con = None
    try:
        con = get_db_connection()
        with con.cursor() as cur:
            sql = """
                UPDATE users
                SET role = %s,
                    modified_by = %s,
                    last_modified = CURRENT_TIMESTAMP
                WHERE id = %s AND status = 1
            """
            print("[SQL]", cur.mogrify(sql, (new_role, modifying_user_id, user_id)))
            cur.execute(sql, (new_role, modifying_user_id, user_id))
        con.commit()
        return jsonify({'message': 'User role updated successfully'})
    except Exception as e:
        if con:
            con.rollback()
        print("❌ Error updating user role:", str(e))
        return jsonify({'error': str(e)}), 500
    finally:
        if con:
            con.close()


@admin_bp.route('/api/user_metrics/<int:user_id>')
@require_role(["admin"])  # or other allowed roles
def user_metrics(user_id):
    con = None
    try:
        con = get_db_connection()
        with con.cursor() as cur:
            # Aggregate guest moderation stats
            cur.execute("""
                SELECT
                    COUNT(*) AS guest_submissions,
                    SUM(CASE WHEN approved = 1 THEN 1 ELSE 0 END) AS guest_approvals,
                    SUM(CASE WHEN rejected = 1 THEN 1 ELSE 0 END) AS guest_rejections,
                    SUM(CASE WHEN state = 1 THEN 1 ELSE 0 END) AS guest_pending,
                    MIN(timestamp) AS guest_first_activity,
                    MAX(timestamp) AS guest_last_activity
                FROM moderation_yearly_guests
                WHERE user_id = %s
            """, (user_id,))
            guest_row = cur.fetchone()

            # Aggregate collectible moderation stats
            cur.execute("""
                SELECT
                    COUNT(*) AS collectible_submissions,
                    SUM(CASE WHEN approved = 1 THEN 1 ELSE 0 END) AS collectible_approvals,
                    SUM(CASE WHEN rejected = 1 THEN 1 ELSE 0 END) AS collectible_rejections,
                    SUM(CASE WHEN state = 1 THEN 1 ELSE 0 END) AS collectible_pending,
                    MIN(timestamp) AS collectible_first_activity,
                    MAX(timestamp) AS collectible_last_activity
                FROM moderation_collectibles
                WHERE user_id = %s
            """, (user_id,))
            collectible_row = cur.fetchone()

            # Get user info
            cur.execute("SELECT user_name, role FROM users WHERE id = %s", (user_id,))
            user_info = cur.fetchone()

        if not user_info:
            return jsonify({"error": "User not found"}), 404

        return jsonify({
            "user_name": user_info[0],
            "role": user_info[1],

            "guest_submissions": guest_row[0] or 0,
            "guest_approvals": guest_row[1] or 0,
            "guest_rejections": guest_row[2] or 0,
            "guest_pending": guest_row[3] or 0,
            "guest_first_activity": guest_row[4].isoformat() if guest_row[4] else None,
            "guest_last_activity": guest_row[5].isoformat() if guest_row[5] else None,

            "collectible_submissions": collectible_row[0] or 0,
            "collectible_approvals": collectible_row[1] or 0,
            "collectible_rejections": collectible_row[2] or 0,
            "collectible_pending": collectible_row[3] or 0,
            "collectible_first_activity": collectible_row[4].isoformat() if collectible_row[4] else None,
            "collectible_last_activity": collectible_row[5].isoformat() if collectible_row[5] else None,
        })
    except Exception as e:
        print("❌ Error fetching user metrics:", str(e))
        return jsonify({"error": "Failed to fetch user metrics"}), 500
    finally:
        if con:
            con.close()

