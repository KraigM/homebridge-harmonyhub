/**
 * Base class for all accessories in this plugin
 * Created by kraig on 3/20/16.
 */

var inherit = require('./inherit');

var Accessory, Service, Characteristic, uuid;

module.exports = function(exportedTypes) {
	if (exportedTypes && !Accessory) {
		Accessory = exportedTypes.Accessory;
		Service = exportedTypes.Service;
		Characteristic = exportedTypes.Characteristic;
		uuid = exportedTypes.uuid;

		inherit.changeAccessoryBase(AccessoryBase, Accessory);
	}
	return AccessoryBase;
};

function AccessoryBase(idKey, name, log) {
	this.log = log;
	this.name = name;
	var id = uuid.generate(idKey);
	Accessory.call(this, this.name, id);
	this.uuid_base = id;

	this.getService(Service.AccessoryInformation)
		.setCharacteristic(Characteristic.Manufacturer, "Logitech")
		.setCharacteristic(Characteristic.Model, "Harmony");
}

AccessoryBase.prototype.getServices = function () {
	return this.services;
};
