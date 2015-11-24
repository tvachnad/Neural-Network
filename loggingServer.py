import json
import os, datetime
from flask import Flask, jsonify, render_template, request

app = Flask(__name__, template_folder='./')

class logserver:
	

	firefile = ""
	potfile  = ""
	missfile = ""
	repfile  = ""
	confile  = ""
	conwfile = ""
	
	def logFiring(self, log):
		self.writeLog(self.firefile, log)

	def logPot(self, log):
		self.writeLog(self.potfile, log)
	
	def logMiss(self, log):
		self.writeLog(self.missfile, log)
	
	def logReplenish(self, log):
		self.writeLog(self.repfile, log)
		
	def logConnection(self, log):
		self.writeLog(self.confile, log)
	
	def logConW(self, log):
		self.writeLog(self.conwfile, log)
		
	def writeLog(self, filename, data):
		logfile = open(filename, 'a')
		for entry in data:
			logfile.write(entry)
		del data[:]
		logfile.close()

	def createNewLogFiles(self):
		logpath = os.path.dirname(os.getcwd())
		logpath = os.path.normpath(os.path.join(logpath, 'BrainPowerLogs'))
		conpath = os.path.normpath(os.path.join(logpath, 'Connections'))
		conwpath = os.path.normpath(os.path.join(logpath, 'ConWeights'))
		firepath = os.path.normpath(os.path.join(logpath, 'Firing'))
		potpath = os.path.normpath(os.path.join(logpath, 'Potential'))
		misspath = os.path.normpath(os.path.join(logpath, 'MissEnergy'))
		reppath = os.path.normpath(os.path.join(logpath, 'ReplenishEnergy'))

		for dir in [conpath, conwpath, firepath, potpath, misspath, reppath]:
			if not os.path.exists(dir):
				os.makedirs(dir)
	
		timestampstr = datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
	
		self.firefile = os.path.join(firepath, timestampstr)
		self.potfile = os.path.join(potpath, timestampstr)
		self.missfile = os.path.join(misspath, timestampstr)
		self.repfile = os.path.join(reppath, timestampstr)
		self.confile  = os.path.join(conpath, timestampstr)
		self.conwfile = os.path.join(conwpath, timestampstr)

		lfile = open(self.firefile, 'w')
		lfile.close()
		lfile = open(self.potfile, 'w')
		lfile.close()
		lfile = open(self.missfile, 'w')
		lfile.close()
		lfile = open(self.repfile, 'w')
		lfile.close()
		lfile = open(self.confile, 'w')
		lfile.close()
		lfile = open(self.conwfile, 'w')
		lfile.close()
	
	def main(self):
		app.run(port=8080, debug=True)	

logserv = logserver()

@app.route("/")
def index():
	return render_template('./index.html')

@app.route("/purplebrain.html")
def brain():
	return render_template('./purplebrain.html')


def logRequest(logger):
	log = request.get_json()
	logger(log)
	return '{"status": "success"}'
	
@app.route('/firing', methods=['POST'])
def logFiring():
	return logRequest(logserv.logFiring)

@app.route('/potential', methods=['POST'])
def logPotential():
	return logRequest(logserv.logPot)

@app.route('/miss', methods=['POST'])
def logMiss():
	return logRequest(logserv.logMiss)

@app.route('/replenish', methods=['POST'])
def logRep():
	return logRequest(logserv.logReplenish)
	
@app.route('/connection', methods=['POST'])
def logConnections():
	return logRequest(logserv.logConnection)

@app.route('/conweights', methods=['POST'])
def logWeights():
	return logRequest(logserv.logConW)

@app.route('/createLogs', methods=['POST'])	
def createLogFiles():		
	logserv.createNewLogFiles()
	return '{"status": "success"}'
	
if __name__ == '__main__':
    logserv.main()
    
