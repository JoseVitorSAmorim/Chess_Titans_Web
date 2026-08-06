# Chess Titans 3D

Um jogo de xadrez 3D em navegador com modo Jogador vs IA e Jogador vs Jogador local.

## Visão geral

O projeto exibe um tabuleiro de xadrez 3D renderizado com peças modeladas em Three.js. A lógica de regras e movimentos de xadrez é gerenciada por Chess.js. No modo contra a IA, o motor Stockfish é carregado dinamicamente em um Web Worker para calcular a jogada do adversário.

## Funcionalidades

- Tabuleiro 3D com peças estilizadas e textura simples
- Seletor de modo: Jogador vs CPU ou Jogador vs Jogador local
- Dificuldades de IA: Fácil, Médio e Difícil
- Destaque de movimentos válidos e capturas
- Capturas exibidas na lateral
- Animações de movimento das peças
- Som de movimento e captura usando a Web Audio API
- Controle de câmera com teclado e rolagem do mouse
- Detecção de xeque, xeque-mate e empate

## Estrutura do projeto

- `index.html` - Estrutura HTML do jogo e inclusão das bibliotecas externas
- `style.css` - Estilos visuais e layout responsivo básico
- `script.js` - Lógica do jogo, renderização 3D, IA e interações

## APIs e bibliotecas usadas

### Bibliotecas de terceiros

- `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`
  - Biblioteca usada para renderizar cena 3D, criar geometria de peças, iluminação, materiais e interação com o mouse.

- `https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js`
  - Biblioteca usada para gerenciar estado do jogo, validação de movimentos, regras de xadrez e detecção de xeque/xeque-mate/empate.

- `https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js`
  - API usada como motor de IA via Web Worker, processando comandos UCI e retornando melhores jogadas.

### APIs do navegador

- `WebGLRenderer` / `THREE.Scene` / `THREE.Camera`
  - Usadas para construir e exibir o tabuleiro e as peças em 3D.

- `fetch()`
  - Usado para carregar o script do Stockfish dinamicamente.
  - Justificativa: permite baixar o motor de IA em tempo de execução sem um bundle pesado.

- `Blob` e `Worker`
  - Usados para transformar o script carregado em um Web Worker do lado do cliente.
  - Justificativa: manter o cálculo da IA em uma thread separada evita travar a interface.

- `Web Audio API` (`AudioContext`, `OscillatorNode`, `GainNode`)
  - Usada para gerar sons de movimento e captura.
  - Justificativa: gera feedback sonoro simples sem depender de arquivos de áudio externos.

- `requestAnimationFrame()`
  - Usado para renderizar continuamente a cena 3D e animar os movimentos de peças.

- `Raycaster` / `Mouse events`
  - Usados para detectar cliques no tabuleiro 3D e traduzir em quadrados de xadrez.

- `DOM API` (`document.getElementById`, eventos de `click`, `change`, etc.)
  - Usados para interação com o menu, atualização de status e painel de capturas.

- `Keyboard events` e `wheel` event
  - Usados para controlar a rotação e zoom da câmera.

## Como usar

1. Abra `index.html` em um navegador compatível.
2. Selecione o modo de jogo e, se aplicável, a dificuldade da IA.
3. Clique em "Iniciar Jogo".
4. Use clique esquerdo para selecionar e mover peças.
5. Use as setas do teclado para girar a câmera e o scroll do mouse para dar zoom.

## Observações

- O jogo promove interatividade 3D sem back-end.
- A IA é executada localmente no navegador usando um Web Worker para melhor desempenho.