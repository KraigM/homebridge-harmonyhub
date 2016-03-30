/**
 * Created by kraig on 3/28/16.
 */

var inherit = require('./inherit');

var AccessoryBase, Service, Characteristic, uuid;

module.exports = function(exportedTypes) {
	if (exportedTypes && !AccessoryBase) {
		AccessoryBase = exportedTypes.AccessoryBase;
		Service = exportedTypes.Service;
		Characteristic = exportedTypes.Characteristic;
		uuid = exportedTypes.uuid;

		inherit.changeBase(HubAccessoryBase, AccessoryBase);
	}
	return HubAccessoryBase;
};

function HubAccessoryBase(connection, idKey, name, log) {
	AccessoryBase.call(this, idKey, name, log);
	this.connection = connection;
	this.refreshHubInfo();
}

var setIfNeeded = function(svc, characteristic, value, defaultValue) {
	if (value == null && !svc.testCharacteristic(characteristic)) return;
	svc.setCharacteristic(characteristic, value != null ? value : defaultValue);
};

HubAccessoryBase.prototype.refreshHubInfo = function() {
	var hubInfo = (this.connection && this.connection.hubInfo) || {};
	var infoSvc = this.getService(Service.AccessoryInformation);
	setIfNeeded(infoSvc, Characteristic.FirmwareRevision, hubInfo.current_fw_version, '');
};

