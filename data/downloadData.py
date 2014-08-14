#Download the index file and all cities
import urllib
import unicodecsv as csv
import os

validsources = ('m', 'd', 'c', 'g', 'b')

def reformatdata(file):
    dictsdata = dict()
    totals = dict()
    fields = []

    with open(file, 'rb') as csvfile:
        reader = csv.DictReader(csvfile, delimiter=',')
        fields = reader.fieldnames
        for row in reader:
            source = row['Quelle'].strip()
            if source not in validsources:
                print 'Error: ' + file + ' has missing or unrecognised source(s)'
                exit()
            else:
                if source not in dictsdata:
                    dictsdata[source] = [] #Array of dicts
                    totals[source]= 0
                dictsdata[source].append(row)
            
    alldata = []
    
    #We go through in a prioritized order - manual, catalog, etc.
    for source in validsources:
        if source in dictsdata:
            for row in dictsdata[source]:
                parent = row['URL PARENT'].strip()
                url = row['URL Datei'].strip()
                if url != '':
                    filename = url.split('/')[-1]
                else: filename = ''
            
                #Parents are always favoured and should be unique
                rowtoadd = []
                if parent != '':
                    if parent not in alldata:
                        rowtoadd = row
                elif url != '':
                    if url not in alldata:
                        rowtoadd = row
                else:
                    print 'Parent and URL are blank in a row in ' + file + '!'
                    exit()
            
                totals[source] += 1
                alldata.append(row)
    
    with open(file, 'wb') as csvfile:
        datawriter = csv.DictWriter(csvfile, fields, delimiter=',')
        datawriter.writeheader()
        for row in alldata:
            datawriter.writerow(row)
    
    return totals
           
kurznamecolumn = 'kurzname'
gidcolumn = 'GID in Datenerfassung'

print "Deleting data..."
for f in os.listdir("."):
    if f.endswith(".csv"):
        os.remove(f)

indexkey = os.environ['INDEXKEY']
erfassungkey = os.environ['ERFASSUNGKEY']

iurl = "https://docs.google.com/spreadsheets/d/" + indexkey + "/export?gid=0&format=csv"
print "Downloading index of cities to index.csv using url " + iurl + "..."
urllib.urlretrieve (iurl, "index.csv");

print "Parsing list of cities to download each file..."

rewritedata = []
indexfields = []

with open('index.csv', 'rb') as csvfile:
    cityreader = csv.DictReader(csvfile, delimiter=',')
    indexfields = cityreader.fieldnames
    
    #For each city that has a short name, download its data from the other sheet, if we have the gid
    for row in cityreader:
        if row[kurznamecolumn] != "":
          if row[gidcolumn] != "":
              durl = "https://docs.google.com/spreadsheets/d/" + erfassungkey + "/export?gid=" + row[gidcolumn] + "&format=csv"
              print "Downloading data for " + row[kurznamecolumn] + " using url " + durl + "..."
              urllib.urlretrieve (durl, row[kurznamecolumn] + ".csv");
              totals = reformatdata(row[kurznamecolumn] + ".csv")
              for source in validsources:
                  if source in totals:
                      row['sourced-from-'+source] = totals[source]
                  else:
                      row['sourced-from-'+source] = 0
          else:
              print "No gid for this city, please check spreadsheet"
          rewritedata.append(row)
    
with open('index.csv', 'wb') as csvfile:

    for source in validsources:
        indexfields.append('sourced-from-'+source)

    citywriter = csv.DictWriter(csvfile, indexfields, delimiter=',')
    citywriter.writeheader()
    for row in rewritedata:
        citywriter.writerow(row)
