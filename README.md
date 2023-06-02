# replace-text-in-bundle-plugin

A webpack plugin for replacing text in bundle files.

## Installation

Install the plugin using npm:

```shell
npm i --save-dev replace-text-in-bundle-plugin
```

## Usage

1. Import the plugin in your webpack configuration file:

   ```javascript
   const ReplaceTextInBundlePlugin = require('replace-text-in-bundle-plugin');
   ```

2. Add an instance of the plugin to the `plugins` array in your webpack configuration:

   ```javascript
   plugins: [
     new ReplaceTextInBundlePlugin([
       {
         bundle: 'main.bundle.js',
         from: '"${temp_base_url}"',
         to: `window.site_base_url + "/some/path/to/"`,
       },
       {
         bundle: 'style.css',
         from: '${temp_base_url}',
         to: '',
       }
     ])
   ]
   ```

   The plugin takes an array of objects as an argument. Each object represents a replacement configuration. The properties of the configuration object are as follows:
   - `bundle`: The name of the generated bundle file to modify.
   - `from`: The text pattern to search for in the bundle.
   - `to`: The replacement text to use.

   In the above example, the plugin will replace `"${temp_base_url}"` with `window.site_base_url + "/some/path/to/"` in the `main.bundle.js` file, and `${temp_base_url}` with an empty string in the `style.css` file.

## Use Case

This plugin is useful when you need to dynamically replace specific text patterns in your bundle files during the webpack build process. For example, you may want to replace placeholder URLs or environment-specific values with actual values.

In the provided usage example, the plugin replaces the `${temp_base_url}` placeholder with a custom URL defined in the `window.site_base_url` variable, concatenated with the value of `/some/path/to/`. This allows you to dynamically set the base URL for your application or replace any other placeholders as needed.

Note: Make sure that the specified text patterns (`from`) exist in the bundle files you're targeting, otherwise the plugin won't make any changes.

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

---