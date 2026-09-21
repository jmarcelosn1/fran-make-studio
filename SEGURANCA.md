# Segurança

Site estático: HTML, CSS e JavaScript servidos como arquivos. Não há banco de dados, login, painel administrativo, formulário que grave dados, upload ou API própria. Isso elimina as classes de ataque mais comuns (invasão de conta, injeção de SQL, roubo de dados de clientes), porque não existe nada no servidor para invadir. O que resta proteger é a integridade do que o navegador carrega, e é disso que este documento trata.

Tudo em `config.js` é público. Nunca coloque senhas, tokens ou chaves nele.

## Cabeçalhos HTTP (vercel.json e _headers)

A fonte é o `vercel.json`. O build gera a partir dele o `dist/_headers`, formato da Cloudflare Pages, então as duas hospedagens recebem os mesmos cabeçalhos; edite só o `vercel.json`. O servidor local de testes (`quality/server.cjs`) lê o mesmo arquivo, então os testes conferem exatamente o que vai para produção.

| Cabeçalho | O que faz |
|---|---|
| Content-Security-Policy | Lista branca do que a página pode carregar (detalhe abaixo). |
| Strict-Transport-Security | Obriga HTTPS por 2 anos, inclusive subdomínios; impede rebaixamento para HTTP. |
| X-Frame-Options: DENY e frame-ancestors 'none' | Ninguém coloca o site dentro de um iframe (protege contra clickjacking). |
| X-Content-Type-Options: nosniff | O navegador não "adivinha" tipos de arquivo. |
| Referrer-Policy: strict-origin-when-cross-origin | Outros sites recebem só o domínio de origem, nunca o caminho. |
| Cross-Origin-Opener-Policy: same-origin | Janelas de outros sites não conseguem controlar esta aba. |
| Cross-Origin-Resource-Policy: same-origin | Outros sites não conseguem embutir as fotos e vídeos direto do servidor. |
| Permissions-Policy | Câmera, microfone, localização, pagamento, USB e captura de tela desligados. |
| Cache-Control | Imagens e vídeos em cache por 7 dias (celular rápido na segunda visita); HTML, JS e CSS sempre revalidados, para uma correção aparecer na hora. |

### Content-Security-Policy

- **Scripts:** só os arquivos do próprio site. Nada de script inline nem `eval`: mesmo que alguém conseguisse injetar texto na página, ele não rodaria.
- **Estilos e fontes:** só os arquivos do próprio site. O único inline liberado é o atributo `style` (`style-src-attr`), exigido pelo SplitType para montar as palavras dos títulos; tags `<style>` inline continuam bloqueadas.
- **Mapa:** iframes só dos domínios do Google Maps. O iframe tem `sandbox` (só scripts, a própria origem dele e abrir o Maps em nova aba) e envia apenas o domínio como referência.
- **Demais:** imagens e vídeo só locais (`blob:` para os vídeos da abertura), conexões só com o próprio site, sem workers, sem plugins (`object-src 'none'`), `base-uri` e `form-action` travados.

## Bibliotecas e fontes

GSAP, ScrollTrigger, Lenis e SplitType ficam em `vendor/`, e DM Sans e Manrope em `fonts/`, servidos pelo próprio site. As bibliotecas são cópias idênticas às das CDNs oficiais, conferidas por hash SHA-384 antes de copiar (licenças em `vendor/LICENCAS.md`). Sem CDN nem Google Fonts, não há terceiro que possa trocar um arquivo, e a política de conteúdo aceita só a própria origem (além do mapa). Para atualizar uma biblioteca, baixe a nova versão da fonte oficial, confira o hash publicado e substitua o arquivo em `vendor/`:

```bash
curl -sL URL_DO_ARQUIVO | openssl dgst -sha384 -binary | openssl base64 -A
```

O contorno de luz é código próprio (sem biblioteca 3D).

## Código

- Nenhum `innerHTML`, `eval`, `new Function` ou `document.write`; textos traduzidos entram por `textContent` (o teste de contratos bloqueia `innerHTML`).
- Links de WhatsApp e Instagram do `config.js` só são aceitos se forem HTTPS e do domínio certo; mídia só local.
- Todos os links externos abrem com `rel="noopener noreferrer"`.
- O `localStorage` guarda só a escolha de idioma, e o valor lido é comparado, nunca executado.
- Dependências de desenvolvimento verificadas por `npm audit` na esteira; o Dependabot abre atualizações semanais.

## O que é publicado

Só o que está em `quality/site-files.cjs` vai para `dist/` e para o ar: as duas páginas, CSS, JS, `config.js`, `i18n`, `images`, favicon e `robots.txt`. Ficam de fora: o guia (`guia.*`), testes, documentação, `package.json`, originais em `_fontes/` e configurações locais. O teste de ponta a ponta confere que esses arquivos respondem 404.

## Repositório (GitHub)

- `.gitignore` exclui `node_modules`, `dist`, `.env`, os originais em `_fontes/` (fotos de clientes em alta resolução) e as pastas locais do editor e do assistente (`.claude/`, `.agents/`), que continham caminhos da máquina e histórico de comandos.
- Não há segredos no código nem no histórico.
- Recomendado: repositório **privado**, verificação em duas etapas na conta do GitHub e na Vercel, e regra de proteção na branch `main` (ver `QUALIDADE.md`).
- Guarde `_fontes/` num backup separado (HD externo ou nuvem pessoal): esses arquivos não estão no Git.

## Alterar sem quebrar

Para integrar outro fornecedor, adicione só o domínio exato na diretiva certa: `script-src` para JavaScript, `style-src` para CSS, `img-src` para imagens, `media-src` para vídeo, `frame-src` para iframes, `connect-src` para requisições. Sem curingas e sem `unsafe-eval`. Depois rode `npm run quality`: o teste de cabeçalhos e o console dos quatro navegadores acusam bloqueios.

Nenhuma configuração é garantia absoluta: mantenha as contas (GitHub, Vercel, domínio, Google) com senha forte e verificação em duas etapas, porque é por elas, e não pelo site, que um invasor conseguiria alterar o conteúdo.
