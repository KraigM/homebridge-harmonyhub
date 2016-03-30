/**
 * Created by kraig on 3/20/16.
 */

var util = require('util');
var inherit = require('./inherit');
var Promise = require('bluebird');
var Activity = require('./activity-accessory')();
var queue = require('queue');
var harmony = require('harmonyhubjs-client');

module.exports = function(exportedTypes) {
	return Hub;
};

function Hub(log, connection) {
	this.connection = connection;
	this.log = log;
}

Hub.prototype.getAccessoriesAsync = function() {
	return this.getActivitiesAsync();
};

Hub.prototype.getActivitiesAsync = function() {
	this.log("Fetching Logitech Harmony activities...");
	var self = this;
	return Promise.all([
			this.connection.invokeAsync(function(client){
				return client.getActivities();
			}),
			this.connection.invokeAsync(function(client){
				return client.getCurrentActivity();
			})
		])
		.bind(this)
		.then(function (results) {
			var activities = results[0];
			var currentActivity = results[1];
			self.currentActivity = currentActivity;
			self.log("Found activities: \n" + activities.map(function (a) {
					return "\t" + a.label;
				}).join("\n"));

			var actAccessories = [];
			var sArray = sortByKey(activities, "label");
			sArray.map(function (s) {
				var accessory = self.createActivityAccessory(s);
				if (accessory.id > 0) {
					accessory.updateActivityState(currentActivity);
					actAccessories.push(accessory);
				}
			});
			self.activityAccessories = actAccessories;
			return actAccessories;
		}.bind(this))
		.catch(function (err) {
			this.log('Unable to get current activity with error', err);
			throw err;
		});
};

Hub.prototype.createActivityAccessory = function(activity) {
	var accessory = new Activity(this.log, activity, changeCurrentActivity.bind(this), this.connection);
	accessory.updateActivityState(this.currentActivity);
	return accessory;
};

//TODO: Use statedigest to detect changes https://github.com/swissmanu/harmonyhubjs-client/blob/master/docs/protocol/stateDigest.md
function changeCurrentActivity(nextActivity, callback) {
	//TODO: Implement or replace
	callback();
}

var sortByKey = function (array, key) {
	return array.sort(function (a, b) {
		var x = a[key];
		var y = b[key];
		return ((x < y) ? -1 : ((x > y) ? 1 : 0));
	});
};