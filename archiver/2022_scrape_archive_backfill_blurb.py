#!/usr/bin/python3

import requests
import time
import sys
import re
import textwrap
import pymysql
import warnings
import traceback
import hashlib
import base64
import pandas
from bs4 import BeautifulSoup


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
            if response.status_code == 404:
                return None
            if attempt < retries:
                print(f"Retrying in {delay} seconds...")
                time.sleep(delay)
            else:
                print("Max retries reached. Giving up.")
                raise


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


db_user = "user"
db_password = "pass"
db = "dbname"

year = 2022
url = "https://web.archive.org/web/20220812114341/https://www.dragoncon.org/people-to-see-2/"
soup = scrape_archived_page(url)


for li in soup.find_all("li"):
    name_tag = li.find("h3", class_="today")
    if name_tag:
        name = name_tag.get_text(strip=True)
        # Get the full text in the <li>, then remove the name to isolate the description
        full_text = li.get_text(" ", strip=True)
        description = full_text.replace(name, "", 1).strip()
        print("name: %s" % name)
        print("description: %s" % description)

        if len(description) == 0:
            description = None

        guest_id = getGuestId(db_user, db_password, db, name)
        if guest_id is None:
            print("guest_id not found")
            sys.exit(1)

        guest_exists = checkGuestForYear(db_user, db_password, db, guest_id, year)
        print("guest_exists for %s in %s is %s" % (name, year, guest_exists))

        if guest_exists is False:
            print("guest bio never loaded")
            sys.exit(1)

        if description is not None:
            description_bytes = description.encode('utf-8')
            description_base64 = base64.b64encode(description_bytes)
            description_string = description_base64.decode('utf-8')

        print({"year": year, "guest_id": guest_id, "name": name, "url": description, "base64": description_string})
        con = pymysql.connect("127.0.0.1", db_user, db_password, db)
        sql="UPDATE yearly_guests SET blurb = %s WHERE year = %s and guest_id = %s"
        cur = con.cursor()
        cur.execute(sql, (description_string, year, guest_id))
        print("Query executed:", cur._last_executed)
        con.commit()
        cur.close()
        con.close()

