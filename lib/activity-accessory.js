/**
 * Created by kraig on 3/20/16.
 */

var util = require('util');
var HubAccessoryBase = require('./hub-accessory-base').HubAccessoryBase;

var Service, Characteristic;

module.exports = function(exportedTypes) {
	if (exportedTypes && !Service) {
		Service = exportedTypes.Service;
		Characteristic = exportedTypes.Characteristic;
	}
	return Activity;
};

function Activity(accessory, log, details, changeCurrentActivity, connection) {
	this.id = details.id;
	this.isOn = false;
	this.changeCurrentActivity = changeCurrentActivity;
	HubAccessoryBase.call(this, accessory, connection, 'activity', null, log);
	var self = this;

	this.accessory.getService(Service.AccessoryInformation)
		// TODO: Add hub unique id to this for people with multiple hubs so that it is really a guid.
		.setCharacteristic(Characteristic.SerialNumber, this.id);

	this.accessory.addService(Service.Switch)
		.getCharacteristic(Characteristic.On)
		.on('get', function (callback) {
			// Refreshed automatically by platform
			callback(null, self.isOn);
		})
		.on('set', this.setPowerState.bind(this));
}
util.inherits(Activity, HubAccessoryBase);


Activity.prototype.updateActivityState = function (currentActivity) {
	this.isOn = (currentActivity === this.id);
	// Force get to trigger 'change' if needed
	this.accessory.getService(Service.Switch)
		.getCharacteristic(Characteristic.On)
		.getValue();
};

Activity.prototype.setPowerState = function (state, callback) {
	this.changeCurrentActivity(state ? this.id : null, callback);
};
