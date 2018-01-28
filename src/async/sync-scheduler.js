var AsyncM = require('asyncm');

module.exports = SyncScheduler;

function SyncScheduler() {
	var queue = [];

	var processing = false;

	var finishListeners = [];
	function notifyFinished() {
		while (finishListeners.length) finishListeners.shift()();
	}

	function onAdded() {
		if (processing) return;
		if (!queue.length) { notifyFinished(); return; }

		processing = true;

		// GOTO is used, watch out
		while (queue.length) {
			var taskF = queue.shift();

			var taskM = taskF();
			if (!taskM) continue;

			taskM.run(onCompleted, onCompleted);
			return;
		}

		processing = false;
		notifyFinished();
	}

	function onCompleted() {
		processing = false;

		onAdded();
	}

	this.schedule = function(fn) {
		queue.push(fn);
		setImmediate(onAdded);
	};

	this.finish = AsyncM.fun(function(onResult) {
		if (!processing) onResult();
		else finishListeners.push(onResult);
	});
}