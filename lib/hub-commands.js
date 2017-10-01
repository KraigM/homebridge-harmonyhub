/**
 * Created by kraig on 10/2/16.
 */

var util = require('util');
var Promise = require('bluebird');
var _ = require('lodash');

module.exports = { };

module.exports.executeCommandAsync = function(client, controlGroup, key, controlKey, duration) {
	var cmd;
	if (!key && !controlKey && isCommand(controlGroup)) {
		cmd = controlGroup;
	} else {
		cmd = getCommand(controlGroup, key, controlKey);
	}
	if (!isCommand(cmd)) {
		return Promise.reject('Unable to locate specified command');
	}
	if (!duration) {
		return executeCommandAsync(client, cmd);
	}
	var startTS = Date.now();
	var endTS = startTS + duration;
	var interval = 100;

	var holdLoop = function() {
		var now = Date.now();
		var diff = endTS - now;
		if (diff < 0) {
			return Promise.resolve();
		}
		if (diff < interval) {
			return Promise.delay(diff);
		}
		return Promise.delay(interval)
			.then(function(){
				return executeCommandAsync(client, cmd, now, 'hold')
			})
			.then(holdLoop);
	};
	return executeCommandAsync(client, cmd, startTS)
		.then(holdLoop)
		.then(function(){
			return executeCommandAsync(client, cmd, endTS, 'release');
		});
};

var executeCommandAsync = function (client, cmd, timestamp, status) {
	var action = cmd && cmd.action;
	if (!action) return Promise.reject("Command not available");
	var encodedAction = action.replace(/\:/g, '::');
	var body = 'action=' + encodedAction;
	body += ':status=' + (status || 'press');
	if (timestamp !== undefined) {
		body += ':timestamp=' + timestamp;
	}
	return client.send('holdAction', body);
};

var getCommand = function(controlGroup, key, controlKey) {
	if (!controlGroup || !key) return null;
	if (controlKey) {
		return getCommandFromControl(_.find(controlGroup, ['name', controlKey]), key);
	}
	return _.reduce(controlGroup, function(found, control) {
		return found || getCommandFromControl(control, key);
	}, null);
};

var getCommandFromControl = function(control, key) {
	return _.find(control && control.function, ['name', key]);
};

var isCommand = function(cmd) {
	return cmd && cmd.action;
};

module.exports.getCommand = getCommand;
