Neural-Glial Network
==============

[Demo](http://edlab-www.cs.umass.edu/~tvachnad/Neural-Network/index.html)

[Paper](http://edlab-www.cs.umass.edu/~tvachnad/FinalProjectWrite-Up.pdf)

##Modifications during simulation

###Network Settings

- Max Signals - the maximum number of signals allowed to exist at once.
- Signal Min Speed/Max Speed - the speed of the signal.
- Max Axon Distance - the farthest allowed connection a neuron can have.
- Max Neuron Connections - the maximum number of connections a neuron can have.
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
- Neuron Size
- Neuron Opacity
- Axon Opacity Mult
- Signal Color
- Neuron Color
- Axon Color
- Background
