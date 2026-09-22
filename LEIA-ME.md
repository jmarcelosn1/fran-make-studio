# Fran Make Studio

Site estático nas cores da logo. Abra `guia.html` localmente para a documentação interativa (ele não é publicado no site): demonstrações, catálogo de imagens, exemplos, busca, checklist e gerador de configuração.

## Abrir e publicar

Com Node 22 ou superior, execute `npm ci`, instale o navegador de testes com `npx playwright install chromium` e rode `npm run quality` e `npm run security`. Abra a prévia com `npm run preview` em http://127.0.0.1:4173. Publique somente a pasta `dist/`, gerada pelo build. A configuração Vercel já aponta para essa pasta. O site tem duas páginas: `index.html` e `portfolio.html`. Nenhuma publicação foi realizada. Veja `QUALIDADE.md` para a esteira, proteção da branch e pendências externas.

O arquivo principal já se chamou `index (5).html`. Esse nome quebrava o build, a esteira e a hospedagem, porque a Vercel serve a raiz a partir de `index.html`. Não renomeie.

## Tipografia e identidade

Versão preto e rosa: abra `index.html?theme=dark` pelo servidor. Remova o parâmetro ou use `?theme=light` para comparar com a versão clara. O tema padrão agora é preto sólido; `dark.css` reúne a paleta alternativa e `boot.js` a aplica antes do primeiro carregamento visual.

DM Sans nos títulos e Manrope nos textos, servidas pelo próprio site (pasta fonts, fontes variáveis, subconjunto latino), com pesos 400 a 700 e display swap. Títulos em 700, menu e botões em 600, textos importantes em 500 e secundários em 400. Sem itálico nos textos principais; font-synthesis:none impede negrito artificial. Animações de texto não usam skew ou rotação. Tamanhos e espaçamentos se adaptam ao celular.

## Arquivos e recursos

Ordem do conteúdo da home: apresentação, cena do pincel, sobre Franciana, noivas, prévia de sociais, formandas, vídeos, serviços, localização e agendamento. O portfólio completo não fica mais na home: vive em `portfolio.html`, alcançável pelo item Portfólio do menu e por chamadas ao longo da página. A home guarda apenas três prévias. O botão Agendar fica na navegação após a intro, inclusive no celular; o contato final usa Agendar meu horário. O Instagram aparece na apresentação como link para conhecer o trabalho.

A intro abre com a assinatura Fran Make sendo escrita da esquerda para a direita conforme o scroll. A arte real é revelada por uma máscara que avança na direção da escrita; o `h1` mantém o texto da marca oculto para buscadores e leitores de tela. Vetorizar o logo e animar `stroke-dashoffset` não serve aqui, porque a caligrafia tem espessura variável e o traçado resultante é o contorno das letras, não a linha da caneta.

- `style.css`: identidade, tipografia, camadas, textura, liquid glass dos CTAs e responsividade.
- `dark.css`: paleta preta padrão e as cores translúcidas do liquid glass. Carrega depois de `style.css`, então regras de tema precisam morar aqui.
- `script.js`: abertura vinculada ao scroll, assinatura, contorno de luz do retrato (WebGL), carrossel, menu, fotos ampliadas, vídeos e mapa. Depende de elementos do hero e não serve a outras páginas.
- `motion.js`: Lenis, GSAP, ScrollTrigger, SplitType, parallax, sequência reversível da formanda e cena do pincel.
- `portfolio.html`, `portfolio.css`, `portfolio.js`: página de portfólio, com filtro por categoria e lightbox navegável. JS próprio, independente do `script.js`.
- `boot.js`: tema antes da primeira pintura. Só a página que declara `data-intro` no `<html>` recebe as classes da abertura; sem isso a navbar ficaria oculta para sempre em páginas sem `script.js`.
- `config.js`: contatos, retrato, efeitos, autoplay e localização.
- `guia.html`, `guia.css`, `guia.js`: documentação para uso local; ficam fora do build publicado.
- `images`: originais, WebP e capas extraídas dos próprios vídeos.

## Cena do pincel

`images/pincel-scroll.mp4` e `images/pincel-scroll-mobile.mp4` são cópias sem áudio do clipe original, reencodadas com quadro de referência a cada seis frames. O original trazia keyframe apenas no primeiro quadro, o que faria cada busca redecodificar desde o início e travar o scroll. As bordas receberam corte de 12% de cada lado para remover um brilho parado na extremidade direita; a versão mobile tem corte mais estreito porque o enquadramento paisagem deixa o pincel pequeno demais em tela retrato.

O scroll controla apenas o tempo do vídeo. Nenhum transform, escala ou rotação é aplicado ao pincel, porque o movimento já está gravado. O clipe é carregado como blob em memória: hospedagem estática sem HTTP Range não permite busca, e o scrub depende de avançar e retroceder. A altura alta da seção só é aplicada pela classe `brush-ready`, adicionada quando tudo inicializa; se o GSAP falhar, a seção fica curta e estática com o poster em vez de um vazio de 170vh.

Lenis 1.3.26, SplitType 0.3.4 e GSAP/ScrollTrigger 3.13.0 ficam na pasta vendor, servidos pelo próprio site (licenças em vendor/LICENCAS.md); o site não depende de nenhum servidor externo além do mapa. O guia contém links oficiais. Há fallback quando as bibliotecas não carregam. O ticker do GSAP coordena o movimento, com fallback requestAnimationFrame. A preferência por menos movimento simplifica a experiência.

Galerias permitem arraste, toque nativo, teclado, avanço e pausa. Autoplay lento de ida e volta, sem duplicar imagens. Interação pausa por 4,5 segundos por padrão; foco e hover também suspendem o movimento. Vídeos usam controles nativos.

## Imagens e transparência

`images/franciana.png` e `images/logo-transparente.png` possuem alpha real, verificado de 0 a 255. O site usa suas versões WebP transparentes. Originais preservados.

Os recortes tiveram assistência de edição por IA. Instruções utilizadas: remover somente o quadriculado da foto, preservando Franciana, pose, roupas, cabelo e pincel; remover somente o fundo marmorizado da logo, preservando FM, Fran Make Studio e cores. Revise detalhes finos antes de impressão ou grandes ampliações.

As sete fotos adicionais estão separadas em sociais, noiva e três perspectivas do look de formanda com vestido verde. Não se trata de antes e depois. As capas poster-transformacao.webp, poster-cacheada.webp e poster-formanda.webp foram extraídas do segundo 3 dos respectivos vídeos.

## Intro em vídeo e localização

O vídeo original `images/francianavideo.mp4` foi preservado. A intro usa `images/franciana-scroll.mp4`, uma cópia sem áudio com quadros de referência a cada seis frames, adequada a avanço e retorno pelo scroll. A resolução original 854 × 480 foi mantida. No desktop, o clip otimizado é carregado em memória para permitir busca reversa mesmo em servidores sem suporte a Range. Se houver falha, a capa permanece e o site continua acessível.

A navbar aparece depois da intro. Um contorno de luz, refeito do Next.js Flare (VGPU) em WebGL, acompanha o retrato enquanto a Hero está visível. Hair e penteados foram incluídos no conteúdo. Avaliações removidas. Não há contador de visitantes. As sete fotos fornecidas continuam no portfólio. O favicon FM é um SVG local.

O link enviado pelo proprietário foi resolvido para Fran Make Studio. As coordenadas do marcador são `-2.5197988, -44.2177339`, extraídas de !3d e !4d do estabelecimento; o centro da câmera não foi usado. O botão mantém o link https://maps.app.goo.gl/gSEBqmsFhHYvpRUdA. Para alterações futuras em `config.js`:

1. `latitude` e `longitude`: coordenadas decimais exatas.
2. `mapsEmbedUrl`: URL do src fornecido pelo Google Maps em Compartilhar > Incorporar um mapa; `mapsUrl` pode conter o link compartilhável.
3. Somente `mapsUrl`: mostra o link correto, sem presumir iframe a partir de link curto.

O mapa está configurado. O guia permite editar seus campos, vídeo, retrato e o contorno de luz e baixar config.js. Consulte `SEGURANCA.md` para os cabeçalhos editáveis de `vercel.json`; não houve publicação.

## Verificação

A sequência da formanda voltou a acompanhar a rolagem vertical no celular: a foto atual desce e desaparece, a próxima surge e o movimento é reversível. A composição fica contida na altura útil da tela, com três controles de perspectiva. A preferência por menos movimento mantém a faixa de fotos sem essa animação.

Atualização de serviços: preços removidos da página pública. Make Social, Make + Hair e Make Noiva têm descrições e um único botão Consulte. A localização mostra os dados e o link do Google Maps imediatamente; no celular o iframe só carrega no toque da capa "Toque para ver o mapa", porque o Google Maps roda no mesmo processo da página e travava a rolagem por até um segundo ao entrar na tela; no computador ele carrega sozinho ao se aproximar (`loading="lazy"`). Assim, a informação principal não depende da resposta do Google. O rosé de destaque foi aproximado dos pixels predominantes da logo (#f0a0a0).

### Revisão mobile

No celular a rolagem é nativa, a intro ocupa uma tela e depois segue o fluxo normal e o vídeo toca sem som em loop com playsinline. A reprodução automática depende do navegador. O iPhone a recusa no Modo de Pouca Energia, e o navegador do Instagram também pode recusar; nesse caso a capa da intro ganha um zoom lento em CSS e o pincel troca o vídeo por `images/pincel-mobile.webp` (WebP animado, 15 quadros por segundo), que gira sem depender de autoplay. Com economia de dados a intro fica só na capa com o mesmo zoom. No celular, opacidade e movimento da abertura têm transição de 0,1 s: quando o Safari limita o JavaScript a 30 quadros por segundo (Modo de Pouca Energia), o compositor desenha os quadros do meio. O contorno de luz é calculado só com a rolagem parada. A cópia mobile recebe nitidez leve, sem inventar detalhes; a fonte continua em 854 × 480. Para ganho real de resolução é necessário o original em maior qualidade.

Lenis, SplitType e parallax ficam reservados ao desktop com mouse. No celular, as três fotos da formanda se substituem com a rolagem vertical e o contorno de luz roda em resolução menor. A galeria permite rolagem vertical sobre as imagens, swipe horizontal e ampliação com dois toques ou dois cliques. Enter e Espaço continuam ampliando para acesso por teclado.

Verificação com emulação de toque: vídeo avançando no tempo, swipe vertical e horizontal, clique simples sem abrir, toque duplo e clique duplo abrindo, rolagem de mouse sobre foto e ausência de overflow em 360, 390, 430 e 768 px. Não equivale a teste em aparelho físico.

Revisão da intro em vídeo: tempo 0 → 2,51 → 5,02 segundos e retorno a 0 acompanhando o scroll. Navbar oculta e fora da navegação por teclado na abertura; visível depois da transição. Mapa Google carregado com as coordenadas confirmadas. Autoplay, pausa, ampliação e download da configuração testados. Cabeçalhos de segurança simulados no navegador sem bloqueio das bibliotecas ou do vídeo.

Layout verificado em 1440, 1200, 1024, 768, 430, 390 e 360 px: sem overflow horizontal, IDs duplicados, imagens carregadas quebradas ou travessões visíveis. Menu, diálogo, redução de movimento, falha das bibliotecas e pesos tipográficos verificados. A sequência de fotos avança e reverte com o scroll. Guia testado com filtros, demonstração, pesos, busca, checklist e download, sem overflow de 360 a 1440 px. Sessões de teste sem erros JavaScript.

Não houve teste em aparelhos físicos ou medição representativa de FPS nesses aparelhos. Serviços com preço (Make Social R$ 119,90, Make + Hair R$ 219,90) e orçamento (Make Noiva), cada um com botão Consulte para o WhatsApp. Nenhuma mensagem foi enviada. Confira os dados comerciais antes de publicar usando a lista do guia.

Spotlight: spotlight.css controla a luz rosé dos serviços, fotos e retrato. Ajuste os valores rgba(240,160,160,...) para mudar sua cor e transparência. A luz do retrato fica atrás do PNG transparente. No desktop acompanha o ponteiro; no celular ganha presença ao entrar na tela, sem capturar gestos. O script principal monta as camadas decorativas e respeita a preferência por menos movimento. A intro reúne as letras conforme o scroll no mesmo agendador existente. As duas referências React foram adaptadas para JavaScript e CSS nativos, sem acrescentar frameworks ou imagens externas.


No mobile, a saída do vídeo dissolve suavemente no fundo e a apresentação aparece conforme o scroll. Títulos, imagens de destaque e informações ganham entradas curtas de 14px via IntersectionObserver, executadas uma vez. Não há captura do scroll nem novo loop de animação. A preferência por menos movimento desativa essas transições. Desktop mantém os efeitos anteriores.
