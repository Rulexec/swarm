var Connector = require('./net/connector');

var connector = new Connector({
	//port: parseInt(process.argv[2], 10)
	port: 0,

	onMessage: function(message) {
		console.log('message <', message.buffer.toString('ascii'));
	}
});

connector.start().run(null, function(error) {
	console.log('error', error);
});

connector.started().result(function() {
	var port = connector.getPort();

	console.log('port', port);

	var sendTo = parseInt(process.argv[3]) || 4242;

	//if (sendTo) connector.send('localhost', sendTo, Buffer.from('0000000000000000 DATAK GET 4 test')).run();
	if (sendTo) connector.send('localhost', sendTo, Buffer.from('0000000000000000 DATAK PUT1 4 test 2 42')).run();
}).run();
