#Download the index file and all cities
import urllib
import unicodecsv as csv
import os
import subprocess
import time

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
                    dictsdata[source] = []
                    totals[source]= 0
                dictsdata[source].append(row)
            
    takenrows = dict()
    filenameswhereparents = [] #Exclude google/bing results based on url from crawler (where we do have parents)
    
    #We go through in a prioritized order - manual, catalog, etc.
    for source in validsources:
        if source in dictsdata:
            print 'Processing source: ' + source
            for row in dictsdata[source]:
                rowtoadd = None
                basedon = None
                theurl = ''
                           
                parent = row['URL PARENT'].strip()
                url = row['URL Datei'].strip()
                if not (url[0:2] == 'htt' or url[0:2] == 'ftp'):
                    url = parent[0:parent.rfind("/")] + url
                
                print 'Processing entry with parent [' + parent +'] and url [' + url + ']'
                
                if url != '':
                    filename = url.split('/')[-1]
                else: filename = ''
            
                #Parents are always favoured and should be unique
                if parent != '':
                    if parent not in takenrows:
                        print 'Adding based on parent [' + parent +'] (filename is [' + filename + '])'
                        basedon = parent
                        theurl = parent
                        if filename != '':
                            filenameswhereparents.append(filename)
                        rowtoadd = row
                    else: print 'Not adding: parent already there'
                elif filename != '':
                    #URLs are messy. Sometimes they are relative (should have been repaired earlier
                    #in the chain, but wasn't) and multiple URLs lead to the same file... throw away based on filename
                    if filename not in takenrows and filename not in filenameswhereparents:
                        print 'Adding based on filename [' + filename +'] (parent is [' + parent + '])'
                        basedon = filename
                        theurl = url
                        rowtoadd = row
                    else: print 'Not adding: filename already there'
                else:
                    print 'Parent and filename are blank in a row in ' + file + '!'
                    exit()
            
                if (rowtoadd != None):
                    print 'Adding.'
                    totals[source] += 1
                    try:
                        del rowtoadd['URL Datei']
                        del rowtoadd['URL PARENT']
                    except:
                        print rowtoadd
                        exit()
                    rowtoadd['URL'] = theurl
                    takenrows[basedon] = rowtoadd
    
    with open(file, 'wb') as csvfile:
        del fields[fields.index('URL Datei')]
        del fields[fields.index('URL PARENT')]
        fields.append('URL')
        datawriter = csv.DictWriter(csvfile, fields, delimiter=',')
        datawriter.writeheader()
        for row in takenrows.values():
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
              
              #Did the file actually change? Requires everything to be inside a git repo,
              #and assumes the files were not in the modified state before
              p = subprocess.Popen(['git', 'status', row[kurznamecolumn] + ".csv"], stdout=subprocess.PIPE)
              out = p.communicate()

              #This is only a partial solution... other rows will have blank entries
              if 'modified:' in str(out):
                  row['modified'] = time.strftime("%d.%m.%Y")
              
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
