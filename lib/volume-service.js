/**
 * Created by kraig on 10/2/16.
 */

var util = require('util');
var inherit = require('./inherit');
var Promise = require('bluebird');
var queue = require('queue');
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
	var key = isUp ? VolumeCommandKey.VolumeUp : VolumeCommandKey.VolumeDown;
	this.log("Changing volume " + (isUp ? '+' : '') + diff);
	var self = this;

	var task = this._executeCommandAsync(key);

	if (this._volumeResetTimerId) {
		clearTimeout(this._volumeResetTimerId);
		this._volumeResetTimerId = null;
	}
	this._volumeResetTimerId = setTimeout(function() {
		self._volumeResetTimerId = null;
		self.log.info('Resetting volume');
		self._resetVolume();
	}, 10000);

	return task;
};

VolumeService.prototype._resetVolume = function (resetValue) {
	var volCh = this.getCharacteristic(Characteristic.Volume);
	var midLevel = resetValue || ((volCh.props.maxValue - volCh.props.minValue) / 2) || 50;
	this.lastVal = midLevel;
	volCh.setValue(midLevel);
};

VolumeService.prototype._executeCommandAsync = function(key) {
	var self = this;
	return valueOrFuncReturn(self.connection).invokeAsync(function(client) {
		var controlGroup = valueOrFuncReturn(self.controlGroup);
		return HubCommands.executeCommandAsync(client, controlGroup, key, VolumeCommandGroupKey);
	});
};

var valueOrFuncReturn = function(val) {
	if (typeof val === "function") {
		return val();
	}
	return val;
};
