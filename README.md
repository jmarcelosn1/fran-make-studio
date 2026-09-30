# Fran Make Studio: site

Site estático de um estúdio de maquiagem, com página inicial, portfólio filtrável e agendamento pelo WhatsApp. Identidade em preto e rosé, tipografia servida pelo próprio site e animações leves.

**Stack:** HTML, CSS e JavaScript nativos · GSAP, Lenis e SplitType para movimento · Playwright, axe-core e Biome para qualidade · GitHub Actions

## O que tem no site

- **Início:** abertura curta na primeira visita da sessão, retrato, título e texto.
- **Serviços e localização:** com agendamento pelo WhatsApp.
- **Portfólio:** página própria com filtro por categoria, grade de fotos com "Ver mais" e lightbox navegável.
- **Preferências:** tema (escuro por padrão) e idioma aplicados antes da primeira pintura, para evitar piscadas.
- **Movimento reduzido:** quem pede menos movimento recebe o conteúdo já no lugar.

## Qualidade automatizada

O repositório trata qualidade como parte do código. O comando `npm run quality` roda, em ordem:

| Etapa | O que verifica |
|---|---|
| Lint | Biome, com avisos tratados como erro |
| Contratos | IDs, âncoras, assets e scripts duplicados; sem HTML executável inline; CSP; imagens com largura e altura (evita salto de layout) |
| Unitários | Validação de URLs de `safety.js`, com cobertura mínima de 95% de linhas, 90% de branches e 100% de funções |
| Build | Gera só os arquivos públicos em `dist/` |
| E2E | Playwright em desktop e celular, com acessibilidade WCAG A/AA via axe |

`npm run security` roda `npm audit` e bloqueia vulnerabilidades altas. A esteira roda na CI (`.github/workflows/quality.yml`), com Dependabot e Conventional Commits verificados por Commitlint. Os detalhes, as limitações conhecidas e o que ainda depende de configuração externa estão em [QUALIDADE.md](QUALIDADE.md) e [SEGURANCA.md](SEGURANCA.md).

## Como rodar

Requer Node 22 ou superior.

```bash
npm ci
npx playwright install chromium
npm run quality
npm run preview      # http://127.0.0.1:4173
```

Só a pasta `dist/` é publicada; a configuração da Vercel (`vercel.json`) já aponta para ela.

## Estrutura

```
index.html, portfolio.html    as duas páginas
style.css, dark.css           identidade, tema escuro e responsividade
script.js, motion.js          interações e animações da home
portfolio.js, portfolio.css   página de portfólio (independente do script.js)
boot.js, config.js            tema e idioma antes da pintura; contatos e links
safety.js                     validação de URLs (coberta por testes unitários)
quality/                      build, servidor de prévia e contratos
tests/                        unitários e E2E
guia.html                     documentação interativa local (fora do build)
```

A documentação de decisões de interface, tipografia e animações está em [LEIA-ME.md](LEIA-ME.md).

## Desenvolvimento com agentes de IA

O projeto é conduzido por agentes de código com um contrato de trabalho versionado em [AGENTS.md](AGENTS.md): registrar referência visual e avaliação de UX antes de mexer na interface, reutilizar componentes existentes, não instalar frameworks sem necessidade demonstrada, rodar `npm run quality` e `npm run security` antes de entregar, e nunca reduzir limites ou desativar testes só para passar. O agente também não pode afirmar aprovação, proteção de branch ou publicação sem evidência real.
