// Globals and DOM nodes cache
const canvas = document.getElementById('shapeCanvas');
const ctx = canvas.getContext('2d');

const sideInput = document.getElementById('sideCount');
const skipInput = document.getElementById('skipCount');
const layerInput = document.getElementById('layerCount');
const speedInput = document.getElementById('speedCtrl');
const glowInput = document.getElementById('glowCtrl');
const hueShiftInput = document.getElementById('hueShift');

const colorButton = document.getElementById('colorBtn'); 
const drawButton = document.getElementById('drawBtn');
const autoButton = document.getElementById('autoBtn');
const exportButton = document.getElementById('exportBtn');
const svgExportButton = document.getElementById('svgExportBtn');

const sideVal = document.getElementById('sideVal');
const skipVal = document.getElementById('skipVal');
const layerVal = document.getElementById('layerVal');
const glowVal = document.getElementById('glowVal');
const hueShiftVal = document.getElementById('hueShiftVal');

let currentHue = 280; 
let animationId = null;
let autoPilotInterval = null;
let isAnimationComplete = false;

let points = [];
let sides = 0;
let skip = 0;
let totalSteps = 0;
let glowAmount = 0;
let hueShiftAmount = 15;
let currentStep = 0;
let currentLine = 0;

// Setup Listeners
drawButton.addEventListener('click', startDrawing);

colorButton.addEventListener('click', () => {
    currentHue = (currentHue + 45) % 360; 
    if (isAnimationComplete) renderFrame(sides, 0);
});

sideInput.addEventListener('input', () => { 
    updateSliders(); 
    startDrawing(); 
});

skipInput.addEventListener('input', () => { 
    skipVal.innerText = skipInput.value; 
    startDrawing(); 
});

layerInput.addEventListener('input', () => {
    layerVal.innerText = layerInput.value;
    if (isAnimationComplete) renderFrame(sides, 0);
});

speedInput.addEventListener('input', () => {
    totalSteps = Math.max(1, 131 - parseInt(speedInput.value, 10));
});

glowInput.addEventListener('input', () => { 
    glowAmount = parseInt(glowInput.value, 10) || 0;
    glowVal.innerText = glowAmount;
    if (isAnimationComplete) renderFrame(sides, 0);
});

hueShiftInput.addEventListener('input', () => {
    hueShiftAmount = parseInt(hueShiftInput.value, 10);
    hueShiftVal.innerText = hueShiftAmount + "°";
    if (isAnimationComplete) renderFrame(sides, 0);
});

autoButton.addEventListener('click', toggleAutoPilot);

window.onload = () => {
    updateSliders();
    startDrawing();
};

function updateSliders() {
    sideVal.innerText = sideInput.value;
    const maxSkip = Math.max(1, Math.floor(parseInt(sideInput.value, 10) / 2));
    skipInput.max = maxSkip;
    if (parseInt(skipInput.value, 10) > maxSkip) {
        skipInput.value = maxSkip;
    }
    skipVal.innerText = skipInput.value;
}

function startDrawing() {
    if (animationId) cancelAnimationFrame(animationId);
    isAnimationComplete = false;

    sides = parseInt(sideInput.value, 10) || 3;
    skip = parseInt(skipInput.value, 10) || 1;
    totalSteps = Math.max(1, 131 - parseInt(speedInput.value, 10)); 
    glowAmount = parseInt(glowInput.value, 10) || 0;
    hueShiftAmount = parseInt(hueShiftInput.value, 10);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 240; // Max optimal canvas boundary mapping radius
    
    points = [];
    for (let i = 0; i < sides; i++) {
        const angle = ((i * skip) * 2 * Math.PI / sides) - (Math.PI / 2);
        points.push({
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
        });
    }

    currentStep = 0;
    currentLine = 0;
    animate();
}

function renderFrame(completedLines, progress = 0) {
    if (points.length === 0) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const layers = parseInt(layerInput.value, 10) || 1;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Loop inwards through user-requested nested geometry layer depth maps
    for (let layer = 0; layer < layers; layer++) {
        const scale = 1 - (layer * (0.6 / layers)); // Intelligently distribution spacing 
        const baseLayerHue = (currentHue + (layer * hueShiftAmount)) % 360;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        ctx.translate(-centerX, -centerY);

        // Core line drawing loops
        for (let i = 0; i < completedLines; i++) {
            ctx.beginPath();
            const startPt = points[i % sides];
            const endPt = points[(i + 1) % sides];
            
            // Dynamic Hue Harmonization sequence per line loop segment
            const localHue = (baseLayerHue + (i * (360 / sides))) % 360;
            const strokeColor = `hsl(${localHue}, 95%, 60%)`;
            
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = strokeColor;
            
            if (glowAmount > 0) {
                ctx.shadowBlur = glowAmount;
                ctx.shadowColor = strokeColor;
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.moveTo(startPt.x, startPt.y);
            ctx.lineTo(endPt.x, endPt.y);
            ctx.stroke();
        }

        // Active progressive rendering tracking line execution branch
        if (completedLines < sides) {
            const startPt = points[completedLines % sides];
            const endPt = points[(completedLines + 1) % sides];
            
            if (endPt) {
                ctx.beginPath();
                const activeHue = (baseLayerHue + (completedLines * (360 / sides))) % 360;
                ctx.strokeStyle = `hsl(${activeHue}, 95%, 60%)`;
                ctx.lineWidth = 4;
                ctx.lineCap = "round";
                
                if (glowAmount > 0) {
                    ctx.shadowBlur = glowAmount;
                    ctx.shadowColor = `hsl(${activeHue}, 95%, 60%)`;
                }

                ctx.moveTo(startPt.x, startPt.y);
                const currentX = startPt.x + (endPt.x - startPt.x) * progress;
                const currentY = startPt.y + (endPt.y - startPt.y) * progress;
                ctx.lineTo(currentX, currentY);
                ctx.stroke();
            }
        } else {
            // Fill closed loop shapes nicely on completion passes
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < sides; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.closePath();
            ctx.fillStyle = `hsl(${baseLayerHue}, 95%, 60%, 0.03)`;
            ctx.fill();
        }
        ctx.restore();
    }
}

function animate() {
    const progress = currentStep / totalSteps;
    renderFrame(currentLine, progress);

    if (currentLine < sides) {
        currentStep++;
        if (currentStep > totalSteps) {
            currentStep = 0;
            currentLine++;
        }
        animationId = requestAnimationFrame(animate);
    } else {
        isAnimationComplete = true;
        renderFrame(sides, 0); 
    }
}

function toggleAutoPilot() {
    if (autoPilotInterval) {
        clearInterval(autoPilotInterval);
        autoPilotInterval = null;
        autoButton.innerText = "🚀 Auto-Pilot";
        autoButton.classList.remove('btn-secondary');
        autoButton.classList.add('btn-accent');
    } else {
        autoButton.innerText = "⏸ Stop Auto";
        autoButton.classList.remove('btn-accent');
        autoButton.classList.add('btn-secondary');
        
        autoPilotInterval = setInterval(() => {
            let currentSides = parseInt(sideInput.value, 10);
            let nextSides = currentSides + 1;
            if (nextSides > 24) nextSides = 5; 
            
            sideInput.value = nextSides;
            updateSliders();
            currentHue = (currentHue + 25) % 360;
            startDrawing();
        }, 4000);
    }
}

// Production SVG Data Compiler & Exporter
svgExportButton.addEventListener('click', () => {
    if (points.length === 0) return;
    
    const layers = parseInt(layerInput.value, 10) || 1;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    let svgPathsMarkup = "";

    // Iterate structural transforms down cleanly matching Canvas state configurations
    for (let layer = 0; layer < layers; layer++) {
        const scale = 1 - (layer * (0.6 / layers));
        const baseLayerHue = (currentHue + (layer * hueShiftAmount)) % 360;
        
        let pathSegments = "";
        for (let i = 0; i < sides; i++) {
            const startPt = points[i % sides];
            const endPt = points[(i + 1) % sides];
            const localHue = (baseLayerHue + (i * (360 / sides))) % 360;
            const strokeColor = `hsl(${localHue}, 95%, 60%)`;
            
            // Generate distinct vector path items to map clean inline styling color waves
            pathSegments += `\n    <path d="M ${startPt.x} ${startPt.y} L ${endPt.x} ${endPt.y}" stroke="${strokeColor}" stroke-dasharray="none" />`;
        }

        // Apply visual transform vectors to simulate real-time inner scaling matrices directly inside SVG markup
        svgPathsMarkup += `  <g transform="translate(${centerX}, ${centerY}) scale(${scale}) translate(${-centerX}, ${-centerY})" fill="hsl(${baseLayerHue}, 95%, 60%, 0.02)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="${points.map(p => `${p.x},${p.y}`).join(' ')}" stroke="none" />${pathSegments}
  </g>\n`;
    }

    const svgFullDocument = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas.width} ${canvas.height}" width="100%" height="100%">
  <rect width="100%" height="100%" fill="#121214"/>
${svgPathsMarkup}</svg>`;

    navigator.clipboard.writeText(svgFullDocument).then(() => {
        const originalText = svgExportButton.innerText;
        svgExportButton.innerText = "✓ Copied Clean SVG Code!";
        svgExportButton.style.background = "#10b981";
        setTimeout(() => {
            svgExportButton.innerText = originalText;
            svgExportButton.style.background = "";
        }, 2500);
    }).catch(err => console.error('Could not parse clipboard save actions: ', err));
});

// PNG High-Res Raster Exporter logic
exportButton.addEventListener('click', () => {
    if (points.length === 0) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.fillStyle = '#121214'; 
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(canvas, 0, 0);

    const downloadLink = document.createElement('a');
    downloadLink.href = tempCanvas.toDataURL('image/png');
    downloadLink.download = `geovector-asset-${sideInput.value}v-skip${skipInput.value}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
});