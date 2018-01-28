var Connector = require('./net/connector');

module.exports = Swarm;

function Swarm(options) {
	var port = options.port || 0,
	    nodeId = options.nodeId,
	    logger = options.logger;

	var connector = new Connector({
		port: port,

		onMessage: function(message) {
			var str = message.buffer.toString('ascii');

			var serviceMatch = /^(?:(DATA) )/.exec(str);

			switch (serviceMatch && serviceMatch[1]) {
			case 'DATA':
				console.log('ho-ho, DATA');
				break;
			}
		}
	});

	this.start = function() {
		return connector.start();
	};
	this.started = connector.started.bind(connector);

	this.getPort = connector.getPort.bind(connector);
}