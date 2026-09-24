# Fran Make Studio

Site estático nas cores da logo. Abra `guia.html` localmente para a documentação interativa (ele não é publicado no site): demonstrações, catálogo de imagens, exemplos, busca, checklist e gerador de configuração.

## Abrir e publicar

Com Node 22 ou superior, execute `npm ci`, instale o navegador de testes com `npx playwright install chromium` e rode `npm run quality` e `npm run security`. Abra a prévia com `npm run preview` em http://127.0.0.1:4173. Publique somente a pasta `dist/`, gerada pelo build. A configuração Vercel já aponta para essa pasta. O site tem duas páginas: `index.html` e `portfolio.html`. Nenhuma publicação foi realizada. Veja `QUALIDADE.md` para a esteira, proteção da branch e pendências externas.

O arquivo principal já se chamou `index (5).html`. Esse nome quebrava o build, a esteira e a hospedagem, porque a Vercel serve a raiz a partir de `index.html`. Não renomeie.

## Tipografia e identidade

Versão preto e rosa: abra `index.html?theme=dark` pelo servidor. Remova o parâmetro ou use `?theme=light` para comparar com a versão clara. O tema padrão agora é preto sólido; `dark.css` reúne a paleta alternativa e `boot.js` a aplica antes do primeiro carregamento visual.

DM Sans nos títulos e Manrope nos textos, servidas pelo próprio site (pasta fonts, fontes variáveis, subconjunto latino), com pesos 400 a 700 e display swap. Títulos em 700, menu e botões em 600, textos importantes em 500 e secundários em 400. Sem itálico nos textos principais; font-synthesis:none impede negrito artificial. Animações de texto não usam skew ou rotação. Tamanhos e espaçamentos se adaptam ao celular.

## Arquivos e recursos

Ordem do conteúdo da home: início (assinatura Fran Make, texto e retrato de Franciana), prévia do portfólio com seis fotos em coverflow e um Ver mais, serviços, localização, contato e rodapé. O portfólio completo vive em `portfolio.html`, alcançável pelo item Portfólio do menu e pelo Ver mais. A barra de navegação não leva botão de agendar: o agendamento pelo WhatsApp fica no Agende dos serviços, no Agendar Horário do menu do celular e no fim do portfólio. O contato mostra só o Instagram, sem título de seção, borda ou moldura: o nome, uma frase e a arte @fran_make, que é o próprio link e sobe e acende um pouco no hover. O rodapé não tem fio separando os direitos. O contato não tem ícone, e nenhum botão do site leva ícone ou estrelinha: só o texto.

O início é uma tela só, sem vídeo, sem pincel e sem rolagem conduzida. Na primeira visita da sessão há uma abertura de cerca de 2 segundos: o nome Fran Make se escreve no centro de uma tela preta e desliza, medido na hora, até cair exatamente sobre o nome do início, enquanto o preto se desfaz e retrato, título e texto sobem juntos (`boot.js` decide, `script.js` desliza, o resto é CSS). Não aparece de novo na mesma sessão, nem para quem chega por um link de seção ou pede menos movimento; sem o script, a cortina sai sozinha. No celular o início ocupa a altura da tela, então o portfólio só aparece depois de rolar. A assinatura Fran Make se escreve sozinha da esquerda para a direita com a mesma animação do portfólio (`pf-escreve`, no `style.css`, compartilhada pelas duas páginas): uma máscara avança na direção da escrita. O `h1` mantém o texto da marca oculto para buscadores e leitores de tela. Assinatura, Franciana, título e texto entram juntos, no mesmo tempo (1,6 s) e na mesma curva, e terminam juntos: a foto como as fotos do portfólio (opacidade, escala e desfoque), o texto subindo de leve; no celular, sem o desfoque. A luz atrás dela é um fundo rosé difuso, como luz de estúdio: um gradiente radial com queda gaussiana em dez paradas, sem patamar nem degrau, apagado em cima e embaixo, tudo em CSS, sem canvas e sem laço de animação. Não há contorno de luz seguindo a silhueta, que lia como linha em volta do cabelo. A base da foto, um corte reto na cintura, se desfaz no preto pela máscara da própria imagem, que também apaga a outra mão, solta no canto de baixo. No desktop o texto fica à esquerda e a foto à direita; no celular a ordem é assinatura, Franciana e, embaixo dela, o título e o texto. Com menos movimento o nome já aparece escrito e a foto já está no lugar. Vetorizar o logo e animar `stroke-dashoffset` não serve aqui, porque a caligrafia tem espessura variável e o traçado resultante é o contorno das letras, não a linha da caneta.

- `style.css`: identidade, tipografia, camadas, textura, liquid glass dos CTAs e responsividade.
- `dark.css`: paleta preta padrão e as cores translúcidas do liquid glass. Carrega depois de `style.css`, então regras de tema precisam morar aqui.
- `script.js`: coverflow do portfólio, menu, luz dos cartões de serviço, entradas curtas no celular, mapa e links configuráveis. Não mantém laço de animação próprio. Depende de elementos da home e não serve a outras páginas.
- `motion.js`: Lenis (conduzido pelo ticker do GSAP), ScrollTrigger, SplitType e parallax.
- `portfolio.html`, `portfolio.css`, `portfolio.js`: página de portfólio, com filtro por categoria, grade de três colunas (também no celular) com nove fotos por vez e um Ver mais que carrega mais nove, e lightbox navegável pelas fotos à vista. JS próprio, independente do `script.js`.
- `boot.js`: tema e idioma antes da primeira pintura, e o estado de clique dos botões com brilho.
- `config.js`: contatos, retrato, efeitos e localização.
- `guia.html`, `guia.css`, `guia.js`: documentação para uso local; ficam fora do build publicado.
- `images`: originais e WebP. `social-estudio-brilho-cartao.webp` (Make Social, recortado abaixo do letreiro; o original está em `_fontes/`) e `instagram-fran-make.webp` (arte do perfil, recortada no conteúdo, fundo transparente) entraram nesta versão; os originais ficam em `_fontes/`, fora do repositório.

## Cores

O rosé do layout é o enviado pelo cliente: `#fa9daa`, média da amostra. Os botões com brilho usam o degradê da própria amostra, de `#fca5b3` a `#f891a6`, com texto `#2a1016` (contraste de 8:1). O mesmo tom vale no desktop e no celular.

## Coverflow do portfólio

A seção Conheça nosso portfólio usa o componente `coverflow-carousel` enviado pelo cliente (prompt guardado em `_fontes/prompts/`), reescrito em JS e CSS puros, sem React, Tailwind nem lucide. Valem os números do original: inclinação de 44°, recuo de 0,6 da largura, perspectiva de 3 larguras, curva 0,56, 10% de opacidade a menos por passo e 5% de vão. Um único número, a posição do centro, move os seis cartões, conduzido por uma mola criticamente amortecida por tempo (não por quadro): um passo leva perto de um segundo, sem tranco, e um toque no meio do movimento parte da velocidade que já existe. O assentamento de 16% por quadro do original cortava rápido demais e corria o dobro em tela de 120 Hz. O laço de quadros só roda enquanto a posição assenta. As fotos das pontas desbotam na borda da moldura em vez de serem cortadas. O anel dá a volta sem copiar cartões: a distância é dobrada para o lado mais curto e o cartão some antes de atravessar meia volta. Setas do cabeçalho e do teclado andam uma foto; arrastar leva a foto junto e o arremesso anda no máximo duas; tocar num cartão do lado o traz ao centro. A moldura recorta com `overflow:clip`: com `hidden`, levar um cartão lateral à vista (foco, leitor de tela, busca na página) rolava a moldura e tirava o anel do centro. Sem legenda, sombra ou contorno nos cartões, a pedido: o brilho do cartão do centro era cortado pela moldura e virava uma linha reta embaixo.

Lenis 1.3.26, SplitType 0.3.4 e GSAP/ScrollTrigger 3.13.0 ficam na pasta vendor, servidos pelo próprio site (licenças em vendor/LICENCAS.md); o site não depende de nenhum servidor externo além do mapa. O guia contém links oficiais. Há fallback quando as bibliotecas não carregam. O ticker do GSAP conduz o Lenis; sem GSAP, o Lenis usa o próprio requestAnimationFrame. A preferência por menos movimento simplifica a experiência.

Galerias permitem arraste, toque nativo, teclado, avanço e pausa. Autoplay lento de ida e volta, sem duplicar imagens. Interação pausa por 4,5 segundos por padrão; foco e hover também suspendem o movimento. Vídeos usam controles nativos.

## Movimento que responde à pessoa

- Foto ampliada do portfólio: nasce da própria miniatura (mesmo tamanho e recorte) e cresce até a tela; ao fechar, volta para ela. Uma animação de transform e clip-path no `#lb-img`, sem cópia da foto. Com a miniatura fora da tela, só esmaece.
- Filtros do portfólio: as fotos que continuam à vista deslizam até o lugar novo; as que ainda não entraram ao rolar ficam com a entrada delas.
- Menu do celular: as opções entram uma depois da outra (0,05 s de diferença).
- Início no computador: ao rolar, a Franciana sobe mais devagar que o texto e a luz rosé apaga (GSAP ScrollTrigger, no `motion.js`).
- `404.html`: endereço inexistente mostra a assinatura e o caminho de volta, com status 404 (Cloudflare Pages e Vercel usam esse arquivo sozinhas). Tudo nela parte da raiz (`/style.css`), porque aparece em qualquer caminho.
- `images/icone-app.png`: ícone de 180 px para quem salva o site na tela do celular.

Tudo respeita a preferência por menos movimento. O topo do portfólio abre com a noiva de renda em cores (ela sai da grade para não repetir); a foto em preto e branco dos bastidores saiu e continua na tag `antes-das-melhorias`.

## Imagens e transparência

Compartilhamento e busca: `images/compartilhar.jpg` (1200 × 630, 95 KB) é a prévia do link no WhatsApp e no Instagram, feita com a Franciana, a luz rosé e o nome. Canonical, `og:url` e `og:image` usam o endereço completo em `https://fran-make-studio.pages.dev` (a Cloudflare redireciona `/portfolio.html` para `/portfolio`); os contratos conferem isso. `sitemap.xml` lista as duas páginas e o `robots.txt` aponta para ele. Se o site ganhar domínio próprio, troque esse endereço nos dois HTML, no `sitemap.xml` e no `robots.txt`. Os vídeos antigos (`videoprincipal.mp4`, `video_formanda.mp4`, `cacheada.mp4`), `logo-transparente.png` e `noiva-vestido-branco.webp` não eram usados e saíram do site; estão em `_fontes/fora-do-site/`.

Ordem das fotos (2026-09-23): as 60 fotos seguem uma curadoria única, da mais bonita para a menos, em páginas de nove. A apresentação da home leva as seis mais fortes, cada uma de uma modelo, e a primeira página do portfólio não repete nenhuma delas (conferido pelos contratos). Fotos da mesma modelo ou da mesma sessão ficam a pelo menos seis posições uma da outra, para a grade não mostrar a mesma pessoa duas vezes seguidas. As fotos vieram de capturas do Instagram: as setas de navegação e os pontos de paginação foram recortados das bordas, duas repetiam fotos que já estavam no site e ficaram de fora, as cinco da modelo da maquiagem artística azul saíram a pedido, e os originais estão em `_fontes/portfolio-2026-09-23/`. Cada foto tem uma versão de 480 px (`-m.webp`) para a grade de três colunas no celular.

`images/franciana.png` e `images/logo-transparente.png` possuem alpha real, verificado de 0 a 255. O site usa suas versões WebP transparentes. Originais preservados.

Os recortes tiveram assistência de edição por IA. Instruções utilizadas: remover somente o quadriculado da foto, preservando Franciana, pose, roupas, cabelo e pincel; remover somente o fundo marmorizado da logo, preservando FM, Fran Make Studio e cores. Revise detalhes finos antes de impressão ou grandes ampliações.

As sete fotos adicionais estão separadas em sociais, noiva e três perspectivas do look de formanda com vestido verde. Não se trata de antes e depois. As capas poster-transformacao.webp, poster-cacheada.webp e poster-formanda.webp foram extraídas do segundo 3 dos respectivos vídeos.

## Localização

A navbar fica visível desde o carregamento. Hair e penteados foram incluídos no conteúdo. Avaliações removidas. Não há contador de visitantes. O favicon FM é um SVG local.

O link enviado pelo proprietário foi resolvido para Fran Make Studio. As coordenadas do marcador são `-2.5197988, -44.2177339`, extraídas de !3d e !4d do estabelecimento; o centro da câmera não foi usado. O botão mantém o link https://maps.app.goo.gl/gSEBqmsFhHYvpRUdA. Para alterações futuras em `config.js`:

1. `latitude` e `longitude`: coordenadas decimais exatas.
2. `mapsEmbedUrl`: URL do src fornecido pelo Google Maps em Compartilhar > Incorporar um mapa; `mapsUrl` pode conter o link compartilhável.
3. Somente `mapsUrl`: mostra o link correto, sem presumir iframe a partir de link curto.

O mapa está configurado. O guia permite editar seus campos e o retrato e baixar config.js. Consulte `SEGURANCA.md` para os cabeçalhos editáveis de `vercel.json`; não houve publicação.

## Verificação

A sequência da formanda voltou a acompanhar a rolagem vertical no celular: a foto atual desce e desaparece, a próxima surge e o movimento é reversível. A composição fica contida na altura útil da tela, com três controles de perspectiva. A preferência por menos movimento mantém a faixa de fotos sem essa animação.

Serviços: sem preço. Make Social, Make + Hair e Make Noiva abrem com uma foto de referência, nessa ordem, e um único botão Agende, para o WhatsApp, fica centrado embaixo dos três. A localização mostra os dados e o link do Google Maps imediatamente; o iframe carrega logo no início, na primeira pausa da rolagem depois do carregamento. Carregado só ao se aproximar (`loading="lazy"`), o Google Maps, que no celular roda no mesmo processo da página, travava a tela por até um segundo justamente ao chegar na seção. Assim, a informação principal não depende da resposta do Google.

### Revisão mobile

No celular a rolagem é nativa e o início ocupa uma tela: a assinatura, o texto e, embaixo, a Franciana inteira, com a base desfeita no preto. Não há vídeo nem pincel, então nada depende de autoplay: o Modo de Pouca Energia do iPhone e o navegador do Instagram mostram a mesma abertura. Fotos e logos ganham `saturate(1.2)` no celular. Os botões ficam opacos, sem `backdrop-filter`, que refazia um desfoque a cada quadro da rolagem.

No portfólio, no celular a entrada das fotos fica só em opacidade e escala (o desfoque animado em cada foto derrubava um em cada vinte quadros); no desktop o desfoque continua. Ao abrir uma foto por toque ou mouse, o foco vai para o próprio quadro da foto, sem o anel rosa no X; pelo teclado ele vai para o X, com o anel. A foto ampliada aparece sozinha, sem legenda; o X e as setas têm o mesmo desenho e ficam presos às bordas da tela, o X no alto da mesma coluna da seta da direita.

Lenis, SplitType e parallax ficam reservados ao desktop com mouse. No celular, as três fotos da formanda se substituem com a rolagem vertical. A galeria permite rolagem vertical sobre as imagens, swipe horizontal e ampliação com dois toques ou dois cliques. Enter e Espaço continuam ampliando para acesso por teclado.


Layout verificado em 1440, 1200, 1024, 768, 430, 390 e 360 px: sem overflow horizontal, IDs duplicados, imagens carregadas quebradas ou travessões visíveis. Menu, diálogo, redução de movimento, falha das bibliotecas e pesos tipográficos verificados. A sequência de fotos avança e reverte com o scroll. Guia testado com filtros, demonstração, pesos, busca, checklist e download, sem overflow de 360 a 1440 px. Sessões de teste sem erros JavaScript.

Não houve teste em aparelhos físicos ou medição representativa de FPS nesses aparelhos. Os serviços não mostram preço; o único botão Agende leva ao WhatsApp. Nenhuma mensagem foi enviada. Confira os dados comerciais antes de publicar usando a lista do guia.

Cartões de serviço: o `spotlight.css` guarda o desenho deles (o nome ficou do tempo em que tinham uma luz rosé seguindo o ponteiro). A luz e a borda fina saíram a pedido em 2026-09-25: o cartão é um fundo um tom acima do preto, com a foto no alto e o texto em 15 px. A foto da Make Social usa um recorte próprio (`social-estudio-brilho-cartao.webp`, 474 × 592) que começa abaixo do letreiro, que já vinha cortado na foto original. O halo do retrato fica no `style.css`.


No mobile, títulos e cartões ganham entradas curtas de 14px via IntersectionObserver, executadas uma vez. Não há captura do scroll nem novo loop de animação. A preferência por menos movimento desativa essas transições.
