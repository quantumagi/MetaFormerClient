const path = require('path');

module.exports = {
  // For development, you might use 'eval-source-map' for faster rebuilds
  mode: 'development', // or 'production'
  entry: './src/index.js', // Main entry point of your app
  output: {
    path: path.resolve(__dirname, 'build'), // Output directory
    filename: 'bundle.js', // Output bundle file name
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader', // Transpile ES6+ to backwards compatible JavaScript
        },
      },
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
        resolve: {
          fullySpecified: false
        }
      },
    ],
  },
  resolve: {
    alias: {
      // Ensure only one React version is used, helps prevent invalid hook calls
      react: path.resolve('./node_modules/react'),
      'react-dom/server': require.resolve('react-dom/server')
    },
    extensions: ['.js', '.jsx', '.json', '.mjs'], // Ensures these extensions are handled
    fullySpecified: false // Allow Webpack to automatically resolve the file extension
  },
};
