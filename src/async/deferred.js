var AsyncM = require('asyncm');

// TODO: move to AsyncM?
module.exports = function Deferred() {
	let waiters = [];

	let isFinished = false,
	    isResult = false;

	let result, error;

	this.result = function(value) {
		isFinished = true;
		isResult = true;
		result = value;
		notifyWaiters();
	};
	this.error = function(value) {
		isFinished = true;
		isResult = false;
		error = value;
		notifyWaiters();
	};

	function notifyWaiters() {
		while (waiters.length) {
			let waiter = waiters.shift();

			if (isResult) waiter.onResult(result);
			else waiter.onError(error);
		}
	}

	this.async = AsyncM.create(function(onResult, onError) {
		if (isFinished) {
			if (isResult) onResult(result);
			else onError(error);
			return;
		}

		waiters.push({ onResult, onError });
	});
};