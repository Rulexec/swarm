/*
	Given buffer with ascii-encoded decimal size, space, binary data, like:

	12 Answer is 42 cont

	In result we should get { buffer: Buffer.from('Answer is 42'), endOffset: 15 }
	or null, if there is no number, or not enough bytes
*/
exports.readSizedBinary = function({buffer, offset}) {
	let number = 0;

	const ZERO_ASCII = 48,
	      SPACE_ASCII = 32;

	let i = offset;

	for (; i < buffer.length; i++) {
		let c = buffer.readUInt8(i);

		if (c === SPACE_ASCII) break;

		let n = c - ZERO_ASCII;

		if (n < 0 || n >= 10) return null;

		number *= 10;
		number += n;
	}

	if (number > Number.MAX_SAFE_INTEGER) return null;

	i++;

	let sizeLeft = buffer.length - i;

	if (sizeLeft < number) return null;

	return {
		buffer: buffer.slice(i, i + number),
		endOffset: i + number
	}
};

if (require.main === module) {
	let buffer = Buffer.from('start 12 Answer is 42 cont', 'ascii');

	let result = exports.readSizedBinary({buffer, offset: 'start '.length});

	if (!result) {
		console.log('No result', result);
		process.exit(1);
	}

	let expectedEndOffset = 'start 12 Answer is 42'.length;
	if (result.endOffset !== expectedEndOffset) {
		console.log('Wrong end offset: ' + result.endOffset + ', expected: ' + expectedEndOffset);
		process.exit(1);
	}

	if (!result.buffer.equals(Buffer.from('Answer is 42'))) {
		console.log('Invalid result buffer: ' + result.buffer.toString('ascii'));
		process.exit(1);
	}

	console.log('OK');
}