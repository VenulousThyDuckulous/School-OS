import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base: works at USERNAME.github.io/REPOSITORY/ without hard-coding.
export default defineConfig({ plugins: [react()], base: './' });
