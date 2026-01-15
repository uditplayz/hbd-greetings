import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

// --- CONFIGURATION ---
const SCENE_SIZE = 12; // Size of the grass platform

// --- SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Minecraft Sky
scene.fog = new THREE.Fog(0x87CEEB, 10, 50);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);

const renderer = new THREE.WebGLRenderer({ antialias: false }); // False for crisp pixels
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.0;

// --- LIGHTING ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

// --- TEXTURE GENERATOR (Procedural Pixel Art) ---
// This creates 16x16 pixel textures on the fly so you don't need image files.
function createPixelTexture(colorBase, noiseAmount) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    
    // Fill base
    ctx.fillStyle = colorBase;
    ctx.fillRect(0, 0, 16, 16);
    
    // Add noise
    for(let i=0; i<64; i++) {
        const x = Math.floor(Math.random() * 16);
        const y = Math.floor(Math.random() * 16);
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * noiseAmount})`;
        ctx.fillRect(x, y, 1, 1);
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * (noiseAmount/2)})`;
        ctx.fillRect(x, y, 1, 1);
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter; // KEY: Keeps it pixelated, not blurry
    tex.minFilter = THREE.NearestFilter;
    return tex;
}

// Generate Materials
const grassTopTex = createPixelTexture('#58bb43', 0.2);
const dirtTex = createPixelTexture('#784c26', 0.2);
const cakeSideTex = createPixelTexture('#fcedd5', 0.1); 
const cakeTopTex = createPixelTexture('#fcedd5', 0.05);

// Add "berries" to cake top
function addBerries(texture) {
    const canvas = texture.image;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#cc2e2e'; // Red
    ctx.fillRect(4, 4, 3, 3);
    ctx.fillRect(10, 10, 2, 2);
    ctx.fillRect(11, 3, 2, 2);
    texture.needsUpdate = true;
    return texture;
}
addBerries(cakeTopTex);

// Block Materials
const grassMat = [
    new THREE.MeshStandardMaterial({ map: dirtTex }), // right
    new THREE.MeshStandardMaterial({ map: dirtTex }), // left
    new THREE.MeshStandardMaterial({ map: grassTopTex }), // top
    new THREE.MeshStandardMaterial({ map: dirtTex }), // bottom
    new THREE.MeshStandardMaterial({ map: dirtTex }), // front
    new THREE.MeshStandardMaterial({ map: dirtTex }), // back
];

const cakeMat = [
    new THREE.MeshStandardMaterial({ map: cakeSideTex }), 
    new THREE.MeshStandardMaterial({ map: cakeSideTex }), 
    new THREE.MeshStandardMaterial({ map: cakeTopTex }), 
    new THREE.MeshStandardMaterial({ map: cakeSideTex }), 
    new THREE.MeshStandardMaterial({ map: cakeSideTex }), 
    new THREE.MeshStandardMaterial({ map: cakeSideTex }), 
];

// --- WORLD GENERATION ---
const geometry = new THREE.BoxGeometry(1, 1, 1);

// 1. Generate Platform
for (let x = -SCENE_SIZE/2; x < SCENE_SIZE/2; x++) {
    for (let z = -SCENE_SIZE/2; z < SCENE_SIZE/2; z++) {
        const block = new THREE.Mesh(geometry, grassMat);
        block.position.set(x, 0, z);
        block.receiveShadow = true;
        scene.add(block);
    }
}

// 2. The Cake
const cakeGroup = new THREE.Group();
const cakeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.8), cakeMat);
cakeMesh.position.set(0, 0.7, 0);
cakeMesh.castShadow = true;
cakeGroup.add(cakeMesh);

// Candle
const candleGeo = new THREE.BoxGeometry(0.1, 0.3, 0.1);
const candleMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
const candle = new THREE.Mesh(candleGeo, candleMat);
candle.position.set(0, 1.0, 0);
cakeGroup.add(candle);

// Flame
const flameGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
const flameMat = new THREE.MeshBasicMaterial({ color: 0xffa500 });
const flame = new THREE.Mesh(flameGeo, flameMat);
flame.position.set(0, 1.2, 0);
cakeGroup.add(flame);

// Flame Light
const flameLight = new THREE.PointLight(0xffa500, 1, 5);
flameLight.position.set(0, 1.2, 0);
cakeGroup.add(flameLight);

scene.add(cakeGroup);

// --- ANIMATION & INTERACTION (DIAMONDS) ---
const diamonds = [];
const diamondGeo = new THREE.OctahedronGeometry(0.3);
const diamondMat = new THREE.MeshStandardMaterial({ 
    color: 0x00ffff, 
    metalness: 0.8, 
    roughness: 0.1,
    emissive: 0x004444
});

function spawnDiamond() {
    const diamond = new THREE.Mesh(diamondGeo, diamondMat);
    
    // Random position above the platform
    const x = (Math.random() - 0.5) * 10;
    const z = (Math.random() - 0.5) * 10;
    diamond.position.set(x, 10, z);
    
    // Random rotation
    diamond.rotation.x = Math.random() * Math.PI;
    diamond.rotation.z = Math.random() * Math.PI;
    
    diamond.castShadow = true;
    scene.add(diamond);
    
    // Physics data
    diamond.userData = {
        velocity: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.1
    };
    
    diamonds.push(diamond);
}

// Click to spawn
window.addEventListener('mousedown', () => {
    // Spawn 5 diamonds at once
    for(let i=0; i<5; i++) spawnDiamond();
});

// --- AUDIO (Optional Minecraft "Pop" sound simulation) ---
// Note: Browsers block auto-audio. Button is provided in HTML.
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playPop() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square'; // 8-bit sound
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

document.getElementById('music-btn').addEventListener('click', () => {
    spawnDiamond();
    playPop();
});

// --- RENDER LOOP ---
function animate() {
    requestAnimationFrame(animate);
    
    // Rotate cake gently
    cakeGroup.rotation.y += 0.01;
    
    // Flicker flame
    flame.scale.setScalar(0.8 + Math.random() * 0.4);
    
    // Animate Diamonds
    for (let i = diamonds.length - 1; i >= 0; i--) {
        const d = diamonds[i];
        d.position.y -= 0.1; // Fall speed
        d.rotation.y += d.userData.rotationSpeed;
        d.rotation.x += d.userData.rotationSpeed;
        
        // Remove if below ground
        if (d.position.y < -5) {
            scene.remove(d);
            diamonds.splice(i, 1);
        }
    }

    controls.update();
    renderer.render(scene, camera);
}

// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();