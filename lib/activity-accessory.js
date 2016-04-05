/**
 * Created by kraig on 3/20/16.
 */

var util = require('util');
var inherit = require('./inherit');
var Promise = require('bluebird');
var queue = require('queue');
var HubAccessoryBase = require('./hub-accessory-base').HubAccessoryBase;
var _ = require('lodash');

var Service, Characteristic;

module.exports = function(exportedTypes) {
	if (exportedTypes && !Service) {
		Service = exportedTypes.Service;
		Characteristic = exportedTypes.Characteristic;
		inherit.changeBase(ActivityService, Service.Switch);
	}
	return ActivityAccessory;
};
module.exports.ActivityAccessory = ActivityAccessory;

function ActivityAccessory(accessory, log, connection) {
	HubAccessoryBase.call(this, accessory, connection, ActivityAccessory.typeKey, null, log);

}
util.inherits(ActivityAccessory, HubAccessoryBase);

ActivityAccessory.typeKey = 'activity';

ActivityAccessory.createAsync = function(accessory, log, connection) {
	var acc = new ActivityAccessory(accessory, log, connection);
	return acc.initAsync()
		.return(acc);
};

ActivityAccessory.prototype.initAsync = function() {
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
		.spread(function (activities, currentActivity) {
			self.log("Found activities: \n" + activities.map(function (a) {
					return "\t" + a.label;
				}).join("\n"));
			self._updateActivities(activities);
			self._updateActivityState(currentActivity);
		})
		.catch(function (err) {
			self.log('Unable to get current activity with error', err);
			throw err;
		});
};

//TODO: Use statedigest to detect changes https://github.com/swissmanu/harmonyhubjs-client/blob/master/docs/protocol/stateDigest.md
ActivityAccessory.prototype._changeCurrentActivityAsync = function(nextActivity, callback) {
	//TODO: Implement or replace
	return Promise.resolve()
		.asCallback(callback);
};

ActivityAccessory.prototype._updateActivities = function(activities) {
	var self = this;
	activities = _.filter(activities, isNotPowerOffActivity);
	activities = _.sortBy(activities, 'label');
	var actAccList = this._getActivityServices();
	if (!_.isEmpty(actAccList)) {
		var invalidActivityServices = _.differenceWith(actAccList, activities, function (service, activity) {
			return !matchesActivityForService(service, activity);
		});
		_.forEach(invalidActivityServices, function (service) {
			self.accessory.removeService(service);
		});
	}
	_.forEach(activities, function(activity) {
		var service = self._getActivityService(activity);
		if (service == null) return;
		updateActivityForService(service, activity);
	});
	this._updateActivityState();
};

ActivityAccessory.prototype._updateActivityState = function (currentActivity) {
	if (currentActivity == null) currentActivity = this._currentActivity;
	else this._currentActivity = currentActivity;
	_.forEach(this._getActivityServices(), function(service){
		var val = getServiceActivityId(service) == currentActivity;
		service.setCharacteristic(Characteristic.On, val);
	});
};

ActivityAccessory.prototype._getActivityService = function(activity) {
	if (!this.accessory) return null;
	//TODO: Use matchesActivityForService
	var activityId = getActivityId(activity);
	if (activityId == null) return null;
	var service = _.find(this._getActivityServices(), function(service) {
		return getServiceActivityId(service) == activityId;
	});
	if (!service && isActivityInfo(activity)) {
		service = this.accessory.addService(ActivityService, activity);
	}
	return service;
};

ActivityAccessory.prototype._getActivityServices = function() {
	return _.filter(this.accessory && this.accessory.services, ActivityService.isInstance);
};

var ActivityService = function(activity) {
	Service.Switch.call(this, activity.label, getActivityId(activity));
	this.updateActivity(activity);
};

ActivityService.isInstance = function(service){
	return ((service instanceof ActivityService) || (ActivityService.UUID === service.UUID)) &&
		(service.subtype != null);
};

//TODO: Make all activity services ActivityService (aka cached services)
ActivityService.prototype.updateActivity = function(activity) {
	return updateActivityForService(this, activity);
};
var updateActivityForService = function(service, activity) {
	service.activity = activity;
	service.setCharacteristic(Characteristic.Name, activity.label);
};

//TODO: Make all activity services ActivityService (aka cached services)
ActivityService.prototype.matchesActivity = function(activity) {
	return matchesActivityForService(this, activity);
};
var matchesActivityForService = function(service, activity) {
	var activityId = getActivityId(activity);
	return activityId != null && getServiceActivityId(service) == activityId;
};

//TODO: Make all activity services ActivityService (aka cached services)
var getServiceActivityId = function(service) {
	if (!service) service = this;
	return getActivityId(service.activity) || service.subtype;
};
Object.defineProperty(ActivityService.prototype, 'activityId', {
	get: getServiceActivityId
});

var isActivityInfo = function(activity) {
	return activity != null && activity.uuid != null;
};

var getActivityId = function(activity) {
	return isActivityInfo(activity) ? activity.uuid : activity;
};

var isNotPowerOffActivity = function(activity) {
	var activityId = getActivityId(activity);
	return activityId != null && activityId > 0;
};
