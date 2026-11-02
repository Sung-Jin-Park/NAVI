const { defineConfig } = require('@vue/cli-service');

module.exports = defineConfig({
  transpileDependencies: true,
  parallel: false,

  // Vercel(production)에서는 루트('/')를 사용하고, 
  // 기존 IIS 환경(또는 필요에 따라)에서는 '/N/' 경로를 사용하도록 설정
  publicPath: process.env.VERCEL ? '/' : (process.env.NODE_ENV === 'production' ? '/N/' : '/'),

  pluginOptions: {
    vuetify: {}
  },

  devServer: {
    port: 9090
  }
});