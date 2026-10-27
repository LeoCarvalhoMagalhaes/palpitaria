// GitHub Pages não conhece as rotas do app: copiar o index.html para 404.html faz qualquer
// endereço (ex.: /palpitaria/grauzinho) abrir o site, e o roteador mostra a página certa.
import fs from 'node:fs'
fs.copyFileSync('dist/index.html', 'dist/404.html')
console.log('dist/404.html criado')
