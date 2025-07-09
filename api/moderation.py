import jwt
import config
from flask import Blueprint, request, jsonify, g
from datetime import datetime
from utils import require_role, get_db_connection, log, capitalize_guest_name, encode_base64_fields, decode_base64_fields
from config import SECRET_KEY

moderation_bp = Blueprint('moderation', __name__)

@moderation_bp.route('/api/moderation/guests/pending')
@require_role(["moderator", "admin"])
def get_pending_moderation_entries():
    con = get_db_connection()
    try:
        with con.cursor() as cur:
            # Query pending moderation entries including deleted flag
            cur.execute("""
                SELECT
                    m.id, m.year, m.guest_name, m.url, m.blurb, m.biography,
                    m.accolades_1, m.accolades_2, m.guest_type, m.version, m.user_id, m.timestamp,
                    u.user_name,
                    m.deleted
                FROM moderation_yearly_guests m
                LEFT JOIN users u ON m.user_id = u.id
                WHERE m.state = 1
                ORDER BY m.guest_name, m.year, m.version DESC
            """)
            rows = cur.fetchall()

            guest_names = set(row[2] for row in rows)  # guest_name at index 2

            guest_map = {}
            if guest_names:
                placeholders = ','.join(['%s'] * len(guest_names))
                cur.execute(f"""
                    SELECT guest_name, guest_id FROM guests
                    WHERE guest_name IN ({placeholders})
                """, tuple(guest_names))
                guest_map = {name: gid for name, gid in cur.fetchall()}

            grouped = {}
            for row in rows:
                (
                    entry_id, year, guest_name, url, blurb_b64, bio_b64,
                    accolades_1, accolades_2, guest_type, version, user_id, timestamp, user_name,
                    deleted
                ) = row

                print("blurb: %s" % blurb_b64)
                print("biography: %s" % bio_b64)
                decoded_fields = {'blurb': blurb_b64, 'biography': bio_b64}
                decode_base64_fields(decoded_fields, ['blurb', 'biography'])

                key = (guest_name, year)
                guest_id = guest_map.get(guest_name)

                note = None
                if not guest_id:
                    note = "⚠️ Guest does not exist — will be created upon approval."

                entry = {
                    "id": entry_id,
                    "year": year,
                    "guest_name": guest_name,
                    "guest_id": guest_id,
                    "url": url,
                    "blurb": decoded_fields['blurb'],
                    "biography": decoded_fields['biography'],
                    "guest_type": guest_type,
                    "accolades_1": accolades_1,
                    "accolades_2": accolades_2,
                    "version": version,
                    "user_id": user_id,
                    "user_name": user_name,
                    "timestamp": timestamp.isoformat() if timestamp else None,
                    "note": note,
                    "deleted": deleted
                }

                grouped.setdefault(key, []).append(entry)

        # Flatten grouped entries into a list
        result = [entry for entries in grouped.values() for entry in entries]
        return jsonify(result)
    except Exception as e:
        con.rollback()
        return jsonify({'error': 'Failed to fetch moderation entries', 'details': str(e)}), 500
    finally:
        con.close()


@moderation_bp.route('/api/moderation/guests/reject', methods=['POST'])
@require_role(["moderator", "admin"])
def reject_moderation_entry():
    data = request.json
    log(f"[DEBUG] Incoming reject payload: {data}")

    entry_id = data.get("id")
    if not entry_id:
        return jsonify({"error": "Missing entry ID"}), 400

    try:
        entry_id = int(entry_id)
    except ValueError:
        return jsonify({"error": "Invalid entry ID"}), 400

    moderator_id = getattr(g, "user", {}).get("user_id")
    if not moderator_id:
        return jsonify({"error": "Invalid user session"}), 401

    con = get_db_connection()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT guest_name, year, version FROM moderation_yearly_guests WHERE id = %s", (entry_id,))
            entry = cur.fetchone()
            if not entry:
                return jsonify({'error': f'No moderation entry with id={entry_id}'}), 404
            guest_name, year, version = entry

            update_sql = """
                UPDATE moderation_yearly_guests
                SET state = 0, moderator_id = %s, rejected = 1
                WHERE id = %s
            """
            params = (moderator_id, entry_id)
            log("[SQL] " + cur.mogrify(update_sql, params))
            cur.execute(update_sql, params)

        con.commit()
        log(f"❌ Rejected {guest_name} ({year}) version {version} [id={entry_id}] by moderator {moderator_id}")
        return jsonify({
            'message': 'Entry rejected successfully',
            'entry_id': entry_id,
            'moderator_id': moderator_id,
            'guest_name': guest_name,
            'year': year,
            'version': version
        })

    except Exception as e:
        con.rollback()
        log(f"❌ Reject failed: {e}")
        return jsonify({'error': str(e)}), 500

    finally:
        con.close()


@moderation_bp.route('/api/moderation/guests/approve', methods=['POST'])
@require_role(["moderator", "admin"])
def approve_guest_submission():
    data = request.get_json()
    entry_id = data.get("id")
    delete_flag = data.get("deleted", 0)  # New field indicating deletion

    if not entry_id:
        return jsonify({"error": "Missing entry ID"}), 400

    moderator_id = getattr(g, "user", {}).get("user_id")
    if not moderator_id:
        return jsonify({"error": "Unauthorized"}), 401

    con = get_db_connection()
    try:
        with con.cursor() as cur:
            con.begin()

            # Fetch pending moderation entry
            cur.execute("""
                SELECT guest_name, year, url, blurb, biography, guest_type,
                       guest_category, accolades_1, accolades_2, guest_id
                FROM moderation_yearly_guests
                WHERE id = %s AND state = 1
            """, (entry_id,))
            row = cur.fetchone()
            if not row:
                raise Exception("No pending moderation entry found with that ID")

            (
                guest_name, year, url, blurb, biography, guest_type,
                guest_category, accolades_1, accolades_2, guest_id
            ) = row

            guest_name = capitalize_guest_name(guest_name)

            # Insert guest if not deleting and guest_id missing or zero
            if delete_flag != 1 and guest_name and (not guest_id or guest_id == 0):
                cur.execute("SELECT guest_id FROM guests WHERE guest_name = %s", (guest_name,))
                existing = cur.fetchone()
                if existing:
                    guest_id = existing[0]
                else:
                    insert_guest_sql = "INSERT INTO guests (guest_name) VALUES (%s)"
                    log(f"[SQL INSERT] {cur.mogrify(insert_guest_sql, (guest_name,))}")
                    cur.execute(insert_guest_sql, (guest_name,))
                    guest_id = cur.lastrowid

                update_moderation_sql = """
                    UPDATE moderation_yearly_guests
                    SET guest_id = %s, guest_name = %s
                    WHERE id = %s
                """
                log(f"[SQL UPDATE] {cur.mogrify(update_moderation_sql, (guest_id, guest_name, entry_id))}")
                cur.execute(update_moderation_sql, (guest_id, guest_name, entry_id))

            if delete_flag == 1:
                # Backup yearly_guests before delete
                insert_deleted_sql = """
                    INSERT INTO deleted_yearly_guests (year, guest_id, url, guest_name, blurb, biography, guest_type,
                                                       guest_category, accolades_1, accolades_2, modified)
                    SELECT year, guest_id, url, guest_name, blurb, biography, guest_type, guest_category,
                           accolades_1, accolades_2, modified
                    FROM yearly_guests
                    WHERE guest_id = %s AND year = %s
                """
                log(f"[SQL INSERT] {cur.mogrify(insert_deleted_sql, (guest_id, year))}")
                cur.execute(insert_deleted_sql, (guest_id, year))

                # Delete from yearly_guests
                delete_sql = "DELETE FROM yearly_guests WHERE guest_id = %s AND year = %s"
                log(f"[SQL DELETE] {cur.mogrify(delete_sql, (guest_id, year))}")
                cur.execute(delete_sql, (guest_id, year))

                # Check references
                cur.execute("SELECT COUNT(*) FROM yearly_guests WHERE guest_id = %s", (guest_id,))
                count_yearly = cur.fetchone()[0]

                cur.execute("SELECT COUNT(*) FROM collectibles WHERE guest_id = %s", (guest_id,))
                count_collectibles = cur.fetchone()[0]

                if count_yearly == 0 and count_collectibles == 0:
                    # Backup and delete guest record
                    insert_deleted_guest_sql = """
                        INSERT INTO deleted_guests (guest_id, guest_name)
                        SELECT guest_id, guest_name FROM guests WHERE guest_id = %s
                    """
                    log(f"[SQL INSERT] {cur.mogrify(insert_deleted_guest_sql, (guest_id,))}")
                    cur.execute(insert_deleted_guest_sql, (guest_id,))

                    delete_guest_sql = "DELETE FROM guests WHERE guest_id = %s"
                    log(f"[SQL DELETE] {cur.mogrify(delete_guest_sql, (guest_id,))}")
                    cur.execute(delete_guest_sql, (guest_id,))

            else:
                upsert_sql = """
                    INSERT INTO yearly_guests
                      (guest_id, year, url, guest_name, blurb, biography, guest_type,
                       guest_category, accolades_1, accolades_2, modified)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0) AS new
                    ON DUPLICATE KEY UPDATE
                      url = new.url,
                      blurb = new.blurb,
                      biography = new.biography,
                      guest_type = new.guest_type,
                      guest_category = new.guest_category,
                      accolades_1 = new.accolades_1,
                      accolades_2 = new.accolades_2,
                      modified = 1
                """
                upsert_vals = (
                    guest_id, year, url, guest_name, blurb, biography,
                    guest_type, guest_category, accolades_1, accolades_2
                )
                log(f"[SQL UPSERT] {cur.mogrify(upsert_sql, upsert_vals)}")
                cur.execute(upsert_sql, upsert_vals)

            update_moderation_sql_2 = """
                UPDATE moderation_yearly_guests
                SET state = 2, approved = 1, moderator_id = %s, guest_name = %s
                WHERE id = %s
            """
            log(f"[SQL UPDATE] {cur.mogrify(update_moderation_sql_2, (moderator_id, guest_name, entry_id))}")
            cur.execute(update_moderation_sql_2, (moderator_id, guest_name, entry_id))

        con.commit()
        return jsonify({
            "message": "Guest data approved and written.",
            "id": entry_id,
            "guest_id": guest_id,
            "guest_name": guest_name,
            "year": year
        })

    except Exception as e:
        con.rollback()
        log(f"[ERROR] {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        con.close()


@moderation_bp.route('/api/moderation/collectibles/pending')
@require_role(["moderator", "admin"])
def get_pending_collectibles():
    con = get_db_connection()
    try:
        with con.cursor() as cur:
            cur.execute("""
                SELECT
                    m.id, m.collectible_id, m.year, m.guest_id, m.guest_name, m.name, m.category,
                    m.notes_1, m.notes_2, m.filename, m.version, m.user_id, m.timestamp,
                    u.user_name, m.deleted
                FROM moderation_collectibles m
                LEFT JOIN users u ON m.user_id = u.id
                WHERE m.state = 1
                ORDER BY m.guest_name, m.name, m.year, m.version DESC
            """)
            rows = cur.fetchall()

        grouped = {}
        for row in rows:
            (
                entry_id, collectible_id, year, guest_id, guest_name, name, category,
                notes_1, notes_2, filename, version, user_id, timestamp, user_name, deleted
            ) = row

            key = (guest_name, year)

            entry = {
                "id": entry_id,
                "collectible_id": collectible_id,
                "year": year,
                "guest_id": guest_id,
                "guest_name": guest_name,
                "name": name,
                "category": category,
                "notes_1": notes_1,
                "notes_2": notes_2,
                "filename": filename,
                "version": version,
                "user_id": user_id,
                "user_name": user_name,
                "timestamp": timestamp.isoformat() if timestamp else None,
                "deleted": deleted,
            }

            grouped.setdefault(key, []).append(entry)

        # Flatten grouped dict into list
        result = [entry for entries in grouped.values() for entry in entries]

        return jsonify(result)

    except Exception as e:
        log(f"Error fetching pending collectibles: {e}")
        return jsonify({"error": "Failed to fetch pending collectibles"}), 500

    finally:
        con.close()


@moderation_bp.route('/api/moderation/collectibles/reject', methods=['POST'])
@require_role(["moderator", "admin"])
def reject_collectible_moderation_entry():
    data = request.json
    log(f"[DEBUG] Incoming reject payload for collectible: {data}")

    entry_id = data.get("id")
    if not isinstance(entry_id, int):
        return jsonify({"error": "Missing or invalid entry ID"}), 400

    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        moderator_id = decoded.get("user_id")
        if not moderator_id:
            raise Exception("Missing user_id in token")
    except Exception as e:
        return jsonify({'error': 'Invalid or missing token', 'details': str(e)}), 401

    try:
        with get_db_connection() as con, con.cursor() as cur:
            cur.execute(
                "SELECT guest_name, year, version FROM moderation_collectibles WHERE id = %s", (entry_id,)
            )
            entry = cur.fetchone()
            if not entry:
                return jsonify({'error': f'No moderation entry with id={entry_id}'}), 404
            guest_name, year, version = entry

            update_sql = """
                UPDATE moderation_collectibles
                SET state = 0, moderator_id = %s, rejected = 1
                WHERE id = %s
            """
            params = (moderator_id, entry_id)
            log("[SQL] " + cur.mogrify(update_sql, params))
            cur.execute(update_sql, params)

            con.commit()
            log(f"❌ Rejected collectible {guest_name} ({year}) version {version} [id={entry_id}] by moderator {moderator_id}")
            return jsonify({
                'message': 'Collectible entry rejected successfully',
                'entry_id': entry_id,
                'moderator_id': moderator_id,
                'guest_name': guest_name,
                'year': year,
                'version': version
            })

    except Exception as e:
        log(f"❌ Reject failed for collectible: {e}")
        return jsonify({'error': 'An internal error occurred'}), 500


@moderation_bp.route('/api/moderation/collectibles/approve', methods=['POST'])
@require_role(["moderator", "admin"])
def approve_collectible_submission():

    data = request.get_json()
    entry_id = data.get("id")
    delete_flag = data.get("deleted", 0)  # New field indicating deletion

    if not entry_id:
        return jsonify({"error": "Missing entry ID"}), 400

    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        moderator_id = decoded.get("user_id")
        if not moderator_id:
            raise Exception("Missing user_id in token")
    except Exception as e:
        return jsonify({"error": "Invalid or missing token", "details": str(e)}), 401

    con = get_db_connection()
    cur = con.cursor()

    def log_query(prefix, sql, params):
        mog_result = cur.mogrify(sql, params)
        if isinstance(mog_result, bytes):
            mog_result = mog_result.decode()
        print(f"[{prefix}] {mog_result}")

    try:
        con.begin()

        # Select moderation entry data
        cur.execute("""
            SELECT collectible_id, year, guest_id, guest_name, name, category,
                   notes_1, notes_2, filename, version
            FROM moderation_collectibles
            WHERE id = %s AND state = 1
        """, (entry_id,))

        row = cur.fetchone()
        if not row:
            raise Exception("No pending moderation entry found with that ID")

        (collectible_id, year, guest_id, guest_name, name, category,
         notes_1, notes_2, filename, version) = row

        # Capitalize guest_name safely
        guest_name = capitalize_guest_name(guest_name)

        # Insert guest if needed and update guest_id (skip if delete_flag == 1)
        if delete_flag != 1 and guest_name and (not guest_id or guest_id == 0):
            print("delete_flag: %s, guest_name: %s, guest_id %s" % (delete_flag, guest_name, guest_id))
            cur.execute("SELECT guest_id FROM guests WHERE guest_name = %s", (guest_name,))
            existing = cur.fetchone()
            if existing:
                guest_id = existing[0]
                print("found existing %s" % guest_id)
            else:
                insert_guest_sql = "INSERT INTO guests (guest_name) VALUES (%s)"
                log_query("SQL INSERT", insert_guest_sql, (guest_name,))
                cur.execute(insert_guest_sql, (guest_name,))
                guest_id = cur.lastrowid

            update_moderation_sql = """
                UPDATE moderation_collectibles
                SET guest_id = %s, guest_name = %s
                WHERE id = %s
            """
            log_query("SQL UPDATE", update_moderation_sql, (guest_id, guest_name, entry_id))
            cur.execute(update_moderation_sql, (guest_id, guest_name, entry_id))

        if delete_flag == 1:
            # Backup collectible before deletion
            insert_deleted_sql = """
                INSERT INTO deleted_collectibles (collectible_id, year, guest_id, guest_name, name, category, notes_1, notes_2, filename, modified)
                SELECT collectible_id, year, guest_id, guest_name, name, category, notes_1, notes_2, filename, 1
                FROM collectibles
                WHERE collectible_id = %s
            """
            log_query("SQL INSERT", insert_deleted_sql, (collectible_id,))
            cur.execute(insert_deleted_sql, (collectible_id,))

            # Delete collectible record from collectibles
            delete_sql = """
                DELETE FROM collectibles
                WHERE collectible_id = %s
            """
            log_query("SQL DELETE", delete_sql, (collectible_id,))
            cur.execute(delete_sql, (collectible_id,))

            # Check if guest_id still referenced in yearly_guests or collectibles
            cur.execute("SELECT COUNT(*) FROM yearly_guests WHERE guest_id = %s", (guest_id,))
            count_yearly = cur.fetchone()[0]
            print("got %s count from yearly_guests for %s" % (count_yearly, guest_id))

            cur.execute("SELECT COUNT(*) FROM collectibles WHERE guest_id = %s", (guest_id,))
            count_collectibles = cur.fetchone()[0]
            print("got %s collectibles count from collectibles for %s" % (count_collectibles, guest_id))

            if count_yearly == 0 and count_collectibles == 0:
                # Backup guest data before deleting from guests
                insert_deleted_guest_sql = """
                    INSERT INTO deleted_guests (guest_id, guest_name)
                    SELECT guest_id, guest_name FROM guests WHERE guest_id = %s
                """
                print("[SQL INSERT] " + cur.mogrify(insert_deleted_guest_sql, (guest_id,)))
                cur.execute(insert_deleted_guest_sql, (guest_id,))

                # Delete guest from guests table
                delete_guest_sql = """
                    DELETE FROM guests WHERE guest_id = %s
                """
                print("[SQL DELETE] " + cur.mogrify(delete_guest_sql, (guest_id,)))
                cur.execute(delete_guest_sql, (guest_id,))

        else:
            # Normal insert/update for non-deletion
            upsert_sql = """
                INSERT INTO collectibles
                  (collectible_id, year, guest_id, guest_name, name, category,
                   notes_1, notes_2, filename, modified)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 0) AS new
                ON DUPLICATE KEY UPDATE
                  year = new.year,
                  guest_id = new.guest_id,
                  guest_name = new.guest_name,
                  name = new.name,
                  category = new.category,
                  notes_1 = new.notes_1,
                  notes_2 = new.notes_2,
                  filename = new.filename,
                  modified = 1
            """
            upsert_vals = (
                collectible_id, year, guest_id, guest_name, name, category,
                notes_1, notes_2, filename
            )
            log_query("SQL UPSERT", upsert_sql, upsert_vals)
            cur.execute(upsert_sql, upsert_vals)

        # Update moderation entry as approved
        update_moderation_sql_2 = """
            UPDATE moderation_collectibles
            SET state = 2, approved = 1, moderator_id = %s, guest_name = %s
            WHERE id = %s
        """
        log_query("SQL UPDATE", update_moderation_sql_2, (moderator_id, guest_name, entry_id))
        cur.execute(update_moderation_sql_2, (moderator_id, guest_name, entry_id))

        con.commit()

        return jsonify({
            "message": "Collectible data approved and written.",
            "id": entry_id,
            "collectible_id": collectible_id,
            "guest_id": guest_id,
            "guest_name": guest_name,
            "year": year
        })

    except Exception as e:
        con.rollback()
        print("[ERROR]", str(e))
        return jsonify({"error": str(e)}), 500

    finally:
        con.close()

