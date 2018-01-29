var AsyncM = require('asyncm');

module.exports = Memory;

function Memory() {
	this.get = AsyncM.pureF(function(id) {
		return AsyncM.result(null);
	});
}