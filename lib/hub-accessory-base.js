/**
 * Created by kraig on 3/28/16.
 */

var util = require('util');
var AccessoryBase = require('./accessory-base').AccessoryBase;

var Service, Characteristic;

module.exports = function(exportedTypes) {
	if (exportedTypes && !Service) {
		Service = exportedTypes.Service;
		Characteristic = exportedTypes.Characteristic;
	}
	return HubAccessoryBase;
};
module.exports.HubAccessoryBase = HubAccessoryBase;

function HubAccessoryBase(accessory, connection, idKey, name, log) {
	AccessoryBase.call(this, accessory, connection.hubId + idKey, name || connection.hubInfo.name, log);
	this.connection = connection;
	this.refreshHubInfo();
}

util.inherits(HubAccessoryBase, AccessoryBase);

var setIfNeeded = function(svc, characteristic, value, defaultValue) {
	if (value == null && !svc.testCharacteristic(characteristic)) return;
	svc.setCharacteristic(characteristic, value != null ? value : defaultValue);
};

HubAccessoryBase.prototype.refreshHubInfo = function() {
	var hubInfo = (this.connection && this.connection.hubInfo) || {};
	var infoSvc = this.accessory.getService(Service.AccessoryInformation);
	setIfNeeded(infoSvc, Characteristic.FirmwareRevision, hubInfo.current_fw_version, '');
};

