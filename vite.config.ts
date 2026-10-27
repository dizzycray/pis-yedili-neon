import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages bir proje sitesini https://<kullanıcı>.github.io/<repo>/ altında sunar.
// İş akışı VITE_BASE_PATH değişkenini "/<repo>/" olarak ayarlar; yerelde kök ("/") kullanılır.
// `vite preview` de derlenmiş çıktıyı aynı alt yolda sunmalıdır.
// Vercel siteyi alan adının kökünden sunar; orada derleme sırasında VERCEL=1 tanımlıdır.
const defaultBuildBase = process.env.VERCEL ? '/' : '/pis-yedili/';

export default defineConfig(({ command, isPreview }) => ({
  base: process.env.VITE_BASE_PATH ?? (command === 'build' || isPreview ? defaultBuildBase : '/'),
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
}));
