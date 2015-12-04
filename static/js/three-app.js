(function main() {
	"use strict";

	// Constants -------------------------------------------------------------
	var counter1 = 0;
	var counter2 = 0;

	const EXCITOR = 0;
	const INHIBITOR = 1;

	// Neuron ----------------------------------------------------------------

	function Neuron(x, y, z) {

		this.type = null;

		this.connection = [];
		// represents the 1:1 ratio astrocyte associated w/ neuron
		this.astrocyte = null;
		// the neurons this neuron is connected to
		this.neurons = [];
		this.receivedSignal = false;
		this.signalCount = 0;
		this.lastSignalRelease = 0;
		this.releaseDelay = 0;
		this.fired = false;
		this.firedCount = 0;
		this.prevReleaseAxon = null;
		this.refactoryPeriod = 10;
		this.xPos = x;
		this.yPos = y;
		this.zPos = z;
		this.idx = -1;

		//neuron fires when this number passes the firing threshold
		this.acc = 0.5;

		this.region = -1; // which region the neuron belongs to
		// 1 - 188, assigned during initialization

		THREE.Vector3.call(this, x, y, z);
	}

	Neuron.prototype = Object.create(THREE.Vector3.prototype);

	//One directional connection from the neuron calling the method to the neuron in the parameter.
	Neuron.prototype.connectNeuronOneDirection = function(neuronB) {

		var neuronA = this;
		// create axon and establish connection from A to B
		var axon = new Axon(neuronA, neuronB);
		neuronA.connection.push(new Connection(axon, 'A'));
		neuronA.neurons.push(neuronB);
		return axon;

	};

	//Two directional connection from the neuron calling the method to the neuron in the parameter.
	//A signal can travel both ways
	Neuron.prototype.connectNeuronTwoDirection = function(neuronB) {

		var neuronA = this;
		// create axon and establish connection in both directions
		var axon = new Axon(neuronA, neuronB);
		neuronA.connection.push(new Connection(axon, 'A'));
		neuronB.connection.push(new Connection(axon, 'B'));
		neuronA.neurons.push(neuronB);
		neuronB.neurons.push(neuronA);
		return axon;

	};

	Neuron.prototype.decay = function(){
		this.acc = 0.9 * this.acc;
		if (this.acc < 0)
			this.acc = 0;
	}

	Neuron.prototype.tryConnect = function(neuronB, network, j, k){

		var n1 = this;
		var n2 = neuronB;
		var r1 = parseInt(n1.region);
		var r2 = parseInt(n2.region);
		var randomForMatrix = (Math.random());
		var canConnect = false;


		var probFromMatrix = network.connectivityMatrix[r1-1][r2];
        probFromMatrix = Number(probFromMatrix);
        probFromMatrix = probFromMatrix / 5000;

        if ( r1 ===r2 && n1 !== n2 && n1.distanceTo( n2 ) < network.maxAxonDist) {
        	canConnect = true;
        }

        else if(n1 !== n2 && randomForMatrix < probFromMatrix){
        	canConnect = true;
        }

		var ner1 = j+1;
		var ner2 = k+1;
		if (canConnect)
		{
			var rand = Math.floor( Math.random() * 3 );

			//two directional connection
			if(rand === 0){
				var connectedAxon = n1.connectNeuronTwoDirection(n2);
				ner1 = j+1;
				ner2 = k+1;
			}

		 	//one directional connection n2 to n1
			else if(rand === 1){
				var connectedAxon = n2.connectNeuronOneDirection(n1);
				ner1 = k+1;
				ner2 = j+1;
			}

			//one directional connection n1 to n2
			else if(rand === 2){
				var connectedAxon = n1.connectNeuronOneDirection(n2);
				ner1 = j+1;
				ner2 = k+1;
			}
			network.constructAxonArrayBuffer(connectedAxon);
			var rand = (Math.random()*41+80)/100;
			connectedAxon.weight = rand * (1/connectedAxon.cpLength);
			if(network.logger != null){
				network.logger.logCon(ner1, ner2, connectedAxon.weight);
				if(rand === 0) {
					network.logger.logCon(ner2, ner1, connectedAxon.weight);
				}	
			}
		}
	}

	Neuron.prototype.createSignal = function(particlePool, minSpeed, maxSpeed) {

		this.firedCount += 1;
		this.receivedSignal = false;

		// create signal to all connected axons
		return this.connection.filter(function(connection)
			{
				return connection.axon !== this.prevReleaseAxon;
			}, this)
			.map(function(connection)
			{
				return new Signal(connection, particlePool, minSpeed, maxSpeed);
			})
	};


	//returns active astrocyte, it's taking energy from
	Neuron.prototype.astrocyteWithEnergy = function(neighbors) {
		neighbors = typeof neighbors !== 'undefined' ? neighbors : true;
		var total = this.neurons.length;
		//console.log(" i"+this.neurons.length);
		var activeAstrocyte = null;
		// see if the astrocyte directly linked to this neuron has the energy needed to fire
		if (this.astrocyte.hasEnergy() === true) {
			return this.astrocyte;
		}

		// if we get here, the directly linked astrocyte did not have enough energy
		// check the astrocytes of surrounding neurons to see if they have enough energy
		if (neighbors){ 
			for (var i = 0; i < total; i++) {
				var astrocyte = this.neurons[i].astrocyteWithEnergy(false);
				if (astrocyte == null)
					return astrocyte;
			}
		}
		return null;

	};
	Neuron.prototype.willFire = function(currentTime)
	{
		var timeSinceLastFiring = currentTime - this.lastSignalRelease; // used to check if in refactory period
		if (timeSinceLastFiring >= this.refactoryPeriod && //past refactory period
			this.acc >= network_settings.firing_threshold) //has to be past the threshold to consider firing
				return Math.random() < this.acc;
		else 
			return false;
	}
	//neuron firing function with probability of firing equal to the energy level
	Neuron.prototype.fire = function() {
		this.fired = true;
		this.acc = 0.125;//this.acc - 0.125; // resets energy of neuron
		// decrease energy level of astrocyte responsible for 
		// giving the neuron the energy it needed to fire
		this.releaseDelay = THREE.Math.randInt(100, 1000);
	};
	
	Neuron.prototype.fireIfCan = function(neuralNet, currentTime)
	{
		var ret = [false, null];
		if (this.willFire(currentTime))
		{
			if (this.receivedSignal) {
				var astrocyte = this.astrocyteWithEnergy(false);
				if (astrocyte != null) { // Astrocyte mode
					var prevacc = this.acc;
					this.fire();
					ret = [true, prevacc]
					astrocyte.deplete(currentTime);
					this.lastSignalRelease = currentTime;
					neuralNet.releaseSignalAt(this);
				} else {
					ret = [false, this.astrocyte.availableEnergy];
				}
				this.receivedSignal = false; // if neuron received signal but still in delay reset it
			} else {
				this.decay();
			}
		} 
		return ret;
	}
	Neuron.prototype.replenishAstrocyte = function(currentTime){
		this.astrocyte.replenish(currentTime);
	}
	Neuron.prototype.effectiveSignal = function() {
		return (this.prevReleaseAxon.weight * network_settings.signal_weight);
	}

	//accumulation function when recieving a signal from an excitory neuron
	Neuron.prototype.buildExcitor = function() {
		this.acc = Math.min(1, this.acc + this.effectiveSignal());
	};

	//accumulation function when recieving a signal from an inhibitory neuron
	Neuron.prototype.buildInhibitor = function() {
		this.acc = Math.max(0, this.acc - this.effectiveSignal());
	};

	// Astrocyte -------------------------------------------------------------
	function Astrocyte() {
		// replaces the if firedCount < 8
		this.availableEnergy = astrocyte_settings.maxEnergy;
		this.lastRefilled = 0;
	}

	// TODO: Get rid of this because we should never have a situation where the astrocyte energy is hard-reset, right?...
	// Astrocytes should just regenerate energy at a constant rate and neurons pull from it if it's there and they need it...
	Astrocyte.prototype.resetEnergy = function(currentTime) {
		//this.availableEnergy = THREE.Math.randInt(astrocyte_settings.minEnergy, astrocyte_settings.maxEnergy);
		if (this.availableEnergy + astrocyte_settings.replenishEnergy > astrocyte_settings.maxEnergy)
			this.availableEnergy = astrocyte_settings.maxEnergy;
		else
			this.availableEnergy += astrocyte_settings.replenishEnergy;
		//console.log("reset: "+ this.availableEnergy);
		this.lastRefilled = currentTime;
	};
	Astrocyte.prototype.hasEnergy = function(){
		if(this.availableEnergy >= astrocyte_settings.fireEnergy)
			return true;
		else
			return false;
	}
	//depletes energy from the astrocyte when the neuron fires
	Astrocyte.prototype.deplete = function(currentTime) {
		this.availableEnergy -= 0.125; //energy needed to fire a signal default: 1/8
		if (this.availableEnergy <= astrocyte_settings.minEnergy) { // if energy not full, then regenerate more
			this.availableEnergy = astrocyte_settings.minEnergy
		}
		this.lastRefilled = currentTime;
	};

	//regenerates energy of the astrocyte in a certain time period that can be set in the settings
	Astrocyte.prototype.replenish = function(currentTime) {
		if (currentTime - this.lastRefilled> astrocyte_settings.regenerationTime)
		{
			this.availableEnergy += astrocyte_settings.replenishEnergy;
			if(this.availableEnergy > astrocyte_settings.maxEnergy){
				this.availableEnergy = astrocyte_settings.maxEnergy;
			}
			this.lastRefilled = currentTime;
		}
	};


	// Signal ----------------------------------------------------------------

	function Signal(connection, particlePool, minSpeed, maxSpeed) {

		this.minSpeed = minSpeed;
		this.maxSpeed = maxSpeed;
		this.speed = THREE.Math.randFloat(this.minSpeed, this.maxSpeed);
		this.alive = true;
		this.t = null;
		this.startingPoint = null;
		this.axon = null;
		this.particle = particlePool.getParticle();
		this.excitor = true;
		THREE.Vector3.call(this);
		this.setConnection(connection);

	}

	Signal.prototype = Object.create(THREE.Vector3.prototype);

	Signal.prototype.setConnection = function(Connection) {

		this.startingPoint = Connection.startingPoint;
		this.axon = Connection.axon;
		if (this.startingPoint === 'A') this.t = 0;
		else if (this.startingPoint === 'B') this.t = 1;

	};

	Signal.prototype.dispatchSignal = function(from, to, clock, logger)
	{
		this.alive = false;
		to.receivedSignal = true;
		to.signalCount++;
		to.prevReleaseAxon = this.axon;
		//checks what type of neuron sent the signal to call the correct build function
		if (from.type == EXCITOR){
			to.buildExcitor();
			logger.logInput(clock, to.idx, EXCITOR);
		}
		else if (from.type == INHIBITOR) {
			//console.log("firer = "+this.axon.neuronA.type+" reciever = "+this.axon.neuronB.type);
			//console.log("energy before = "+this.axon.neuronB.acc);
			to.buildInhibitor();
			logger.logInput(clock, to.idx, INHIBITOR);
			//console.log("energy after = "+this.axon.neuronB.acc);
		}

	}

	Signal.prototype.freeParticle = function(){
		if (this.particle != null)
		{
			this.particle.free();
			this.particle = null;
		}
	}				

	Signal.prototype.travel = function(clock, logger) {

		var pos;
		//var temp = this.axon.getPoint(this.t);
		// console.log("direction of axon = "+this.axon.direction + "starting point = "+this.startingPoint);
		// if (this.startingPoint === 'A' && (this.axon.direction === 0 || this.axon.direction === 2)) {
		if (this.startingPoint === 'A') {
			this.t += this.speed;
			if (this.t >= 1) {
				this.t = 1;
				this.dispatchSignal(this.axon.neuronA, this.axon.neuronB, clock, logger);
			}
			//console.log("fired signal = "+this.startingPoint);

		} //else if (this.startingPoint === 'B' && (this.axon.direction === 1 || this.axon.direction === 2)) {
		else if (this.startingPoint === 'B') {
			this.t -= this.speed;
			if (this.t <= 0) {
				this.t = 0;
				this.dispatchSignal(this.axon.neuronB, this.axon.neuronA, clock, logger);
			}
			//console.log("fired signal = "+this.startingPoint);
		}

		if (this.particle != null)
		{
			pos = this.axon.getPoint(this.t);
			this.particle.set(pos.x, pos.y, pos.z);	
		}

		// if (pos === temp)
		// 	this.alive = false;


		// pos = this.axon.getPointAt(this.t);	// uniform point distribution but slower calculation


	};

	// Particle Pool ---------------------------------------------------------

	function ParticlePool(poolSize) {

		this.spriteTextureSignal = THREE.ImageUtils.loadTexture("./static/sprites/electric.png");

		this.poolSize = poolSize;
		this.pGeom = new THREE.Geometry();
		this.particles = this.pGeom.vertices;
		this.availableParticles = []

		this.offScreenPos = new THREE.Vector3(9999, 9999, 9999); // #CM0A r68 PointCloud default frustumCull = true(extended from Object3D), so need to set to 'false' for this to work with oppScreenPos, else particles will dissappear

		this.pColor = 0xff4400;
		this.pSize = 0.6;

		var particle;
		for (var ii = 0; ii < this.poolSize; ii++) {
			particle = new Particle(this);
			this.particles[ii] = particle;
			this.free(particle)
		}

		// inner particle
		this.pMat = new THREE.PointCloudMaterial({
			map: this.spriteTextureSignal,
			size: this.pSize,
			color: this.pColor,
			blending: THREE.AdditiveBlending,
			depthTest: false,
			transparent: true
		});

		this.pMesh = new THREE.PointCloud(this.pGeom, this.pMat);
		this.pMesh.frustumCulled = false; // ref: #CM0A

		scene.add(this.pMesh);


		// outer particle glow
		this.pMat_outer = new THREE.PointCloudMaterial({
			map: this.spriteTextureSignal,
			size: this.pSize * 10,
			color: this.pColor,
			blending: THREE.AdditiveBlending,
			depthTest: false,
			transparent: true,
			opacity: 0.025
		});

		this.pMesh_outer = new THREE.PointCloud(this.pGeom, this.pMat_outer);
		this.pMesh_outer.frustumCulled = false; // ref:#CM0A

		scene.add(this.pMesh_outer);

	}

	ParticlePool.prototype.getParticle = function() {
		if (this.availableParticles.length > 0)
			return this.availableParticles.pop();
		return null;

	};

	ParticlePool.prototype.free = function(particle){
		particle.set(this.offScreenPos.x, this.offScreenPos.y, this.offScreenPos.z);
		this.availableParticles.push(particle);
	};

	ParticlePool.prototype.update = function() {

		this.pGeom.verticesNeedUpdate = true;

	};

	ParticlePool.prototype.updateSettings = function() {

		// inner particle
		this.pMat.color.setHex(this.pColor);
		this.pMat.size = this.pSize;
		// outer particle
		this.pMat_outer.color.setHex(this.pColor);
		this.pMat_outer.size = this.pSize * 10;

	};

	// Particle --------------------------------------------------------------
	// Private class for particle pool

	function Particle(particlePool) {

		this.particlePool = particlePool;

	}

	Particle.prototype = Object.create(THREE.Vector3.prototype);

	Particle.prototype.free = function() {
		this.particlePool.free(this);

	};

	// Axon ------------------------------------------------------------------

	function Axon(neuronA, neuronB) {

		this.weight = 1;

		this.neuronA = neuronA;
		this.neuronB = neuronB;
		this.cpLength = neuronA.distanceTo(neuronB);
		THREE.LineCurve3.call(this, this.neuronA, this.neuronB);

		this.geom = new THREE.Geometry();
		this.geom.vertices.push(this.neuronA, this.neuronB);

	}

	Axon.prototype = Object.create(THREE.LineCurve3.prototype);

	// Connection ------------------------------------------------------------
	function Connection(axon, startingPoint) {
		this.axon = axon;
		this.startingPoint = startingPoint;


	}
	
	// Logger ----------------------------------------------------------------
	function Logger(){
		this.urlFire = "firing";
		this.urlInput = "input";
		this.urlPot  = "potential";
		this.urlMiss = "miss";
		this.urlRep  = "replenish";
		this.urlCon  = "connection";
		this.urlConW = "conweights";
		this.entF = []; //firings
		this.entI = []; //inputs
		this.entP = []; //potential energy
		this.entM = []; //missed energy
		this.entR = []; //replenish energy
		this.entC = []; //connection (binary)
		this.entW = []; //connection weight
	}
	Logger.prototype.logFiring = function(time, neuron, potential){
		this.entF.push(time.toString() + "," + neuron.toString() + ", 1\n")
		this.entP.push(time.toString() + "," + neuron.toString() + "," + potential.toString() + "\n")
		if(this.entF.length >= 1000){
			this.flushFiring();
		}
	}
	Logger.prototype.logInput = function(time, neuron, type){
		this.entI.push(time.toString() + "," + neuron.toString() + "," + type.toString() + "\n")
		if(this.entI.length >= 1000){
			this.flushInput();
		}
	}
	Logger.prototype.logMissEnergy = function(time, neuron, energy){
		this.entM.push(time.toString() + "," + neuron.toString() + "," + energy.toString() + "\n")
		if(this.entM.length >= 1000){
			this.flushMiss();
		}
	}
	Logger.prototype.logRep = function(time, energy){
		this.entR.push(time.toString() + "," + energy.toString());
		if(this.entR.length >= 200){
			this.flushRep();
		}
	}
	Logger.prototype.logCon = function(n1, n2, weight){
		this.entC.push(n1.toString() + "," + n2.toString() + ", 1\n")
		this.entW.push(n1.toString() + "," + n2.toString() + "," + weight.toString() + "\n")
		if(this.entC.length >= 1000){
			this.flushCon();
		}
	}
	Logger.prototype.flushFiring = function(){
		this.sendToServer(this.entF, this.urlFire);
		this.sendToServer(this.entP, this.urlPot);
		this.entF = [];
		this.entP = [];
	}
	Logger.prototype.flushInput = function(){
		this.sendToServer(this.entI, this.urlInput);
		this.entI = [];
	}
	Logger.prototype.flushMiss = function(){
		this.sendToServer(this.entM, this.urlMiss);
		this.entM = [];
	}
	Logger.prototype.flushRep = function(){
		this.sendToServer(this.entR, this.urlRep);
		this.entR = [];
	}
	Logger.prototype.flushCon = function(){
		this.sendToServer(this.entC, this.urlCon);
		this.sendToServer(this.entW, this.urlConW);
		this.entC = [];
		this.entW = [];
	}
	Logger.prototype.sendToServer = function(entries, url){
		$.ajax({
		 	type: "POST",
		 	url: "/"+url,
		  	contentType: "application/json; charset=utf-8",
		  	data: JSON.stringify(entries),
		  	dataType: 'json',
		  	success: function(data) {
//		  		console.log("success");
		  	},
		  	error: function(error) {
		  		console.log(error);
		  	}
		});
	}
	Logger.prototype.createLogs = function(){
		$.ajax({
		 	type: "POST",
		 	url: "/createLogs",
		  	contentType: "application/json; charset=utf-8",
		  	data: JSON.stringify("Create the logs"),
		  	dataType: 'json',
		  	success: function(data) {
//		  		console.log("success");
		  	},
		  	error: function(error) {
		  		console.log(error);
		  	}
		});
	}	
	// Clock -----------------------------------------------------------------
	function Clock(){
		this.currentTime = 0;
		this.stepSize = 1; //1 millisecond
	}
	
	Clock.prototype.time = function(){
		return this.currentTime;
	}
	Clock.prototype.getStepSize = function(){
		return this.stepSize();
	}
	Clock.prototype.reset = function(){
		this.currentTime = 0;
	}
	Clock.prototype.inc = function(steps){
		this.currentTime = this.currentTime + this.stepSize * steps;
	}
	
	
	
	// Neural Network --------------------------------------------------------
	function NeuralNetwork() {
		this.initialized = false;
		//this.logger = null; 
		this.logger = new Logger();
		this.numberExcite = 0;
		this.numberInhibit = 0;
		
		// settings
		this.verticesSkipStep = 1; //2
		this.maxAxonDist = network_settings.AxonDistance; //default 8
		//this.maxAxonDist = network_settings.AxonDistanceInhibitor; //default 4
		this.maxConnectionPerNeuron = network_settings.NeuronConnection; //default 6
		//this.maxConnectionPerNeuronInhibitor = network_settings.NeuronConnectionInhibitor; //default 20

		this.firing_threshold = network_settings.firing_threshold; // threshold to fire signal (not used yet)

		this.currentMaxSignals = 8000;
		this.limitSignals = 200000;
		this.particlePool = new ParticlePool(this.limitSignals); // *************** ParticlePool must bigger than limit Signal ************

		this.signalMinSpeed = 0.035;
		this.signalMaxSpeed = 0.065;

		// NN component containers
		this.allNeurons = [];
		this.allSignals = [];
		this.allAxons = [];

		// axon
		this.axonOpacityMultiplier = 1.0;
		this.axonColor = 0x0099ff;
		this.axonGeom = new THREE.BufferGeometry();
		this.axonPositions = [];
		this.axonIndices = [];
		this.axonNextPositionsIndex = 0;

		this.shaderUniforms = {
			color: {
				type: 'c',
				value: new THREE.Color(this.axonColor)
			},
			opacityMultiplier: {
				type: 'f',
				value: 1.0
			}
		};

		this.shaderAttributes = {
			opacityAttr: {
				type: 'f',
				value: []
			}
		};

		// neuron
		this.neuronSize = 0.7;
		this.spriteTextureNeuron = THREE.ImageUtils.loadTexture("./static/sprites/electric.png");
		this.excitorColor = 0x00ffff;
		this.inhibitorColor = 0xff0037;
		this.neuronOpacity = 1.0;
		this.excitorsGeom = new THREE.Geometry();
		this.inhibitorsGeom = new THREE.Geometry();
		this.excitorMaterial = new THREE.PointCloudMaterial({
			map: this.spriteTextureNeuron,
			size: this.neuronSize,
			color: this.excitorColor,
			blending: THREE.AdditiveBlending,
			depthTest: false,
			transparent: true,
			opacity: this.neuronOpacity
		});

		this.inhibitorMaterial = new THREE.PointCloudMaterial({
			map: this.spriteTextureNeuron,
			size: this.neuronSize,
			color: this.inhibitorColor,
			blending: THREE.AdditiveBlending,
			depthTest: false,
			transparent: true,
			opacity: this.neuronOpacity
		});

		// info api
		this.numNeurons = 0;
		this.numAxons = 0;
		this.numSignals = 0;
		// probably shouldn't be hardcoded
		this.numActiveAstrocytes = 7241;
		this.regenSign = 1;
		this.lastRegenUpdate = 0;
		//connectivity matrix between different regions
		this.connectivityMatrix =[];

		// initialize NN
		this.initNeuralNetwork();


	}
	NeuralNetwork.prototype.updateRegeneration = function(currentTime) {
		var timeSinceLastUpdate = currentTime - this.lastRegenUpdate;
		if(timeSinceLastUpdate >= astrocyte_settings.frequency){
			astrocyte_settings.replenishEnergy += this.regenSign*astrocyte_settings.amplitude;
			this.lastRegenUpdate = currentTime;
			if(astrocyte_settings.replenishEnergy > astrocyte_settings.maxThreshold){
				astrocyte_settings.replenishEnergy = astrocyte_settings.maxThreshold; 
				this.regenSign *= -1;
			} else if(astrocyte_settings.replenishEnergy < astrocyte_settings.minThreshold){
				astrocyte_settings.replenishEnergy = astrocyte_settings.minThreshold;
				this.regenSign *= -1;
			}
			if(this.logger != null){
				this.logger.logRep(currentTime, astrocyte_settings.replenishEnergy);
			}
		}
	}


	NeuralNetwork.prototype.constructNeuralNetwork = function(loadedObject){
		var loadedMesh = loadedObject.children[0];
		var loadedMeshVertices = loadedMesh.geometry.vertices;

		// render loadedMesh
		loadedMesh.material = new THREE.MeshBasicMaterial({
			transparent: true,
			opacity: 0.05,
			depthTest: false,
			color: 0x0088ff,
			blending: THREE.AdditiveBlending
		});
		scene.add(loadedObject);

		this.initNeurons(loadedMeshVertices);
		this.initAxons();

		this.initialized = true;

		console.log('Neural Network initialized');
		document.getElementById('loading').style.display = 'none'; // hide loading animation when finish loading model
		//this.regenerationFunction();
		//this.decayFunction();

	}
	NeuralNetwork.prototype.initNeuralNetwork = function() {

		// obj loader
		var self = this;
		var loader = new THREE.OBJLoader();
		
		if(this.logger != null){
			this.logger.createLogs();
		}
		//load connectivity matrix
		d3.csv("./static/models/connectivity.csv", function(data) {
	  		for(var q = 0;q<188;q++){
	  			self.connectivityMatrix[q]=data[q];
	  		}
			loader.load('./static/models/brain_vertex_low.obj', function(loadedObject){
				self.constructNeuralNetwork(loadedObject);
				});
			});
	}

	NeuralNetwork.prototype.printRegions = function(){
		for(var i = 0; i<this.allNeurons.length; i++){
			var n = this.allNeurons[i];
			console.log("neuron # "+i+" region: "+n.region+"position: "+n.xPos+" "+n.yPos+" "+n.zPos);
		}
	};

	NeuralNetwork.prototype.initNeurons = function(inputVertices) {
		console.log("init Neurons");
		var exciteNeurons = [];
		var inhibNeurons = [];
		var numInhibitors = 0;
		for (var i = 0; i < inputVertices.length; i += this.verticesSkipStep) {
			for(var q = 0; q<40; q++){
				var pos = inputVertices[i];
				var rand1 = (Math.random()*18)-9;
				var rand2 = (Math.random()*18)-9;
				var rand3 = (Math.random()*18)-9;
				var n = new Neuron(pos.x+rand1, pos.y+rand2, pos.z+rand3);
				n.type = EXCITOR;
				//n.maxConnectionPerNeuron = network_settings.NeuronConnectionExcitor;
				n.region = i+1;

				n.astrocyte = new Astrocyte();
				// half of all the astrocytes should be live
				//console.log("adfasdvknvjanlkdsjnfjvhslkvdbchjksbdn");
				if (q % 4 == 0) {
					n.astrocyte.active = true; //currently not used
				}
				//every 5th neuron is inhibitory
				if (q % (5*this.verticesSkipStep) == 0) {
					n.type = INHIBITOR;
					//n.maxConnectionPerNeuron = network_settings.NeuronConnectionInhibitor;
					numInhibitors++;
				}
				//console.log("# of inhibitors" +numInhibitors);
				n.astrocyte.resetEnergy(0); // modify this, should be a rand int between max and min
				//this.allNeurons.push(n);
				if (n.type == EXCITOR){
					this.excitorsGeom.vertices.push(n);
					exciteNeurons.push(n);
				}
				else if (n.type == INHIBITOR) {
					this.inhibitorsGeom.vertices.push(n);
					inhibNeurons.push(n);
				}
			}
		}
		
		for(var i = 0; i < exciteNeurons.length; i++){
			this.allNeurons.push(exciteNeurons[i]);
		}
		for(var i =0; i < inhibNeurons.length; i++){
			this.allNeurons.push(inhibNeurons[i])
		}
		
		this.numberExcite = exciteNeurons.length;
		this.numberInhibit = inhibNeurons.length;

		// give each Neuron knowledge of their index
		for(var i = 0; i < this.allNeurons.length; i++){
			this.allNeurons[i].idx = i;
		}

		// neuron mesh
		this.excitorParticles = new THREE.PointCloud(this.excitorsGeom, this.excitorMaterial);
		scene.add(this.excitorParticles);
		this.inhibitorParticles = new THREE.PointCloud(this.inhibitorsGeom, this.inhibitorMaterial);
		scene.add(this.inhibitorParticles);

		//this.printRegions();

	};

	NeuralNetwork.prototype.initAxons = function () {

			var allNeuronsLength = this.allNeurons.length;
			for (var j=0; j<allNeuronsLength; j++) {
				var n1 = this.allNeurons[j];
				for (var k=j+1; k<allNeuronsLength; k++) {
					var n2 = this.allNeurons[k];
					// connect neuron if distance ... and limit connection per neuron to not more than x
					
					n1.tryConnect(n2, this, j, k);
				}
			}
			if(this.logger != null){
				this.logger.flushCon();
			} 
						
			// *** attirbute size must bigger than its content ***
			var axonIndices = new Uint32Array(this.axonIndices.length);
			var axonPositions = new Float32Array(this.axonPositions.length);
			var axonOpacities = new Float32Array(this.shaderAttributes.opacityAttr.value.length);

			// transfer temp-array to arrayBuffer
			transferToArrayBuffer(this.axonIndices, axonIndices);
			transferToArrayBuffer(this.axonPositions, axonPositions);
			transferToArrayBuffer(this.shaderAttributes.opacityAttr.value, axonOpacities);
			this.axonIndices = [];
			this.axonPositions = [];
			this.axonOpacities = [];

			function transferToArrayBuffer(fromArr, toArr) {
				for (i=0; i<toArr.length; i++) {
					toArr[i] = fromArr[i];
				}
			}

			this.axonGeom.addAttribute( 'index', new THREE.BufferAttribute(axonIndices, 1) );
			this.axonGeom.addAttribute( 'position', new THREE.BufferAttribute(axonPositions, 3) );
			this.axonGeom.addAttribute( 'opacityAttr', new THREE.BufferAttribute(axonOpacities, 1) );


			// axons mesh
			this.shaderMaterial = new THREE.ShaderMaterial( {
				uniforms:       this.shaderUniforms,
				attributes:     this.shaderAttributes,
				vertexShader:   document.getElementById('vertexshader-axon').textContent,
				fragmentShader: document.getElementById('fragmentshader-axon').textContent,
				blending:       THREE.AdditiveBlending,
				// depthTest:      false,
				transparent:    true
			});

		this.axonMesh = new THREE.Line(this.axonGeom, this.shaderMaterial, THREE.LinePieces);

		scene.add(this.axonMesh);

	};

	NeuralNetwork.prototype.update = function(currentTime) {

		if (!this.initialized) return;
		this.updateRegeneration(currentTime);

		var n, ii;

		// update neurons state and release signal
		for (ii = 0; ii < this.allNeurons.length; ii++) {
			n = this.allNeurons[ii];
			// the astrocyte we're taking energy from
			var result = n.fireIfCan(this, currentTime);
			if(this.logger != null){
				if (result[0] === true) {
					this.logger.logFiring(currentTime, ii+1, result[1]);	
				} else if (result[1] != null) {
					this.logger.logMissEnergy(currentTime, ii+1, result[1]);
				}
			}
			
		}
		for (ii = 0; ii < this.allNeurons.length; ii++) {
			n = this.allNeurons[ii];
			n.replenishAstrocyte(currentTime);
		}
		if(this.logger != null){
			if(this.logger.entF.length >= 1000 || this.logger.entM.length >= 1000){
				this.logger.flushFiring();
				this.logger.flushMiss();
				//this.logger.flushRep();
			}
			
		}
		// reset all neurons and when there is X signal
		if (this.allSignals.length <= 0) {

			// first collect some stats on average signal count
			var allsignals = 0;
			for (ii = 0; ii < this.allNeurons.length; ii++) {
				n = this.allNeurons[ii];
				allsignals += n.signalCount;
				// reset signal count for next time
				n.signalCount = 0;
			}
			//var averagesignals = allsignals / this.allNeurons.length;
			//console.log("averagesignals: " + averagesignals);

			for (ii = 0; ii < this.allNeurons.length; ii++) { // reset all neuron state
				n = this.allNeurons[ii];
				n.releaseDelay = 0;
				n.fired = false;
				n.receivedSignal = false;
				n.firedCount = 0;
				// reset all astrocytes
				// TODO: in the future this should be adjustable and occur constantly,
				// not just when the signal dies.
				n.astrocyte.resetEnergy(currentTime);
			}
			//console.log("New signal released");
			this.releaseSignalAt(this.allNeurons[THREE.Math.randInt(0, this.allNeurons.length)]);

		}

		// update and remove signals
		// this.allSignals.map(function(signal){
		// 	signal.travel();
		// 	if (!signal.alive)
		// 		signal.freeParticle();
		// })
		// this.allSignals = this.allSignals.filter(function(signal)
		// {
		// 	return signal.alive;
		// })

		// a reverse refactorization
		for (var j = this.allSignals.length - 1; j >= 0; j--) {
			var s = this.allSignals[j];
			s.travel(currentTime, this.logger);

			if (!s.alive) {
				s.particle.free();
				for (var k = this.allSignals.length - 1; k >= 0; k--) {
					if (s === this.allSignals[k]) {
						this.allSignals.splice(k, 1);
						break;
					}
				}
			}

		}

		// update particle pool vertices
		this.particlePool.update();

		// update info for GUI
		this.updateInfo();

	};

	// add vertices to temp-arrayBuffer, generate temp-indexBuffer and temp-opacityArrayBuffer 
	NeuralNetwork.prototype.constructAxonArrayBuffer = function(axon) {
		this.allAxons.push(axon);
		var vertices = axon.geom.vertices;
		var numVerts = vertices.length;

		// &&&&&&&&&&&&&&&&&&&&&^^^^^^^^^^^^^^^^^^^^^
		// var opacity = THREE.Math.randFloat(0.001, 0.1);

		for (var i = 0; i < numVerts; i++) {

			this.axonPositions.push(vertices[i].x, vertices[i].y, vertices[i].z);

			if (i < numVerts - 1) {
				var idx = this.axonNextPositionsIndex;
				this.axonIndices.push(idx, idx + 1);

				var opacity = THREE.Math.randFloat(0.002, 0.2);
				this.shaderAttributes.opacityAttr.value.push(opacity, opacity);

			}

			this.axonNextPositionsIndex += 1;
		}
	};

	NeuralNetwork.prototype.releaseSignalAt = function(neuron) {
		var signals = neuron.createSignal(this.particlePool, this.signalMinSpeed, this.signalMaxSpeed);
		for (var ii = 0; ii < signals.length; ii++) {
			var s = signals[ii];
			this.allSignals.push(s);
		}
	};

	NeuralNetwork.prototype.updateInfo = function() {
		this.numNeurons = this.allNeurons.length;
		this.numAxons = this.allAxons.length;
		this.numSignals = this.allSignals.length;
		var activeAstros = 0;
		for (i = 0; i < this.numNeurons; i++) {
			if (this.allNeurons[i].astrocyte.availableEnergy > 0)
				activeAstros++;
		}
		this.numActiveAstrocytes = activeAstros;


	};

	NeuralNetwork.prototype.updateSettings = function() {

		this.excitorMaterial.opacity = this.neuronOpacity;
		this.excitorMaterial.color.setHex(this.excitorColor);
		this.excitorMaterial.size = this.neuronSize;

		this.inhibitorMaterial.color.setHex(this.inhibitorColor);


		this.shaderUniforms.color.value.set(this.axonColor);
		this.shaderUniforms.opacityMultiplier.value = this.axonOpacityMultiplier;

		this.particlePool.updateSettings();
	};

	// Main ------------------------------------------------------------------

	if (!Detector.webgl) {
		Detector.addGetWebGLMessage();
		document.getElementById('loading').style.display = 'none'; // hide loading animation when finish loading model
	}

	var container, stats;
	var scene, camera, cameraCtrl, renderer;

	// ---- scene
	container = document.getElementById('canvas-container');
	scene = new THREE.Scene();

	// ---- camera
	camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
	// camera orbit control
	cameraCtrl = new THREE.OrbitControls(camera, container);
	cameraCtrl.object.position.y = 150;
	cameraCtrl.update();

	// ---- renderer
	renderer = new THREE.WebGLRenderer({
		antialias: true,
		alpha: true
	});
	renderer.setSize(window.innerWidth, window.innerHeight);
	container.appendChild(renderer.domElement);

	// ---- stats
	stats = new Stats();
	container.appendChild(stats.domElement);

	// ---- scene settings
	var scene_settings = {
		pause: false,
		bgColor: 0x0d0d0f
	};

	var astrocyte_settings = {
		minEnergy: 0.0, // default min
		maxEnergy: 1.0, // default max
		fireEnergy: 0.125, // the amount that depletes on firing
		replenishEnergy: 0.05, // amount of energy astrocyte regenerates 
		regenerationTime: 20, // time needed for energy to regenerate in milliseconds
		//minThreshold: 0.125, // energy level at which the astrocyte starts regenerating energy
		minThreshold: 0.02, //
		maxThreshold: 0.08, //
		frequency: 100, // in milliseconds
		amplitude: 0.01 // increased by this amount
	};

	var network_settings = {
		firing_threshold: 0.50, // neuron fires when reaching this amount.
		signal_weight: 0.40, // energy of neuron increases by this amount per signal.
		AxonDistance: 10, //default
		//AxonDistanceInhibitor: 4, //default
		NeuronConnection: 6, //default
		//NeuronConnectionInhibitor: 20, //default
		decayTime: 5000, //time needed for neurons to decay

		reload: function() {
			window.clock = new Clock();
			window.neuralNet = new NeuralNetwork(window.clock);
		}, // reinitializes the network
	};

	// Neural Net
	var clock = window.clock = new Clock();
	var neuralNet = window.neuralNet = new NeuralNetwork();


	// ---------- GUI ----------

	var gui = new dat.GUI();
	gui.width = 425;

	var gui_info = gui.addFolder('Network information');
	gui_info.add(neuralNet, 'numNeurons').name('Neurons');
	gui_info.add(neuralNet, 'numNeurons').name('Energy Pools');
	gui_info.add(neuralNet, 'numAxons').name('Axons (connections)');
	gui_info.add(neuralNet, 'numSignals', 0, neuralNet.numAxons).name('Current action potentials');
	gui_info.add(neuralNet, 'numActiveAstrocytes', 0, neuralNet.numActiveAstrocytes).name('Viable energy pools');
	gui_info.add(astrocyte_settings, 'minEnergy').name('Min in energy pool');
	gui_info.add(astrocyte_settings, 'maxEnergy').name('Max in energy pool');
	gui_info.add(astrocyte_settings, 'fireEnergy').name('Min energy for firing');
	gui_info.autoListen = false;

	var gui_settings = gui.addFolder('Network settings');
	gui_settings.add(neuralNet, 'currentMaxSignals', 0, neuralNet.limitSignals).name('Max signals');
	gui_settings.add(network_settings, 'AxonDistance', 0, 20).name('Max axon distance');
	//gui_settings.add(network_settings, 'AxonDistanceInhibitor', 0, 20).name('Max Axon Distance Inhibitor');
	gui_settings.add(network_settings, 'NeuronConnection', 0, 20).name('Max neuron connections');
	//gui_settings.add(network_settings, 'NeuronConnectionInhibitor', 0, 20).name('Max Inhibitor Neuron Connections');
	gui_settings.add(neuralNet, 'signalMinSpeed', 0.01, 0.1, 0.01).name('Signal min speed');
	gui_settings.add(neuralNet, 'signalMaxSpeed', 0.01, 0.1, 0.01).name('Signal max speed');
	gui_settings.add(network_settings, 'reload'); 

	var gui_settings = gui.addFolder('Energy pool settings');
	//gui_settings.add(astrocyte_settings, 'minThreshold', 0, 1).name('Threshold for energy regeneration');
	gui_settings.add(astrocyte_settings, 'replenishEnergy', 0, 1).name('Replenish rate').listen();
	gui_settings.add(astrocyte_settings, 'regenerationTime', 0, 500).name('Regen. time (ms)');
	gui_settings.add(astrocyte_settings, 'minThreshold', 0, 1).name('Minimum threshold');
	gui_settings.add(astrocyte_settings, 'maxThreshold', 0, 1).name('Maximum threshold');
	gui_settings.add(astrocyte_settings, 'frequency', 0, 1000).name('Freq. of rate change');
	gui_settings.add(astrocyte_settings, 'amplitude', 0, 1).name('Amp. of rate change');

	// controller.onFinishChange(function(value){
	// 	//clearInterval(functionRegeneration);
	// 	window.neuralNet.regenerationFunction();
	// });

	var gui_settings = gui.addFolder('Activation function settings');
	gui_settings.add(network_settings, 'firing_threshold', 0, 1).name("Membrane pot. thresh.");
	gui_settings.add(network_settings, 'signal_weight', 0, 1).name("Signal weight");
	gui_settings.add(network_settings, 'decayTime', 0, 100000).name("Decay time in ms");

	var gui_settings = gui.addFolder('Visual settings');
	gui_settings.add(neuralNet.particlePool, 'pSize', 0.2, 2).name('Signal size');
	gui_settings.add(neuralNet, 'neuronSize', 0, 2).name('Neuron size');
	gui_settings.add(neuralNet, 'neuronOpacity', 0, 1.0).name('Neuron opacity');
	gui_settings.add(neuralNet, 'axonOpacityMultiplier', 0.0, 5.0).name('Axon opacity mult');
	gui_settings.addColor(neuralNet.particlePool, 'pColor').name('Signal color');
	gui_settings.addColor(neuralNet, 'excitorColor').name('Excitatory neuron color');
	gui_settings.addColor(neuralNet, 'inhibitorColor').name('Inhibitory neuron color');
	gui_settings.addColor(neuralNet, 'axonColor').name('Axon color');
	gui_settings.addColor(scene_settings, 'bgColor').name('Background');

	//gui_info.open();
	// a_settings.open();

	function updateNeuralNetworkSettings() {
		neuralNet.updateSettings();
	}

	for (var i in gui_settings.__controllers) {
		gui_settings.__controllers[i].onChange(updateNeuralNetworkSettings);
	}

	function updateGuiInfo() {
		for (var i in gui_info.__controllers) {
			gui_info.__controllers[i].updateDisplay();
		}
	}

	// ---------- end GUI ----------


	(function run() {


		requestAnimationFrame(run);
		renderer.setClearColor(scene_settings.bgColor, 1); // change to 0 for white background (looks bad)

		if (!scene_settings.pause) {
			clock.inc(1);
			neuralNet.update(clock.time());
			updateGuiInfo();

		}

		renderer.render(scene, camera);
		stats.update();

	})();


	window.addEventListener('keypress', function(event) {
		if (event.keyCode === 32) { // if spacebar is pressed
			event.preventDefault();
			scene_settings.pause = !scene_settings.pause;
		}
	});

	window.addEventListener('resize', function onWindowResize() {
		var w = window.innerWidth;
		var h = window.innerHeight;
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
		renderer.setSize(w, h);
	}, false);

}());
