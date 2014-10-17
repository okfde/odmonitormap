# -*- coding: utf-8 -*-
import os
import psycopg2
import psycopg2.extras
import unicodecsv as csv
import metautils
from collections import OrderedDict

from dbsettings import settings

psycopg2.extensions.register_type(psycopg2.extensions.UNICODE)
psycopg2.extensions.register_type(psycopg2.extensions.UNICODEARRAY)

print 'Deleting existing data...'
for f in os.listdir("."):
    if f.endswith(".csv"):
        os.remove(f)
 
try:
    cur = metautils.getDBCursor(settings, dictCursor = True)

    cur.execute('SELECT DISTINCT city_fullname, contact_email, open_data_portal, last_updated, city_shortname, cities.url AS url, latitude, longitude FROM cities INNER JOIN data ON data.city = cities.city_shortname WHERE data.accepted=%s', (True,))
    results = cur.fetchall()
    
    rows = []
    
    for result in results:
        print 'Processing city ' + result['city_shortname'] + '...'
        row = OrderedDict()
        row['Stadtname'] = result['city_fullname']
        row['kurzname'] = result['city_shortname']
        row['DOMAIN'] = result['url']
        row['Open Data Portal'] = result['open_data_portal']
        row['Kontakt Mail'] = result['contact_email']
        row['Lat'] = result['latitude']
        row['Lon'] = result['longitude']
        row['modified'] = result['last_updated']

        sources = ('m','d','c','b','g')
        
        for source in sources:
            cur.execute('SELECT COUNT(source) AS counted FROM data WHERE city = %s AND source = %s AND accepted=%s', (row['kurzname'], source, True))
            row['sourced-from-'+source] = cur.fetchone()['counted']
            
        #Find out what/which data portals contributed catalog results
        cur.execute('SELECT DISTINCT originating_portal FROM data WHERE city LIKE %s AND originating_portal IS NOT NULL AND length(originating_portal)>0', (row['kurzname'],))
        csources = []
        for res in cur.fetchall():
            csources.append(res['originating_portal'])
        row['catalog-sources'] = metautils.arraytocsv(csources)
            
        rows.append(row)
        
        print 'Writing ' + row['kurzname'] + '.csv...'
        with open(row['kurzname'] + '.csv', 'wb') as csvfile:
            categories = ('Arbeitsmarkt', u'Bevölkerung', 'Bildung und Wissenschaft', 'Haushalt und Steuern', 'Stadtentwicklung und Bebauung', 'Wohnen und Immobilien', 'Sozialleistungen', u'Öffentl. Sicherheit', 'Gesundheit', 'Kunst und Kultur', 'Land- und Forstwirtschaft', 'Sport und Freizeit', 'Umwelt', 'Transport und Verkehr', 'Energie, Ver- und Entsorgung', 'Politik und Wahlen', 'Verwaltung', 'Gesetze und Justiz', u'Wirtschaft und Wirtschaftsförderung', 'Tourismus', 'Verbraucher', 'Sonstiges', 'Noch nicht kategorisiert')
            datafields = ['Dateibezeichnung', 'URL', 'Lizenz', 'Format', 'Quelle']
            datafields.extend(categories)
            
            datawriter = csv.DictWriter(csvfile, datafields, delimiter=',')
            datawriter.writeheader()

            cur.execute('SELECT title, url, licenseshort, formats, source, categories FROM data WHERE city = %s AND accepted = %s', (row['kurzname'], True))
            citydata = cur.fetchall()
            
            entries = []
            
            for row in citydata:
                entry = {}
                entry['Dateibezeichnung'] = row['title']
                entry['URL'] = row['url']
                entry['Lizenz'] = row['licenseshort']
                entry['Format'] = metautils.arraytocsv(row['formats'])
                entry['Quelle'] = row['source']
                for cat in row['categories']:
                    if cat in datafields:
                        entry[cat] = 'x'
                    else:
                        print 'WARNING: Category ' + cat + ' in DB not supported on website!'
                datawriter.writerow(entry)
          
    print 'Writing out index file...'
    indexfields = [] 
    if len(rows) > 0:
        indexfields = rows[0].keys()
            
    with open('index.csv', 'wb') as csvfile:
        citywriter = csv.DictWriter(csvfile, indexfields, delimiter=',')
        citywriter.writeheader()
        for row in rows:
            citywriter.writerow(row)
            
except psycopg2.DatabaseError, e:
    print 'Database error: %s' % e
    

