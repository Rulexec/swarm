var AsyncM = require('asyncm');

module.exports = ParallelScheduler;

function ParallelScheduler() {
	var runningCount = 0,
	    finishListeners = [];

	this.schedule = function(fn) {
		setImmediate(function() {
			runningCount++;

			var m = fn();
			m.any(function() {
				runningCount--;

				if (runningCount === 0) {
					while (finishListeners.length) finishListeners.shift()();
				}
			}).run();
		});
	};

	this.finish = AsyncM.fun(function(onResult) {
		if (runningCount === 0) onResult();
		else finishListeners.push(onResult);
	});
}