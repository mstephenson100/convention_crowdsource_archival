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
    end_line = None
    body = soup.body
    body_text = body.get_text(separator="\n", strip=True) if body else ""

    body_lines = body_text.split("\n")
    bio_lines = "\n".join(body_lines[:-1]) if len(body_lines) > 1 else ""
    parse_lines = bio_lines.split('\n')

    print(parse_lines)
    for index, value in enumerate(parse_lines):
        #if index == 96:
        if value == "Vendors":
            start_line = index + 2
            print("found start_line: %s" % start_line)

        print("%s: %s" % (index, value))

        #start_line = 96
        if value == '© 2013 – 2014 DCI, Inc. All Rights Reserved.' or value == "© 2015 DCI, Inc. All Rights Reserved." or value == "© 2017 DCI, Inc. All Rights Reserved." or value == "© 2016 DCI, Inc. All Rights Reserved." or value == "© 2014 DCI, Inc. All Rights Reserved." or value == "© 2018 DCI, Inc. All Rights Reserved." or value == "© 2019 DCI, Inc. All Rights Reserved." or value == "© 2020 DCI, Inc. All Rights Reserved.":
        #if value == 'Vendors':
            end_line = index
            print("found end_line: %s" % end_line)

    print("start_line: %s" % start_line)

    if end_line is None:
        return None, "performance act"
    else:
        filtered_text = "\n".join(body_lines[start_line:end_line]) if len(body_lines) > end_line else ""
        biography = filtered_text.replace('\n', ' ')
        biography = biography.replace('  \t', ' ')
        biography = biography.replace('\xa0', ' ')
        biography = biography.replace('  ', ' ')
        biography = biography.replace("�", "")

        combined_name = (name + " " + name)
        biography = biography.replace(combined_name, name).strip()

    return biography, "performance act"


db_user = "user"
db_password = "pass"
db = "dbname"

year = 2016
url = "https://web.archive.org/web/20160814140941/http://www.dragoncon.org/?q=performers_list"
people_url = "https://web.archive.org/web/20160814140941/http://www.dragoncon.org/"
print(url)
soup = scrape_archived_page(url)
#print(soup)
#sys.exit(1)

performers = []
sections = soup.find_all('div', id=lambda x: x and x.isupper())  # Sections with capitalized IDs (A, B, C...)

for section in sections:
    # Extract all performer entries within the section
    performers_list = section.find_all('p', recursive=False)  # Performers are within <p> tags
    for performer in performers_list:
        # Extract name and href
        link = performer.find('a')
        name = link.text.strip()
        name = name.replace("\n", " ")
        name = re.sub(r'\s+', ' ', name)
        href = link['href']
        print("href: %s" % href)
        bio_link = people_url + href
        print("bio_link: %s" % bio_link)
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
                biography, guest_type = parse_user_soup(user_soup, name)

            description = performer.get_text(strip=True).strip()

            prefix_segment = description[:50]
            rest_segment = description[50:]
            prefix_cleaned = re.sub(re.escape(name), '', prefix_segment, count=1)
            description = prefix_cleaned + rest_segment
            description = description.replace("»", '')
            #description = description.removeprefix(name)
            description = description.replace("\n", " ")  # Replace line breaks with spaces
            description = re.sub(r'\s+', ' ', description)  # Replace multiple spaces with a single space
            description = description.replace(u'\xa0', ' ')  # Replace non-breaking spaces

            if len(description) == 0:
                description = None

            # Append the data
            performers.append({"year": year, "name": name, "url": bio_link, "blurb": description, "biography": biography})
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

            performance = None
            guest_type = "performance act"
            print("bio: %s" % biography_string)
            print("blurb: %s" % blurb_string)
            print({"year": year, "name": name, "url": bio_link, "biography": biography, "blurb": description, "guest_category": performance, "guest_type": guest_type})
            con = pymysql.connect("127.0.0.1", db_user, db_password, db)
            sql="INSERT INTO yearly_guests (year, guest_id, guest_name, url, biography, blurb, guest_category, guest_type) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
            cur = con.cursor()
            cur.execute(sql, (year, guest_id, name, bio_link, biography_string, blurb_string, performance, guest_type))
            print("Query executed:", cur._last_executed)
            con.commit()
            cur.close()
            con.close()

