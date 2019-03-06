const path = require('path');
const webpack = require('webpack');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const env = require('./.env.json');

const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  mode: isProd ? 'production' : 'development',
  entry: {
    vendor: ['pixi.js', 'vue', 'mousetrap'],
    main: 'src/index',
  },
  output: {
    filename: '[name].[hash].js',
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendor: {
          chunks: 'initial',
          name: 'vendor',
          test: 'vendor',
          filename: 'vendor.[contenthash].js',
          enforce: true,
        },
      },
    },
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
        ],
      },
      {
        type: 'javascript/auto',
        test: /\.(png|jpg|gif|json)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
            },
          },
        ],
      },
    ],
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, 'src/'),
    },
    extensions: ['.js', '.vue'],
  },
  plugins: [
    new webpack.DefinePlugin({
      DEBUG: JSON.stringify(!isProd),
    }),
    new VueLoaderPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name].[hash].css',
    }),
    new HTMLWebpackPlugin({
      template: 'src/index.html',
      favicon: 'src/assets/favicon.ico',
    }),
    new webpack.DefinePlugin({
      'process.env.API_BASE_URL': JSON.stringify(env.API_BASE_URL),
    }),
  ],
};
