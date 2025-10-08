// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');


module.exports = {
  mode: 'development', // ou 'production' selon le besoin
  entry: './src/index.tsx', // point d'entrée de ton app
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true, // nettoie le dossier dist à chaque build
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      // TypeScript
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      // CSS
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      // Images et fonts
      {
        test: /\.(png|jpg|jpeg|gif|svg|woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  new CopyWebpackPlugin({
    patterns: [
      { from: 'public/images', to: 'images' }, // copies images to dist/images
    ],
  }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    
    compress: true,
    port: 3000,
    open: true,
    hot: true,
  },
};
