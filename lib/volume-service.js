/**
 * Created by kraig on 10/2/16.
 */

var inherit = require('./inherit');
var Promise = require('bluebird');
var HubCommands = require('./hub-commands');
var _ = require('lodash');

var Service, Characteristic;

const VolumeCommandGroupKey = "Volume";
const VolumeCommandKey = {
	Mute: "Mute",
	VolumeUp: "VolumeUp",
	VolumeDown: "VolumeDown"
};

module.exports = function(exportedTypes) {
	if (exportedTypes && !Service) {
		Service = exportedTypes.Service;
		Characteristic = exportedTypes.Characteristic;
		inherit.changeBase(VolumeService, Service.Speaker);
		VolumeService.UUID = Service.Speaker.UUID;
	}
	return VolumeService;
};

/**
 * Volume Service
 * @param activity
 * @constructor
 */
var VolumeService = function(name, subType, log) {
	Service.Speaker.call(this, name, subType);
	this.setCharacteristic(Characteristic.Name, name);
	
	var self = this;
	self.controlGroup = null;
	self.log = log;

	self.getCharacteristic(Characteristic.Mute)
		.on('set', function(val, cb) {
			self._executeCommandAsync(VolumeCommandKey.Mute)
				.asCallback(cb);
		});

	self.getCharacteristic(Characteristic.Volume)
		.on('set', function(val, cb) {
			self.setVolumeAsync(val)
				.asCallback(cb);
		});

	self._resetVolume();
};
module.exports.VolumeService = VolumeService;

VolumeService.isInstance = function(service){
	return ((service instanceof VolumeService) || (VolumeService.UUID === service.UUID)) &&
		(service.subtype != null);
};

VolumeService.prototype.setVolumeAsync = function(newVal) {
	var diff = newVal - this.lastVal;
	if (diff < 1 && diff > -1) return Promise.resolve();
	this.lastVal = newVal;
	var isUp = diff >= 0;
	diff = Math.abs(diff);

	// Attempt to handle receivers / sound bars that auto increase the volume change rate the longer you hold the button
	var duration = diff > 5 ? 100 + (Math.sqrt(diff) * 200) : null;

	var key = isUp ? VolumeCommandKey.VolumeUp : VolumeCommandKey.VolumeDown;
	this.log("Changing volume " + (isUp ? '+' : '-') + diff + ' (' + (duration ? (duration / 1000) + 's' : 'Single Press') + ')');

	var task = this._executeCommandAsync(key, duration);

	// Since Harmony doesn't know the volume level of the device, we need to reset the volume back to 50% so the user can continue to increase/decrease the volume
	this.resetVolume();

	return task;
};

VolumeService.prototype.resetVolume = _.debounce(function () {
	this.log.info('Resetting volume');
	this._resetVolume();
}, 5000);

VolumeService.prototype._resetVolume = function (resetValue) {
	var volCh = this.getCharacteristic(Characteristic.Volume);
	var midLevel = resetValue || ((volCh.props.maxValue - volCh.props.minValue) / 2) || 50;
	this.lastVal = midLevel;
	volCh.setValue(midLevel);
};

VolumeService.prototype._executeCommandAsync = function(key, duration) {
	var self = this;
	return valueOrFuncReturn(self.connection).invokeAsync(function(client) {
		var controlGroup = valueOrFuncReturn(self.controlGroup);
		if (!controlGroup) {
			self.log.warn('Ignoring volume command because no command is currently available (e.g. all activities may be off)');
			return Promise.resolve();
		}
		return HubCommands.executeCommandAsync(client, controlGroup, key, VolumeCommandGroupKey, duration);
	});
};

var valueOrFuncReturn = function(val) {
	if (typeof val === "function") {
		return val();
	}
	return val;
};
