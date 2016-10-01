# homebridge-harmonyhub
[Logitech Harmony Hub](http://www.logitech.com/en-us/product/harmony-hub) plugin for [Homebridge](https://github.com/nfarina/homebridge)

Currently, this plugin displays Activities as switches.  This way you can turn on the "Watch TV" activity by saying "Hey Siri, turn on Watch TV".  You can also configure HomeKit (using an app like Insteon+) to rename the Siri command for the "Watch TV" activity to something like "TV" and put it in the "Living Room" room, that way you can say "Hey Siri, turn on the Living Room TV" and Siri will start/switch to the "Watch TV" activity.

# Important 0.2.x changes

In version 0.2.x, the plugin was drastically changed to allow much better connectivity handling, faster response, 
simplified integration, and true multi-hub support including auto adding newly discovered hubs.  

As part of this, how your activities show up in HomeKit are very different.  Each hub will now properly show up as a single
device in HomeKit instead of a device for each activity.  That device (accessory) for the hub will contain a switch for each activity 
on that hub.  Just like before, turning on any activity on that hub will turn off all the others and just switching off the current activity 
is equivalent to pressing the off button on the Harmony remote.  This will drastically clean up a HomeKit for most people and makes 
it easier to determine which activity goes with which hub (if you have multiple).

Since multi-hub support is built right into the platform (as of this release), users who used the work around of adding 
the platform multiple times (with different IP address's specified) should just remove the IP addresses and go back to 
just one platform in your homebridge config.

In order to fix many connectivity issues, give faster responses, and add auto discovery, the discovery/connection systems 
wer greatly altered and integrated with one another.  Given this, plus the fact that multi-hub support is built right into 
the platform, the ability to hard code the IP address of the hub in the config has been removed (for now).  Eventually, we 
will likely reintegrate that feature in some way, but we will likely work on better, alternative solutions to unique cases 
as hard coding IP addresses is not a good long term solution.  If you have one of these unique cases, feel free to write 
up an issue in GitHub or (preferably) submit a pull request with a better solution to your case.

**Warning**: when updating from 0.1.x to 0.2.x will remove any all HarmonyHub devices/activities/settings from HomeKit, replacing 
them with the new setup.  This will _NOT_ effect your Harmony Hubs themselves. This will _NOT_ effect any other HomeKit/HomeBridge 
devices/settings/etc.  The only real change is that any customizations you did to the old HarmonyHub HomeKit devices will be 
reset; things like renaming an activity in HomeKit (which can effect Siri), adding an activity to a room/scene, etc will be reset. 
All this means is that you will need to go back and redo anything customizations (reorganizing, renaming for Siri, etc) you did to 
HarmonyHub devices in HomeKit.

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-harmonyhub
3. Update your configuration file. See sample config.json snippet below. 

# Configuration

Configuration sample:

 ```
	"platforms": [
		{
			"platform": "HarmonyHub",
			"name": "Harmony Hub"
		}
	]
```

Fields: 

* "platform": Must always be "HarmonyHub" (required)
* "name": Can be anything (used in logs)
