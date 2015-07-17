(function(define) {'use strict'
	define("latte_rpc/master", ["require", "exports", "module", "window"],
 	function(require, exports, module, window) {
      var Net = require("net");
			var latte_lib = require("latte_lib");
			var Rpc = require("../rpc");
      var defaultConfig = {};
      (function() {
				this.log = 0;
      }).call(defaultConfig);
      var Master = function(config) {
          this.config = latte_lib.merger(defaultConfig, config);
          this.rpc = new Rpc(this.config.rpc);
					var self = this;
					this.rpc.on("error", function(err) {
							if(self.config.rpc.log) {
								var filename = "./logs/rpcServerError/"+latte_lib.format.dateFormat()+".log";
									latte_lib.fs.writeFile(filename,  latte_lib.getErrorString(err));
							}else{
								throw err;
							}
					});
					this.rpc.on("rpcLoadError", function(err){
							if(self.config.rpc.log) {
								var filename = "./logs/masterRpcLoadError/"+latte_lib.format.dateFormat()+".log";
									latte_lib.fs.writeFile(filename,  latte_lib.getErrorString(err));
							}else{
									throw err;
							}
					});
					this.rpc.reload();
          this.sockets = [];
      };
			latte_lib.inherits(Master, latte_lib.events);
      (function() {
          this.run = function() {
              var self = this;
              var server = this.server = Net.createServer(function(socket) {
                  self.rpc.addSocket(socket);
                  self.sockets.push(socket);
                  socket.on("end", function() {
                      var index = self.sockets.indexOf(socket);
                      if(index != -1) {
                        latte_lib.removeLocalArray(self.sockets, index);
                      }
                  });
              });
              server.listen(this.config.port);
          }
          this.CallAll = function(method, params, cb) {
            var self = this;
            if(cb) {
              var funcs = this.sockets.map(function(socket) {
                  return function(callback) {
                    socket.Call(method, params, function(error, data) {
                      callback(null, {
                        error: error,
                        data: data,
												socket: socket
                      });
                    });
                  };
              });
              latte_lib.async.parallel(funcs, function(err, all) {
                  cb(err, all);
              });
            }else{
              this.sockets.forEach(function(socket) {
                socket.Call(method, params);
              });
            }
          }
      }).call(Master.prototype);
      module.exports = Master;
  });
})(typeof define === "function"? define: function(name, reqs, factory) {factory(require, exports, module); });
