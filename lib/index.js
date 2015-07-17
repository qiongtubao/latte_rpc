(function(define) {'use strict'
	define("latte_rpc", ["require", "exports", "module", "window"],
 	function(require, exports, module, window) {
      var Master = require("./master")
        , Slave = require("./slave");
      (function() {
          this.createServer = function(config) {
              var master = new Master(config);
              return master;
          }
          this.createClient = function(config) {
              var slave = new Slave(config);
              return slave;
          }
      }).call(module.exports);
  });
})(typeof define === "function"? define: function(name, reqs, factory) {factory(require, exports, module); });
