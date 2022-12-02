/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: https://www.gatsbyjs.com/docs/node-apis/
 */

const webpack = require("webpack");

exports.onCreateWebpackConfig = function addPathMapping({
  stage,
  actions,
  getConfig,
}) {
  actions.setWebpackConfig({
    experiments: {
      asyncWebAssembly: true,
    },
    plugins: [
      // Work around for Buffer is undefined:
      // https://github.com/webpack/changelog-v5/issues/10
      new webpack.ProvidePlugin({
        Buffer: ["buffer", "Buffer"],
      }),
    ],
    resolve: {
      fallback: {
        assert: require.resolve("assert/"),
        buffer: require.resolve("buffer"),
        crypto: require.resolve("crypto-browserify"),
        fs: false,
        http: require.resolve("http-browserify"),
        https: require.resolve("https-browserify"),
        os: require.resolve("os-browserify/browser"),
        path: false,
        stream: require.resolve("stream-browserify"),
        url: require.resolve("url/"),
      },
    },
  });
};
