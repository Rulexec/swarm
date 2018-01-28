var dateFormat = require('dateformat');

module.exports = Logger;

var LEVEL = {
	ERROR: 'E',
	WARN: 'W',
	WARNING: 'W',
	INFO: 'I',
	TRACE: 'T',
	PROFILE: 'P',
	STATS: 'S'
};

var lastDate = null,
    lastCounter = 0;

function Logger(options) {
	var loggerId = options && options.key;

	this.log = function(key, props, options) {
		var arr = [];

		arr.push(options && options.level || LEVEL.INFO);
		arr.push(getUniqueTime());
		arr.push(loggerId || 'main');
		arr.push(escape(key));

		if (props) for (let id in props) if (props.hasOwnProperty(id)) {
			arr.push(escapeIncludingColon(id) + ':' + escape('' + props[id]));
		}

		if (options && options.extra) {
			arr.push('|');

			if (options.extra instanceof Error) arr.push('stack:' + escape(options.extra.stack));
			else arr.push(JSON.stringify(options.extra));
		}

		process.stdout.write(arr.join(' '));
		process.stdout.write('\n');

		function escapeIncludingColon(str) {
			return str.replace(/[:\s\n]/g, function(x) {
				switch (x) {
				case ':': return '\\:';
				case ' ': return '\\ ';
				case '\n': return '\\n';
				default: return x;
				}
			});
		}
		function escape(str) {
			return str.replace(/[\s\n]/g, function(x) {
				switch (x) {
				case ' ': return '\\ ';
				case '\n': return '\\n';
				default: return x;
				}
			});
		}
	};
	this.error = function(key, props, options) { return this.log(key, props, Object.assign(options, { level: LEVEL.ERROR })); };

	this.fork = function(opts) {
		return new Logger(Object.assign({}, options, opts, {
			key: loggerId ? loggerId + ':' + options.key : opts.key
		}));
	};

	function getUniqueTime() {
		let date = new Date();

		let utc = date.getTime();

		let counter;

		if (lastDate === utc) {
			counter = lastCounter + 1;
		} else {
			counter = date.getMilliseconds() * 1000;
		}

		if (counter >= 1000000) {
			utc++;
			counter = 0;
		}

		lastDate = utc;
		lastCounter = counter;

		let formattedDate = dateFormat(lastDate, 'UTC:yyyy-mm-dd\'Z\'HH:MM:ss.');

		formattedDate += counter.toString().padStart(6, '0');

		return formattedDate;
	}
}

Logger.LEVEL = LEVEL;
