import{sources as e}from"webpack";function t(e){return t="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},t(e)}function r(e){var r=function(e,r){if("object"!==t(e)||null===e)return e;var n=e[Symbol.toPrimitive];if(void 0!==n){var o=n.call(e,r||"default");if("object"!==t(o))return o;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===r?String:Number)(e)}(e,"string");return"symbol"===t(r)?r:String(r)}function n(e,t){for(var n=0;n<t.length;n++){var o=t[n];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(e,r(o.key),o)}}var o=function(){function t(e){var n,o,i;!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,t),n=this,i=void 0,(o=r(o="options"))in n?Object.defineProperty(n,o,{value:i,enumerable:!0,configurable:!0,writable:!0}):n[o]=i,this.options=e}var o,i,a;return o=t,(i=[{key:"apply",value:function(t){var r=this;if(!Array.isArray(this.options))throw new Error("ReplaceTextInBundlePlugin: Expected an array in options");t.hooks.emit.tap("ReplaceTextInBundlePlugin",(function(t){r.options.forEach((function(r){if(void 0===r.bundle||void 0===r.from||void 0===r.to)throw new Error("ReplaceTextInBundlePlugin: Invalid object key");var n=t.assets[r.bundle].source().replace(new RegExp(r.from,"g"),r.to);t.assets[r.bundle]=new e.RawSource(n)}))}))}}])&&n(o.prototype,i),a&&n(o,a),Object.defineProperty(o,"prototype",{writable:!1}),t}();export{o as default};