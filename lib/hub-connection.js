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

function HubConnection(hubInfo, log, discover) {
	EventEmitter.call(this);
	this.hubId = hubInfo.uuid;
	this.hubInfo = hubInfo;
	this.log = log;
	this._discover = discover;

	var self = this;
	self._discover.on('online', function (info) {
		if (!info || info.uuid != self.hubId) return;
		self._HandleConnectionOnline();
	});

	self._discover.on('offline', function (info) {
		if (!info || info.uuid != self.hubId) return;
		self._HandleConnectionOffline();
	});
}

util.inherits(HubConnection, EventEmitter);

HubConnection.createAsync = function(hubInfo, log, discover) {
	var conn = new HubConnection(hubInfo, log, discover);
	conn.on('error', (err) => {
		console.error(err);
	});

	return conn.connectAsync(hubInfo)
		.return(conn);
};

HubConnection.prototype.connectAsync = function(hubInfo) {
	this.hubInfo = hubInfo;
	this.client = null;
	this.queue = new Queue();
	this.queue.concurrency = 1;
	return this.refreshAsync();
};

HubConnection.prototype.disconnectAsync = function() {
	var lastClient = this.client;
	var lastQueue = this.queue;
	this.queue = null;
	this.client = null;
	this._OnConnectionChanged();
	//TODO: Properly cancel running tasks
	if (lastQueue) lastQueue.end();
	if (lastClient) return BluebirdExt.toBlueBird(lastClient.end());
	return Promise.resolve();
};

HubConnection.prototype._getClientAsync = function() {
	var client = this.client;
	if (client) {
		return Promise.resolve(client);
	}
	var connTask = this._connTask;
	if (connTask) {
		return connTask;
	}
	var self = this;
	connTask = BluebirdExt.toBlueBird(Client(self.hubInfo.ip, self.hubInfo.port, self.hubInfo.email, self.hubInfo.password))
		.then(function (client) {
			self.log.debug('created new client for hub with uuid ' + self.hubId);

			client._xmppClient.on('offline', self._HandleConnectionOffline.bind(self));

			client.on('stateDigest', function (stateDigest) {
				self.log.debug('got state digest. reemit it');
				self.emit(Events.StateDigest, {
					stateDigest: stateDigest
				});
			});
			self.client = client;
			return client;
		});
	this._connTask = connTask;
	this._OnConnectionChanged();
	return connTask
		.timeout(30 * 1000)
		.finally(function() {
			if (self._connTask == connTask) {
				self._connTask = null;
			}
			self._OnConnectionChanged();
		});
};

Object.defineProperty(HubConnection.prototype, 'status', {
	get: function() {
		if (this.client) return ConnectionStatus.Connected;
		if (this._connTask) return ConnectionStatus.Connecting;
		if (this.queue) return ConnectionStatus.PendingConnection;
		if (this.hubInfo) return ConnectionStatus.Disconnected;
		return ConnectionStatus.Unknown;
	}
});

HubConnection.prototype._HandleConnectionOnline = function() {
	this.log.debug("Hub went online: " + this.hubId);
	return this.refresh();
};

HubConnection.prototype._HandleConnectionOffline = function() {
	this.log.debug('client for hub ' + this.hubInfo.uuid + ' went offline. re-establish.');
	this.client = undefined;
	return this.refresh();
};

HubConnection.prototype.refresh = function() {
	var self = this;
	this.refreshAsync()
		.catch(function(err) {
			self.log.debug(err);
			self._OnConnectionChanged();
		});
};

HubConnection.prototype.refreshAsync = function() {
	this._OnConnectionChanged();
	return this.invokeAsync(function(client){
		return client;
	});
};

HubConnection.prototype._OnConnectionChanged = function() {
	var last = this._lastStatus;
	var status = this.status;
	if (last == status) return;
	this._lastStatus = status;
	this.emit(Events.ConnectionChanged, status);
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
module.exports.HubConnection = HubConnection;
module.exports.Events = Events;
module.exports.ConnectionStatus = ConnectionStatus;
