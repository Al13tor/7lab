window.Telegram.WebApp.ready(); // Сообщаем Telegram, что приложение загрузилось
window.Telegram.WebApp.expand(); // Разворачиваем игру на весь экран
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const levelDisplay = document.getElementById("levelDisplay");
const gameOverScreen = document.getElementById("gameOverScreen");
const finalScore = document.getElementById("finalScore");

// Состояние игры
let isGameOver = false;
let score = 0;
let level = 1;
let frameCount = 0;

// Игрок
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 15,
    speed: 5,
    angle: 0, // Угол поворота (в радианах)
    color: "#5A98D0"
};

// Массивы объектов
let enemies = [];
let medals = [];

// Управление
const keys = {
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    w: false, s: false, a: false, d: false
};

// Трекер мыши
let useMouse = false;

// --- ОБРАБОТЧИКИ СОБЫТИЙ ---
document.addEventListener("keydown", (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
    useMouse = false; 
});

document.addEventListener("keyup", (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

canvas.addEventListener("mousemove", (e) => {
    useMouse = true;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Вычисляем вектор направления до мыши
    const dx = mouseX - player.x;
    const dy = mouseY - player.y;

    // Если мышь сдвинулась, обновляем угол (чтобы корабль не дергался, когда мышь стоит)
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        player.angle = Math.atan2(dy, dx);
    }

    player.x = mouseX;
    player.y = mouseY;
});

// --- ЛОГИКА ИГРЫ ---

function spawnEnemy() {
    if (frameCount % Math.max(20, 70 - level * 5) === 0) {
        let side = Math.floor(Math.random() * 4);
        let x, y;
        if (side === 0) { x = Math.random() * canvas.width; y = -20; }
        else if (side === 1) { x = canvas.width + 20; y = Math.random() * canvas.height; }
        else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + 20; }
        else { x = -20; y = Math.random() * canvas.height; }

        const speed = 1.5 + level * 0.5;
        const angle = Math.atan2(player.y - y, player.x - x);
        
        enemies.push({
            x: x, y: y,
            radius: 10,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: "#E74C3C"
        });
    }
}

function spawnMedal() {
    if (frameCount % 120 === 0 && medals.length < 3) {
        medals.push({
            x: Math.random() * (canvas.width - 40) + 20,
            y: Math.random() * (canvas.height - 40) + 20,
            radius: 8,
            color: "#F1C40F",
            vx: (Math.random() - 0.5) * (1 + level * 0.2),
            vy: (Math.random() - 0.5) * (1 + level * 0.2)
        });
    }
}

function update() {
    if (isGameOver) return;
    frameCount++;

    // 1. Управление с клавиатуры
    if (!useMouse) {
        let dx = 0;
        let dy = 0;

        if (keys.ArrowUp || keys.w) dy -= 1;
        if (keys.ArrowDown || keys.s) dy += 1;
        if (keys.ArrowLeft || keys.a) dx -= 1;
        if (keys.ArrowRight || keys.d) dx += 1;

        // Если есть движение, обновляем координаты И угол поворота
        if (dx !== 0 || dy !== 0) {
            player.x += dx * player.speed;
            player.y += dy * player.speed;
            player.angle = Math.atan2(dy, dx); // Поворачиваем в сторону движения
        }
    }

    // Ограничение игрока рамками экрана
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

    // 2. Спавн объектов
    spawnEnemy();
    spawnMedal();

    // 3. Обновление врагов
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        e.x += e.vx;
        e.y += e.vy;

        const dist = Math.hypot(player.x - e.x, player.y - e.y);
        if (dist < player.radius + e.radius) {
            gameOver();
            return;
        }

        if (e.x < -100 || e.x > canvas.width + 100 || e.y < -100 || e.y > canvas.height + 100) {
            enemies.splice(i, 1);
        }
    }

    // 4. Обновление медалей
    for (let i = medals.length - 1; i >= 0; i--) {
        let m = medals[i];
        m.x += m.vx;
        m.y += m.vy;

        if (m.x < m.radius || m.x > canvas.width - m.radius) m.vx *= -1;
        if (m.y < m.radius || m.y > canvas.height - m.radius) m.vy *= -1;

        const dist = Math.hypot(player.x - m.x, player.y - m.y);
        if (dist < player.radius + m.radius) {
            medals.splice(i, 1);
            score++;
            updateUI();
            
            if (score % 3 === 0) {
                level++;
                updateUI();
            }
        }
    }
}

function draw() {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- РИСУЕМ ИГРОКА (ТРЕУГОЛЬНИК) ---
    ctx.save(); // Сохраняем текущее состояние холста
    ctx.translate(player.x, player.y); // Перемещаем центр холста в центр игрока
    ctx.rotate(player.angle); // Поворачиваем холст на угол движения

    ctx.beginPath();
    // Острие треугольника (направлено вперед по оси X)
    ctx.moveTo(player.radius * 1.5, 0); 
    // Левый задний угол
    ctx.lineTo(-player.radius, -player.radius * 0.8); 
    // Правый задний угол
    ctx.lineTo(-player.radius, player.radius * 0.8); 
    ctx.closePath();

    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.restore(); // Возвращаем холст в исходное состояние (чтобы враги не поворачивались вместе с игроком)

    // Рисуем врагов (красные круги)
    enemies.forEach(e => {
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.fill();
        ctx.closePath();
    });

    // Рисуем медали (желтые круги)
    medals.forEach(m => {
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fillStyle = m.color;
        ctx.fill();
        ctx.closePath();
    });
}

function gameLoop() {
    update();
    draw();
    if (!isGameOver) {
        requestAnimationFrame(gameLoop);
    }
}

function updateUI() {
    scoreDisplay.textContent = `Медали: ${score}`;
    levelDisplay.textContent = `Уровень: ${level}`;
}

function gameOver() {
    isGameOver = true;
    finalScore.textContent = score;
    gameOverScreen.classList.remove("hidden");
}

function restartGame() {
    isGameOver = false;
    score = 0;
    level = 1;
    frameCount = 0;
    enemies = [];
    medals = [];
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    player.angle = 0;
    
    updateUI();
    gameOverScreen.classList.add("hidden");
    gameLoop();
}

updateUI();
gameLoop();