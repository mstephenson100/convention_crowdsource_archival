#!/usr/bin/python3

import requests
import time
import sys
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


def parse_user_soup(soup):

    time.sleep(10)
    title = soup.title.string.strip() if soup.title else "No title found"

    body = soup.body
    body_text = body.get_text(separator="\n", strip=True) if body else ""

    # Remove the last 11 lines
    body_lines = body_text.split("\n")
    filtered_text = "\n".join(body_lines[1:-11]) if len(body_lines) > 11 else ""

    biography = filtered_text.replace('\n', ' ')

    return biography


db_user = "user"
db_password = "pass"
db = "dbname"

year = 2001
url = "https://web.archive.org/web/20010603182824/http://www.dragoncon.org/people/index.html"
people_url = "https://web.archive.org/web/20010608220101/http://www.dragoncon.org/people/"
soup = scrape_archived_page(url)

guests = []

for li in soup.find_all('li'):
    guest = {}
    # Find the guest's name and URL (inside <a>)
    name_tag = li.find('a')
    if name_tag:
        guest['year'] = year
        guest['name'] = name_tag.text.strip()
        guest['url'] = people_url + name_tag.get('href', '').strip()
        bio_link = people_url + name_tag.get('href', '').strip()
        #print("scraping %s" % bio_link)

        guest_id = getGuestId(db_user, db_password, db, guest['name'])
        if guest_id is None:
            guest_id = generateGuestId(db_user, db_password, db, guest['name'])

        print("got guest_id: %s" % guest_id)
        #print("scraping %s" % bio_link)
        guest_exists = checkGuestForYear(db_user, db_password, db, guest_id, year)
        print("guest_exists for %s in %s is %s" % (guest['name'], year, guest_exists))


        if guest_exists is False:
            user_soup =  scrape_archived_page(bio_link)


            if user_soup is None:
                guest['biography'] = None
            else:
                biography = parse_user_soup(user_soup)
                guest['biography'] = biography

            #guest['url'] = name_tag.get('href', '').strip()  # Extract href attribute

            # Find the description (inside <menu>)
            menu_tag = li.find('menu')
            if menu_tag:
                guest['description'] = menu_tag.text.strip()
            else:
                guest['description'] = None  # If no description is available

            #print(guest)
            guests.append(guest)
            if guest['biography'] is not None:
                biography_bytes = guest['biography'].encode('utf-8')
                biography_base64 = base64.b64encode(biography_bytes)
                biography_string = biography_base64.decode('utf-8')
            else:
                biography_string = None

            if guest['description'] is not None:
                blurb_bytes = guest['description'].encode('utf-8')
                blurb_base64 = base64.b64encode(blurb_bytes)
                blurb_string = blurb_base64.decode('utf-8')
            else:
                blurb_string = None

            print("bio: %s" % biography_string)
            print("blurb: %s" % blurb_string)
            print({"year": year, "name": guest['name'], "url": guest['url'], "bio": guest['biography'], "blurb": guest['description']})
            con = pymysql.connect("127.0.0.1", db_user, db_password, db)
            sql="INSERT INTO yearly_guests (year, guest_id, guest_name, url, biography, blurb) VALUES (%s, %s, %s, %s, %s, %s)"
            cur = con.cursor()
            cur.execute(sql, (year, guest_id, guest['name'], guest['url'], biography_string, blurb_string))
            print("Query executed:", cur._last_executed)
            con.commit()
            cur.close()
            con.close()
