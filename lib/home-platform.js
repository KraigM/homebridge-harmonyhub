/**
 * Created by kraig on 3/20/16.
 */

var Discover = require('harmonyhubjs-discover');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var _ = require('lodash');
var Promise = require('bluebird');
var Hub = require('./hub')();
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
	var self = this;
	this.log = log;

	self._discoveredHubs = [];
	self._hubs = {};
	self._hubIndex = [];
	self._isInitialized = false;

	self._discover = new Discover(61991);

	self._discover.on('update', function (hubs) {
		self.log.debug('received update event from harmonyhubjs-discover. there are ' + hubs.length + ' hubs');
		self._discoveredHubs = hubs;
		if (!self._isInitialized && hubs && hubs.length > 0) {
			//TODO: Support multiple hubs
			//TODO: Support specific IP
			var info = hubs[0];
			var hubId = info.uuid;
			var conn = new Connection(info, log);
			conn.connectAsync(info)
				.catch(function(err){
					log.error(err);
				});
			self._hubs[hubId] = new Hub(log, conn);
			self._hubIndex.push(hubId);
		}
		//TODO: Allow dynamically added hubs
		if (!self._isInitialized) {
			//TODO: support expected hubs
			self._isInitialized = self._hubIndex && self._hubIndex.length > 0;
		}
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

	EventEmitter.call(self);
}
util.inherits(HomePlatform, EventEmitter);

HomePlatform.prototype.waitForInitializationAsync = function() {
	var self = this;
	return new Promise(function(resolve, reject){
		if (self._isInitialized) {
			resolve();
		} else {
			var onDiscover = function (discoveredHubs) {
				if (self._isInitialized) {
					self.removeListener(Events.DiscoveredHubs, onDiscover);
					resolve();
				}
			};
			self.on(Events.DiscoveredHubs, onDiscover);
			onDiscover(self._discoveredHubs);
		}
	});
};

HomePlatform.prototype.getAccessoriesAsync = function() {
	var self = this;
	return this.waitForInitializationAsync()
		.then(function(){
			return Promise.map(self._hubIndex, function(hubId){
				if (!hubId || !self._hubs.hasOwnProperty(hubId)) return [];
				var hub = self._hubs[hubId];
				return hub.getAccessoriesAsync();
			});
		})
		.then(function(resultsArr){
			return _.flatten(resultsArr);
		})
		.map(function(acc){
			if (acc instanceof AccessoryBase) {
				return acc.accessory;
			} else {
				return acc;
			}
		})
		.catch(function(err){
			throw err;
		});
};

HomePlatform.prototype.accessories = function(callback) {
	this.getAccessoriesAsync()
		.then(callback);
};

HomePlatform.prototype.configureAccessory = function(accessory) {
};
