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


def parse_user_soup(soup):

    time.sleep(10)

    body = soup.body
    body_text = body.get_text(separator="\n", strip=True) if body else ""

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
        if "»" in value or "Back to Top" in value:
            end_line = index
            if value == "Back to Top":
                end_line = (index - 1)

            print("FOUND end_line: %s" % end_line)

    print("first_line to check: %s" % first_line_to_check)
    #filtered_text = "\n".join(body_lines[start_line:-16]) if len(body_lines) > 16 else ""
    filtered_text = "\n".join(body_lines[start_line:end_line]) if len(body_lines) > end_line else ""

    #filtered_text = "\n".join(body_lines[:-2]) if len(body_lines) > 2 else ""
    biography = filtered_text.replace('\n', ' ')
    biography = biography.replace('  \t', ' ')
    biography = biography.replace('\xa0', ' ')
    biography = biography.replace('  ', ' ')
    biography = biography.replace("�", "")
    #print(biography)
    #biography = biography.encode('latin1').decode('utf-8')

    combined_name = (name + " " + name)
    biography = biography.replace(combined_name, name).strip()

    return biography


db_user = "user"
db_password = "pass"
db = "dbname"

year = 2010
url = "https://web.archive.org/web/20100826064922/http://www.dragoncon.org/dc_guests_list.php"
people_url = "https://web.archive.org/web/20100826064922/http://www.dragoncon.org/"
soup = scrape_archived_page(url)


# Find the main body content
main_body = soup.find_all(class_="MainBody")

people_data = []

for section in main_body:
    # Extract all <ul> (unordered lists with people's details)
    lists = section.find_all('ul')
    for ul in lists:
        items = ul.find_all('li')
        for item in items:
            # Extract the <a> tag and the following text
            link = item.find('a')
            if link:
                name = link.text.strip()  # Name of the person
                name = name.replace("\n", " ")
                name = re.sub(r'\s+', ' ', name)
                href = link.get('href')  # Link to the person's page

                performance_tag = item.find('span', class_='performance')
                performance = performance_tag.text.strip() if performance_tag else None

                bio_link = people_url + href
                guest_id = getGuestId(db_user, db_password, db, name)
                if guest_id is None:
                    guest_id = generateGuestId(db_user, db_password, db, name)

                print("got guest_id: %s" % guest_id)
                #print("scraping %s" % bio_link)
                guest_exists = checkGuestForYear(db_user, db_password, db, guest_id, year)
                print("guest_exists for %s in %s is %s" % (name, year, guest_exists))

                if guest_exists is False:
                    user_soup =  scrape_archived_page(bio_link)
                    if user_soup is None:
                        biography = None
                    else:
                        biography = parse_user_soup(user_soup)

                    description = item.get_text(strip=True).replace(name, "", 1).strip()

                    parts = list(item.stripped_strings)
                    if parts and parts[0].startswith(name):
                        parts[0] = parts[0].replace(name, "").strip()

                    description = ' '.join(parts).strip()
                    description = re.sub(r'\s+', ' ', description)
                    description = description.replace("[2007 Guest] ", "")
                    description = description.replace("» ", "")
                    description = description.replace("�", "")

                    people_data.append({"year": year, "name": name, "url": bio_link, "blurb": description, "biography": biography})
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
                    print({"year": year, "name": name, "url": bio_link, "biography": biography, "blurb": description, "guest_category": performance})
                    con = pymysql.connect("127.0.0.1", db_user, db_password, db)
                    sql="INSERT INTO yearly_guests (year, guest_id, guest_name, url, biography, blurb, guest_category) VALUES (%s, %s, %s, %s, %s, %s, %s)"
                    cur = con.cursor()
                    cur.execute(sql, (year, guest_id, name, bio_link, biography_string, blurb_string, performance))
                    print("Query executed:", cur._last_executed)
                    con.commit()
                    cur.close()
                    con.close()

