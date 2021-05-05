
const path = require('path');

module.exports = {
  entry: ['./src/main.js'],
  output: {
    path       : path.resolve(__dirname, 'dist'),
    filename   : 'bundle.js',
    publicPath : '/'
  },
  module: {
    rules: [
      {
        test: /\.(html|svelte)$/,
        use: 'svelte-loader'
      },
      {
        // required to prevent errors from Svelte on Webpack 5+
        test: /node_modules\/svelte\/.*\.mjs$/,
        resolve: {
          fullySpecified: false
        }
      }
    ]
  },
  resolve: {
    extensions : ['.js', '.svelte'],
    modules    : ['node_modules', 'public', 'src']
  }
};
