/**
 * Created by kraig on 3/20/16.
 */

var util = require('util');
var _ = require('lodash');

module.exports = { };

var mixin = module.exports.mixin = function(Class, MixinClass, doOverride) {
	var mixinMethods = MixinClass.prototype || MixinClass;
	var cls = Class.prototype || Class;
	for (var mn in mixinMethods) {
		if (!doOverride && cls[mn] != undefined) return;
		cls[mn] = mixinMethods[mn];
	}
};

var changeBase = module.exports.changeBase = function(Class, BaseClass) {
	var orig = Class.prototype;
	util.inherits(Class, BaseClass);
	Class.prototype.parent = BaseClass.prototype;
	mixin(Class, orig, true);
};

module.exports.reconstruct = function(inst, Class) {
	if (inst == null) {
		return null;
	}
	if (!(inst instanceof Class)) {
		inst.__proto__ = Class.prototype;
		inst.constructor.apply(inst, _.slice(arguments, 2));
	}
	return inst;
};
