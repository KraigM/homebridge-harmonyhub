/**
 * Created by kraig on 3/28/16.
 */

var util = require('util');
var HubConnection = require('./hub-connection.js');
var HubConnectionStatus = require('./hub-connection.js').ConnectionStatus;
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
	var hubId, hubInfo;
	if (connection) {
		hubId = connection.hubId;
		hubInfo = connection.hubInfo;
	} else if (accessory && accessory.context) {
		hubId = accessory.context.hubId;
		hubInfo = accessory.context.hubInfo;
	}
	AccessoryBase.call(this, accessory, hubId + idKey, name || (hubInfo && hubInfo.friendlyName), log);
	this._refreshConnection = refreshConnection.bind(this);
	this.updateConnection(connection);
}

util.inherits(HubAccessoryBase, AccessoryBase);

HubAccessoryBase.prototype.updateConnection = function(connection) {
	var oldConn = this.connection;
	this.connection = connection;
	this.refreshHubInfo();

	if (oldConn != connection) {
		if (oldConn) {
			oldConn.removeListener(HubConnection.Events.ConnectionChanged, this._refreshConnection);
		}
		if (connection) {
			connection.addListener(HubConnection.Events.ConnectionChanged, this._refreshConnection);
		}
	}

	this._refreshConnection(connection ? connection.status : null)
};

var refreshConnection = function(connStatus) {
	var reachable = connStatus != null && connStatus == HubConnectionStatus.Connected;
	this.accessory.updateReachability(reachable);
	this.log.debug("Updated reachability of " + this.hubId + " to " + reachable);
};

var setIfNeeded = function(svc, characteristic, value, defaultValue) {
	if (value == null && !svc.testCharacteristic(characteristic)) return;
	svc.setCharacteristic(characteristic, value != null ? value : defaultValue);
};

HubAccessoryBase.prototype.refreshHubInfo = function() {
	var hubInfo = (this.connection && this.connection.hubInfo) || {};

	var ctx = this.accessory.context || (this.accessory.context = {});
	ctx.hubInfo = hubInfo;
	ctx.hubId = this.connection && this.connection.hubId;

	var infoSvc = this.accessory.getService(Service.AccessoryInformation);
	setIfNeeded(infoSvc, Characteristic.FirmwareRevision, hubInfo.current_fw_version, '');
};

