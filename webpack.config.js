var webpack = require("webpack");
var ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
  entry: "./public/entry.js",
  output: {
    path: "./public",
    filename: "bundle.js"
  },
  module: {
    loaders: [
      {
	test: /\.css$/,
	loader: ExtractTextPlugin.extract({
	  fallbackLoader: 'style-loader',
	  loader: 'css-loader' })
      }
    ]
  },
  resolve: {
    modules: ['public/libs', 'node_modules'],
  },
  plugins: [
    new webpack.ProvidePlugin({
      $: "jquery",
      jQuery: "jquery"
    }),
    new ExtractTextPlugin({
      filename: "css/bundle.css",
      allChunks: false,
      disable: false})
  ]
};
