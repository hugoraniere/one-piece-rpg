import { defineConfig } from 'vite';

// Porta vem de PORT quando definida (permite rodar mais de uma instância
// do dev server ao mesmo tempo, ex: duas sessões trabalhando no projeto em
// paralelo); 8642 continua sendo o padrão pra quem rodar `npm run dev` direto.
export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 8642,
  },
});
