const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let level = 1;
let lives = 3;
let maxHits = 3;
let hits = 3;
let starsTotal = 0;
let starsCollected = 0;

let platforms = [];
let stars = [];
let spikes = [];

let player = {
    x: 400,
    y: 500,
    width: 24,
    height: 24,
    vx: 0,
    vy: 0,
    speed: 5,
    jumpForce: -11,
    gravity: 0.5,
    isGrounded: false,
    invulnerableTime: 0
};

const keys = {};
window.addEventListener('keydown', e => { keys[e.code] = true; });
window.addEventListener('keyup', e => { keys[e.code] = false; });

function generateLevel() {
    platforms = [];
    stars = [];
    spikes = [];
    
    // Bottom ground
    platforms.push({ x: 0, y: 550, w: 800, h: 50 });
    
    // Create platforms
    let numPlatforms = 6 + level * 2;
    for(let i=0; i<numPlatforms; i++) {
        let attempts = 0;
        let placed = false;
        while(attempts < 30 && !placed) {
            let source = platforms[Math.floor(Math.random() * platforms.length)];
            let w = 70 + Math.random() * 60;
            let h = 20;
            
            let dir = Math.random() < 0.5 ? -1 : 1;
            let dx = dir * (60 + Math.random() * 80);
            let dy = -30 - Math.random() * 60; 
            if (Math.random() < 0.2 && source.y < 450) dy = 40 + Math.random() * 60; 
            
            let nx = source.x + source.w/2 + dx - w/2;
            let ny = source.y + dy;
            
            nx = Math.max(20, Math.min(800 - w - 20, nx));
            ny = Math.max(100, Math.min(500, ny));
            
            let overlap = platforms.some(p => {
                return nx < p.x + p.w + 10 && nx + w > p.x - 10 &&
                       ny < p.y + p.h + 30 && ny + h > p.y - 30;
            });
            
            if (!overlap) {
                platforms.push({ x: nx, y: ny, w: w, h: h });
                placed = true;
            }
            attempts++;
        }
    }
    
    let availablePlats = platforms.slice(1);
    availablePlats.sort(() => Math.random() - 0.5);
    
    // Place stars
    let starCount = 3 + Math.floor(level * 1.2);
    for(let i=0; i<starCount && i<availablePlats.length; i++) {
        let p = availablePlats[i];
        stars.push({
            x: p.x + p.w/2,
            y: p.y - 20,
            radius: 10,
            collected: false
        });
    }
    starsTotal = stars.length;
    starsCollected = 0;
    
    // Place spikes
    let spikeCount = 1 + Math.floor(level * 0.8);
    for(let i=0; i<spikeCount; i++) {
        let p = availablePlats[Math.floor(Math.random() * availablePlats.length)];
        if(p.w < 60) continue; // Needs enough space to patrol
        spikes.push({
            x: p.x + p.w/2,
            y: p.y - 12,
            radius: 12,
            vx: (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random() * 1.5),
            minX: p.x + 12,
            maxX: p.x + p.w - 12
        });
    }
    
    // Reset player
    player.x = 388;
    player.y = 526;
    player.vx = 0;
    player.vy = 0;
    player.isGrounded = false;
    player.invulnerableTime = 0;
    
    updateUI();
}

function updateUI() {
    document.getElementById('star-count').innerText = `${starsCollected} / ${starsTotal}`;
    document.getElementById('level-display').innerText = level;
    
    let healthPercent = (hits / maxHits) * 100;
    let healthBar = document.getElementById('health-bar');
    healthBar.style.width = healthPercent + '%';
    if (hits === 1) healthBar.style.backgroundColor = '#ef4444';
    else if (hits === 2) healthBar.style.backgroundColor = '#f59e0b';
    else healthBar.style.backgroundColor = '#10b981';
    
    let livesHtml = '';
    for(let i=0; i<3; i++) {
        if (i < lives) {
            livesHtml += '<span class="heart">❤️</span>';
        } else {
            livesHtml += '<span class="heart lost">❤️</span>';
        }
    }
    document.getElementById('lives-display').innerHTML = livesHtml;
}

function handleInput() {
    if (keys['ArrowLeft'] || keys['KeyA']) {
        player.vx = -player.speed;
    } else if (keys['ArrowRight'] || keys['KeyD']) {
        player.vx = player.speed;
    } else {
        player.vx = 0;
    }
    
    if ((keys['ArrowUp'] || keys['KeyW'] || keys['Space']) && player.isGrounded) {
        player.vy = player.jumpForce;
        player.isGrounded = false;
    }
}

function getOverlap(r1, r2) {
    let l1 = r1.x, r1x = r1.x + r1.width;
    let t1 = r1.y, b1 = r1.y + r1.height;
    let l2 = r2.x, r2x = r2.x + r2.w;
    let t2 = r2.y, b2 = r2.y + r2.h;
    
    return l1 < r2x && r1x > l2 && t1 < b2 && b1 > t2;
}

function circleRectCollide(cx, cy, radius, rx, ry, rw, rh) {
    let testX = cx;
    let testY = cy;
    
    if (cx < rx) testX = rx;
    else if (cx > rx + rw) testX = rx + rw;
    
    if (cy < ry) testY = ry;
    else if (cy > ry + rh) testY = ry + rh;
    
    let distX = cx - testX;
    let distY = cy - testY;
    let distance = Math.sqrt((distX*distX) + (distY*distY));
    
    return distance <= radius;
}

function takeDamage() {
    hits--;
    player.invulnerableTime = 90; // 1.5 seconds
    if (hits <= 0) {
        lives--;
        if (lives <= 0) {
            gameOver();
        } else {
            hits = maxHits;
        }
    }
    updateUI();
}

function levelComplete() {
    level++;
    generateLevel();
}

let isGameOver = false;

function gameOver() {
    isGameOver = true;
    document.getElementById('game-over-screen').classList.remove('hidden');
}

function update() {
    player.vy += player.gravity;

    // X axis logic
    player.x += player.vx;
    if(player.x < 0) player.x = 0;
    if(player.x + player.width > 800) player.x = 800 - player.width;

    for(let p of platforms) {
        if (getOverlap(player, p)) {
            if (player.vx > 0) {
                player.x = p.x - player.width;
            } else if (player.vx < 0) {
                player.x = p.x + p.w;
            }
            player.vx = 0;
        }
    }

    // Y axis logic
    player.y += player.vy;
    player.isGrounded = false;
    
    if(player.y < 0) {
        player.y = 0;
        player.vy = 0;
    }
    if(player.y + player.height >= 600) {
        player.y = 600 - player.height;
        player.isGrounded = true;
        player.vy = 0;
    }

    for(let p of platforms) {
        if (getOverlap(player, p)) {
            if (player.vy > 0) {
                player.y = p.y - player.height;
                player.isGrounded = true;
                player.vy = 0;
            } else if (player.vy < 0) {
                player.y = p.y + p.h;
                player.vy = 0;
            }
        }
    }
    
    // Update spikes
    for(let s of spikes) {
        s.x += s.vx;
        if (s.x < s.minX) {
            s.x = s.minX;
            s.vx *= -1;
        } else if (s.x > s.maxX) {
            s.x = s.maxX;
            s.vx *= -1;
        }
    }
    
    // Check stars
    for(let star of stars) {
        if (!star.collected && circleRectCollide(star.x, star.y, star.radius, player.x, player.y, player.width, player.height)) {
            star.collected = true;
            starsCollected++;
            updateUI();
            if (starsCollected >= starsTotal) {
                levelComplete();
            }
        }
    }
    
    // Check spikes
    if (player.invulnerableTime <= 0) {
        for(let spike of spikes) {
            // make the hitbox slightly smaller than the visual radius to be fair
            if (circleRectCollide(spike.x, spike.y, spike.radius * 0.7, player.x, player.y, player.width, player.height)) {
                takeDamage();
                break;
            }
        }
    } else {
        player.invulnerableTime--;
    }
}

function drawStar(cx, cy, spikesNum, outerRadius, innerRadius, context) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikesNum;

    context.beginPath();
    context.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikesNum; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        context.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        context.lineTo(x, y);
        rot += step;
    }
    context.lineTo(cx, cy - outerRadius);
    context.closePath();
    context.fill();
}

function drawSpikeBall(cx, cy, r, context) {
    context.fillStyle = '#ef4444';
    context.shadowColor = '#ef4444';
    context.shadowBlur = 10;
    context.beginPath();
    context.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
    context.fill();
    
    let spikesNum = 8;
    for(let i=0; i<spikesNum; i++) {
        let angle = (Math.PI * 2 / spikesNum) * i;
        context.beginPath();
        context.moveTo(cx + Math.cos(angle - 0.2) * r * 0.6, cy + Math.sin(angle - 0.2) * r * 0.6);
        context.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
        context.lineTo(cx + Math.cos(angle + 0.2) * r * 0.6, cy + Math.sin(angle + 0.2) * r * 0.6);
        context.fill();
    }
    context.shadowBlur = 0;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Platforms
    ctx.fillStyle = '#334155';
    for (let p of platforms) {
        ctx.beginPath();
        if(ctx.roundRect) {
            ctx.roundRect(p.x, p.y, p.w, p.h, 4);
        } else {
            ctx.rect(p.x, p.y, p.w, p.h);
        }
        ctx.fill();
        
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        if(ctx.roundRect) {
            ctx.roundRect(p.x, p.y, p.w, Math.min(p.h, 6), 4);
        } else {
            ctx.rect(p.x, p.y, p.w, Math.min(p.h, 6));
        }
        ctx.fill();
        ctx.fillStyle = '#334155';
    }
    
    // Stars
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 15;
    for (let star of stars) {
        if (!star.collected) {
            let bob = Math.sin(Date.now() / 200) * 3;
            drawStar(star.x, star.y + bob, 5, star.radius, star.radius / 2.5, ctx);
        }
    }
    ctx.shadowBlur = 0;
    
    // Spikes
    for (let spike of spikes) {
        ctx.save();
        ctx.translate(spike.x, spike.y);
        ctx.rotate(Date.now() / 200 * (spike.vx > 0 ? 1 : -1));
        drawSpikeBall(0, 0, spike.radius, ctx);
        ctx.restore();
    }
    
    // Player
    if (player.invulnerableTime > 0 && Math.floor(player.invulnerableTime / 5) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    }
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    if(ctx.roundRect) {
        ctx.roundRect(player.x, player.y, player.width, player.height, 6);
    } else {
        ctx.rect(player.x, player.y, player.width, player.height);
    }
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
    
    // Player eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    let eyeDirX = player.vx > 0 ? 3 : (player.vx < 0 ? -3 : 0);
    ctx.arc(player.x + player.width/2 - 5 + eyeDirX, player.y + 8, 2.5, 0, Math.PI * 2);
    ctx.arc(player.x + player.width/2 + 5 + eyeDirX, player.y + 8, 2.5, 0, Math.PI * 2);
    ctx.fill();
}

function gameLoop(timestamp) {
    if (!isGameOver) {
        handleInput();
        update();
        draw();
    }
    requestAnimationFrame(gameLoop);
}

document.getElementById('restart-btn').addEventListener('click', () => {
    level = 1;
    lives = 3;
    hits = maxHits;
    isGameOver = false;
    document.getElementById('game-over-screen').classList.add('hidden');
    generateLevel();
});

// Start
generateLevel();
requestAnimationFrame(gameLoop);

// Touch Controls (Floating Joystick & Swipe to Jump)
const activeTouches = {};

function updateMovementKeys() {
    keys['ArrowLeft'] = false;
    keys['ArrowRight'] = false;
    for (let id in activeTouches) {
        if (activeTouches[id].direction === 'left') keys['ArrowLeft'] = true;
        if (activeTouches[id].direction === 'right') keys['ArrowRight'] = true;
    }
}

document.addEventListener('touchstart', (e) => {
    if (e.target && e.target.closest && e.target.closest('button')) return; // let buttons work normally
    e.preventDefault();
    
    for (let i = 0; i < e.changedTouches.length; i++) {
        let t = e.changedTouches[i];
        activeTouches[t.identifier] = {
            anchorX: t.clientX,
            lastX: t.clientX, // Track for immediate direction changes
            startY: t.clientY,
            direction: null,
            hasJumped: false
        };
    }
    updateMovementKeys();
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    if (e.target && e.target.closest && e.target.closest('button')) return;
    e.preventDefault();
    
    let deadzone = 15;
    let maxRadius = 40;
    
    for (let i = 0; i < e.changedTouches.length; i++) {
        let t = e.changedTouches[i];
        let touchData = activeTouches[t.identifier];
        if (touchData) {
            let deltaX = t.clientX - touchData.lastX;
            touchData.lastX = t.clientX;
            
            // Instantly snap the anchor if the user reverses their finger direction
            if (deltaX < -3 && touchData.direction !== 'left') {
                touchData.anchorX = t.clientX + deadzone + 1;
            } else if (deltaX > 3 && touchData.direction !== 'right') {
                touchData.anchorX = t.clientX - deadzone - 1;
            }
            
            // Update anchorX if finger moves too far (dynamic floating joystick)
            if (t.clientX > touchData.anchorX + maxRadius) {
                touchData.anchorX = t.clientX - maxRadius;
            } else if (t.clientX < touchData.anchorX - maxRadius) {
                touchData.anchorX = t.clientX + maxRadius;
            }
            
            // Determine direction based on anchor offset
            if (t.clientX > touchData.anchorX + deadzone) {
                touchData.direction = 'right';
            } else if (t.clientX < touchData.anchorX - deadzone) {
                touchData.direction = 'left';
            } else {
                touchData.direction = null; // stop moving if within deadzone
            }
            
            // Jump logic: update startY if finger moves down, so you can always swipe up
            if (t.clientY > touchData.startY) {
                touchData.startY = t.clientY;
            }
            
            if (!touchData.hasJumped && (touchData.startY - t.clientY) > 30) {
                if (player.isGrounded) {
                    player.vy = player.jumpForce;
                    player.isGrounded = false;
                }
                touchData.hasJumped = true; // Prevent continuous jumps from the same swipe
            }
        }
    }
    updateMovementKeys();
}, { passive: false });

document.addEventListener('touchend', (e) => {
    if (e.target && e.target.closest && e.target.closest('button')) return;
    e.preventDefault();
    
    for (let i = 0; i < e.changedTouches.length; i++) {
        let t = e.changedTouches[i];
        delete activeTouches[t.identifier];
    }
    updateMovementKeys();
}, { passive: false });

document.addEventListener('touchcancel', (e) => {
    if (e.target && e.target.closest && e.target.closest('button')) return;
    
    for (let i = 0; i < e.changedTouches.length; i++) {
        let t = e.changedTouches[i];
        delete activeTouches[t.identifier];
    }
    updateMovementKeys();
}, { passive: false });
