const webpack = require('webpack');

module.exports = {
  entry: './js/index.js',
  output: {
    filename: './package/staticresources/fuse_setup.resource',
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin(),
  ],
};
