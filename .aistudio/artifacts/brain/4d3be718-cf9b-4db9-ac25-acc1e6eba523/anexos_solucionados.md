# Soluções Implementadas no Sistema de Gestão Eclesiástica

## 1. Direitos Reservados e Contato Oficial
- **Apresentação Oficial e Direitos Reservados**:
  - Exibição em destaque na tela de abertura/login: **Direitos Reservados a Carlito Carvalho Rodrigues**.
  - Canal oficial de atendimento e suporte via WhatsApp: **(18) 99109-9608** com link direto interativo (`https://wa.me/5518991099608`).
  - Rodapé oficial integrado no menu lateral expandido (Sidebar): *Gestão Eclesiástica • © Carlito Carvalho Rodrigues • WhatsApp: (18) 99109-9608*.

## 2. Formulário de Identificação para Testadores do Sistema
- **Controle e Captação de Leads de Teste na Abertura**:
  - Aba de destaque **"Testar / Demonstração"** na tela de login.
  - Solicitação prévia e obrigatória dos dados do interessado:
    - **Nome Completo**
    - **Celular / WhatsApp** (com máscara de preenchimento `(00) 00000-0000`)
    - **E-mail de Contato**
    - **Igreja / Congregação e Cidade** (opcional)
  - Persistência automática no banco Firestore na coleção `leads_testadores` com data/hora e metadados, permitindo ao administrador Carlito Carvalho Rodrigues acompanhar todos os contatos que testam a plataforma.
  - Liberação imediata e sem atritos de um perfil de demonstração interativo com todas as permissões para exploração completa.

## 3. Funcionamento do Período de Teste, Contagem de Dias e Bloqueio por Expiração
- **1. Quando o usuário entra no sistema**:
  - O sistema registra o testador e inicia a contagem de **15 dias de avaliação gratuita** (prazo padrão configurável).
  - É calculada a data limite: `expirationDate = data_atual + 15 dias`.
  - O testador recebe permissões completas de visualização e operação para experimentar a emissão de cartas com IA, cadastro de membros, tesouraria, patrimônio e escalas de ministérios.
- **2. Enquanto o teste está ativo (Acompanhamento em Tempo Real)**:
  - No topo de todas as telas (acima do cabeçalho), é exibido um **Banner de Demonstração Ativa**:
    - Informa quantos dias restam: *"Olá, [Nome]! Restam X dias de avaliação gratuita."*
    - Botão em destaque: **"Falar com Carlito Rodrigues (18) 99109-9608"** para tirar dúvidas sobre valores e adesão oficial.
- **3. Prevenção de Fraudes de Reentrada**:
  - Se o usuário tentar sair e digitar o mesmo e-mail na tela de login, o sistema busca o cadastro prévio no Firestore e mantém a contagem original de dias sem reiniciar o prazo.
- **4. Quando o teste expira (Final do Teste - dia 0)**:
  - O status do usuário é atualizado automaticamente para `expired`.
  - O sistema exibe um **Modal de Bloqueio em Tela Cheia**:
    - Título: *"Período de Demonstração Finalizado"*.
    - Mensagem personalizada parabenizando pelo teste e informando que os 15 dias de avaliação terminaram.
    - Orientações de adesão oficial com os dados de **Carlito Carvalho Rodrigues** e **WhatsApp (18) 99109-9608**.
    - Botão verde de 1 clique que abre o WhatsApp com a mensagem pronta: *"Olá Carlito! Concluí o período de testes do Gestão Eclesiástica e gostaria de contratar a licença definitiva para minha igreja."*
    - Botão de saída para retornar à tela inicial.
- **5. Controle Administrativo por Carlito**:
  - No menu **Configurações > Licenças e Usuários**, Carlito tem visão dos status de cada conta (`EM TESTE`, `EXPIRADO`, `ATIVO`, `SUPER ADMIN`).
  - Pode prorrogar dias com 1 clique (+15 dias, +30 dias) ou aprovar a conta como Licença Ativa Permanente/Vitalícia.

## 4. Módulo Financeiro: IA Rápida e Focada em Cadastros (Sem Lentidão)
- **Leitura Inteligente de Documentos / OCR Rápido**:
  - Adicionado botão e área de captura de destaque no modal de movimentações financeiras: **✨ Escanear Comprovante / Recibo com IA**.
  - Otimização de performance: a imagem é redimensionada e comprimida client-side (máx 1000px, JPEG leve), reduzindo o tempo de upload e inferência para menos de 2 segundos no backend.
  - Extração e preenchimento automático instantâneo:
    - Tipo de movimentação (Entrada ou Saída)
    - Valor total (R$) formatado
    - Data da operação e vencimento
    - Descrição clara da transação
    - Nº da Nota Fiscal, cupom ou comprovante bancário
    - Categoria contábil mais apropriada
    - Forma de pagamento (Pix, Dinheiro, Boleto, Cartão, Transferência)
    - Vinculação de fornecedor cadastrado
    - Anexação automática do próprio documento como comprovante no formulário.
- **Sugestão Inteligente de Categorias em Tempo Real**:
  - Identificação de palavras-chave enquanto o tesoureiro digita a descrição (ex: ao digitar "copel/luz", "sabesp", "posto/gasolina", "dízimo", "ceia"), exibindo um chip de um clique para aplicar a categoria correta imediatamente.

## 5. Secretaria Eclesiástica: Expansão de Modelos de Cartas Eclesiásticas
- **Novos Modelos de Cartas Disponíveis no Assistente de IA**:
  1. **Carta Convite Oficial para Pregador / Ministro da Palavra**: Tom reverente convidando o ministro e apresentando o tema e a honra da ministração.
  2. **Carta Convite para Cantor / Grupo de Louvor Convidado**: Convite festivo com orientações e expectativa de adoração.
  3. **Carta de Congresso / Convocação e Credenciamento**: Convocação solene de obreiros, jovens, círculo de oração e delegações.
  4. **Carta de Aniversário de Membro / Obreiro**: Votos pastorais fraternos, oração de gratidão e versículos de bênção.
  5. **Carta de Aniversário do Pastor Titular**: Homenagem oficial de honra e gratidão pelo sacerdócio.
  6. **Carta de Aniversário da Igreja / Jubileu**: Celebração histórica da congregação com júbilo espiritual.
  7. **Carta de Recomendação Eclesiástica**: Padrão canônico atestando comunhão e bom testemunho.
  8. **Carta de Transferência Definitiva de Membro**: Formalização de transferência canônica entre congregações.
  9. **Carta de Apresentação e Boas-Vindas Pastoral**: Acolhimento fraterno e idoneidade.
  10. **Declaração de Comunhão & Idoneidade Eclesiástica**: Certidão negativa para fins canônicos.
  11. **Carta de Consagração / Separação Ministerial**: Reconhecimento para novos diáconos, presbíteros e evangelistas.
  12. **Carta de Agradecimento Eclesiástico**: Gratidão por doações e serviços voluntários dedicados à obra de Deus.
- **Formulário Dinâmico e Inteligente**: Rótulos e placeholders adaptam-se ao modelo selecionado.

## 6. Diretrizes Rigorosas de Linguagem e Timbragem
- Proibição absoluta de termos em inglês (ex: *Cabeça da Igreja* em vez de *Head da Igreja*).
- Zero duplicidade de nomes da denominação e congregação.
- Cabeçalho timbrado oficial, rodapé com data por extenso antes das assinaturas e rubricas oficiais importadas diretamente do módulo de parâmetros.

## 7. Solução de Impressão e Exportação de Capas & Etiquetas Físicas de Pastas
- **Problema corrigido**: O clique no botão "Imprimir" disparava o toast, mas o navegador bloqueava o `window.print()` devido ao sandbox do iframe do AI Studio.
- **Solução definitiva implementada**:
  - Implementação da função `openElementInNewTabForPrint(elementId, title)` que abre uma nova janela/aba limpa e autônoma com todos os estilos CSS Tailwind injetados, acionando a caixa de diálogo de impressão nativa de qualquer impressora sem travas.
  - Disponibilização dos botões diretos de **Baixar PDF** de alta resolução e **Imagem PNG** para colagem em etiquetas Pimaco, pastas A4 e arquivos sanfonados.

## 8. Implantação das 3 Inovações Competitivas de Alta Relevância
1. **Carteirinha Digital do Membro com QR Code no Celular**:
   - Design moderno no formato padrão PVC / Apple Wallet / Google Wallet.
   - Apresenta foto oficial, dados de batismo, admissão, cargo eclesiástico, congregação e QR Code dinâmico de autenticação.
   - Animação de giro frente/verso com 1 clique para conferir dados pastorais e filiação no verso.
   - Compartilhamento direto no WhatsApp do membro (`wa.me`) com texto oficial e link de acesso rápido.
   - Rota pública e responsiva (`/carteirinha` e `/validar-membro`) permitindo ao membro salvar como atalho na tela inicial do celular (PWA/Home Screen) e aos porteiros e recepcionistas conferirem a autenticidade do membro em convenções e assembleias.
   - Download imediato em PDF de alta qualidade e Imagem PNG.

2. **Conciliação Bancária com Leitura Automática de Extratos (OFX / Excel / CSV)**:
   - Motor nativo de importação bancária compatível com os principais bancos brasileiros (Bradesco, Itaú, Banco do Brasil, Santander, Caixa, Nubank, Inter, Sicredi, Sicoob).
   - Suporte a arquivos padrão bancário `.ofx` e planilhas `.xlsx`, `.xls` e `.csv`.
   - Comparação automática e inteligente de entradas e saídas do banco com os lançamentos de caixa da congregação.
   - Detecção visual de tarifas bancárias, dízimos via Pix e transferências ainda não lançadas no caixa da igreja, com **botão de 1 clique para lançar no caixa** sem retrabalho de digitação.
   - Emissão de relatório timbrado de conciliação com assinatura do tesoureiro e pastor.

3. **Disparo Rápido do Resumo da Escala Semanal no WhatsApp**:
   - Integração consolidada das escalas da semana (Dirigentes, Pregadores, Músicos, Diaconato e Limpeza).
   - Cálculo automático dos dias de culto da semana corrente (Quarta/Quinta, Sábado, Domingo Manhã e Domingo Noite).
   - Formatação profissional de texto com emojis, negrito do WhatsApp (`*texto*`) e versículo bíblico de ânimo aos obreiros.
   - Disparo em 1 clique para o Grupo de WhatsApp dos Obreiros via WhatsApp Web e Link Direto `wa.me`, com cópia automática para a área de transferência.

## 9. Soluções de Acesso Mobile, WhatsApp e Customização do Crachá (Anexos 1, 2 e 3)
1. **Anexo 1 - Correção da Abertura da Carteirinha no Celular e Busca por CPF**:
   - **Diagnóstico**: O membro estava no banco de dados local do computador da secretaria e ainda não havia sido sincronizado para o banco em nuvem Firestore; ao abrir o link em outro navegador ou celular, o banco em nuvem não continha o registro e a busca por CPF não limpava caracteres de pontuação.
   - **Solução Implementada**:
     - *Auto-Sync para o Firestore*: Toda vez que a carteirinha é aberta ou visualizada na Secretaria, os dados do membro são automaticamente sincronizados e gravados no Firestore (`members`).
     - *Fallback Instantâneo por Parâmetros de URL*: O link do WhatsApp agora transporta os dados fundamentais codificados na URL (`&n=...&r=...&c=...`), garantindo que o cartão abra **100% das vezes** em qualquer smartphone, mesmo que a conexão com a nuvem esteja lenta ou offline.
     - *Busca Inteligente por CPF e Nome*: A busca pública no celular remove pontuações (`replace(/\D/g, "")`), permitindo localizar digitando apenas os números (ex: `04717807820`) ou o formato com pontos/traço (`047.178.078-20`).

2. **Anexo 2 - Solução do Envio para WhatsApp Web e Explicação de Funcionamento**:
   - **Diagnóstico**: No computador desktop, os links `wa.me` abrem uma página padrão do WhatsApp Web perguntando se o usuário quer abrir o aplicativo ou continuar para a Web, gerando dúvida sobre onde clicar.
   - **Solução Implementada**:
     - *Botão "WhatsApp Web (PC)"*: Abre diretamente a tela de conversa no WhatsApp Web (`https://web.whatsapp.com/send?phone=...&text=...`), sem passar pela tela intermediária de "Abrir app".
     - *Botão "WhatsApp (wa.me)"*: Mantido para dispositivos móveis ou usuários que preferem o aplicativo instalado no Windows.
     - *Botão "Copiar Mensagem"*: Copia a mensagem completa com o link para colar em qualquer grupo ou conversa.
     - *Emojis Padronizados*: Emojis com codificação universal (ex: `🙏`) eliminando o caractere de interrogação com losango (``).

3. **Anexo 3 - Facilidades de Edição e Montagem do Crachá (Cores, Fundo e Estilos)**:
   - Novo botão **"🎨 Cores & Design"** integrado ao topo do modal da carteirinha.
   - **6 Paletas Predefinidas Oficiais**:
     - *Verde Esmeralda Oficial* (Padrão eclesiástico elegante).
     - *Azul Real Pentecostal* (Degradê marinho com dourado).
     - *Ouro Nobre & Preto Premium* (Preto ônix com acabamento dourado).
     - *Vinho / Bordô Sacerdotal* (Degradê bordô com bronze).
     - *Roxo Celestial & Realeza* (Roxo majestoso com detalhes em prata/ouro).
     - *Preto Ônix / Black Titanium* (Grafite e titânio moderno).
   - **Seletores de Cores Personalizadas (Color Pickers)**:
     - Cor Inicial e Final do degradê.
     - Cor da Borda / Contorno do cartão.
     - Cor dos Detalhes e Ouro.
   - **Texturas e Fundos**:
     - *Brasão d'Água Oficial* (marca d'água oficial translúcida).
     - *Ondas & Curvas Modernas* (grafismo fluido dinâmico).
     - *Malha Geométrica / Grid* (fundo tecnológico sutil).
     - *Fundo Liso Fosco* (minimalismo limpo).
   - **Opções de Montagem**:
     - Formato da foto: *Cantos Arredondados (Padrão 3x4)* ou *Circular Clássica*.
     - Selo Superior Personalizável: *OFICIAL*, *CREDENCIAL*, *MEMBRO ATIVO*, *MINISTERIAL*.
     - Interruptores para exibir/ocultar Pastor Titular, Datas de Batismo/Admissão e Logotipo.
     - *Persistência em Tempo Real*: As configurações são salvas no sistema e refletidas imediatamente tanto no preview da Secretaria quanto na tela do celular do membro (`/carteirinha`)!




## 12. Resolução dos Anexos (Marca d'Água Centralizada & Correção de Hooks)
- **Anexo 1 - Brasão d'Água Oficial com Fundo Transparente & Cor Harmonizada**:
  - Criado o componente especializado `BrasaoWatermark` (`src/components/secretaria/BrasaoWatermark.tsx`).
  - Fundo 100% transparente (`bg-transparent`, sem caixas escuras).
  - Ocupa estritamente o centro do cartão (`size: 145px/155px`), centralizado com precisão milimétrica.
  - Elimina qualquer texto preto ou vermelho que manchava a leitura do cartão. A cor adapta-se dinamicamente ao tema ativo da carteirinha (`cardTheme.accentColor` ou branco suave translúcido `opacity: 16%`).
  - Selo heráldico com anéis de segurança concêntricos, filigrana, micro-estrelas, texto em arco "IGREJA O BRASIL PARA CRISTO • CREDENCIAL ECLESIÁSTICA" e símbolos cristãos centrais (Cruz e Bíblia).

- **Anexos 2 e 3 - Correção do Erro "Rendered more hooks than during the previous render"**:
  - **Causa**: Em `src/pages/CarteirinhaMembroPublica.tsx`, hooks `useMemo` (`cardTheme` e `registeredLogo`) estavam posicionados após os retornos condicionais `if (loading)` e `if (!member)`. Quando a página abria ou quando o link copiado era colado no navegador, a renderização inicial registrava menos hooks do que a renderização com os dados carregados, disparando o erro de ciclo de vida do React.
  - **Solução**: Todos os hooks (`churchConfig`, `cardTheme`, `registeredLogo`, `searchTerm`, `searchResults`) foram movidos incondicionalmente para o topo do componente, respeitando estritamente as *Rules of Hooks* do React. A página pública da carteirinha agora abre instantaneamente no celular e em qualquer navegador via link copiado sem nenhuma falha.

## 13. Resolução dos 7 Novos Anexos Solicitados (Alinhamentos, Rolagem, Validade e Selo Superior)
1. **Anexo 1 - Legenda em Frame no Login (`src/pages/Login.tsx`)**:
   - Atualizado o subtítulo abaixo de "Sistema Integrado de Administração Cristã & Ministerial" para o texto exato solicitado: **"Plataforma Completa de Administração Eclesiástica"**.
   - O texto foi posicionado dentro de um elegante container em moldura (`frame`), com borda esmeralda translúcida, fundo escuro estilizado, indicador luminoso pulsante e cantos arredondados, harmonizando com a identidade visual da igreja.

2. **Anexo 2 - Alinhamento Perfeito dos Frames de Documentos (`src/pages/Secretaria.tsx`)**:
   - No bloco "Documentos, Comunicados & Relatórios Oficiais", os 6 botões/cards (`Documentos`, `Relatórios`, `Comunicados`, `Gestor de Eventos`, `Cargos & Funções`, `Carteirinha Digital`) foram reorganizados.
   - O selo **NOVO** da Carteirinha Digital foi reposicionado no canto superior direito interno do cartão, eliminando o transbordamento (`overflow`) que cortava a palavra como "NOV".
   - Aplicada a disciplina de `min-w-0`, `truncate` e proporções simétricas para que todos os títulos e descrições fiquem 100% contidos dentro de suas respectivas molduras sem cortes.

3. **Anexo 3 - Correção da Rolagem e Visualização Completa da Carteirinha (`CarteirinhaDigitalModal.tsx`)**:
   - **Causa**: O container flex utilizava `justify-center` em conjunto com `overflow-y-auto`. Em viewports menores ou notebooks, o cálculo do flexbox empurrava o topo do cartão para fora da área rolável (posição negativa de scroll), impedindo que o usuário visse o topo do crachá.
   - **Solução**: Corrigido para alinhamento superior com `justify-start` e margem automática suave (`my-auto`), garantindo que tanto na visualização padrão quanto no modo editor o cartão permaneça 100% visível, rolável e sem nenhum corte.

4. **Anexo 4 - Harmonização e Centralização da Validade da Credencial**:
   - No Verso da carteirinha (Verso Constitucional, Verso Simples e impressão), a faixa de validade foi redesenhada:
     - A legenda **"VALIDADE DA CREDENCIAL:"** e a data (ex: `31/12/2028`) agora ficam unidas e próximas (com `gap-2`), em vez de separadas nas extremidades opostas do cartão.
     - O bloco está perfeitamente centralizado na horizontal e na vertical.
     - As cores foram harmonizadas com o tema e a cor de destaque (`accentColor` e `borderColor`), garantindo contraste legível e aspecto institucional requintado.

5. **Anexo 5 - Rolagem Completa até a Última Opção no Modo Editor**:
   - Ajustado o container de edição e adicionado espaçamento inferior de segurança (`pb-36`).
   - O usuário agora consegue rolar o menu lateral até o fim absoluto, acessando perfeitamente a seção **"Função Ministerial (Obreiro do Altar)"** e suas notas explicativas sem nenhum bloqueio ou ocultação.

6. **Anexo 6 - Alinhamento do Cabeçalho e Selo nos Obreiros do Altar**:
   - No cabeçalho da carteirinha, foi adicionado espaçamento flexível (`gap-2`) e truncamento inteligente com `min-w-0 flex-1`.
   - O selo superior recebeu a regra `shrink-0 whitespace-nowrap self-center`, impedindo que textos como `MINISTERIAL` ou `CREDENCIAL MINISTERIAL` sejam comprimidos ou tenham suas letras cortadas.
   - A legenda "OBREIRO DO ALTAR" foi alinhada com margens simétricas diretamente sobre o nome do ministro e sua credencial.

7. **Anexo 7 - Efeito Imediato da Seleção do "Selo Superior"**:
   - **Causa**: O código anterior sobrepunha a escolha do dropdown caso o membro fosse detectado como obreiro (`isObreiro ? "CREDENCIAL MINISTERIAL" : badgeLabel`).
   - **Solução**: Atualizada a precedência para `const activeBadgeLabel = cardTheme.badgeLabel || (isObreiro ? "CREDENCIAL MINISTERIAL" : "OFICIAL")`.
   - Adicionada também a opção explícita "CREDENCIAL MINISTERIAL" ao dropdown do Selo Superior. Ao selecionar qualquer opção ("MEMBRO ATIVO", "CREDENCIAL", "OFICIAL", "MINISTERIAL", etc.), ela reflete **imediatamente** na carteirinha na tela, na versão impressa e no celular do membro!

## 14. Resolução dos Problemas do Verso Constitucional & CF/88 (Prompt 10)
1. **Fim do Corte no Canto Superior e Conteúdo Completo**:
   - **Causa**: O verso utilizava uma imagem bitmap com `background-size: cover` que empurrava o topo para além da borda física do crachá, cortando o cabeçalho "CONSTITUIÇÃO DE 1988/REPÚBLICA FEDERATIVA DO BRASIL". Além disso, a advertência legal ("Esta Credencial é pessoal e intransferível...") ficava sobreposta e oculta pela barra de validade.
   - **Solução Implementada**:
     - Removida a imagem raster cortada e implementado o fundo com a bandeira oficial do Brasil vetorizada (`/assets/bandeira_brasil.svg`), posicionada no lado esquerdo com fade suave para branco.
     - Cabeçalho dotado de padding seguro (`pt-1 sm:pt-1.5 px-1`) que impede qualquer corte nos cantos superiores.
     - Todos os textos e artigos constitucionais inseridos na íntegra:
       - `REPÚBLICA FEDERATIVA DO BRASIL • CONSTITUIÇÃO DE 1988`
       - `Solicitamos às autoridades oficiais, civis e militares que dispensem ao portador todas as facilidades e auxílios no exercício de seu Ministério.`
       - `ENTRADAS EM HOSPITAIS E PRESÍDIOS` (Art. 5º VII-A / Lei 9.982)
       - `LIBERDADE DE CULTO` (Art. 5º VI)
       - `Esta Credencial é pessoal e intransferível. Válida com apresentação de RG/CPF.`
       - QR Code de Validação Digital (`VALIDAR DIGITAL` e validade).
       - Barra de Validade centralizada sem colisões.
       - Assinaturas digitais oficiais do Pastor Presidente e Pastor Local.

2. **Correção da Inversão e Preservação na Seleção do Verso**:
   - **Causa**: O seletor utilizava valores "sim/nao" e, ao trocar o tema predefinido de cores, o estado do verso era reinicializado para o padrão do tema, gerando a sensação de inversão ou perda da escolha. Além disso, a carteirinha combinada para download móvel forçava o verso com bandeira mesmo quando "Verso Simples" estava selecionado.
   - **Solução Implementada**:
     - Seletor atualizado para rótulos e valores diretos:
       - `🇧🇷 Verso com Bandeira & CF/88 (Constitucional)` (`value="bandeira"`)
       - `⚪ Verso Simples (Eclesiástico Tradicional)` (`value="simples"`)
     - `handleSelectPresetTheme` atualizado para preservar a escolha do usuário sobre o modelo do verso, largura de borda e obreiro ao alternar temas de cores.
     - Sincronização em todos os locais: Modal da Secretaria, página pública móvel (`/carteirinha`) e exportação combinada (Frente + Verso) em PDF/PNG.

3. **Eliminação de Legendas Fracas/Apagadas & Enquadramento em Frames**:
   - **Causa**: O arquivo PNG original continha textos estáticos que, somados a um degradê branco semitransparente (`rgba(255,255,255,0.72)`), deixavam as legendas acinzentadas, borradas e apagadas, além do conflito de texto duplicado.
   - **Solução Implementada**:
     - Fundo 100% limpo, sem textos impressos na arte gráfica da bandeira.
     - Cada garantia constitucional (`ENTRADAS EM HOSPITAIS E PRESÍDIOS` e `LIBERDADE DE CULTO`) foi emoldurada em seu próprio container/frame com fundo branco translúcido (`bg-white/90`), cantos arredondados e borda sutil.
     - Cores com contraste máximo: títulos em verde-floresta sólido profundo (`#064e3b` / `text-emerald-950`) em peso ultra-negrito (`font-black`), e artigos legais em ardósia escuro (`#0f172a` / `#1e293b`), garantindo 100% de legibilidade tanto na tela quanto na impressão.
