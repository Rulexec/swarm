var AsyncM = require('asyncm');

module.exports = DataService;

function DataService() {
	var commands = {
		GET: function({params, reply}) {
			var match = /^(\d+)$/.exec(params);
			if (!match) return AsyncM.error('GET no id');

			var id = parseInt(match[1], 10);
			if (!isFinite(id) || id > Number.MAX_SAFE_INTEGER) return AsyncM.error('too big id');

			if (id === 42) return reply('DATA GET_OK ' + id + ' 1 6 Answer');
		},
		PUT0: function(message) {},
		PUT1: function(message) {},
		PUT2: function(message) {},

		PUT3: function(message) {},
		PUT3_CONFIRM: function(message) {},
		PUT3_REJECT: function(message) {}
	};
	var regexp = new RegExp('^(' + Object.keys(commands).join('|') + ')(?:\\s|$)(.+)$');

	this.processMessage = AsyncM.pureF(function(options) {
		var {command} = options;

		var match = regexp.exec(command);
		if (!match) return AsyncM.error('Invalid command: ' + command);

		var commandName = match[1],
		    params = match[2];

		var m = commands[commandName](Object.assign({}, options, { params }));
		return m || AsyncM.result();
	});
}