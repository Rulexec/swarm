var AsyncM = require('asyncm');

var Logger = require('./logging');

var Swarm = require('./index'),
    KeyedDataMemoryStore = require('./datak/store/memory');

var mainLogger = new Logger({ key: 'main' });

var swarm = new Swarm({
	logger: mainLogger.fork({ key: 'swarm' }),
	port: 4242,
	nodeId: 1,

	keyedStore: new KeyedDataMemoryStore()
});

AsyncM.parallel([
	swarm.start(),
	swarm.started().result(function() {
		mainLogger.log('STARTED', { port: swarm.getPort() });
	})
], { drop: true }).run(null, function(error) {
	mainLogger.error('START', null, { extra: error });
});