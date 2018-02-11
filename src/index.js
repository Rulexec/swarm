var Connector = require('./net/connector'),
    KeyedDataService = require('./datak'),
    ParallelScheduler = require('./async/parallel-scheduler');

module.exports = Swarm;

function Swarm(options) {
	var {port, nodeId, logger, keyedStore} = options;

	if (!port) port = 0;

	var keyedDataService = new KeyedDataService({
		store: keyedStore
	});

	var scheduler = new ParallelScheduler();

	var connector = new Connector({
		port: port,

		onMessage: function(message) {
			var str = message.buffer.toString('ascii');

			console.log('< ' + str);

			var match = /^([0-9a-fA-F]{16}) (?:(DATAK) )(.+)$/.exec(str);
			if (!match) return;

			var requestId = match[1],
			    serviceName = match[2],
			    command = match[3],
			    commandBuffer = message.buffer.slice(16 + 1 + serviceName.length + 1);

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
				allocatedBufferSlice = allocatedBuffer.slice(requestId.length + 1);
				return allocatedBufferSlice;
			}

			switch (serviceName) {
			case 'DATAK':
				scheduler.schedule(function() {
					return keyedDataService.processMessage({
						requestId, command, commandBuffer, message, reply, createBufferForReply
					}).error(function(error) {
						logger.warn('DATAK', null, { extra: error });
					});
				});
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