#!/usr/bin/env python3

import requests
import json
import urllib.parse
import datetime
from dateutil.relativedelta import relativedelta
from dateutil import parser
import sys

####################################################################################################
#
# cStock daily maintenance script
#
# The first argument to this script must be a server configuration JSON file
# containing (at least) the following:
#
# {
#   "dhis": {
#     "baseurl": "http://localhost:8080",
#     "username": "admin",
#     "password": "district"
#   }
# }
#
####################################################################################################

if len(sys.argv) < 2:
	print('Usage: python3 cstock-daily.py configFile')
	sys.exit(1)

config = json.loads(open(sys.argv[1]).read())

dhis = config['dhis']
api = dhis['baseurl'] + '/api/'
credentials = (dhis['username'], dhis['password'])

today = datetime.date.today()
startOfThisMonth = today.strftime('%Y-%m-01')
startOfLastMonth = (today+relativedelta(months=-1)).strftime('%Y-%m-01')
startOfNextMonth = (today+relativedelta(months=+1)).strftime('%Y-%m-01')

def d2get(args):
	# print(api + args + '&paging=false') # DBUG
	return requests.get(api + args + '&paging=false', auth=credentials).json()

def d2put(args):
	try:
		requests.put(api + args, auth=credentials).json()
	except: # For some reason causes error even though succeeds
		pass

def d2post(args):
	print('time curl -u ' + dhis['username'] + ':' + dhis['password'] + ' -X POST "' + api + args + '"')
	returned = requests.post(api + args, auth=credentials).json()
	print(returned)

def index(data, field):
	index = {}
	for	i in data:
		index[i[field]] = i
	return index

####################################################################################################
#
# When monthly received data is entered, close any corresponding stockout that was open at the time
#
####################################################################################################

print('Auto-closing stockouts...')

programs = d2get('programs?fields=id,name&filter=name:like:Emergency+Order')['programs']

dataElements = d2get('dataElements?fields=name,id&filter=name:like:Monthly+Received')['dataElements']
dataElementNameIndex = index(dataElements, 'name')

trackedEntityInstances = d2get('trackedEntityInstances.json?ou=HfVjCurKxh2&ouMode=DESCENDANTS&lastUpdatedStartDate='+startOfLastMonth+'&lastUpdatedEndDate='+startOfNextMonth+'&fields=trackedEntityInstance,attributes[value]')['trackedEntityInstances']
trackedEntityInstanceIdIndex = index(trackedEntityInstances, 'trackedEntityInstance')

enrollments = d2get('enrollments.json?ou=HfVjCurKxh2&ouMode=DESCENDANTS')['enrollments'] # Root orgUnit and all descendants

monthlyReceived = d2get('dataValueSets.json?orgUnit=HfVjCurKxh2&children=true&dataElementGroup=M3XsZRdunaM&startDate='+startOfLastMonth+'&endDate='+startOfNextMonth)['dataValues']  # Root orgUnit and all descendants
receivedValues = {} # Hash of monthly recieved values, indexed by dataElement, period and orgUnit
for r in monthlyReceived:
	receivedValues[r['dataElement']+r['period']+r['orgUnit']] = r

programToReceived = {} # Make a map from the program UID to the corresponding 'Monthly Received' data element UID
for p in programs:
	programName = p['name']
	productName = programName[0:-16]
	dataElementName = productName + ' Monthly Received'
	dataElement = dataElementNameIndex[dataElementName]
	programToReceived[p['id']] = dataElement['id']

restocks = 0

for e in enrollments:
	if e['enrollmentDate'] >= startOfLastMonth and e['enrollmentDate'] <= startOfNextMonth and e['status'] != 'COMPLETED':
		if e['trackedEntityInstance'] in trackedEntityInstanceIdIndex:
			trackedEntityInstance = trackedEntityInstanceIdIndex[e['trackedEntityInstance']]
			attributes = trackedEntityInstance['attributes']
			if attributes:
				stockoutLevel = attributes[0]['value']
				if stockoutLevel == '0':
					dataElementId = programToReceived[e['program']]
					stockoutMonth = parser.parse(e['created'][0:7]+'-01')
					restockPeriod = (stockoutMonth+relativedelta(months=1)).strftime('%Y%m')
					key = dataElementId+restockPeriod+e['orgUnit']
					if key in receivedValues:
						value = receivedValues[key]['value']
						if value != '0':
							d2put('enrollments/' + e['enrollment'] + '/completed')
							restocks += 1

print ('Closed out', restocks, 'stockouts because of restocking.')

####################################################################################################
#
# Run the predictors
#
####################################################################################################

# Some predictors depend on other predicted values, so they need to be run in order by type

predictorTypes = [
	'CHV Stockout Days starting last month',
	'Previous Stock on Hand',
	'Previous Month Resupply',
	'Current Monthly Consumption',
	'Average Monthly Consumption',
	'Stock Status: Stockout',
	'Stock Status: Understocked',
	'Stock Status: Adequate',
	'Stock Status: Overstocked',
	'Stock on Hand Reported'
]

d2put('resourceTables/analytics')

monthCount = 2 # Number of months to process (from the curent month counting backwards)

# Run them for one month at a time, so they don't take too long and time out.
for i in reversed(range(monthCount)): # Do the early months first, then the later months, which build on their output.
	for pt in predictorTypes:
		print('Predicting ' + pt + '\n', end='', flush=True)
		predictors = d2get('predictors?fields=id,name&filter=name:like:' + urllib.parse.quote_plus(pt))['predictors']
		for p in predictors:
			startOfMonth = (today+relativedelta(months=-i)).strftime('%Y-%m-01')
			startOfFollowingMonth = (today+relativedelta(months=-i+1)).strftime('%Y-%m-01')
			d2post('predictors/' + p['id'] + '/run?startDate='+startOfMonth+'&endDate='+startOfFollowingMonth)
			# print('.', end='', flush=True)
	print()

d2put('resourceTables/analytics')

print('End of daily run.')
sys.exit(0)
