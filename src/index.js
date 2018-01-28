var Connector = require('./net/connector');

var connector = new Connector({
	port: parseInt(process.argv[2], 10),

	onMessage: function(message) {
		console.log('message', message.buffer.toString('ascii'), message.buffer.length);
	}
});

connector.start().run(null, function(error) {
	console.log('error', error);
});

connector.started().result(function() {
	var port = connector.getPort();

	console.log('port', port);

	//if (parseInt(process.argv[3])) connector.send('localhost', 4242, Buffer.from(''.padStart(466 + 1, 'x'))).run();
}).run();
