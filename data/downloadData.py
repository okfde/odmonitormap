#Download the index file and all cities
import urllib
import csv
import os

kurznamecolumn = 12
gidcolumn = 13

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
with open('index.csv', 'rb') as csvfile:
    cityreader = csv.reader(csvfile, delimiter=',')
    headings = next(cityreader, None)
    
    #For each city that has a short name, download its data from the other sheet, if we have the gid
    for row in cityreader:
        if row[kurznamecolumn] != "":
          if row[gidcolumn] != "":
              durl = "https://docs.google.com/spreadsheets/d/" + erfassungkey + "/export?gid=" + row[gidcolumn] + "&format=csv"
              print "Downloading data for " + row[kurznamecolumn] + " using url " + durl + "..."
              urllib.urlretrieve (durl, row[kurznamecolumn] + ".csv");
          else:
              print "No gid for this city, please check spreadsheet"
