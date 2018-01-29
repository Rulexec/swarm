var AsyncM = require('asyncm');

module.exports = DataService;

function DataService(options) {
	var {store} = options;

	var commands = {
		GET: function({params, reply, createBufferForReply}) {
			let match = /^(\d+)$/.exec(params);
			if (!match) return AsyncM.error('GET no id');

			let id = parseInt(match[1], 10);
			if (!isFinite(id) || id > Number.MAX_SAFE_INTEGER) return AsyncM.error('too big id');

			return store.get(id).result(function(data) {
				// No such item
				if (!data) return reply('DATA GET_OK ' + id + ' 0');

				let response = 'DATA GET_OK ' + id + ' ' + data.version + ' ' + data.buffer.length + ' ';

				let buffer = createBufferForReply(response.length + data.buffer.length);

				buffer.write(response, 'ascii');
				data.buffer.copy(buffer, response.length);

				return reply(buffer);
			});
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
		let {command} = options;

		let match = regexp.exec(command);
		if (!match) return AsyncM.error('Invalid command: ' + command);

		let commandName = match[1],
		    params = match[2];

		let m = commands[commandName](Object.assign({}, options, { params }));
		return m || AsyncM.result();
	});
}