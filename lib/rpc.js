(function(define) {'use strict'
	define("latte_rpc/rpc", ["require", "exports", "module", "window"],
 	function(require, exports, module, window) {
      var latte_lib = require("latte_lib")
        , Modules = require("latte_require")
				, latte_watch = require("latte_watch")
				, Path = require("path")
				, Net = require("net");
      var defaultConfig = {};
      (function() {
					this.log = 0;
      }).call(defaultConfig);

      var Rpc = function(config) {
        if(latte_lib.isString(config)) {
          config = {
            path: config
          }
        }
        config = latte_lib.merger(defaultConfig, config);
        this.config = config;
        this.methods = {};
        this.id = 0;
      };
			latte_lib.inherits(Rpc, latte_lib.events);
      (function() {
        this.reload = function(path){
					var self = this;
          path = path || this.config.path;
					if(!path) { return; }
          this.methods = {};
          this.config.path = path = path || this.config.path;
          this.rpcRequire =  Modules.create("./");
          //this.load(path);
          if(this.watcher) {
            this.watcher.close();
            this.watcher = null;
          }
					this.watcher = latte_watch.create(path);
					this.watcher.on("addDir", function(addDirName ) {
							self.loadDir(addDirName);
					});
					this.watcher.on("unlink" , function() {
							self.reload();
					});
					this.watcher.on("unlinkDir", function(){
							self.reload();
					});
					this.watcher.on("add", function(filename) {
							self.loadFile(filename);
					});
					this.watcher.on("change", function() {
							self.reload();
					});
					this.loadDir(path);
        }

				this.loadDir = function(path) {
						var self = this;
						var files = latte_lib.fs.readdirSync(path);
						files.forEach(function(filename) {
							var stat = latte_lib.fs.statSync(path + "/" + filename);
								 if(stat.isFile()) {
										 	self.loadFile(path + "/"+ filename);
								 }else{
									 		self.loadDir(path + "/" + filename);
								 }
						});
				}

				this.loadFile =function(path) {
						var self = this;
						var o;
						try {
							o = self.rpcRequire.require("./"+path);
						}catch(err) {
								if(self.config.log) {
										var filename = "./logs/loadRpc/"+latte_lib.format.dateFormat()+".log";
										latte_lib.fs.writeFile(filename,  latte_lib.getErrorString(err));
								}else{
										throw err;
								}
								return ;
						}
						if(o.handle) {
							self.Set(o.method, o.handle);
						}
				}

        this.Set = function(method, fn) {
          this.methods[method] = fn;
        }
          var backData = this.backData = function(err, result, id) {
            return {
              error: err,
              result: result,
              id: id
            };
          };
        this.addSocket = function(socket) {
          var self = this;
          socket.Call = function(method, params, callback) {
            socket.write(JSON.stringify({
              method: method,
              params: params,
              id: ++self.id
            }));
            callback && self.once(self.id, callback.bind(socket));
          }
          socket.on("data", function(data){
              try {
                data = JSON.parse(data);
              }catch(e) {
                return console.log(e);
              }
              if(data.method) {
                var method = self.methods[data.method];
                if(method) {
                  if(!latte_lib.isArray(data.params)) {
                    data.params = [].concat(data.params);
                  }
                  data.params.push(function(err, result) {
                      socket.write(JSON.stringify(self.backData(err, result, data.id)));
                  });
									try {
											method.apply(socket, data.params);
									} catch(e) {
											self.emit("error", e);
									}

                }
              } else if(data.id) {
                self.emit(data.id , data.error, data.result);
              }
          });
        }
      }).call(Rpc.prototype);
      module.exports = Rpc;
  });
})(typeof define === "function"? define: function(name, reqs, factory) {factory(require, exports, module); });
