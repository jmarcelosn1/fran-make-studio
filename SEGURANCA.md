# Configuração de segurança

O site continua editável em HTML, CSS e JavaScript. Não há painel público de administração, upload remoto ou endpoint que grave arquivos. O guia gera config.js para baixar e substituir manualmente. Todos os valores de config.js são públicos: nunca guarde senhas, tokens ou chaves privadas nele.

## Cabeçalhos

vercel.json configura a hospedagem Vercel quando o projeto for publicado. Não altera o vínculo existente nem publica automaticamente. No servidor local simples os cabeçalhos não são aplicados. Em outra hospedagem, configure os mesmos valores no painel ou arquivo de cabeçalhos correspondente.

- Content-Security-Policy restringe scripts aos arquivos locais, Unpkg e cdnjs. Não permite eval ou scripts inline. Estilos inline são necessários para GSAP, partículas, tilt e a documentação interativa.
- frame-src permite o mapa apenas nos domínios Google listados. frame-ancestors e X-Frame-Options impedem que terceiros coloquem o site em iframes.
- X-Content-Type-Options impede interpretação incorreta dos tipos de arquivo.
- Referrer-Policy limita as informações de navegação enviadas para outros sites.
- Permissions-Policy desativa câmera, microfone e geolocalização, recursos que este site não usa. O mapa usa coordenadas fixas e continua funcionando.

## Alterar sem quebrar recursos

Antes de integrar outro fornecedor, adicione somente seu domínio exato na diretiva correspondente: script-src para JavaScript, style-src para CSS, img-src para imagens, media-src para vídeo, frame-src para iframes e connect-src para consultas. Evite curingas e não adicione unsafe-eval. Mantenha cópia do arquivo anterior e teste console, intro, mapa, menu e WhatsApp após a alteração.

O código aceita somente imagens e vídeos locais na configuração de mídia. O mapa e os contatos validam protocolo HTTPS e domínios conhecidos. A edição usa texto e propriedades do DOM, sem interpretar HTML fornecido pelo formulário.

A cena do pincel busca o clipe com `fetch` na própria origem e o exibe por `blob:`. Isso já é permitido por `connect-src 'self'` e `media-src 'self' blob:`, então nenhuma diretiva precisou ser afrouxada. O mesmo vale para `portfolio.html`, que não carrega nenhum recurso externo além das fontes já autorizadas.

As dependências CDN têm versões fixadas. Atualize uma por vez e confira a documentação oficial. As regras não substituem atualizações da hospedagem, controle de acesso da conta ou revisão de código; não representam garantia absoluta de segurança.

Não há contador de visitantes, avaliações ou rastreador de analytics adicionado. O mapa Google e os CDNs fazem requisições externas quando carregados.
