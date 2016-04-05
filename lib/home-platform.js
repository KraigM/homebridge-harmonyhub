/**
 * Created by kraig on 3/20/16.
 */

var Discover = require('harmonyhubjs-discover');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var _ = require('lodash');
var Promise = require('bluebird');
var Hub = require('./hub').Hub;
var Connection = require('./hub-connection');
var AccessoryBase = require('./accessory-base').AccessoryBase;

var Events = {
	DiscoveredHubs: 'discoveredHubs'
};

module.exports = function() {
	return HomePlatform;
};
module.exports.Events = Events;
module.exports.HomePlatform = HomePlatform;

function HomePlatform(log, config, api) {
	if (!config) {
		log.warn("Ignoring Harmony Platform setup because it is not configured");
		return null;
	}

	EventEmitter.call(this);

	var self = this;
	this.log = log;

	self._discoveredHubs = [];
	self._hubs = {};
	self._hubIndex = [];
	self._isInitialized = false;
	self._autoAddNewHubs = false;

	self._discover = new Discover(61991);

	self._discover.on('update', function (hubs) {
		self.log.debug('received update event from harmonyhubjs-discover. there are ' + hubs.length + ' hubs');
		self._discoveredHubs = hubs;
		_.forEach(self._discoveredHubs, self._handleDiscoveredHubAsync.bind(self));
		self.emit(Events.DiscoveredHubs, hubs);
	});

	self._discover.on('online', function (hub) {
		self.log.debug("Hub went online: " + JSON.stringify(hub));
		self.emit('hubOnline', hub);
	});

	self._discover.on('offline', function (hub) {
		self.log.debug("Hub went offline: " + JSON.stringify(hub));
		self.emit('hubOffline', hub);
	});
	self._discover.start();

	if (api) {
		// Save the API object as plugin needs to register new accessory via this object.
		self._api = api;

		// Listen to event "didFinishLaunching", this means homebridge already finished loading cached accessories
		// Platform Plugin should only register new accessory that doesn't exist in homebridge after this event.
		// Or start discover new accessories
		self._api.on('didFinishLaunching', self._finishInitialization.bind(self));
	}
}
util.inherits(HomePlatform, EventEmitter);

HomePlatform.prototype._finishInitialization = function() {
	var self = this;
	return this._finishInitializationAsync()
		.catch(function(err) {
			self.error('Error finishing initialization of HarmonyHub: ' + (err ? (err.stack || err.message || err) : err));
		});
};

HomePlatform.prototype._finishInitializationAsync = function() {
	this.log.debug("Finalizing Plugin Launch");
	var self = this;
	self._autoAddNewHubs = true;
	return Promise.resolve(this._discoveredHubs)
		.map(self._handleDiscoveredHubAsync.bind(self))
		.all()
		.then(function() {
			self._isInitialized = true;
		});
};

HomePlatform.prototype._handleDiscoveredHubAsync = function(hubInfo) {
	if (!this._autoAddNewHubs) return;

	var hubId = hubInfo.uuid;
	if (!hubId) return;

	var hub = this._hubs[hubId];
	if (hub) return;

	var conn = new Connection(hubInfo, this.log);
	hub = new Hub(this.log, conn);
	this._hubs[hubId] = hub;
	this._hubIndex.push(hubId);

	var self = this;
	return conn.connectAsync(hubInfo)
		.then(function() {
			var cachedAccList = _.filter(self._cachedAccessories, function(acc) {
				return acc && acc.context && acc.context.hubId == hubId;
			});
			return hub.updateAccessoriesAsync(cachedAccList);
		});
};

HomePlatform.prototype.configureAccessory = function(accessory) {
	this.log.debug("Plugin - Configure Accessory: " + accessory.displayName);
	if (this._cachedAccessories == null) this._cachedAccessories = [];
	this._cachedAccessories.push(accessory);
};
