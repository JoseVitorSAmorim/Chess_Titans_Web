// --- ESTADO DO JOGO E CONFIGURAÇÕES ---
const game = new Chess();
let stockfish = null;
let isAnimating = false;

let gameMode = 'cpu';       // 'cpu' ou 'pvp'
let difficulty = 'medium';  // 'easy', 'medium', 'hard'

const statusElement = document.getElementById('status');
const container = document.getElementById('game3d-container');
const startMenu = document.getElementById('start-menu');
const modeSelect = document.getElementById('mode-select');
const difficultySelect = document.getElementById('difficulty-select');
const difficultyGroup = document.getElementById('difficulty-group');

// Desativa menu de contexto padrão do botão direito
window.addEventListener('contextmenu', (e) => e.preventDefault());

// Exibir/Ocultar seletor de dificuldade dependendo do modo
modeSelect.addEventListener('change', () => {
    if (modeSelect.value === 'pvp') {
        difficultyGroup.style.display = 'none';
    } else {
        difficultyGroup.style.display = 'block';
    }
});

// Botão Iniciar Jogo
document.getElementById('start-btn').addEventListener('click', () => {
    gameMode = modeSelect.value;
    difficulty = difficultySelect.value;
    
    startMenu.style.display = 'none';
    resetGame();
});

// Botão Novo Jogo / Voltar ao Menu
document.getElementById('menu-btn').addEventListener('click', () => {
    startMenu.style.display = 'flex';
});

function resetGame() {
    game.reset();
    selectedSquare = null;
    clearHighlights();
    render3D();
    
    if (gameMode === 'cpu') {
        configureStockfishDifficulty();
        camTheta = 0;
        targetCamTheta = 0;
        updateCameraPosition();
    } else {
        setCameraForTurn();
    }
    updateStatus();
}

// --- EFEITOS SONOROS ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'move') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
    } else if (type === 'capture') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.12);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
    }
}

// --- CENA THREE.JS ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x121214);

const camera = new THREE.PerspectiveCamera(45, 800 / 600, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(800, 600);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// --- SISTEMA DE CÂMERA E ROTAÇÃO AUTOMÁTICA ---
let camTheta = 0;
let targetCamTheta = 0;
let camPhi = Math.PI / 3;
let camRadius = 14;

function updateCameraPosition() {
    camPhi = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, camPhi));
    camRadius = Math.max(6, Math.min(22, camRadius));

    camera.position.x = camRadius * Math.sin(camPhi) * Math.sin(camTheta);
    camera.position.y = camRadius * Math.cos(camPhi);
    camera.position.z = camRadius * Math.sin(camPhi) * Math.cos(camTheta);
    camera.lookAt(0, 0, 0);
}
updateCameraPosition();

// Calcula o ângulo ideal da câmera com base na vez do jogador (PvP)
function setCameraForTurn() {
    if (gameMode !== 'pvp') return;

    // Brancas ficam em 0 radianos, Pretas em PI radianos (180 deg)
    const desired = (game.turn() === 'w') ? 0 : Math.PI;
    
    // Calcula a diferença de ângulo no menor caminho
    let diff = (desired - camTheta) % (2 * Math.PI);
    if (diff < -Math.PI) diff += 2 * Math.PI;
    if (diff > Math.PI) diff -= 2 * Math.PI;

    targetCamTheta = camTheta + diff;
}

const keyState = {};
window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        keyState[e.key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        keyState[e.key] = false;
    }
});

function handleCameraKeyboard() {
    let moved = false;
    if (keyState['ArrowLeft']) { camTheta -= 0.03; moved = true; }
    if (keyState['ArrowRight']) { camTheta += 0.03; moved = true; }
    if (keyState['ArrowUp']) { camPhi -= 0.02; moved = true; }
    if (keyState['ArrowDown']) { camPhi += 0.02; moved = true; }

    if (moved) {
        targetCamTheta = camTheta; // Mantém a posição escolhida manualmente
        updateCameraPosition();
    }
}

container.addEventListener('wheel', (e) => {
    e.preventDefault();
    camRadius += e.deltaY * 0.01;
    updateCameraPosition();
}, { passive: false });

// --- ILUMINAÇÃO ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xfffaed, 1.2);
dirLight.position.set(8, 18, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.bias = -0.0001;
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x90e0ef, 0.4);
fillLight.position.set(-8, 10, -10);
scene.add(fillLight);

// --- MATERIAIS & MODELAGEM ---
const matWhite = new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.15, metalness: 0.1 });
const matBlack = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.2, metalness: 0.3 });
const matBoardWhite = new THREE.MeshStandardMaterial({ color: 0xeedcb9, roughness: 0.3 });
const matBoardBlack = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.3 });
const matBorder = new THREE.MeshStandardMaterial({ color: 0x2d1810, roughness: 0.4 });

let piecesGroup = new THREE.Group();
let highlightsGroup = new THREE.Group();
scene.add(piecesGroup);
scene.add(highlightsGroup);
let squares = [];

const pieceGeometries = {};

function buildPieceGeometries() {
    function createLathe(points) {
        const vecPoints = points.map(p => new THREE.Vector2(p[0], p[1]));
        return new THREE.LatheGeometry(vecPoints, 32);
    }

    pieceGeometries['p'] = createLathe([
        [0, 0], [0.38, 0], [0.35, 0.08], [0.28, 0.15], [0.25, 0.25], 
        [0.2, 0.5], [0.24, 0.53], [0.18, 0.58], [0.27, 0.72], [0.25, 0.85], 
        [0.15, 0.93], [0, 0.95]
    ]);

    pieceGeometries['r'] = createLathe([
        [0, 0], [0.42, 0], [0.38, 0.1], [0.3, 0.2], [0.26, 0.65], 
        [0.34, 0.72], [0.34, 1.05], [0.28, 1.05], [0, 1.05]
    ]);

    pieceGeometries['b'] = createLathe([
        [0, 0], [0.4, 0], [0.36, 0.1], [0.28, 0.22], [0.2, 0.65], 
        [0.26, 0.72], [0.24, 0.95], [0.18, 1.15], [0.08, 1.25], [0, 1.3]
    ]);

    pieceGeometries['q'] = createLathe([
        [0, 0], [0.44, 0], [0.4, 0.12], [0.3, 0.25], [0.22, 0.85], 
        [0.32, 0.95], [0.28, 1.25], [0.33, 1.35], [0.12, 1.45], [0, 1.5]
    ]);

    pieceGeometries['k'] = createLathe([
        [0, 0], [0.45, 0], [0.41, 0.12], [0.32, 0.25], [0.24, 0.9], 
        [0.34, 1.0], [0.3, 1.35], [0.22, 1.45], [0.25, 1.55], [0, 1.6]
    ]);

    const knightBase = createLathe([[0,0], [0.4,0], [0.36,0.12], [0.28,0.25], [0.24,0.45], [0,0.45]]);
    const headGeo = new THREE.BoxGeometry(0.35, 0.6, 0.55);
    headGeo.translate(0, 0.7, 0.08);

    const knightGroup = new THREE.Group();
    const meshBase = new THREE.Mesh(knightBase);
    const meshHead = new THREE.Mesh(headGeo);
    knightGroup.add(meshBase);
    knightGroup.add(meshHead);
    pieceGeometries['n'] = knightGroup;
}

function createPieceMesh(type, color) {
    const mat = color === 'w' ? matWhite : matBlack;
    const key = type.toLowerCase();

    if (key === 'n') {
        const group = pieceGeometries['n'].clone();
        group.children.forEach(child => {
            child.material = mat;
            child.castShadow = true;
            child.receiveShadow = true;
        });
        group.rotation.y = color === 'w' ? 0 : Math.PI;
        return group;
    } else {
        const geo = pieceGeometries[key];
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }
}

// --- TABULEIRO ---
function createBoard() {
    const frameGeo = new THREE.BoxGeometry(9.2, 0.4, 9.2);
    const frameMesh = new THREE.Mesh(frameGeo, matBorder);
    frameMesh.position.set(0, -0.15, 0);
    frameMesh.receiveShadow = true;
    scene.add(frameMesh);

    for (let x = 0; x < 8; x++) {
        for (let z = 0; z < 8; z++) {
            const geo = new THREE.BoxGeometry(1, 0.2, 1);
            const mat = (x + z) % 2 === 0 ? matBoardWhite : matBoardBlack;
            const square = new THREE.Mesh(geo, mat);
            
            square.position.set(x - 3.5, 0, z - 3.5);
            square.receiveShadow = true;
            square.userData = { x, z, squareName: getSquareName(z, x) };
            
            scene.add(square);
            squares.push(square);
        }
    }
}

function getSquareName(row, col) {
    return ['a','b','c','d','e','f','g','h'][col] + ['8','7','6','5','4','3','2','1'][row];
}

function getCoordsFromSquare(squareName) {
    const file = squareName.charCodeAt(0) - 97;
    const rank = 8 - parseInt(squareName[1]);
    return { x: file - 3.5, z: rank - 3.5 };
}

function getSquareNameFromCoords(x, z) {
    const col = Math.round(x + 3.5);
    const row = Math.round(z + 3.5);
    if (col >= 0 && col < 8 && row >= 0 && row < 8) {
        return getSquareName(row, col);
    }
    return null;
}

// --- HIGHLIGHTS ---
function clearHighlights() {
    while (highlightsGroup.children.length > 0) {
        const obj = highlightsGroup.children[0];
        obj.geometry.dispose();
        obj.material.dispose();
        highlightsGroup.remove(obj);
    }
}

function addHighlight(squareName, colorHex, opacity = 0.5) {
    const coords = getCoordsFromSquare(squareName);
    const geo = new THREE.PlaneGeometry(0.96, 0.96);
    const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: opacity,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(coords.x, 0.11, coords.z);
    highlightsGroup.add(mesh);
}

function showHighlights(squareName) {
    clearHighlights();
    addHighlight(squareName, 0xffd700, 0.5);

    const moves = game.moves({ square: squareName, verbose: true });
    moves.forEach(move => {
        const isCapture = Boolean(move.captured || move.flags.includes('c') || move.flags.includes('e'));
        const color = isCapture ? 0xff3333 : 0x33ff66;
        addHighlight(move.to, color, 0.6);
    });
}

// --- RENDERIZAÇÃO E PAINEL ---
const pieceSymbols = { 'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚' };

function updateCapturedPanel() {
    const history = game.history({ verbose: true });
    const capturedByWhite = [];
    const capturedByBlack = [];

    history.forEach(move => {
        if (move.captured) {
            const symbol = pieceSymbols[move.captured];
            if (move.color === 'w') {
                capturedByWhite.push(symbol);
            } else {
                capturedByBlack.push(symbol);
            }
        }
    });

    document.getElementById('captured-by-white').textContent = capturedByWhite.join(' ');
    document.getElementById('captured-by-black').textContent = capturedByBlack.join(' ');
}

function render3D() {
    while(piecesGroup.children.length > 0) piecesGroup.remove(piecesGroup.children[0]);
    
    const boardState = game.board();
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = boardState[r][c];
            if (piece) {
                const mesh = createPieceMesh(piece.type, piece.color);
                mesh.position.set(c - 3.5, 0.1, r - 3.5);
                piecesGroup.add(mesh);
            }
        }
    }
    updateCapturedPanel();
}

// --- ANIMAÇÃO DAS PEÇAS ---
function animateMove(fromSquare, toSquare, isCapture, onComplete) {
    const startCoords = getCoordsFromSquare(fromSquare);
    const endCoords = getCoordsFromSquare(toSquare);
    
    let targetMesh = null;
    piecesGroup.children.forEach(mesh => {
        if (Math.abs(mesh.position.x - startCoords.x) < 0.1 && 
            Math.abs(mesh.position.z - startCoords.z) < 0.1) {
            targetMesh = mesh;
        }
    });

    if (!targetMesh) {
        if (onComplete) onComplete();
        return;
    }

    isAnimating = true;
    const startTime = performance.now();
    const duration = 380;

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        targetMesh.position.x = startCoords.x + (endCoords.x - startCoords.x) * progress;
        targetMesh.position.z = startCoords.z + (endCoords.z - startCoords.z) * progress;
        targetMesh.position.y = 0.1 + Math.sin(progress * Math.PI) * 0.9;

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            targetMesh.position.y = 0.1;
            isAnimating = false;
            playSound(isCapture ? 'capture' : 'move');
            if (onComplete) onComplete();
        }
    }

    requestAnimationFrame(step);
}

// --- INTERAÇÃO E REGRAS DE TURNO ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedSquare = null;

container.addEventListener('click', (event) => {
    if (isAnimating) return;

    if (gameMode === 'cpu' && game.turn() === 'b') return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        for (let i = 0; i < intersects.length; i++) {
            let hitObj = intersects[i].object;
            let current = hitObj;
            let squareFound = null;

            while (current && current !== scene) {
                if (current.userData && current.userData.squareName) {
                    squareFound = current.userData.squareName;
                    break;
                }
                if (current.parent === piecesGroup) {
                    squareFound = getSquareNameFromCoords(current.position.x, current.position.z);
                    break;
                }
                current = current.parent;
            }

            if (squareFound) {
                handleMoveLogic(squareFound);
                break;
            }
        }
    }
});

function handleMoveLogic(squareName) {
    const currentTurnColor = game.turn();

    if (!selectedSquare) {
        const piece = game.get(squareName);
        if (piece && piece.color === currentTurnColor) {
            selectedSquare = squareName;
            showHighlights(squareName);
            statusElement.textContent = "Selecionado: " + squareName.toUpperCase();
        }
    } else {
        if (selectedSquare === squareName) {
            selectedSquare = null;
            clearHighlights();
            updateStatus();
            return;
        }

        const from = selectedSquare;
        const to = squareName;
        const moveValid = game.move({ from, to, promotion: 'q' });

        if (moveValid) {
            const isCapture = Boolean(moveValid.captured);
            selectedSquare = null;
            clearHighlights();
            game.undo();

            animateMove(from, to, isCapture, () => {
                game.move({ from, to, promotion: 'q' });
                render3D();
                updateStatus();

                if (gameMode === 'pvp') {
                    setCameraForTurn();
                } else if (gameMode === 'cpu' && game.turn() === 'b') {
                    setTimeout(makeAIMove, 300);
                }
            });
        } else {
            const piece = game.get(squareName);
            if (piece && piece.color === currentTurnColor) {
                selectedSquare = squareName;
                showHighlights(squareName);
                statusElement.textContent = "Selecionado: " + squareName.toUpperCase();
            } else {
                selectedSquare = null;
                clearHighlights();
                updateStatus();
            }
        }
    }
}

// --- CONEXÃO E CONFIGURAÇÃO DA IA STOCKFISH ---
async function initStockfish() {
    try {
        const response = await fetch('https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js');
        if (!response.ok) throw new Error("Erro de rede.");

        const scriptText = await response.text();
        const blob = new Blob([scriptText], { type: 'application/javascript' });

        stockfish = new Worker(URL.createObjectURL(blob));

        stockfish.onmessage = function(event) {
            const message = event.data;
            if (message.startsWith('bestmove')) {
                const move = message.split(' ')[1];
                if (move && move !== '(none)') {
                    const from = move.substring(0, 2);
                    const to = move.substring(2, 4);
                    const promotion = move.length > 4 ? move.substring(4, 5) : undefined;
                    
                    const isCapture = Boolean(game.get(to));

                    animateMove(from, to, isCapture, () => {
                        game.move({ from, to, promotion: promotion || 'q' });
                        render3D();
                        updateStatus();
                    });
                }
            }
        };

        stockfish.postMessage('uci');
    } catch (error) {
        console.error("Erro no Stockfish:", error);
    }
}

function configureStockfishDifficulty() {
    if (!stockfish) return;

    let skillLevel = 5;
    if (difficulty === 'easy') skillLevel = 1;
    if (difficulty === 'medium') skillLevel = 8;
    if (difficulty === 'hard') skillLevel = 20;

    stockfish.postMessage(`setoption name Skill Level value ${skillLevel}`);
}

function makeAIMove() {
    if (game.game_over() || !stockfish) return;

    statusElement.textContent = "Chess Titans pensando...";
    stockfish.postMessage(`position fen ${game.fen()}`);

    let moveTime = 600;
    if (difficulty === 'easy') moveTime = 300;
    if (difficulty === 'medium') moveTime = 800;
    if (difficulty === 'hard') moveTime = 1500;

    stockfish.postMessage(`go movetime ${moveTime}`);
}

function updateStatus() {
    if (game.in_checkmate()) {
        statusElement.textContent = "Xeque-mate! Fim de jogo.";
    } else if (game.in_draw()) {
        statusElement.textContent = "Empate!";
    } else if (game.in_check()) {
        statusElement.textContent = "Xeque! " + (game.turn() === 'w' ? "Vez das Brancas" : "Vez das Pretas");
    } else {
        if (gameMode === 'cpu') {
            statusElement.textContent = game.turn() === 'w' ? "Sua vez (Brancas)" : "Vez da IA (Pretas)";
        } else {
            statusElement.textContent = game.turn() === 'w' ? "Vez do Jogador 1 (Brancas)" : "Vez do Jogador 2 (Pretas)";
        }
    }
}

// --- LOOP PRINCIPAL ---
function animate() {
    requestAnimationFrame(animate);

    // Transição suave de rotação da câmera (Interpolador Lerp)
    if (Math.abs(camTheta - targetCamTheta) > 0.001) {
        camTheta += (targetCamTheta - camTheta) * 0.05;
        updateCameraPosition();
    }

    handleCameraKeyboard();
    renderer.render(scene, camera);
}

// Inicialização
buildPieceGeometries();
createBoard();
render3D();
initStockfish();
animate();