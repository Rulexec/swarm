var AsyncM = require('asyncm');

var ParsingUtil = require('../util/parsing');

module.exports = KeyedDataService;

function KeyedDataService(options) {
	var {store} = options;

	const BAD_VERSION_ERROR = { type: 'bad_version' };

	function doSimplePut({commandName}, {paramsBuffer, reply, createBufferForReply}) {
		let key = ParsingUtil.readSizedBinary({buffer: paramsBuffer, offset: 0});
		if (!key) return AsyncM.error({ reason: 'DATAK ' + commandName + ' (nokey)' });

		let dataToWrite = ParsingUtil.readSizedBinary({buffer: paramsBuffer, offset: key.endOffset + 1});
		if (!dataToWrite) return AsyncM.error({ reason: 'DATAK ' + commandName + ' (nodata)' });

		return store.getAndLock(key.buffer, function({data, write}) {
			if (data && data.version > 1) {
				return AsyncM.error({
					type: BAD_VERSION_ERROR,
					version: data.version,
					reason: 'DATAK ' + commandName + ' (version>1)'
				});
			}

			return write({
				version: 1,
				buffer: dataToWrite.buffer
			}).skipResult(AsyncM.result({
				keyBuffer: key.buffer,
				oldVersion: data ? data.version : 0
			}));
		}).error(function(error) {
			if (error && error.type === BAD_VERSION_ERROR) {
				return;
			}

			return AsyncM.error({
				keyBuffer: key.buffer,
				originalError: error
			});
		});
	}

	var commands = {
		/*
			DATAK GET (length) (key)

			DATAK GET_OK (length) (key) 0
			DATAK GET_OK (length) (key) (length) (data)
		*/
		GET: function({message, params, paramsBuffer, reply, createBufferForReply}) {
			let match = /^(\d+) /.exec(params);
			if (!match) return AsyncM.error({reason: 'DATAK GET (nolength)', params});

			let keyLength = parseInt(match[1], 10);
			if (!isFinite(keyLength)) return AsyncM.error({reason: 'DATAK GET (infinite)', params});

			let keyLengthStr = keyLength.toString();

			let keyBuffer = paramsBuffer.slice(keyLengthStr.length + 1, keyLengthStr.length + 1 + keyLength);

			return store.get(keyBuffer).result(function(data) {
				let responseHeader = 'DATAK GET_OK ' + keyLengthStr + ' ';

				// No such item
				if (!data) {
					let buffer = createBufferForReply(
						responseHeader.length + keyBuffer.length + ' 0'.length
					);

					buffer.write(responseHeader, 'ascii');
					keyBuffer.copy(buffer, responseHeader.length);
					buffer.write(' 0', responseHeader.length + keyBuffer.length, 'ascii');

					return reply(buffer);
				}

				let responseVersionDataLength = ' ' + data.version + ' ' + data.buffer.length + ' ';

				let buffer = createBufferForReply(
					responseHeader.length + keyBuffer.length +
					responseVersionDataLength.length + data.buffer.length
				);

				let offset = 0;
				buffer.write(responseHeader, offset, 'ascii');
				offset += responseHeader.length;

				keyBuffer.copy(buffer, offset);
				offset += keyBuffer.length;

				buffer.write(responseVersionDataLength, offset, 'ascii');
				offset += responseVersionDataLength.length;

				data.buffer.copy(buffer, offset);

				return reply(buffer);
			});
		},
		/*
			DATAK PUT0 (length) (key) (length) (data)
		*/
		PUT0: function(options) {
			return doSimplePut({ commandName: 'PUT0' }, options);
		},
		/*
			DATAK PUT1 (length) (key) (length) (data)

			DATAK PUT1_OK (length) (key) (old_version)
			DATAK PUT1_FAIL (length) (key) (new_version | -1)
		*/
		PUT1: function(options) {
			let { reply, createBufferForReply } = options;

			return doSimplePut({ commandName: 'PUT1' }, options
			).next(function({ keyBuffer, oldVersion }) {
				let keyLengthStr = keyBuffer.length.toString(),
				    oldVersionStr = ' ' + oldVersion;

				let responseHeader = 'DATAK PUT1_OK ' + keyLengthStr + ' ';

				let buffer = createBufferForReply(
					responseHeader.length + keyBuffer.length + oldVersionStr.length
				);

				let offset = 0;

				buffer.write(responseHeader, offset);
				offset += responseHeader.length;

				keyBuffer.copy(buffer, offset);
				offset += keyBuffer.length;

				buffer.write(oldVersionStr, offset);

				return reply(buffer);
			}, function(error) {
				let { keyBuffer } = error;

				let newVersion = -1; // unknown error

				if (error.type === BAD_VERSION_ERROR) {
					newVersion = error.version;
				}

				let keyLengthStr = keyBuffer.length.toString(),
				    newVersionStr = ' ' + newVersion;

				let responseHeader = 'DATAK PUT1_FAIL ' + keyLengthStr + ' ';

				let buffer = createBufferForReply(
					responseHeader.length + keyBuffer.length + newVersionStr.length
				);

				let offset = 0;

				buffer.write(responseHeader, offset);
				offset += responseHeader.length;

				keyBuffer.copy(buffer, offset);
				offset += keyBuffer.length;

				buffer.write(newVersionStr, offset);

				return reply(buffer);
			});
		},
		PUT2: function(message) {},

		PUT3: function(message) {},
		PUT3_CONFIRM: function(message) {},
		PUT3_REJECT: function(message) {}
	};
	var regexp = new RegExp('^(' + Object.keys(commands).join('|') + ')(?:\\s|$)(.+)$');

	this.processMessage = AsyncM.pureF(function(options) {
		let {command, commandBuffer} = options;

		let match = regexp.exec(command);
		if (!match) return AsyncM.error('Invalid command: ' + command);

		let commandName = match[1],
		    params = match[2],
		    paramsBuffer = commandBuffer.slice(commandName.length + 1);

		let m = commands[commandName](Object.assign({}, options, { params, paramsBuffer }));
		return m || AsyncM.result();
	});
}