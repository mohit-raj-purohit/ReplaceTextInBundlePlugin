(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('webpack')) :
  typeof define === 'function' && define.amd ? define(['exports', 'webpack'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.replaceTextInBundlePlugin = {}, global.webpack));
})(this, (function (exports, webpack) { 'use strict';

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _typeof(obj) {
    "@babel/helpers - typeof";

    return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) {
      return typeof obj;
    } : function (obj) {
      return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    }, _typeof(obj);
  }

  function _toPrimitive(input, hint) {
    if (_typeof(input) !== "object" || input === null) return input;
    var prim = input[Symbol.toPrimitive];
    if (prim !== undefined) {
      var res = prim.call(input, hint || "default");
      if (_typeof(res) !== "object") return res;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return (hint === "string" ? String : Number)(input);
  }

  function _toPropertyKey(arg) {
    var key = _toPrimitive(arg, "string");
    return _typeof(key) === "symbol" ? key : String(key);
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
    }
  }
  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    Object.defineProperty(Constructor, "prototype", {
      writable: false
    });
    return Constructor;
  }

  function _defineProperty(obj, key, value) {
    key = _toPropertyKey(key);
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }
    return obj;
  }

  var ReplaceTextInBundlePlugin = /*#__PURE__*/function () {
    function ReplaceTextInBundlePlugin(options) {
      _classCallCheck(this, ReplaceTextInBundlePlugin);
      _defineProperty(this, "options", void 0);
      this.options = options;
    }
    _createClass(ReplaceTextInBundlePlugin, [{
      key: "apply",
      value: function apply(compiler) {
        var _this = this;
        if (!Array.isArray(this.options)) {
          throw new Error("ReplaceTextInBundlePlugin: Expected an array in options");
        }
        compiler.hooks.emit.tap('ReplaceTextInBundlePlugin', function (compilation) {
          _this.options.forEach(function (option) {
            if (option.bundle === undefined || option.from === undefined || option.to === undefined) {
              throw new Error("ReplaceTextInBundlePlugin: Invalid object key");
            }
            var bundleSource = compilation.assets[option.bundle].source();
            var modifiedBundleSource = bundleSource.replace(new RegExp(option.from, 'g'), option.to);
            compilation.assets[option.bundle] = new webpack.sources.RawSource(modifiedBundleSource);
          });
        });
      }
    }]);
    return ReplaceTextInBundlePlugin;
  }();

  exports.default = ReplaceTextInBundlePlugin;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=index.development.js.map
