import vue from '@vitejs/plugin-vue'
import tailwind from 'tailwindcss'
import path from 'node:path'
export default {
  root: path.resolve('.local/startup-delay-preview'),
  plugins: [vue()],
  resolve: { alias: { '~': process.cwd(), 'vue': path.resolve('../node_modules/.pnpm/node_modules/vue/dist/vue.runtime.esm-bundler.js') } },
  css: { postcss: { plugins: [tailwind({ config: path.resolve('tailwind.config.js') })] } },
  server: { host: '127.0.0.1', port: 4317, strictPort: true, fs: { allow: [process.cwd()] } },
}
