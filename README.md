# ViralFlow GUI – MVP (mvp-viralflow-gui_v0.26.8)

Esta é uma versão **MVP de demonstração** da aplicação **ViralFlow GUI** em Electron + React.

> ⚠️ **Importante:** nesta versão **nenhum comando real é executado** no sistema operacional.
> Todas as chamadas ao `micromamba` e ao `viralflow` são **simuladas** (“fake”), apenas com
> registro de log na interface.  
> A aba de **Parâmetros** continua gerando o arquivo `.params` e a aba de **Resultados**
> continua apenas **lendo/mostrando arquivos e pastas já existentes**.

---

## 1. Requisitos

- Node.js **>= 18**
- npm (ou pnpm/yarn, se preferir)
- Git (apenas para fins de desenvolvimento; **não é usado pela aplicação em modo MVP**)

Não é necessário ter `micromamba` nem `viralflow` instalados para rodar esta versão.

---

## 2. Instalação das dependências

Dentro da pasta do projeto:

```bash
npm install
```

Isso irá instalar as dependências do React, Vite e Electron.

---

## 3. Executando a aplicação (modo desenvolvimento)

Ainda na pasta do projeto, rode:

```bash
npm run start
```

Esse comando irá:

1. Gerar o bundle do front‑end (Vite).
2. Iniciar o processo Electron que carrega a GUI.

A janela do **ViralFlow GUI – MVP** será aberta.

---

## 4. Comportamento especial deste MVP

### 4.1. Estado de instalação (micromamba / ViralFlow)

- **Sempre que a aplicação iniciar**, ela se comporta como se **micromamba** e **ViralFlow**
  **não estivessem instalados**.
- Por isso, o **modal inicial de instalação** é sempre exibido na abertura.
- Os botões de:
  - **Instalar micromamba**
  - **Instalar ViralFlow**
  - **Construir containers**
  - **Atualizar Pangolin**
  - **Customizar snpEff**

  **não executam nenhum comando real**.  
  Eles apenas:
  - Registram mensagens de log na área de logs.
  - Atualizam um **estado interno em memória** para que, dentro da sessão atual,
    a interface passe a considerar que as etapas foram “concluídas com sucesso”.

Ao fechar e abrir novamente a aplicação, o estado volta ao início (não instalado).

### 4.2. Aba de Execução (Run)

- O botão **Executar**:
  - Gera normalmente o arquivo `viralflow-gui.params` no diretório configurado do ViralFlow
    (conforme a aba de Configurações).
  - **Não executa** o comando real `micromamba run ... viralflow -run ...`.
  - Apenas envia logs simulados para a área de execução, como se a execução tivesse
    sido concluída com sucesso.

### 4.3. Abas de Parâmetros e Resultados

- **Parâmetros**
  - Continua salvando e carregando parâmetros no formato aceito pelo ViralFlow (`.params`),
    usando o comportamento já existente.
- **Resultados**
  - Continua listando pastas e arquivos de resultados **já existentes** no sistema de arquivos.
  - Não há geração de novos resultados automaticamente nesta versão, pois o pipeline
    não é executado de verdade.

---

## 5. Estrutura geral

- `electron/main.js`  
  Contém a lógica principal do processo Electron (IPC, leitura/escrita de arquivos,
  simulação das chamadas ao micromamba/ViralFlow, etc.).
- `electron/preload.js`  
  Faz o bridge seguro entre o processo principal e o front‑end React (`window.api`).
- `src/`  
  Código React (páginas Home, Parâmetros, Execução, Resultados, Configurações e modal
  de instalação).
- `README.md`  
  Este arquivo com as instruções de uso do MVP.

---

## 6. Observação sobre uso em produção

Esta versão **mvp-viralflow-gui_v0.26.8** é indicada apenas para:

- Demonstrações de UX/UI;
- Validação de fluxo de telas;
- Discussão com usuários e partes interessadas, **sem** requisitos de acesso real
  ao ambiente ViralFlow.

Para uso em produção será necessário:

- Reativar as chamadas reais ao `micromamba` e ao `viralflow`;
- Tratar logs e erros de execução reais;
- Validar permissões e ambiente de execução no SO alvo (.deb, .rpm, etc.).

