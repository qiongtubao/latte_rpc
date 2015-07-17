(function(define) {'use strict'
	define("latte_rpc/slave", ["require", "exports", "module", "window"],
 	function(require, exports, module, window) {
			var latte_lib = require("latte_lib")
				, Domain = require("domain")
				, Rpc = require("../rpc")
				, Net = require("net");
      var defaultConfig = {};
      (function() {
				this.isRestart = 1;
				this.timeout = 1000;
				this.log = 0;
      }).call(defaultConfig);
      var Slave = function(config) {
          this.config = latte_lib.merger(defaultConfig, config);
          this.rpc = new Rpc(config.rpc);
					var self = this;
					this.rpc.on("error", function(err) {
							if(self.config.rpc.log) {
								var filename = "./logs/rpcClientError/"+latte_lib.format.dateFormat()+".log";
									latte_lib.fs.writeFile(filename, latte_lib.getErrorString(err));
							}else{
									throw err;
							}
					});
					this.rpc.on("rpcLoadError", function(err){
							if(self.config.rpc.log) {
								var filename = "./logs/slaveRpcLoadError/"+latte_lib.format.dateFormat()+".log";
									latte_lib.fs.writeFile(filename,  latte_lib.getErrorString(err));
							}else{
									throw err;
							}
					});
					this.rpc.reload();
					this.buffers = [];
      };
			latte_lib.inherits(Slave, latte_lib.events);
      (function() {
				this.close = function() {
					this.isRestart = 0;
					this.socket.close();
				}
				this.open = function() {
						var self = this;
						var d = Domain.create();
						d.on("error", function(err) {
								self.socket = null;
								if(err.code !== "ECONNREFUSED") {
										throw err;
								}
						});
						d.run(function(){
							var socket  =  Net.connect({
									address: self.config.host,
									port: self.config.port
								}, function() {
										self.rpc.addSocket(socket);
										self.emit("open");
										self.socket = socket;
										var buffer ;
										while(buffer = self.buffers.unshift() && self.socket) {
											self.Call(buffer.method, buffer.params, buffer.callback);
										}
								});
							socket.on("close", function(){
									self.socket = null;
									self.emit("close");
									if(self.config.isRestart) {
										self.open();
									}
							});
						});
				}
				this.Call = function(method, params, callback) {
					var self = this;
					if(this.socket) {
						this.socket.Call(method, params, callback);
					}else{
						this.buffers.push({
							method: method,
							params: params,
							callback: callback
						});
					}
				}
      }).call(Slave.prototype);
      module.exports = Slave;
  });
})(typeof define === "function"? define: function(name, reqs, factory) {factory(require, exports, module); });
