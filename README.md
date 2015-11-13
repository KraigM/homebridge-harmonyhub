# homebridge-harmonyhub
[Homebridge](https://github.com/nfarina/homebridge) platform plugin for the [Logitech Harmony Hub](http://www.logitech.com/en-us/product/harmony-hub)

Currently, this plugin displays Activities as switches.  This way you can turn on the "Watch TV" activity by saying "Hey Siri, turn on Watch TV".  You can also configure HomeKit (using an app like Insteon+) to rename the Siri command for the "Watch TV" activity to something like "TV" and put it in the "Living Room" room, that way you can say "Hey Siri, turn on the Living Room TV" and Siri will start/switch to the "Watch TV" activity.

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-harmonyhub
3. Update your configuration file. See sample config.json snippet below. 

# Configuration

Configuration sample:

 ```
	"platforms": [
		{
			"platform": "LogitechHarmony",
			"name": "Living Room Harmony Hub"
		}
	]
```

Fields: 

* "platform": Must always be "HarmonyHub" (required)
* "name": Can be anything (required)
* "ip_address": IP Address of your harmony hub like "10.0.1.4" or "192.168.1.12" (optional, automatically discovered if not specified)

