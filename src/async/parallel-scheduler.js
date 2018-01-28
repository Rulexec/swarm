var AsyncM = require('asyncm');

module.exports = ParallelScheduler;

function ParallelScheduler() {
	var runningCount = 0,
	    finishListeners = [];

	this.schedule = function(fn) {
		setImmediate(function() {
			runningCount++;

			var m = fn();

			if (!m) {
				onFinish();
			} else {
				m.any(onFinish).run();
			}

			function onFinish() {
				runningCount--;

				if (runningCount === 0) {
					while (finishListeners.length) finishListeners.shift()();
				}
			}
		});
	};

	this.finish = AsyncM.fun(function(onResult) {
		if (runningCount === 0) onResult();
		else finishListeners.push(onResult);
	});
}