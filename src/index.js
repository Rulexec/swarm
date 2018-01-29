var Connector = require('./net/connector'),
    DataService = require('./data'),
    ParallelScheduler = require('./async/parallel-scheduler');

module.exports = Swarm;

function Swarm(options) {
	var port = options.port || 0,
	    nodeId = options.nodeId,
	    logger = options.logger,

	    dataStore = options.dataStore;

	var dataService = new DataService({
		store: dataStore
	});

	var scheduler = new ParallelScheduler();

	var connector = new Connector({
		port: port,

		onMessage: function(message) {
			var str = message.buffer.toString('ascii');

			console.log('< ' + str);

			var match = /^([0-9a-fA-F]{16}) (?:(DATA) )(.+)$/.exec(str);
			if (!match) return;

			var requestId = match[1],
			    serviceName = match[2],
			    command = match[3];

			var allocatedBuffer = null,
			    allocatedBufferSlice = null;

			function reply(data) {
				if (typeof data === 'string') {
					data = requestId + ' ' + data;
					console.log('> ' + data);
					return message.reply(Buffer.from(data, 'ascii'));
				}

				var buffer;

				if (data === allocatedBufferSlice) {
					buffer = allocatedBuffer;

					buffer.write(requestId + ' ', 'ascii');
				} else {
					if (allocatedBuffer) logger.warning('allocatedBufferNotUsed', null, { extra: new Error('Allocated buffer is not used') });

					buffer = Buffer.allocUnsafe(requestId.length + 1 + data.length);
					buffer.write(requestId + ' ', 'ascii');
					data.copy(buffer, requestId.length + 1);
				}

				console.log('> ' + buffer.toString('ascii'));

				return message.reply(buffer);
			}

			function createBufferForReply(size) {
				allocatedBuffer = Buffer.allocUnsafe(requestId.length + 1 + size);
				allocatedBufferSlice = buffer.slice(requestId.length + 1);
				return allocatedBufferSlice;
			}

			switch (serviceName) {
			case 'DATA':
				scheduler.schedule(dataService.processMessage.bind(dataService, { requestId, command, message, reply, createBufferForReply }));
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