/**
 * Created by kraig on 3/20/16.
 */

var util = require('util');
var inherit = require('./inherit');
var Promise = require('bluebird');
var queue = require('queue');
var HubAccessoryBase = require('./hub-accessory-base').HubAccessoryBase;
var HubConnection = require('./hub-connection');
var HubConnectionStatus = HubConnection.ConnectionStatus;
var VolumeService = require('./volume-service').VolumeService;
var _ = require('lodash');

var Service, Characteristic;

module.exports = function(exportedTypes) {
	if (exportedTypes && !Service) {
		Service = exportedTypes.Service;
		Characteristic = exportedTypes.Characteristic;
		inherit.changeBase(ActivityService, Service.Switch);
		ActivityService.UUID = Service.Switch.UUID;
		inherit.changeBase(ActivityVolumeService, VolumeService);
		ActivityVolumeService.UUID = VolumeService.UUID;
	}
	return ActivityAccessory;
};
module.exports.ActivityAccessory = ActivityAccessory;

const ActivityStatus = {
	Off: 0,
	Starting: 1,
	Started: 2,
	TurningOff: 3
};
module.exports.ActivityStatus = ActivityStatus;

function ActivityAccessory(accessory, log, connection) {
	this._onConnectionChanged = onConnectionChanged.bind(this);
	this._onStateChanged = onStateChanged.bind(this);
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
	if (!this.connection) return Promise.resolve();

	var volSvc = this.accessory.getService(ActivityVolumeService);
	if (volSvc) {
		inherit.reconstruct(volSvc, ActivityVolumeService, this);
	} else {
		this.accessory.addService(new ActivityVolumeService(this));
	}

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

ActivityAccessory.prototype.updateConnection = function() {
	var oldConn = this.connection;
	var rtn = HubAccessoryBase.prototype.updateConnection.apply(this, arguments);
	var newConn = this.connection;
	if (oldConn != newConn) {
		if (oldConn) {
			oldConn.removeListener(HubConnection.Events.ConnectionChanged, this._onConnectionChanged);
			oldConn.removeListener(HubConnection.Events.StateDigest, this._onStateChanged);
		}
		if (newConn) {
			newConn.addListener(HubConnection.Events.ConnectionChanged, this._onConnectionChanged);
			newConn.addListener(HubConnection.Events.StateDigest, this._onStateChanged);
		}
	}
	return rtn;
};

var onConnectionChanged = function(connStatus) {
	if (connStatus == HubConnectionStatus.Connected) {
		//TODO: Refresh Activity List
		this.refreshActivityAsync();
	}
};
var onStateChanged = function(args) {
	var stateDigest = args.stateDigest;
	var activityId = stateDigest && stateDigest.activityId;
	this._updateActivityState(activityId);
};

ActivityAccessory.prototype._updateActivities = function(list) {
	var self = this;
	var filteredActivities = _.filter(list, isNotPowerOffActivity);
	var activities = _.sortBy(filteredActivities, 'label');
	var actAccList = this._getActivityServices();
	if (!_.isEmpty(actAccList)) {
		var invalidActivityServices = _.differenceWith(actAccList, activities, function (service, activity) {
			return matchesActivityForService(service, activity);
		});
		_.forEach(invalidActivityServices, function (service) {
			self.accessory.removeService(service);
		});
		_.forEach(actAccList, self._bindService.bind(self));
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
		service.getCharacteristic(Characteristic.On).setValue(val, null, true);
	});
};

ActivityAccessory.prototype.refreshActivityAsync = function() {
	var self = this;
	return this.connection.invokeAsync(function(client){
		return client.getCurrentActivity();
	})
	.then(self._updateActivityState.bind(self))
	.catch(function (err) {
		self.log('Unable to get current activity with error', err);
		throw err;
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
		this._bindService(service);
	}
	return service;
};

ActivityAccessory.prototype._getCurrentActivityService = function() {
	return this._getActivityService(this._currentActivity);
};

ActivityAccessory.prototype._getCurrentActivityInfo = function() {
	var actSvc = this._getCurrentActivityService();
	return actSvc && actSvc.activity;
};

ActivityAccessory.prototype._getActivityServices = function() {
	return _.filter(this.accessory && this.accessory.services, ActivityService.isInstance);
};

ActivityAccessory.prototype._bindService = function(service) {
	if (service._isAccBound) return;

	var c = service.getCharacteristic(Characteristic.On);
	c.on('set', this._setActivityServiceOn.bind(this, service));

	service._isAccBound = true;
};
ActivityAccessory.prototype._setActivityServiceOn = function(service, isOn, callback, doIgnore) {
	if (doIgnore == true) {
		callback();
		return;
	}
	var self = this;
	var actId = isOn ? getServiceActivityId(service) : '-1';
	var c = service.getCharacteristic(Characteristic.On);
	var finish = function() {
		var cb = callback;
		callback = null;
		c.removeListener('change', onChange);
		if (cb) cb.apply(this, arguments);
	};
	var onChange = function(args) {
		if (args.newValue != isOn) return;
		self.log.debug("Preemptively marking finished.");
		finish();
	};
	return this.connection
		.invokeAsync(function(client) {
			self.log.debug("Switching to Activity: " + actId);
			c.addListener('change', onChange);

			var task = client.startActivity(actId);
			self.log.debug("Switching Task Started: " + actId);
			return task;
		})
		.asCallback(finish)
		.finally(function(){
			self.log.debug("Switch Task Finished: " + actId);
		});
};

/**
 * Activity Service
 * @param activity
 * @constructor
 */
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
	return activity != null && activity.id != null;
};

var getActivityId = function(activity) {
	return isActivityInfo(activity) ? activity.id : activity;
};

var isNotPowerOffActivity = function(activity) {
	var activityId = getActivityId(activity);
	return activityId != null && activityId > 0;
};

/**
 * Activity Volume Service
 * @param activityAccessory
 * @constructor
 */
var ActivityVolumeService = function(activityAccessory) {
	VolumeService.call(this, activityAccessory.accessory.name + " Sound", null, activityAccessory.log);
	var self = this;
	self.activityAccessory = activityAccessory;
	this.controlGroup = function() {
		var activity = self.activityAccessory._getCurrentActivityInfo();
		return activity && activity.controlGroup;
	};
	this.connection = function() {
		return self.activityAccessory.connection;
	};
};

ActivityVolumeService.isInstance = function(service){
	return ((service instanceof ActivityVolumeService) || (ActivityVolumeService.UUID === service.UUID));
};
