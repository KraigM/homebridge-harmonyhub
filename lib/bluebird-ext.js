/**
 * Created by kraig on 3/29/16.
 */

var Promise = require('bluebird');

var toBlueBird = function(promise) {
	if (!promise || promise instanceof Promise ||
		!promise.then || typeof promise.then !== "function") {
		return promise;
	}
	return new Promise(function(resolve, reject){
		return promise.then(resolve, reject);
	});
};

var asBlueBird = function(func) {
	return function() {
		return toBlueBird(func.apply(this, arguments));
	};
};

module.exports = {
	toBlueBird: toBlueBird,
	asBlueBird: asBlueBird
};