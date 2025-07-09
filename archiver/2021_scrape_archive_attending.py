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
            response = requests.get(archived_url, timeout=10) 
            response.raise_for_status() 
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, "html.parser")
                return soup
            else:
                print(f"Failed to fetch page. Status code: {response.status_code}")
                return None

            return response.content 
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


def parse_user_soup(soup, name):

    time.sleep(10)

    body = soup.body
    body_text = body.get_text(separator="\n", strip=True) if body else ""

    body_lines = body_text.split("\n")
    #filtered_text = "\n".join(body_lines[189:-39]) if len(body_lines) > 39 else ""
    bio_lines = "\n".join(body_lines[:-10]) if len(body_lines) > 10 else ""
    parse_lines = bio_lines.split('\n')
    #for index, value in enumerate(parse_lines):
    #    print("%s: %s" % (index, value))

    print(parse_lines)
    #start_line = 96
    for index, value in enumerate(parse_lines):
        print("%s: %s" % (index, value))
        if value.lower() == name.lower():
            start_line = (index + 1)
            print("found start_line: %s" % start_line)
        #start_line = 96
        if value == '© 2013 – 2014 DCI, Inc. All Rights Reserved.':
            print("found finish_line")
            finish_line = index

    print("start_line: %s" % start_line)
    filtered_text = "\n".join(body_lines[start_line:-13]) if len(body_lines) > 13 else ""
    biography = filtered_text

    return biography


db_user = "user"
db_password = "pass"
db = "dbname"

year = 2021
url = "https://web.archive.org/web/20210819152319/https://www.dragoncon.org/people-to-see-2/professionals/"
people_url = "https://web.archive.org/web/20210819152319/http://www.dragoncon.org/"
soup = scrape_archived_page(url)

guests = []

# Locate the main container
pro_blocks = soup.find("div", class_="pro-blocks")

# Extract <article> sections, which contain the guest entries
guest_articles = pro_blocks.find_all("article") if pro_blocks else []

# Parse each guest entry
guest_data = []
for article in guest_articles:
    for li in article.find_all("li"):
        name_tag = li.find("h4")
        desc_tag = li.find("p")
        if name_tag and desc_tag:
            name = name_tag.get_text(strip=True)
            description = desc_tag.get_text(separator=" ", strip=True)

            if len(description) == 0:
                description = None

            guest_id = getGuestId(db_user, db_password, db, name)
            if guest_id is None:
                guest_id = generateGuestId(db_user, db_password, db, name)

            print("got guest_id: %s" % guest_id)

            guest_exists = checkGuestForYear(db_user, db_password, db, guest_id, year)
            print("guest_exists for %s in %s is %s" % (name, year, guest_exists))

            if guest_exists is False:

                blurb_bytes = description.encode('utf-8')
                blurb_base64 = base64.b64encode(blurb_bytes)
                blurb_string = blurb_base64.decode('utf-8')
                biography_string = None
                bio_link = None

                performance = None
                guest_type = "attending professional"
                #guests.append({"year": year, "guest_id": guest_id, "name": name, "url": None, "blurb": description, "biography": None})
                print({"year": year, "guest_id": guest_id, "name": name, "url": None, "biography": None, "blurb": description, "base64": blurb_string, "guest_category": performance, "guest_type": guest_type})
                con = pymysql.connect("127.0.0.1", db_user, db_password, db)
                sql="INSERT INTO yearly_guests (year, guest_id, guest_name, url, biography, blurb, guest_category, guest_type) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
                cur = con.cursor()
                cur.execute(sql, (year, guest_id, name, bio_link, biography_string, blurb_string, performance, guest_type))
                print("Query executed:", cur._last_executed)
                con.commit()
                cur.close()
                con.close()
