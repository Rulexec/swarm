var AsyncM = require('asyncm');

var Logger = require('./logging');

var Swarm = require('./index'),
    DataMemoryStore = require('./data/store/memory');

var mainLogger = new Logger({ key: 'main' });

var swarm = new Swarm({
	logger: mainLogger.fork({ key: 'swarm' }),
	port: 4242,
	nodeId: 1,

	dataStore: new DataMemoryStore()
});

AsyncM.parallel([
	swarm.start(),
	swarm.started().result(function() {
		mainLogger.log('STARTED', { port: swarm.getPort() });
	})
], { drop: true }).run(null, function(error) {
	mainLogger.error('START', null, { extra: error });
});