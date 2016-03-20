/**
 * Created by kraig on 3/20/16.
 */

var util = require('util');

module.exports = { };

var mixin = module.exports.mixin = function(Class, MixinClass) {
	var mixinMethods = MixinClass.prototype || MixinClass;
	for (var mn in mixinMethods) {
		Class.prototype[mn] = mixinMethods[mn];
	}
};

var changeBase = module.exports.changeBase = function(Class, BaseClass) {
	var orig = Class.prototype;
	util.inherits(Class, BaseClass);
	Class.prototype.parent = BaseClass.prototype;
	mixin(Class, orig);
};
