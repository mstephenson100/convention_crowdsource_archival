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
            if response.status_code == 404:
                return None
            if attempt < retries:
                print(f"Retrying in {delay} seconds...")
                time.sleep(delay)
            else:
                print("Max retries reached. Giving up.")
                raise


def parse_user_soup(soup, name):

    time.sleep(10)

    start_line = None
    finish_line = None
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

    if start_line is None:
        return None

    print("start_line: %s" % start_line)
    filtered_text = "\n".join(body_lines[start_line:-13]) if len(body_lines) > 13 else ""
    biography = filtered_text

    lines_to_remove = [
        "Back to Top",
        "DAYS UNTIL THE CON",
        r"ONLY \d+ DAYS LEFT!",
        "Important Dates",
        "Sunday, August 1:",
        "August 29:",
        "Deadline for applying for media credentials",
        "More Information"
    ]

    pattern = re.compile(r'^(?:' + '|'.join(lines_to_remove) + r')\s*$', re.MULTILINE)
    biography = re.sub(pattern, '', biography).strip()

    return biography


db_user = "user"
db_password = "pass"
db = "dbname"

year = 2013
url = "https://web.archive.org/web/20130812115012/http://www.dragoncon.org/?q=attending-professionals-view"
people_url = "https://web.archive.org/web/20130812115012/http://www.dragoncon.org/"
print(url)
soup = scrape_archived_page(url)
#print(soup)
#sys.exit(1)


# Find the container where guest details are located
guests_section = soup.find_all("div", class_="content clearfix")

# Initialize a list to hold the guest details
guest_details = []

# Loop through the relevant sections to extract guest names and descriptions
for section in guests_section:
    for paragraph in section.find_all("p"):
        name_tag = paragraph.find("b")  # Locate the bold tag with the name
        if name_tag:
            biography = None
            name = name_tag.get_text(strip=True)
            name = name.replace("\n", " ")
            name = re.sub(r'\s+', ' ', name)
            print("NAME: %s" % name)
            guest_id = getGuestId(db_user, db_password, db, name)
            if guest_id is None:
                guest_id = generateGuestId(db_user, db_password, db, name)
            print("got guest_id: %s" % guest_id)
            #print("scraping %s" % bio_link)
            guest_exists = checkGuestForYear(db_user, db_password, db, guest_id, year)
            print("guest_exists for %s in %s is %s" % (name, year, guest_exists))

            if guest_exists is False:
                description = paragraph.get_text(separator=" ", strip=True)
                prefix_segment = description[:50]
                rest_segment = description[50:]
                prefix_cleaned = re.sub(re.escape(name), '', prefix_segment, count=1)
                description = prefix_cleaned + rest_segment
                description = description.lstrip()

                if len(description) == 0:
                    description = None

                guest_details.append({"year": year, "name": name, "url": None, "blurb": description, "biography": biography})
                if biography is not None:
                    biography_bytes = biography.encode('utf-8')
                    biography_base64 = base64.b64encode(biography_bytes)
                    biography_string = biography_base64.decode('utf-8')
                else:
                    biography_string = None

                if description is not None:
                    blurb_bytes = description.encode('utf-8')
                    blurb_base64 = base64.b64encode(blurb_bytes)
                    blurb_string = blurb_base64.decode('utf-8')
                else:
                    blurb_string = None

                print("bio: %s" % biography_string)
                print("blurb: %s" % blurb_string)
                bio_link = None
                guest_type = "attending professional"
                performance = None
                print({"year": year, "name": name, "url": None, "biography": biography, "blurb": description, "guest_category": performance, "guest_type": guest_type})
                con = pymysql.connect("127.0.0.1", db_user, db_password, db)
                sql="INSERT INTO yearly_guests (year, guest_id, guest_name, url, biography, blurb, guest_category, guest_type) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
                cur = con.cursor()
                cur.execute(sql, (year, guest_id, name, bio_link, biography_string, blurb_string, performance, guest_type))
                print("Query executed:", cur._last_executed)
                con.commit()
                cur.close()
                con.close()

