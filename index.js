var Service, Characteristic, Accessory, uuid;

module.exports = function (homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	Accessory = homebridge.hap.Accessory;
	uuid = homebridge.hap.uuid;

	var acc = LogitechHarmonyActivityAccessory.prototype;
	inherits(LogitechHarmonyActivityAccessory, Accessory);
	LogitechHarmonyActivityAccessory.prototype.parent = Accessory.prototype;
	for (var mn in acc) {
		LogitechHarmonyActivityAccessory.prototype[mn] = acc[mn];
	}

	homebridge.registerPlatform("homebridge-harmonyhub", "HarmonyHub", LogitechHarmonyPlatform);
};
