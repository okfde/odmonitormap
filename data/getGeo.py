import csv
import time
import urllib
import xml.etree.ElementTree as etree

csvoutfile = open('output.csv', 'wb')
citywriter = csv.writer(csvoutfile, delimiter=',')

with open('index.csv', 'rb') as csvfile:
    cityreader = csv.reader(csvfile, delimiter=',')
    headings = next(cityreader, None)
    citywriter.writerow(headings)
    
    for row in cityreader:
        print "Trying to get location of " + row[0]

        url = "http://nominatim.openstreetmap.org/search?q=" + row[0].replace(" ", "%20") + ",Germany&format=xml"
        print "Using URL: " + url
        
        resp = urllib.urlopen(url)
        xml = resp.read()
        
        #print "Full XML response:\n" + xml;

        root = etree.fromstring(xml)

        print "XML to use:";
        print(etree.tostring(root[0]))
        
        print row[0] + " has coordinates " + root[0].attrib['lat'] + ", " + root[0].attrib['lon']

        row[4] = root[0].attrib['lat'];
        row[5] = root[0].attrib['lon'];
        citywriter.writerow(row)
        #For debugging, turn this on so as to not overload the server
        #raw_input("Press Enter to continue...")
        
        #Don't upset the server (extra cautious/friendly)
        time.sleep(1) 
        
csvfile.close();
csvoutfile.close();