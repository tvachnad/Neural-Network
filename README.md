Neural-Glial Network
==============

[Demo](http://edlab-www.cs.umass.edu/~tvachnad/Neural-Network/index.html)

[Paper](http://edlab-www.cs.umass.edu/~tvachnad/FinalProjectWrite-Up.pdf)

##Modifications during simulation

###Astrocyte Settings

The amount of energy that is regenerated per turn can be changed by adjusting "replenish energy amount" setting. The time needed to regenerate that amount can be adjusted by modifying "energy regeneration time in ms".

###Network Settings

Signal properties can be adjusted. The maximum number of signals allowed to exist at once can be modified by changing "Max Signals" attribute. The speed of the signals can be changed from "Signal Min Speed", "Signal Max Speed".

"Max Axon Distance" represents the farthest allowed connection distance between two neurons. "Max Neuron Connections" represents the maximum number of connection a neuron can have. After changing these two attributes, the "reload" button has to be pressed in orded for them to take affect. This changes the whole structure of the brain.

Currently, all attributes take effect in real time except "Max Neuron Connections" and "Max Axon Distance".

###Non-functional changes

Changing any of the following attributes will have no affect on network functionality:
- Neuron Size
- Neuron Opacity
- Axon Opacity Mult
- Signal Color
- Neuron Color
- Axon Color
- Background
