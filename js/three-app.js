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

		this.xPos = x;
		this.yPos = y;
		this.zPos = z;

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

	Neuron.prototype.tryConnect = function(neuronB, network){

		var n1 = this;
		var n2 = neuronB;
		var r1 = parseInt(n1.region);
		var r2 = parseInt(n2.region);
		var randomForMatrix = (Math.random());
		var canConnect = false;


		var probFromMatrix = network.connectivityMatrix[r1-1][r2];
        probFromMatrix = Number(probFromMatrix);
        probFromMatrix = probFromMatrix / 10000;

        if(randomForMatrix < probFromMatrix || r1 === r2){
        	canConnect = true;
        }

		// else if (n1 !== n2 && n1.distanceTo(n2) < network.maxAxonDist &&
		// 	n1.connection.length < network.maxConnectionPerNeuron &&
		// 	n2.connection.length < network.maxConnectionPerNeuron ){

		// 	canConnect = true;
		// }

		if (canConnect)
		{
			var rand = Math.floor( Math.random() * 3 );

			//one directional connection starting from n1
			if(rand === 0){
			var connectedAxon = n1.connectNeuronTwoDirection(n2);
			}

		 	//one directional connection starting from n2
			else if(rand === 1){
				var connectedAxon = n2.connectNeuronOneDirection(n1);
			}

			//two directional connection
			else {
				var connectedAxon = n1.connectNeuronOneDirection(n2);
			}
			network.constructAxonArrayBuffer(connectedAxon);
			var rand = (Math.random()*41+80)/100;
			connectedAxon.weight = rand * (1/connectedAxon.cpLength);

		}
	}

	Neuron.prototype.createSignal = function(particlePool, minSpeed, maxSpeed) {

		this.firedCount += 1;
		this.receivedSignal = false;

		var signals = [];
		// create signal to all connected axons
		return this.connection.filter(function(connection)
			{
				return connection.axon !== this.prevReleaseAxon;
			}, this)
			.map(connection, function()
			{
				return new Signal(connection, particlePool, minSpeed, maxSpeed);
			})
	};


	//returns active astrocyte, it's taking energy from
	Neuron.prototype.canFire = function(neighbors) {
		neighbors = typeof neighbors !== 'undefined' ? neighbors : true;
		if (this.acc >= network_settings.firing_threshold) {
			var total = this.neurons.length;
			//console.log(" i"+this.neurons.length);
			var activeAstrocyte = null;
			// see if the astrocyte directly linked to this neuron has the energy needed to fire
			if (this.astrocyte.availableEnergy > astrocyte_settings.minEnergy) {
				return this.astrocyte;
			}

			// if we get here, the directly linked astrocyte did not have enough energy
			// check the astrocytes of surrounding neurons to see if they have enough energy
			if (neighbors) 
				for (var i = 0; i < total; i++) {
					if (astrocyte = this.neurons[i].canFire(False))
						return astrocyte
				}
		}
		return null;

	};


	//accumulation function when recieving a signal from an excitory neuron
	Neuron.prototype.buildExcitor = function() {
		this.acc = this.acc + (this.prevReleaseAxon.weight * network_settings.signal_weight);
		if (this.acc > 1)
			this.acc = 1; // each signal adds 1/6 * axon weight.
		//console.log(this.acc);
	};

	//accumulation function when recieving a signal from an inhibitory neuron
	Neuron.prototype.buildInhibitor = function() {
		this.acc = this.acc - (this.prevReleaseAxon.weight * network_settings.signal_weight);
		if (this.acc < 1)
			this.acc = 0; // each signal adds 1/6 * axon weight.
		//console.log(this.acc);
	};

	//neuron firing function with probability of firing equal to the energy level
	Neuron.prototype.fire = function() {
		var rand = Math.random();
		if (rand < this.acc) {
			this.fired = true;
			this.acc = this.acc - 0.125; // resets energy of neuron
			// decrease energy level of astrocyte responsible for 
			// giving the neuron the energy it needed to fire
			this.releaseDelay = THREE.Math.randInt(100, 1000);
			return true;
		} else {
			return false; // didn't fire
		}

	};

	// Astrocyte -------------------------------------------------------------
	function Astrocyte() {
		// replaces the if firedCount < 8
		this.availableEnergy = astrocyte_settings.maxEnergy;
		// currently this value is not being used but it allows room for future expansion
		this.lastUsed = 0;
	}

	// TODO: Get rid of this because we should never have a situation where the astrocyte energy is hard-reset, right?...
	// Astrocytes should just regenerate energy at a constant rate and neurons pull from it if it's there and they need it...
	Astrocyte.prototype.resetEnergy = function() {
		//this.availableEnergy = THREE.Math.randInt(astrocyte_settings.minEnergy, astrocyte_settings.maxEnergy);
		if (this.availableEnergy + astrocyte_settings.replenishEnergy > astrocyte_settings.maxEnergy)
			this.availableEnergy = astrocyte_settings.maxEnergy;
		else
			this.availableEnergy += astrocyte_settings.replenishEnergy;
		//console.log("reset: "+ this.availableEnergy);

	};

	//depletes energy from the astrocyte when the neuron fires
	Astrocyte.prototype.deplete = function() {
		this.availableEnergy -= 0.125; //energy needed to fire a signal default: 1/8
		if (this.availableEnergy <= astrocyte_settings.maxEnergy) { // if energy not full, then regenerate more
			// make it take 5 iterations to be ready again
			this.lastUsed = 100;
			this.replenish();
		}
	};

	//regenerates energy of the astrocyte in a certain time period that can be set in the settings
	Astrocyte.prototype.replenish = function() {
		var that = this;
		setInterval(function() {
			that.resetEnergy();
		}, astrocyte_settings.regenerationTime);
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

	Signal.prototype.travel = function() {

		var pos;
		var temp = this.axon.getPoint(this.t);
		// console.log("direction of axon = "+this.axon.direction + "starting point = "+this.startingPoint);
		// if (this.startingPoint === 'A' && (this.axon.direction === 0 || this.axon.direction === 2)) {
		if (this.startingPoint === 'A') {
			this.t += this.speed;
			if (this.t >= 1) {
				this.t = 1;
				this.alive = false;
				this.axon.neuronB.receivedSignal = true;
				this.axon.neuronB.signalCount++;
				this.axon.neuronB.prevReleaseAxon = this.axon;
				//checks what type of neuron sent the signal to call the correct build function
				if (this.axon.neuronA.type == EXCITOR)
					this.axon.neuronB.buildExcitor();
				else if (this.axon.neuronA.type == INHIBITOR) {
					//console.log("firer = "+this.axon.neuronA.type+" reciever = "+this.axon.neuronB.type);
					//console.log("energy before = "+this.axon.neuronB.acc);
					this.axon.neuronB.buildInhibitor();
					//console.log("energy after = "+this.axon.neuronB.acc);
				}
			}
			//console.log("fired signal = "+this.startingPoint);

		} //else if (this.startingPoint === 'B' && (this.axon.direction === 1 || this.axon.direction === 2)) {
		else if (this.startingPoint === 'B') {
			this.t -= this.speed;
			if (this.t <= 0) {
				this.t = 0;
				this.alive = false;
				this.axon.neuronA.receivedSignal = true;
				this.axon.neuronA.signalCount++;
				this.axon.neuronA.prevReleaseAxon = this.axon;
				if (this.axon.neuronB.type == EXCITOR)
					this.axon.neuronA.buildExcitor();
				else if (this.axon.neuronB.type == INHIBITOR)
					this.axon.neuronA.buildInhibitor();
			}
			//console.log("fired signal = "+this.startingPoint);
		}

		pos = this.axon.getPoint(this.t);
		this.particle.set(pos.x, pos.y, pos.z);
		// if (pos === temp)
		// 	this.alive = false;


		// pos = this.axon.getPointAt(this.t);	// uniform point distribution but slower calculation


	};

	// Particle Pool ---------------------------------------------------------

	function ParticlePool(poolSize) {

		this.spriteTextureSignal = THREE.ImageUtils.loadTexture("sprites/electric.png");

		this.poolSize = poolSize;
		this.pGeom = new THREE.Geometry();
		this.particles = this.pGeom.vertices;

		this.offScreenPos = new THREE.Vector3(9999, 9999, 9999); // #CM0A r68 PointCloud default frustumCull = true(extended from Object3D), so need to set to 'false' for this to work with oppScreenPos, else particles will dissappear

		this.pColor = 0xff4400;
		this.pSize = 0.6;

		for (var ii = 0; ii < this.poolSize; ii++) {
			this.particles[ii] = new Particle(this);
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

		for (var ii = 0; ii < this.poolSize; ii++) {
			var p = this.particles[ii];
			if (p.available) {
				p.available = false;
				return p;
			}
		}
		return null;

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
		this.available = true;
		THREE.Vector3.call(this, particlePool.offScreenPos.x, particlePool.offScreenPos.y, particlePool.offScreenPos.z);

	}

	Particle.prototype = Object.create(THREE.Vector3.prototype);

	Particle.prototype.free = function() {

		this.available = true;
		this.set(this.particlePool.offScreenPos.x, this.particlePool.offScreenPos.y, this.particlePool.offScreenPos.z);

	};

	// Axon ------------------------------------------------------------------

	function Axon(neuronA, neuronB) {

		this.weight = 1;

		this.bezierSubdivision = 8;
		this.neuronA = neuronA;
		this.neuronB = neuronB;
		this.cpLength = neuronA.distanceTo(neuronB) / THREE.Math.randFloat(1.5, 4.0);
		this.controlPointA = this.getControlPoint(neuronA, neuronB);
		this.controlPointB = this.getControlPoint(neuronB, neuronA);
		THREE.CubicBezierCurve3.call(this, this.neuronA, this.controlPointA, this.controlPointB, this.neuronB);

		this.geom = new THREE.Geometry();
		this.geom.vertices = this.calculateVertices();

	}

	Axon.prototype = Object.create(THREE.CubicBezierCurve3.prototype);

	Axon.prototype.calculateVertices = function() {
		return this.getSpacedPoints(this.bezierSubdivision);
	};

	// generate uniformly distribute vector within x-theta cone from arbitrary vector v1, v2
	Axon.prototype.getControlPoint = function(v1, v2) {

		var dirVec = new THREE.Vector3().copy(v2).sub(v1).normalize();
		var northPole = new THREE.Vector3(0, 0, 1); // this is original axis where point get sampled
		var axis = new THREE.Vector3().crossVectors(northPole, dirVec).normalize(); // get axis of rotation from original axis to dirVec
		var axisTheta = dirVec.angleTo(northPole); // get angle
		var rotMat = new THREE.Matrix4().makeRotationAxis(axis, axisTheta); // buildExcitor rotation matrix

		var minz = Math.cos(THREE.Math.degToRad(45)); // cone spread in degrees
		var z = THREE.Math.randFloat(minz, 1);
		var theta = THREE.Math.randFloat(0, Math.PI * 2);
		var r = Math.sqrt(1 - z * z);
		var cpPos = new THREE.Vector3(r * Math.cos(theta), r * Math.sin(theta), z);
		cpPos.multiplyScalar(this.cpLength); // length of cpPoint
		cpPos.applyMatrix4(rotMat); // rotate to dirVec
		cpPos.add(v1); // translate to v1
		return cpPos;

	};

	// Connection ------------------------------------------------------------
	function Connection(axon, startingPoint) {
		this.axon = axon;
		this.startingPoint = startingPoint;


	}

	// Neural Network --------------------------------------------------------

	function NeuralNetwork() {

		this.initialized = false;

		// settings
		this.verticesSkipStep = 1; //2
		this.maxAxonDist = network_settings.AxonDistance; //default 8
		//this.maxAxonDist = network_settings.AxonDistanceInhibitor; //default 4
		this.maxConnectionPerNeuron = network_settings.NeuronConnection; //default 6
		//this.maxConnectionPerNeuronInhibitor = network_settings.NeuronConnectionInhibitor; //default 20

		this.firing_threshold = network_settings.firing_threshold; // threshold to fire signal (not used yet)

		this.currentMaxSignals = 8000;
		this.limitSignals = 12000;
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
		this.spriteTextureNeuron = THREE.ImageUtils.loadTexture("sprites/electric.png");
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

		//connectivity matrix between different regions
		this.connectivityMatrix =[];

		// initialize NN
		this.initNeuralNetwork();


	}

	//function for astrocyte energy regeneration
	//TODO: somewhat messy needs tiding up
	NeuralNetwork.prototype.regenerationFunction = function() {
		var increasing;
		if (astrocyte_settings.replenishEnergy >= astrocyte_settings.minThreshold)
			increasing = true;
		else
			increasing = false;
		var increase = function() {
			if (astrocyte_settings.replenishEnergy + astrocyte_settings.amplitude > astrocyte_settings.maxThreshold) {
				increasing = false;
				decrease();
			} else
				astrocyte_settings.replenishEnergy += astrocyte_settings.amplitude;
		};
		var decrease = function() {
			if (astrocyte_settings.replenishEnergy - astrocyte_settings.amplitude < astrocyte_settings.minThreshold) {
				increasing = true;
				increase();
			} else
				astrocyte_settings.replenishEnergy -= astrocyte_settings.amplitude;
		};
		var regeneration = function() {

				setTimeout(function() {
					if (increasing)
						increase();
					else if (!increasing)
						decrease();
					regeneration();
					//console.log(astrocyte_settings.replenishEnergy);
				}, astrocyte_settings.frequency);

			}
			//console.log("regeneration");
		regeneration();

	};

	//takes away potential firing energy of a neuron if it hasn't recieved any signals for some time
	NeuralNetwork.prototype.decayFunction = function() {
		var that = this;

		var decay = function() {
			setTimeout(function() {
				for (var i = 0; i < that.allNeurons.length; i++) {
					var n = that.allNeurons[i];
					//console.log(n.acc);
					n.acc = 0.9 * n.acc;
					if (n.acc < 0)
						n.acc = 0;
					//console.log("after"+ n.acc);
				}
				//console.log("finish loop");
				decay();
			}, network_settings.decayTime);
			//console.log("after loop");
		};

		//console.log("again");
		decay();

	};

	NeuralNetwork.prototype.initNeuralNetwork = function() {

		// obj loader
		var self = this;
		var loadedMesh, loadedMeshVertices;
		var loader = new THREE.OBJLoader();

		//load connectivity matrix
		d3.csv("models/connectivity.csv", function(data) {

  		for(var q = 0;q<188;q++){
  			self.connectivityMatrix[q]=data[q];
  		}
  		// console.log(data);
  		// console.log(self.connectivityMatrix);

		loader.load('models/brain_vertex_low.obj', function constructNeuralNetwork(loadedObject) {

			loadedMesh = loadedObject.children[0];
			loadedMeshVertices = loadedMesh.geometry.vertices;

			// render loadedMesh
			loadedMesh.material = new THREE.MeshBasicMaterial({
				transparent: true,
				opacity: 0.05,
				depthTest: false,
				color: 0x0088ff,
				blending: THREE.AdditiveBlending
			});
			scene.add(loadedObject);

			self.initNeurons(loadedMeshVertices);
			self.initAxons();

			self.initialized = true;

			console.log('Neural Network initialized');
			document.getElementById('loading').style.display = 'none'; // hide loading animation when finish loading model
			self.regenerationFunction();
			self.decayFunction();

		}); // end of loader1

		});

	};

	NeuralNetwork.prototype.printRegions = function(){
		for(var i = 0; i<this.allNeurons.length; i++){
			var n = this.allNeurons[i];
			console.log("neuron # "+i+" region: "+n.region+"position: "+n.xPos+" "+n.yPos+" "+n.zPos);
		}
	};

	NeuralNetwork.prototype.initNeurons = function(inputVertices) {
		console.log("init Neurons");

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
			n.astrocyte.resetEnergy(); // modify this, should be a rand int between max and min
			this.allNeurons.push(n);
			if (n.type == EXCITOR)
				this.excitorsGeom.vertices.push(n);
			else if (n.type == INHIBITOR)
				this.inhibitorsGeom.vertices.push(n);
		}
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
					
					n1.tryConnect(n2, this);
				}
			}

			// *** attirbute size must bigger than its content ***
			var axonIndices = new Uint32Array(this.axonIndices.length);
			var axonPositions = new Float32Array(this.axonPositions.length);
			var axonOpacities = new Float32Array(this.shaderAttributes.opacityAttr.value.length);

			// transfer temp-array to arrayBuffer
			transferToArrayBuffer(this.axonIndices, axonIndices);
			transferToArrayBuffer(this.axonPositions, axonPositions);
			transferToArrayBuffer(this.shaderAttributes.opacityAttr.value, axonOpacities);

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

	NeuralNetwork.prototype.update = function() {

		if (!this.initialized) return;


		var n, ii;
		var currentTime = Date.now();

		// update neurons state and release signal
		for (ii = 0; ii < this.allNeurons.length; ii++) {

			n = this.allNeurons[ii];
			if (this.allSignals.length < this.currentMaxSignals - this.maxConnectionPerNeuron) { // currentMaxSignals - maxConnectionPerNeuron because allSignals can not bigger than particlePool size
				// the astrocyte we're taking energy from
				var a = n.canFire();
				if (n.receivedSignal && a != null) { // Astrocyte mode
					// if (n.receivedSignal && n.firedCount < 8)  {	// Traversal mode
					// if (n.receivedSignal && (currentTime - n.lastSignalRelease > n.releaseDelay) && n.firedCount < 8)  {	// Random mode
					// if (n.receivedSignal && !n.fired )  {	// Single propagation mode

					// n.fired = true;
					// n.acc = n.acc - 0.125; // resets energy of neuron
					// // decrease energy level of astrocyte responsible for 
					// // giving the neuron the energy it needed to fire
					// a.deplete();

					// n.lastSignalRelease = currentTime;
					// n.releaseDelay = THREE.Math.randInt(100, 1000);
					if (n.fire() === true) {
						a.deplete();
						n.lastSignalRelease = currentTime;
						this.releaseSignalAt(n);
					}
				}

			}

			n.receivedSignal = false; // if neuron received signal but still in delay reset it
			//TODO
			// while we're iterating through the neurons, check each corresponding astrocyte to see if
			// its energy was all used up, update time remaining until it gets its energy back, possibly
			// give it its energy back if it's been long enough
			// if(n.astrocyte.availableEnergy<=astrocyte_settings.minEnergy)
			// n.astrocyte.replenish();
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
			var averagesignals = allsignals / this.allNeurons.length;
			console.log("averagesignals: " + averagesignals);

			for (ii = 0; ii < this.allNeurons.length; ii++) { // reset all neuron state
				n = this.allNeurons[ii];
				n.releaseDelay = 0;
				n.fired = false;
				n.receivedSignal = false;
				n.firedCount = 0;
				// reset all astrocytes
				// TODO: in the future this should be adjustable and occur constantly,
				// not just when the signal dies.
				n.astrocyte.resetEnergy();
			}
			console.log("New signal released");
			this.releaseSignalAt(this.allNeurons[THREE.Math.randInt(0, this.allNeurons.length)]);

		}

		// update and remove signals
		for (var j = this.allSignals.length - 1; j >= 0; j--) {
			var s = this.allSignals[j];
			s.travel();

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
		alpha: false
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
		minEnergy: 0, // default min
		maxEnergy: 1, // default max
		replenishEnergy: 0.5, // amount of energy astrocyte regenerates 
		regenerationTime: 20000, // time needed for energy to regenerate in milliseconds
		//minThreshold: 0.125, // energy level at which the astrocyte starts regenerating energy
		minThreshold: 0.2, //
		maxThreshold: 0.8, //
		frequency: 1000, // in milliseconds
		amplitude: 0.1 // increased by this amount
	};

	var network_settings = {
		firing_threshold: 0.5, // neuron fires when reaching this amount.
		signal_weight: 0.167, // energy of neuron increases by this amount per signal.
		AxonDistance: 8, //default
		//AxonDistanceInhibitor: 4, //default
		NeuronConnection: 6, //default
		//NeuronConnectionInhibitor: 20, //default
		decayTime: 5000, //time needed for neurons to decay

		reload: function() {
			window.neuralNet = new NeuralNetwork();
		}, // reinitializes the network
	};

	// Neural Net
	var neuralNet = window.neuralNet = new NeuralNetwork();


	// ---------- GUI ----------

	var gui = new dat.GUI();
	gui.width = 400;

	var gui_info = gui.addFolder('Info');
	gui_info.add(neuralNet, 'numNeurons').name('Neurons');
	gui_info.add(neuralNet, 'numNeurons').name('Astrocytes');
	gui_info.add(neuralNet, 'numAxons').name('Axons');
	gui_info.add(neuralNet, 'numSignals', 0, neuralNet.limitSignals).name('Signals');
	gui_info.add(neuralNet, 'numActiveAstrocytes', 0, neuralNet.numActiveAstrocytes).name('Active Astrocytes');
	gui_info.add(astrocyte_settings, 'minEnergy').name('Min energy');
	gui_info.add(astrocyte_settings, 'maxEnergy').name('Max energy');
	gui_info.autoListen = false;

	var gui_settings = gui.addFolder('Network Settings');
	gui_settings.add(neuralNet, 'currentMaxSignals', 0, neuralNet.limitSignals).name('Max Signals');
	gui_settings.add(network_settings, 'AxonDistance', 0, 20).name('Max Axon Distance Excitor');
	//gui_settings.add(network_settings, 'AxonDistanceInhibitor', 0, 20).name('Max Axon Distance Inhibitor');
	gui_settings.add(network_settings, 'NeuronConnection', 0, 20).name('Max Neuron Connections');
	//gui_settings.add(network_settings, 'NeuronConnectionInhibitor', 0, 20).name('Max Inhibitor Neuron Connections');
	gui_settings.add(neuralNet, 'signalMinSpeed', 0.01, 0.1, 0.01).name('Signal Min Speed');
	gui_settings.add(neuralNet, 'signalMaxSpeed', 0.01, 0.1, 0.01).name('Signal Max Speed');
	gui_settings.add(network_settings, 'reload');
	gui_settings.open();

	var gui_settings = gui.addFolder('Astrocyte Settings');
	//gui_settings.add(astrocyte_settings, 'minThreshold', 0, 1).name('Threshold for energy regeneration');
	gui_settings.add(astrocyte_settings, 'replenishEnergy', 0, 1).name('Replenish energy amount').listen();
	gui_settings.add(astrocyte_settings, 'regenerationTime', 0, 100000).name('Energy regeneration time in ms');
	gui_settings.add(astrocyte_settings, 'minThreshold', 0, 1).name('Minimum Threshold');
	gui_settings.add(astrocyte_settings, 'maxThreshold', 0, 1).name('Maximum Threshold');
	gui_settings.add(astrocyte_settings, 'frequency', 0, 20000).name('frequency for change in energy in ms');
	gui_settings.add(astrocyte_settings, 'amplitude', 0, 1).name('Amplitude');
	gui_settings.open();

	// controller.onFinishChange(function(value){
	// 	//clearInterval(functionRegeneration);
	// 	window.neuralNet.regenerationFunction();
	// });

	var gui_settings = gui.addFolder('Activation Function Settings');
	gui_settings.add(network_settings, 'firing_threshold', 0, 1).name("Firing Threshold");
	gui_settings.add(network_settings, 'signal_weight', 0, 1).name("Signal Weight");
	gui_settings.add(network_settings, 'decayTime', 0, 100000).name("Decay Time in ms");

	var gui_settings = gui.addFolder('Visual Settings');
	gui_settings.add(neuralNet.particlePool, 'pSize', 0.2, 2).name('Signal Size');
	gui_settings.add(neuralNet, 'neuronSize', 0, 2).name('Neuron Size');
	gui_settings.add(neuralNet, 'neuronOpacity', 0, 1.0).name('Neuron Opacity');
	gui_settings.add(neuralNet, 'axonOpacityMultiplier', 0.0, 5.0).name('Axon Opacity Mult');
	gui_settings.addColor(neuralNet.particlePool, 'pColor').name('Signal Color');
	gui_settings.addColor(neuralNet, 'excitorColor').name('Excitor Color');
	gui_settings.addColor(neuralNet, 'inhibitorColor').name('Inhibitor Color');
	gui_settings.addColor(neuralNet, 'axonColor').name('Axon Color');
	gui_settings.addColor(scene_settings, 'bgColor').name('Background');

	gui_info.open();
	// a_settings.open();
	gui_settings.open();

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
		renderer.setClearColor(scene_settings.bgColor, 1);

		if (!scene_settings.pause) {

			neuralNet.update();
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
