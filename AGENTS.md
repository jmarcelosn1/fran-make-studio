# Contrato de trabalho do projeto

Antes de alterar interfaces, registrar: referência visual (layout, paleta, tipografia, ritmo), avaliação de UX (contraste, toque, teclado, loading, erro, responsividade) e componentes existentes a reutilizar. A estética aprovada é preto sólido e rosé da marca, títulos retos, fotos reais, destaque às noivas e um Agende para os três serviços. Sem preços ou imagens duplicadas.

Use HTML/CSS/JS nativos. Reutilize .portfolio-card, .mp-card, .btn-pk, #lightbox, .spotlight-light e o agendador existente. Não crie um segundo carrossel, modal ou loop permanente. Separe lógica pura quando houver fronteira de segurança ou reutilização concreta; não migre para React por causa de uma referência visual. Não instale frameworks sem necessidade demonstrada.

Antes de entregar: npm run quality e npm run security. Nunca reduza limites ou desative testes apenas para passar. Sincronize index - Copia.html com index.html. Uma alteração de limite precisa de justificativa no PR. Nenhum segredo no frontend. Código servidor futuro deve ficar separado e validar tudo novamente; rate limit no navegador não protege APIs.

Reportar testes executados, limitações, componentes usados e motivo das decisões visuais. Não afirmar que houve aprovação jurídica, proteção de branch, telemetria ou publicação sem evidência real.
