/**
 * Created by kraig on 3/20/16.
 */

var util = require('util');
var inherit = require('./inherit');
var Promise = require('bluebird');
var ActivityAccessory = require('./activity-accessory').ActivityAccessory;
var queue = require('queue');
var harmony = require('harmonyhubjs-client');
var _ = require('lodash');

module.exports = function(exportedTypes) {
	return Hub;
};
module.exports.Hub = Hub;

function Hub(log, connection) {
	this.connection = connection;
	this.log = log;
}

Hub.prototype.getAccessoriesAsync = function() {
	if (this._accessories) {
		return Promise.resolve(this._accessories);
	}
	return this.updateAccessoriesAsync();
};

Hub.prototype.updateAccessoriesAsync = function(cachedAccessories) {
	var self = this;
	var conn = this.connection;

	var activityCachedAcc = _.find(cachedAccessories, function (acc) {
		return acc.context.typeKey = ActivityAccessory.typeKey;
	});
	var activityTask = ActivityAccessory.createAsync(activityCachedAcc, this.log, conn);

	return Promise.all([
			activityTask
		])
		.tap(function(accessories){
			self._accessories = accessories;
		});
};

