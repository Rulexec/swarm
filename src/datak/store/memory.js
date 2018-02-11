let AsyncM = require('asyncm');

var Deferred = require('../../async/deferred');

module.exports = Memory;

function Memory() {
	let values = new Map(); // key -> {version, buffer}

	let lockedKeys = new Map(); // key -> [waiters()]

	this.get = AsyncM.pureF(function(keyBuffer) {
		let data = values.get(keyBuffer.toString('ascii'));
		return AsyncM.result(data || null);
	});

	this.getAndLock = AsyncM.pureF(function(keyBuffer, fun) {
		let keyAscii = keyBuffer.toString('ascii');

		let data = values.get(keyAscii);

		let lockedWaiters = lockedKeys.get(keyAscii);

		let isLocked = true;

		if (lockedWaiters) {
			let deferred = new Deferred();

			lockedWaiters.push(function() {
				// FIXME: no cancel
				execute().next(deferred.result.bind(deferred), deferred.error.bind(deferred)
				).run();
			});

			return deferred.async;
		}

		lockedWaiters = [];
		lockedKeys.set(keyAscii, lockedWaiters);

		return execute();

		function execute() {
			return fun({
				data: data ? { version: data.version, buffer: data.buffer } : null,
				write: function({version, buffer}) {
					if (!isLocked) return AsyncM.error({ reason: 'write() to not locked key' });

					values.set(keyAscii, { version, buffer });

					return AsyncM.result();
				}
			}).any(function() {
				// unlock
				isLocked = false;

				if (!lockedWaiters.length) {
					lockedKeys.delete(keyAscii);
					return;
				}

				lockedWaiters.shift()();
			});
		}
	});
}

if (require.main === module) {
	let store = new Memory();

	var firstCall = 0,
	    secondCall = 0;

	store.getAndLock(Buffer.from('test'), function() {
		firstCall = Date.now();
		return AsyncM.sleep(500);
	}).run();

	store.getAndLock(Buffer.from('test'), function() {
		if (!firstCall) {
			console.log('No first call');
			process.exit(1);
		}

		if (Date.now() - firstCall < 500) {
			console.log('Second called in ' + (Date.now() - firstCall) + 'ms');
			process.exit(1);
		}

		secondCall = Date.now();

		return AsyncM.sleep(500).skipResult(AsyncM.result(42));
	}).result(function(result) {
		if (result !== 42) {
			console.log('Result is not 42');
			process.exit(1);
		}

		if (Date.now() - secondCall < 500) {
			console.log('Second called in ' + (Date.now() - secondCall) + 'ms');
			process.exit(1);
		}

		console.log('OK');
	}).run();
}