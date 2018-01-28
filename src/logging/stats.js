var DebouncedScheduler = require('../async/debounced-scheduler');

var LOG_LEVEL = require('./index').LEVEL;

var DEFAULT_TIMEOUT = 100000;

exports.Counter = function StatsCounter(options) {
	let name = options.name,
	    logger = options.logger,
	    calcCount = options.calcCount,
	    absoluteChange = options.absoluteChange;

	var count = 0,
	    lastCount = 0;

	var lastReportDate = Date.now(),
	    scheduler = new DebouncedScheduler({timeout: DEFAULT_TIMEOUT, waitFirstTime: true});

	scheduler.schedule(logStats);
	function logStats(options) {
		let now = Date.now();

		if (calcCount) count = calcCount();

		if (absoluteChange) {
			if (lastCount !== count) {
				logger.log(name, {count: count, duration: now - lastReportDate}, {level: LOG_LEVEL.STATS});
			}
		} else if (count) {
			logger.log(name, {count: count, duration: now - lastReportDate}, {level: LOG_LEVEL.STATS});
		}

		lastReportDate = now;
		lastCount = count;
		count = 0;

		if (!(options && options.dontStart)) scheduler.schedule(logStats);
	}

	this.increment = function() { count++; };
	this.add = function(n) {
		count += n;
	};

	this.stop = function() {
		scheduler.schedule(null);

		logStats({dontStart: true});
	};
};

exports.Counters = function StatsCounters(options) {
	let name = options.name,
	    logger = options.logger,
	    calcCount = options.calcCount;

	var counts = {};

	var lastReportDate = Date.now(),
	    scheduler = new DebouncedScheduler({timeout: DEFAULT_TIMEOUT, waitFirstTime: true});

	scheduler.schedule(logStats);
	function logStats(options) {
		let now = Date.now();

		if (calcCount) counts = calcCount();

		let isSomeData = false;

		for (let key in counts) if (counts.hasOwnProperty(key)) {
			isSomeData = true;
			break;
		}

		if (isSomeData) {
			let props = Object.assign({duration: now - lastReportDate}, counts);

			logger.log(name, props, {level: LOG_LEVEL.STATS});
		}

		lastReportDate = now;
		counts = {};

		if (!(options && options.dontStart)) scheduler.schedule(logStats);
	}

	this.increment = function(key) {
		if (!counts[key]) counts[key] = 1;
		else counts[key]++;
	};
	this.add = function(key, n) {
		if (!counts[key]) counts[key] = n;
		else counts[key] += n;
	};

	this.stop = function() {
		scheduler.schedule(null);

		logStats({dontStart: true});
	};
};
