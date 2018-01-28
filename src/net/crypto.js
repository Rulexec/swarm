var crypto = require('crypto');

var AsyncM = require('asyncm');

/*
msg_key_large = SHA256 (substr (auth_key, 88+x, 32) + plaintext + random_padding);
msg_key = substr (msg_key_large, 8, 16);
sha256_a = SHA256 (msg_key + substr (auth_key, x, 36));
sha256_b = SHA256 (substr (auth_key, 40+x, 36) + msg_key);
aes_key = substr (sha256_a, 0, 8) + substr (sha256_b, 8, 16) + substr (sha256_a, 24, 8);
aes_iv = substr (sha256_b, 0, 8) + substr (sha256_a, 8, 16) + substr (sha256_b, 24, 8);
*/

exports.encrypt = AsyncM.fun(function(onResult, onError, buffer, options) {
	var {authKey, isQuery} = options;

	let padding = buffer.length % 16;
	if (padding) {
		padding = 16 - padding;

		let newBuffer = Buffer.allocUnsafe(buffer.length + padding);

		buffer.copy(newBuffer);

		for (let i = buffer.length; i < newBuffer.length; i++) {
			let rand = (Math.random() * 256) | 0;
			newBuffer.writeUInt8(rand, i);
		}

		buffer = newBuffer;
	}

	var msgKey = calcMsgKey(buffer, authKey, isQuery);

	crypt(buffer, options, msgKey, true, function(error, buffer) {
		if (error) onError(error);
		else onResult({msgKey, buffer});
	});
});
exports.decrypt = AsyncM.fun(function(onResult, onError, buffer, options) {
	crypt(buffer, options, options.msgKey, false, function(error, buffer) {
		if (error) onError(error);
		else onResult(buffer);
	});
});

function calcMsgKey(buffer, authKey, isQuery) {
	var x = isQuery ? 8 : 0;

	var msgKeyLargeHash = crypto.createHash('sha256');

	msgKeyLargeHash.update(authKey.slice(88 + x, 88 + x + 32));
	msgKeyLargeHash.update(buffer);

	var msgKeyLarge = msgKeyLargeHash.digest(),
	    msgKey = msgKeyLarge.slice(8, 8 + 16);

	return msgKey;
}

function crypt(buffer, options, msgKey, isEncrypt, callback) {
	var {authKey, isQuery} = options;

	var x = isQuery;

	var sha256_aHash = crypto.createHash('sha256');
	sha256_aHash.update(msgKey);
	sha256_aHash.update(authKey.slice(x, x + 36));
	var sha256_a = sha256_aHash.digest();

	var sha256_bHash = crypto.createHash('sha256');
	sha256_bHash.update(authKey.slice(40 + x, 40 + x + 36));
	sha256_bHash.update(msgKey);
	var sha256_b = sha256_bHash.digest();

	var aesKey = Buffer.allocUnsafe(32),
	    aesIV = Buffer.allocUnsafe(32);

	sha256_a.copy(aesKey, 0, 0, 8);
	sha256_b.copy(aesKey, 8, 8, 8 + 16);
	sha256_a.copy(aesKey, 24, 24, 24 + 8);

	sha256_b.copy(aesIV, 0, 0, 8);
	sha256_a.copy(aesIV, 8, 8, 8 + 16);
	sha256_b.copy(aesIV, 24, 24, 24 + 8);

	// Start AES 256 IGE

	var cipher;
	if (isEncrypt) cipher = crypto.createCipher('aes-256-ecb', aesKey);
	else cipher = crypto.createDecipher('aes-256-ecb', aesKey);
	cipher.setAutoPadding(false);

	var result = Buffer.allocUnsafe(buffer.length);

	var prevTop, prevBottom;

	if (isEncrypt) {
		prevTop = aesIV.slice(0, 16);
		prevBottom = aesIV.slice(16, 32);
	} else {
		prevTop = aesIV.slice(16, 32);
		prevBottom = aesIV.slice(0, 16);
	}

	var current = Buffer.allocUnsafe(16);

	for (let offset = 0; offset < buffer.length; offset += 16) {
		buffer.copy(current, 0, offset, offset + 16);

		xorBuffer(current, prevTop);

		let crypted = cipher.update(current);

		xorBuffer(crypted, prevBottom);

		crypted.copy(result, offset, 0, 16);

		prevTop = crypted;
		prevBottom = buffer.slice(offset, offset + 16);
	}

	if (!isEncrypt) {
		let actualMsgKey = calcMsgKey(result, authKey, isQuery);

		if (!msgKey.equals(actualMsgKey)) {
			callback('invalid');
			return;
		}
	}

	callback(null, result);
}

function xorBuffer(buffer, xor) {
	for (let i = 0; i < buffer.length; i++) {
		let a = buffer.readUInt8(i),
		    b = xor.readUInt8(i);

		buffer.writeUInt8(a ^ b, i);
	}
}

if (require.main === module) {
	let authKey = Buffer.from(
		'a7847ff672456c275807318f50dcd4e04696278a9531292826effa887ee9f987' +
		'86c2028ed0196701df48d1dee8e6a4635be700d9a3bb8d35b0a739d2a4455c38' +
		'aa29393e2af0151d716f14ca4dc115877fcdc01689cd89e0fc56dad72da8967a' +
		'88204ff1f56b952565796d906922222144a06b0eec897f500876f252f94f2b30' +
		'934329511ff513a03b4189e20914e080d6f5b6ab95b9c6169d53be808ecfa98e' +
		'6681e60e9dfe780cb00535b0c1a6a8ac1fe78391130cb7936d1e9c359b2a4744' +
		'9e127b3364cc25b5fa017fec6b27e6b9b14ff9eaae684e3743f9f374bc80c87e' +
		'e4443da1dbd180cc3a20dcad17cc4513585c1eaa7f4c7aecc8851931f814c681',

		'hex'
	);

	var buffer = Buffer.from('Test passed     42             ]', 'ascii');

	exports.encrypt(buffer, {authKey}).result(function(result) {
		return exports.decrypt(result.buffer, {authKey, msgKey: result.msgKey}).result(function(result) {
			console.log(result.toString('ascii'));
		});
	}).run(null, function(error) {
		console.log(error);
	});

	exports.encrypt(buffer, {authKey, isQuery: true}).result(function(result) {
		return exports.decrypt(result.buffer, {authKey, isQuery: true, msgKey: result.msgKey}).result(function(result) {
			console.log(result.toString('ascii'));
		});
	}).run(null, function(error) {
		console.log(error);
	});

	/*var start = Date.now();

	var ns = 0,
	    ops = 0;

	while (Date.now() - start < 5000) {
		ops++;

		var w = process.hrtime();

		exports.encrypt(buffer, {authKey}, function(){});

		w = process.hrtime(w);
		ns += w[0] * 1000000000;
		ns += w[1];
	}

	var elapsed = ns / 1000000000;

	console.log('Elapsed ' + elapsed + ', Ops: ' + ops + ', ops per second: ' + (ops / elapsed));*/
}
