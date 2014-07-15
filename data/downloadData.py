#Download the index file and all cities
import urllib
import csv
import os

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
        if row[9] != "":
          if row[10] != "":
              durl = "https://docs.google.com/spreadsheets/d/" + erfassungkey + "/export?gid=" + row[10] + "&format=csv"
              print "Downloading data for " + row[9] + " using url " + durl + "..."
              urllib.urlretrieve (durl, row[9] + ".csv");
          else:
              print "No gid for this city, please check spreadsheet"
