Neural-Glial Network
==============

[Demo](http://edlab-www.cs.umass.edu/~tvachnad/Neural-Network/index.html)

[Paper](http://edlab-www.cs.umass.edu/~tvachnad/FinalProjectWrite-Up.pdf)

An interactive 3D visualization of a neural network

Neurons:
- Neurons can either be excitory or inhibitory.
- Every 5th neuron that is initialized is inhibitory making it 20% of the whole network. Inhibitory neurons are shown as red dots while excitory neurons are shown as blue dots.

Axons:
- 66% of the connections between neurons are one directional while the remaining 33% are bi-directional, which are randomly chosen.
- connection weights are assigned depending on the connection length, the longer the connections are the smaller the weights. For the purpose of randomness a number between 0 and 20% of the weight is either added or subtracted from the weight. 
``` 
var rand = (Math.random()*41+80)/100;
connectedAxon.weight = rand * (1/connectedAxon.cpLength);
``` 

Signals:
- when a neuron receives a signal it's potential energy(this.acc) increases by an amount of the connection weight multiplied by the signal weight, which can be adjusted from the settings.
excitor build function:

``` 
this.acc = this.acc + (this.prevReleaseAxon.weight * network_settings.signal_weight);
```
inhibitor build function:

``` 
this.acc = this.acc - (this.prevReleaseAxon.weight * network_settings.signal_weight);
```
- Once the accumulated potential energy of the the neuron passes the minimum threshold, which can be adjusted from the settings, the neuron firing function is activated. The higher the potential energy is, the higher the chance for the neuron to fire.
firing function:

``` 
var rand = Math.random();
			if(rand < this.acc){
				this.fired = true;
				this.acc = this.acc - 0.125; // resets energy of neuron
				// decrease energy level of astrocyte responsible for 
				// giving the neuron the energy it needed to fire
				this.releaseDelay = THREE.Math.randInt(100, 1000);
				return true;
			}
			else{
				return false; // didn't fire
			}
``` 

##Modifications during simulation

###Network Settings

- Max Signals - the maximum number of signals allowed to exist at once.
- Max Axon Distance - the farthest allowed connection a neuron can have.
- Max Neuron Connections - the maximum number of connections a neuron can have.
- Signal Min Speed/Max Speed - the speed of the signal.
- reload - in order for "Max Axon Distance" and "Max Neuron Connections" to take effect the network has to be re-rendered. All the other attributes take effect in real time.

###Astrocyte Settings

All attributes take effect in real time
- replenish energy amount - the amount of energy regenerated per turn. 
- energy regeneration time in ms - the time needed to regenerate that amount of energy.
- Threshold for energy regeneration - threshold at which energy regeneration starts. // no longer needed because there is constant energy regeneration.
Energy regeneration function settings:
(the amount of energy replenished changes over time depending on the settings below, "replenish energy amount" is changed accordingly)
- Minimum Threshold - the amount replenished never goes below this threshold.
- Maximum Threshold - the amount replenished never goes above this threshold.
- frequency for change in energy in ms - frequency that the changes occur.
- Amplitude - the amount that "replenish energy amount" will be changed by.

###Activation Function Settings

When neuron is ready to fire it fires with a probability equal to its energy level at that time.
- Firing Threshold - when the energy level of the neuron reaches this threshold the neuron fires.
- Signal Weight - the amount of energy that is added to a neuron when it recieves a signal.
- Decay Time in ms - the amount of time it takes neurons to decay.


###Visual Settings

Changing any of the following attributes will have no affect on network functionality:
- Signal Size
- Neuron Size
- Neuron Opacity
- Axon Opacity Mult
- Signal Color
- Excitor Color
- Inhibitor Color
- Axon Color
- Background
