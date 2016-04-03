/**
 * Created by kraig on 3/20/16.
 */

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Client = require('harmonyhubjs-client');
var Queue = require('queue');
var Promise = require('bluebird');
var BluebirdExt = require('./bluebird-ext');

var Events = {
	ConnectionChanged: 'connectionChanged',
	StateDigest: 'stateDigest'
};

var ConnectionStatus = {
	Unknown: 0,
	Connecting: 1,
	Connected: 2,
	PendingConnection: 3,
	Disconnected: 4
};

function HubConnection(hubInfo, log) {
	EventEmitter.call(this);
	this.status = ConnectionStatus.Disconnected;
	this.hubId = hubInfo.uuid;
	this.hubInfo = hubInfo;
	this.log = log;
	this.queue = new Queue();
	this.queue.concurrency = 1;
}

util.inherits(HubConnection, EventEmitter);

HubConnection.createAsync = function(hubInfo, log) {
	var conn = new HubConnection(hubInfo, log);
	return conn.connectAsync(hubInfo)
		.return(conn);
};

HubConnection.prototype.connectAsync = function(hubInfo) {
	this.hubInfo = hubInfo;
	this.client = null;
	return this.invokeAsync(function(client){
		return client;
	});
};

HubConnection.prototype._getClientAsync = function() {
	var client = this.client;
	if (client) {
		return Promise.resolve(client);
	}
	var self = this;
	return Client(self.hubInfo.ip)
		.then(function (client) {
			self.log.debug('created new client for hub with uuid ' + self.hubId);

			client._xmppClient.on('offline', function () {
				self.log.debug('client for hub ' + self.hubInfo.uuid + ' went offline. re-establish.');
				self.client = undefined;
				return self._getClientAsync();
			});

			client.on('stateDigest', function (stateDigest) {
				self.log.debug('got state digest. reemit it');
				self.emit(Events.StateDigest, {
					stateDigest: stateDigest
				});
			});

			self.client = client;
			return client;
		});
};

HubConnection.prototype.invokeAsync = function(func) {
	var self = this;
	return new Promise(function(resolve, reject) {
		self.queue.push(resolve);
		startQueueInBackground(self.queue);
	})
	.then(function(cb){
		return self._getClientAsync()
			.then(BluebirdExt.asBlueBird(func))
			.finally(function(){
				setTimeout(cb, 0);
			})
			.catch(function(err){
				throw err;
			});
	});
};

var startQueueInBackground = function(queue) {
	if (queue && !queue.running) {
		setTimeout(queue.start.bind(queue), 0);
	}
};

module.exports = HubConnection;
module.exports.Events = Events;
module.exports.ConnectionStatus = ConnectionStatus;
