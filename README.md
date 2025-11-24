# ViralFlow GUI – MVP (mvp-viralflow-gui_v0.26.8)

Esta é uma versão **MVP totalmente simulada** da aplicação **ViralFlow GUI**, construída em
**Electron + React**.

Desde a concepção deste MVP, o objetivo é **validar o fluxo de telas, usabilidade e logs**
**sem executar nenhum comando real** do pipeline ViralFlow ou de ferramentas auxiliares.

> ✅ **Use este projeto para:**
> - Demonstrar a interface para usuários finais;
> - Validar o fluxo de instalação / configuração / execução;
> - Testar leitura de parâmetros e visualização de resultados já existentes em disco.  
>
> ❌ **Não use este projeto para:**
> - Executar o pipeline ViralFlow de verdade;
> - Gerar resultados reais a partir de arquivos FASTQ/entrada bruta.

---

## 1. Requisitos

- Node.js **>= 18**
- npm (ou pnpm/yarn, se preferir)
- Git (apenas para clonar/baixar o código, não é usado pela GUI em tempo de execução)

> ℹ️ **Não é necessário** ter `micromamba` nem `viralflow` instalados para rodar este MVP.

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

1. Gerar o bundle do front-end (Vite);
2. Iniciar o processo Electron que carrega a GUI.

Uma janela do **ViralFlow GUI – MVP** será aberta.

---

## 4. Como funciona o MVP (tudo é simulado)

### 4.1. Estado de instalação (micromamba / ViralFlow)

- **Sempre que a aplicação inicia**, ela considera que:
  - `micromamba` **não está instalado**;
  - `ViralFlow` **não está instalado**;
  - Containers **não foram construídos**.

- Por isso, o **modal inicial de instalação** é sempre exibido.

- Os botões:
  - **Instalar micromamba**
  - **Instalar ViralFlow**
  - **Construir containers**
  - **Atualizar Pangolin**
  - **Customizar snpEff**

  funcionam da seguinte forma neste MVP:

  - Não executam nenhum comando real (`micromamba`, `viralflow`, `git`, `curl`, etc.);
  - Apenas registram mensagens de log na área apropriada;
  - Atualizam um **estado interno em memória** para que, **durante a sessão atual**, a UI
    passe a enxergar essas etapas como “concluídas com sucesso”.

Ao fechar e abrir novamente a aplicação, o estado volta ao início (ambiente não instalado).

---

### 4.2. Aba de Execução (Run)

Na aba **Execução**:

- O botão **Executar**:
  - Gera o arquivo `viralflow-gui.params` no diretório configurado do ViralFlow
    (conforme a aba **Configurações**);
  - **Não executa** o comando real `micromamba run -n viralflow viralflow ...`;
  - Envia mensagens de log simuladas para a área de execução, como se a execução tivesse
    ocorrido com sucesso.

Ou seja: o usuário consegue ver *como* seria o comando e *como* seriam os logs, mas
nenhum processo externo é iniciado.

---

### 4.3. Abas de Parâmetros e Resultados

Estas duas abas se comportam de forma mais “realista”, mas ainda sem disparar o pipeline:

- **Parâmetros**
  - Permite editar, salvar e carregar parâmetros no formato aceito pelo ViralFlow (`.params`);
  - O arquivo é escrito/lido normalmente no sistema de arquivos.

- **Resultados**
  - Lista e abre arquivos/pastas já existentes no diretório de resultados;
  - A interface apenas **lê** o que já está no disco — ela **não cria** novos resultados,
    pois o pipeline não é executado neste MVP.

---

## 5. Estrutura geral do projeto

- `electron/main.js`  
  Processo principal do Electron: IPC, leitura/escrita de arquivos, simulação de
  instalação/execução e envio de logs.

- `electron/preload.js`  
  Faz o bridge seguro entre o processo principal e o front-end React, expondo a
  API em `window.api`.

- `src/`  
  Código React:
  - `pages/Home.tsx`
  - `pages/Params.tsx`
  - `pages/Run.tsx`
  - `pages/Results.tsx`
  - `pages/Settings.tsx`
  - `pages/SetupModal.tsx`
  - estilos, tema e i18n.

- `README.md`  
  Este arquivo, com as instruções de uso do MVP.

---

## 6. Próximos passos (futuras versões)

Este MVP foi desenhado para ser a **primeira etapa** da GUI, focada em:

- Fluxo de navegação entre abas;
- Usabilidade das telas;
- Estrutura de logs;
- Interação com arquivos de parâmetros e resultados.

Em versões futuras, poderá ser adicionada a **integração real** com:

- `micromamba` (instalação e gerenciamento de ambientes);
- `viralflow` (execução real do pipeline);
- Logs de execução reais, com tratamento de erros, tempo de execução, etc.

Essa integração ainda **não foi implementada** neste projeto — toda a execução é,
por design, **100% simulada**.
