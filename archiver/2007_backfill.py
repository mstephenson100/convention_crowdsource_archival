#!/usr/bin/python3

import requests
import time
import sys
import re
import pymysql
import warnings
import traceback
import hashlib
import base64
from bs4 import BeautifulSoup


def generateGuestId(db_user, db_password, db, guest_name):

    con = pymysql.connect("127.0.0.1", db_user, db_password, db)
    sql="INSERT INTO guests (guest_name) VALUES (%s)"
    cur = con.cursor()
    cur.execute(sql, (guest_name))
    print("Query executed:", cur._last_executed)
    con.commit()
    cur.close()
    con.close()
    guest_id = getGuestId(db_user, db_password, db, guest_name)
    return guest_id


def getGuestId(db_user, db_password, db, guest_name):

    guest_id = None
    con = pymysql.connect("127.0.0.1", db_user, db_password, db)
    sql="SELECT guest_id FROM guests WHERE guest_name = %s"
    formatted_query = sql % pymysql.escape_string(guest_name)
    print("Query executed:", formatted_query)

    with con:
        cur = con.cursor()
        #cur.execute("%s" % sql)
        cur.execute(sql, (guest_name,))
        rows = cur.fetchall()

    if rows == None:
        return None

    for row in rows:
        guest_id = row[0]

    cur.close()
    con.close()

    return guest_id


def checkGuestForYear(db_user, db_password, db, guest_id, year):

    guest_exists = False
    guest_count = 0
    sql=("SELECT COUNT(*) FROM yearly_guests WHERE year = %s AND guest_id = %s" % (year, guest_id))
    print(sql)
    con = pymysql.connect("127.0.0.1", db_user, db_password, db)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
    with con:
        cur = con.cursor()
        cur.execute("%s" % sql)
        result = cur.fetchone()
        guest_count=result[0]
        print("guest_count: %s" % guest_count)
        if guest_count > 0:
            guest_exists = True

    cur.close()
    con.close()

    return guest_exists


def scrape_archived_page(archived_url, retries=5, delay=300):
    for attempt in range(1, retries + 1):
        try:
            response = requests.get(archived_url, timeout=10)  # Timeout prevents hanging indefinitely
            response.raise_for_status()  # Raise HTTP errors as exceptions
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, "html.parser")
                return soup
            else:
                print(f"Failed to fetch page. Status code: {response.status_code}")
                return None

            return response.content  # Return the response content if successful
        except ConnectionError as e:
            print(f"Attempt {attempt} failed: {e}")
            if attempt < retries:
                print(f"Retrying in {delay} seconds...")
                time.sleep(delay)
            else:
                print("Max retries reached. Giving up.")
                raise
        except Exception as e:
            print(f"An unexpected error occurred: {e}")
            if response.status_code == 404 or response.status_code == 403:
                time.sleep(10)
                return None
            if attempt < retries:
                print(f"Retrying in {delay} seconds...")
                time.sleep(delay)
            else:
                print("Max retries reached. Giving up.")
                raise


def parse_user_soup(soup):

    time.sleep(10)
    body = soup.body
    body_text = body.get_text(separator="\n", strip=True) if body else ""

    # Remove the first 149 lines and last 55 lines
    end_line = None
    body_lines = body_text.split("\n")
    bio_lines = "\n".join(body_lines[:-1]) if len(body_lines) > 1 else ""
    parse_lines = bio_lines.split('\n')
    for index, value in enumerate(parse_lines):
        print("%s: %s" % (index, value))
        #if value == name:
        if value == "GUESTS":
            start_line = index + 2
            first_line_to_check = index
            print("FOUND IT")
            print(first_line_to_check)
        if "»" in value:
            end_line = index
            print("FOUND end_line: %s" % end_line)

    print("first_line to check: %s" % first_line_to_check)
    #filtered_text = "\n".join(body_lines[start_line:-16]) if len(body_lines) > 16 else ""
    filtered_text = "\n".join(body_lines[start_line:end_line]) if len(body_lines) > end_line else ""

    #filtered_text = "\n".join(body_lines[:-2]) if len(body_lines) > 2 else ""
    biography = filtered_text.replace('\n', ' ')
    biography = biography.replace('  \t', ' ')
    biography = biography.replace('\xa0', ' ')
    biography = biography.replace('  ', ' ')
    combined_name = (name + " " + name)
    biography = biography.replace(combined_name, name).strip()

    return biography

db_user = "user"
db_password = "pass"
db = "dbname"

year = 2007
url = "https://web.archive.org/web/20070821054810/http://dragoncon.org/dc_past_guests.php"
people_url = "https://web.archive.org/web/20070821054810/http://www.dragoncon.org/"
#soup = scrape_archived_page(url)
#print(soup)
#sys.exit(1)

with open("2007_backfill.soup", "r", encoding="utf-8") as f:
    html_text = f.read()


# Insert </li> after every </menu> that is directly followed by a <li>
patched_html = re.sub(r"(</menu>)(\s*<li>)", r"\1</li>\2", html_text)

# Re-parse with BeautifulSoup to verify patching
soup = BeautifulSoup(patched_html, "html.parser")

guest_items = soup.find_all("li")
guest_data = []

for item in guest_items:
    a_tag = item.find("a")
    if not a_tag:
        continue

    name = a_tag.text.strip().replace("[new]", "").strip()
    href = a_tag.get("href", "").strip()
    href = re.sub(r"\s+", "", a_tag.get("href", ""))
    full_text = item.get_text(separator=" ", strip=True)
    blurb = full_text.replace(name, "", 1).strip()

    # Tag logic
    #if re.match(r"^\[XXXX\s+Guest[s]?\]", blurb, flags=re.IGNORECASE):
    if re.search(r"\[XXXX\s+Guest[s]?\]", blurb, flags=re.IGNORECASE):
        ex_year = "XXXX"
        #blurb = re.sub(r"^\[XXXX\s+Guest[s]?\]\s*", "", blurb, flags=re.IGNORECASE)
        blurb = re.sub(r"\[XXXX\s+Guest[s]?\]\s*", "", blurb, flags=re.IGNORECASE)
    elif re.match(r"^\[0\s+Guest[s]?\]", blurb, flags=re.IGNORECASE):
        ex_year = "XXXX"
        blurb = re.sub(r"^\[0\s+Guest[s]?\]\s*", "", blurb, flags=re.IGNORECASE)
    elif re.match(r"^\[(\d{4})\s+Guest[s]?\]", blurb):
        ex_year = re.match(r"^\[(\d{4})\s+Guest[s]?\]", blurb).group(1)
        blurb = re.sub(r"^\[\d{4}\s+Guest[s]?\]\s*", "", blurb)
    elif re.match(r"^\[(?i:prior-year)\]", blurb):
        ex_year = "2006"
        blurb = re.sub(r"^\[(?i:prior-year)\]\s*", "", blurb)
    elif re.match(r"^\[(?i:new)\]", blurb):
        ex_year = "2007"
        blurb = re.sub(r"^\[(?i:new)\]\s*", "", blurb)
    else:
        ex_year = None

    # Clean and normalize blurb
    blurb = re.sub(r"\[Guest Emeritus\]\s*", "", blurb, flags=re.IGNORECASE)
    blurb = re.sub(r"\s+", " ", blurb)


    ## Remove [Guest Emeritus] anywhere in blurb (case-insensitive)
    #blurb = re.sub(r"\[Guest Emeritus\]\s*", "", blurb, flags=re.IGNORECASE)

    ## Normalize whitespace
    #blurb = re.sub(r"\s+", " ", blurb)

    if ex_year is None:
        ex_year = year

    print("name: %s" % name)
    print("href: %s" % href)
    print("year: %s" % ex_year)
    print("blurb: %s" % blurb)
    bio_link = people_url + href
    print("bio_link %s" % bio_link)

    if name == "Claudia  Christian":
        name = "Claudia Christian"

    if name == "Brett  Dawson":
        name = "Brett Dawson"

    if name == "William  Stout":
        name = "William Stout"

    if name != "INDEX: ALL BIOGRAPHIES" and name != "INDEX: 2007 GUESTS" and ex_year != "XXXX":
        if ex_year is not None and ex_year != "XXXX":
            guest_id = getGuestId(db_user, db_password, db, name)
            if guest_id is None:
                print("guest_id:")
                guest_id = generateGuestId(db_user, db_password, db, name)
            else:
                print("guest_id: %s" % guest_id)

        #print("got guest_id: %s" % guest_id)
        guest_exists = checkGuestForYear(db_user, db_password, db, guest_id, ex_year)
        #print("guest_exists for %s in %s is %s" % (name, ex_year, guest_exists))

        if guest_exists is False:
            user_soup =  scrape_archived_page(bio_link)
            if user_soup is None:
                biography = None
            else:
                biography = parse_user_soup(user_soup)

            if biography is not None:
                biography_bytes = biography.encode('utf-8')
                biography_base64 = base64.b64encode(biography_bytes)
                biography_string = biography_base64.decode('utf-8')
            else:
                biography_string = None

            if blurb is not None:
                blurb_bytes = blurb.encode('utf-8')
                blurb_base64 = base64.b64encode(blurb_bytes)
                blurb_string = blurb_base64.decode('utf-8')
            else:
                blurb_string = None

            print("bio: %s" % biography_string)
            print("blurb: %s" % blurb_string)

            print({"year": ex_year, "name": name, "url": bio_link, "bio": biography, "blurb": blurb})
            con = pymysql.connect("127.0.0.1", db_user, db_password, db)
            sql="INSERT INTO yearly_guests (year, guest_id, guest_name, url, biography, blurb) VALUES (%s, %s, %s, %s, %s, %s)"
            cur = con.cursor()
            cur.execute(sql, (ex_year, guest_id, name, bio_link, biography_string, blurb_string))
            print("Query executed:", cur._last_executed)
            con.commit()
            cur.close()
            con.close()

