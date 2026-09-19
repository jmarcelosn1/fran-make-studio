# Esteira de qualidade

## Rodar localmente

Use Node 22 ou superior. Execute `npm ci`, `npx playwright install chromium` e `npm run quality`. Em seguida `npm run security`. Windows com Edge instalado pode usar `$env:PW_CHANNEL='msedge'` antes dos testes. A CI também executa WebKit mobile. `npm run build` gera somente os arquivos públicos em `dist/`; publique essa pasta. Testes, documentos internos e configurações de desenvolvimento não entram na distribuição.

## O que bloqueia a CI

| Camada | Verificação |
| --- | --- |
| Código | Biome: variáveis e parâmetros não utilizados, código inalcançável, chaves duplicadas, debugger, eval e igualdade ambígua |
| Contratos | IDs, âncoras, assets, scripts duplicados, HTML sincronizado, ausência de HTML executável inline e políticas CSP |
| Unitários | Validação real de URLs usada pelo site; cobertura mínima de 95% de linhas, 90% de branches e 100% de funções nesse módulo |
| Integração/E2E | Serviços, mapa, teclado, lightbox, intro reversível, falha de CDN, layout mobile e axe WCAG A/AA |
| Segurança | npm audit bloqueia vulnerabilidades altas/críticas nas dependências de desenvolvimento |
| Performance | JS/CSS próprios até 45.000 bytes gzip; cada vídeo da intro até 4 MiB. Não representa pontuação Lighthouse nem FPS de aparelho real |
| Commits | Conventional Commits via Commitlint em pull requests |

Os relatórios de cobertura, capturas de falha e traces são anexados à execução por 14 dias. A cobertura cobre a fronteira de URLs, não toda a interface. Revise também as bibliotecas CDN fixadas no HTML e Three.js local, que npm audit não examina.

Validação local em 16/09/2026: lint e contratos aprovados, três testes unitários aprovados, 95,65% de linhas e 96% de branches em safety.js, 12 E2E aprovados em Edge desktop/mobile e seis em WebKit mobile. Axe não encontrou violações nos estados auditados. npm audit retornou zero vulnerabilidades. Foram corrigidos atributos ARIA inválidos na intro e foco por teclado na sequência de fotos. Emulação não substitui teste em aparelhos físicos; CI Linux e proteção remota ainda precisam de execução no repositório real.

## Ativação da proteção remota

Esta pasta ainda não possui Git/remote configurado. Coloque o conteúdo desta pasta na raiz do repositório. No GitHub, crie uma regra para `main`: exigir pull request, uma aprovação independente, dismiss stale approvals, resolução de conversas, checks obrigatórios incluindo `quality-gate`, branch atualizada, bloquear force-push e exclusão, sem bypass de administradores. Com apenas um mantenedor, providencie revisor independente antes de exigir a aprovação. Depois confirme com um PR propositalmente falhando que o merge está bloqueado. O workflow sozinho NÃO proíbe push direto.

Não há deploy automático nesta esteira. Se a Vercel estiver conectada ao GitHub, publicar produção somente da main protegida. Prévia de PR não deve ser confundida com publicação aprovada.

## Escolha proporcional das ferramentas

Biome, Commitlint, Playwright, axe e cobertura local foram incorporados. Contratos locais substituem um pacote arch-contract adicional. Knip e Stryker ficam para quando houver grafo de módulos e regras de negócio que justifiquem seu custo. Endtest duplicaria os E2E; Codecov pode receber coverage/lcov.info quando a conta e a política de envio forem definidas. Não há integração externa fictícia.

O site não possui backend, login, banco ou endpoint de escrita. Rate limit deverá ser aplicado no servidor/WAF se esses recursos forem criados, nunca como limite JavaScript facilmente contornável. Nenhum backend foi adicionado apenas para justificar ferramentas.

## Observabilidade e operação

Hoje há relatórios de teste e erros de navegador coletados na CI, sem telemetria de visitantes. Sentry é a opção a avaliar para erros reais de produção depois de definir projeto/DSN, responsável, retenção e tratamento de dados. Datadog, New Relic e OpenTelemetry simultâneos seriam redundantes para este frontend. Não foram adicionados SDKs sem destino ou contas configuradas.

Antes de ativar telemetria: aprovar dados coletados, filtrar URLs/query strings e dados pessoais, desativar replay por padrão, ajustar CSP ao domínio exato, definir amostragem e alerta com destinatário real. Não enviar erros a terceiros sem essa configuração. Após publicar, verificar HTTPS, headers reais, disponibilidade, reprodução do vídeo em iOS/Android e Core Web Vitals. Fazer rollback pela versão anterior se agendamento, navegação ou mídia principal falhar.

## Revisão jurídica pendente

Não existe aprovação jurídica registrada nem dados suficientes para afirmar termos aprovados. Antes de lançar, o responsável deve fornecer identidade legal/controlador, canal de privacidade, política comercial de agendamento/cancelamento, retenção, direitos de uso das fotos e confirmação dos fornecedores (Google Fonts/Maps, WhatsApp, Instagram, hospedagem e eventual telemetria). O jurídico deve revisar termos e política, registrar nome/data/versão e autorizar a publicação. Documentos internos não são termos públicos. Essa aprovação é uma etapa humana de lançamento, não um checkbox que o código possa certificar.

## Direção visual e componentes

As referências de spotlight e texto no scroll já foram adaptadas para o sistema atual. A disciplina Apple/Emil reforça controle direto pelo gesto, feedback rápido e contenção; não impõe vidro, outra paleta ou uma nova biblioteca.

| Before | After | Why |
| --- | --- | --- |
| Validação manual dispersa | Fluxo reproduzível e evidências no PR | Preservar a experiência aprovada a cada mudança |
| URLs validadas dentro do script | Fronteira safety.js compartilhada com os testes | Testar segurança sem reconstruir componentes |
| Pasta inteira como publicação | Lista explícita de arquivos públicos em dist | Não expor artefatos internos |

Antes de cada tela: extrair referência e hierarquia, antecipar riscos, mapear componentes existentes. Componentes atuais: navbar/menu, galeria, sequência de formandas, lightbox, cards de serviços, spotlight, CTA e mapa sob demanda. Revisar loading do vídeo e poster, erro de CDN, mapa fechado, foco visível, zoom/texto grande, contraste e toque. Nenhum componente decorativo novo foi criado nesta etapa de qualidade.

Referências técnicas: https://biomejs.dev/reference/configuration/ ; https://playwright.dev/docs/test-configuration ; https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
