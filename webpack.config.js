var webpack = require("webpack");

module.exports = {
  entry: "./public/entry.js",
  output: {
    path: "./public",
    filename: "bundle.js"
  },
  module: {
    loaders: [
      { test: /\.css$/, loader: "style-loader!css-loader" }
    ]
  },
  resolve: {
    modules: ['public/libs', 'node_modules'],
  },
  plugins: [
    new webpack.ProvidePlugin({
      $: "jquery",
      jQuery: "jquery"
    })
  ]
};
