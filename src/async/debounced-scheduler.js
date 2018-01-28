var AsyncM = require('asyncm');

module.exports = DebouncedScheduler;

function DebouncedScheduler(options) {
	var timeout = options && options.timeout,
	    waitFirstTime = options && options.waitFirstTime;

	var lastRunTime = 0;

	var isRunning = false,
	    fun = null,
	    immediateId = null,
	    timeoutId = null;

	var finishListeners = [];
	function notifyFinished() {
		while (finishListeners.length) {
			finishListeners.shift()();
		}
	}

	this.schedule = function(fn) {
		fun = fn;
		if (!fun) {
			if (immediateId) { clearImmediate(immediateId); immediateId = null; }
			if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }

			isRunning = false;

			notifyFinished();
			return;
		}

		if (!isRunning) {
			isRunning = true;

			scheduleExecute();
		}

		function scheduleExecute() {
			if (!timeout) { setImmediate(execute); return; }

			var now = Date.now(),
			    diff = now - lastRunTime;

			if (!waitFirstTime && diff >= timeout) {
				setImmediate(execute);
			} else {
				setTimeout(execute, waitFirstTime ? timeout : timeout - diff);
				waitFirstTime = false;
			}
		}

		function execute() {
			let oldFun = fun;
			fun = null;

			if (!oldFun) {
				isRunning = false;

				notifyFinished();
				return;
			}

			var m = oldFun();

			if (m && m.run) {
				m.run(onFinished, onFinished);
			} else {
				onFinished();
			}
		}

		function onFinished() {
			if (timeout) lastRunTime = Date.now();

			if (fun) {
				scheduleExecute();
			} else {
				isRunning = false;

				notifyFinished();
			}
		}
	};

	this.finish = AsyncM.fun(function(onResult) {
		if (!isRunning) { onResult(); return; }

		finishListeners.push(onResult);
	});
}