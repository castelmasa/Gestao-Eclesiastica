# Soluções Implementadas no Sistema

## 1. Eliminação de Duplicidades no Nome da Igreja e Congregação
- **Resolução do problema de repetição (ex: "2ª Congregação - 2ª Congregação")**:
  - No backend (`server.ts`), unificação e higienização inteligente dos parâmetros `churchName` e `branchName`.
  - Quando a congregação selecionada for uma filial, a denominação principal e a congregação são combinadas de forma harmônica (ex: *Igreja Evangélica Pentecostal O Brasil para Cristo - 2ª Congregação*), sem repetir o mesmo termo.
  - Implementado pós-processamento de segurança com regex no backend para interceptar e remover qualquer ocorrência de nomes repetidos consecutivamente.

## 2. Correção de Termos em Inglês para Português do Brasil
- **Erradicação de anglicismos e termos em inglês**:
  - Inserida diretriz mandatória em todas as chamadas da IA da Secretaria:
    - **"Head da Igreja"** foi substituído por **"Cabeça da Igreja"** (ou "Supremo Pastor" / "Senhor da Igreja").
    - Termos como "Leader", "Worship", "Staff", "Team", "Meeting" foram formalmente proibidos, exigindo os termos eclesiásticos tradicionais em língua portuguesa ("Líder", "Ministério de Louvor", "Corpo de Obreiros", "Equipe", "Reunião / Assembleia").
  - Adicionado filtro de sanitização em `server.ts` que substitui automaticamente qualquer resquício de `Head da Igreja` ou `Head of the church` por `Cabeça da Igreja`.

## 3. Correção de Duplicidades no Cabeçalho Timbrado
- **Harmonização do Cabeçalho (`renderOfficialHeader`)**:
  - Linha 1: Nome da denominação oficial em destaque (*IGREJA EVANGÉLICA PENTECOSTAL O BRASIL PARA CRISTO*).
  - Linha 2: Nome da congregação (*2ª CONGREGAÇÃO*), exibida apenas quando diferente da denominação e não sendo a sede genérica.
  - Se a congregação já estiver anexada ao nome digitado nos parâmetros, a redundância é limpa para que nunca apareçam duas linhas idênticas uma embaixo da outra.
- **Barra de Ações do Modal**:
  - Substituído o título repetido do documento na barra de ferramentas por um indicador de status elegante (*"Carta Eclesiástica Pronta"*, *"Ata Formal de Assembleia Pronta"*, etc.), permitindo que o título solene do documento oficial apareça exclusivamente dentro da folha A4.

## 4. Padrão Oficial A4 Retrato e Assinaturas dos Parâmetros
- Todos os documentos gerados pelo módulo de IA da Secretaria estão formatados no tamanho padrão A4 (`210mm x 297mm`) com tipografia clássica serifada.
- Data oficial do documento logo antes das assinaturas por extenso (*Valparaíso - SP, 03 de Novembro de 2026*).
- Assinaturas dinâmicas do **Pastor Titular / Presidente** e do **1º Secretário(a)** importadas diretamente do cadastro de parâmetros com suas respectivas rubricas/assinaturas digitalizadas.
- Botões de alta resolução para **"Baixar PDF (A4)"**, **"Imprimir A4"** e **"Copiar Texto"**.
