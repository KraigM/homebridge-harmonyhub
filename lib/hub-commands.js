/**
 * Created by kraig on 10/2/16.
 */

var util = require('util');
var Promise = require('bluebird');
var _ = require('lodash');

module.exports = { };

module.exports.executeCommandAsync = function(client, controlGroup, key, controlKey) {
	var cmd;
	if (!key && !controlKey && isCommand(controlGroup)) {
		cmd = controlGroup;
	} else {
		cmd = getCommand(controlGroup, key, controlKey);
	}
	if (!isCommand(cmd)) {
		return Promise.reject('Unable to locate specified command');
	}
	return executeCommandAsync(client, cmd);
};

var executeCommandAsync = function (client, cmd) {
	var action = cmd && cmd.action;
	if (!action) return Promise.reject("Command not available");
	var encodedAction = action.replace(/\:/g, '::');
	return client.send('holdAction', 'action=' + encodedAction + ':status=press');
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
