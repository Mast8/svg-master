// Centralized Application State & DOM Cache
const state = {
    canvas: document.getElementById('shapeCanvas'),
    ctx: document.getElementById('shapeCanvas')?.getContext('2d') || null,
    
    // Inputs
    inputs: {
        side: document.getElementById('sideCount'),
        skip: document.getElementById('skipCount'),
        layer: document.getElementById('layerCount'),
        speed: document.getElementById('speedCtrl'),
        glow: document.getElementById('glowCtrl'),
        hueShift: document.getElementById('hueShift')
    },
    
    // Buttons
    buttons: {
        color: document.getElementById('colorBtn'),
        draw: document.getElementById('drawBtn'),
        auto: document.getElementById('autoBtn'),
        random: document.getElementById('randomBtn'),
        exportPng: document.getElementById('exportBtn'),
        svgExport: document.getElementById('svgExportBtn'),
        svgDownload: document.getElementById('svgDownloadBtn')
    },
    
    // Labels
    labels: {
        side: document.getElementById('sideVal'),
        skip: document.getElementById('skipVal'),
        layer: document.getElementById('layerVal'),
        glow: document.getElementById('glowVal'),
        hueShift: document.getElementById('hueShiftVal')
    },

    // Runtime Engine State Variables
    currentHue: 280,
    animationId: null,
    autoPilotInterval: null,
    isAnimationComplete: false,
    points: [],
    sides: 8,
    skip: 2,
    totalSteps: 30,
    glowAmount: 15,
    hueShiftAmount: 15,
    currentStep: 0,
    currentLine: 0
};

// Initialize Canvas Setup Boundaries
if (state.canvas) {
    if (!state.canvas.width) state.canvas.width = 600;
    if (!state.canvas.height) state.canvas.height = 600;
}

// Global Event Routing Pipeline
window.addEventListener('DOMContentLoaded', () => {
    initListeners();
    syncStateFromUI();
    startDrawing();
});

function initListeners() {
    const { inputs, buttons } = state;

    buttons.draw?.addEventListener('click', startDrawing);
    buttons.random?.addEventListener('click', randomizeDrawing);
    buttons.auto?.addEventListener('click', toggleAutoPilot);
    
    buttons.color?.addEventListener('click', () => {
        state.currentHue = (state.currentHue + 45) % 360;
        if (state.isAnimationComplete) renderFrame(state.sides, 0);
    });

    inputs.side?.addEventListener('input', () => {
        updateSliders();
        startDrawing();
    });

    inputs.skip?.addEventListener('input', () => {
        state.labels.skip.innerText = inputs.skip.value;
        startDrawing();
    });

    inputs.layer?.addEventListener('input', () => {
        state.labels.layer.innerText = inputs.layer.value;
        if (state.isAnimationComplete) renderFrame(state.sides, 0);
    });

    inputs.speed?.addEventListener('input', () => {
        state.totalSteps = Math.max(1, 131 - parseInt(inputs.speed.value, 10));
    });

    inputs.glow?.addEventListener('input', () => {
        state.glowAmount = parseInt(inputs.glow.value, 10) || 0;
        state.labels.glow.innerText = state.glowAmount;
        if (state.isAnimationComplete) renderFrame(state.sides, 0);
    });

    inputs.hueShift?.addEventListener('input', () => {
        state.hueShiftAmount = parseInt(inputs.hueShift.value, 10);
        state.labels.hueShift.innerText = state.hueShiftAmount + "°";
        if (state.isAnimationComplete) renderFrame(state.sides, 0);
    });

    buttons.svgExport?.addEventListener('click', handleSVGClipboardCopy);
    buttons.svgDownload?.addEventListener('click', handleSVGDownload);
    buttons.exportPng?.addEventListener('click', handlePNGExport);
}

function syncStateFromUI() {
    const { inputs } = state;
    state.sides = parseInt(inputs.side?.value, 10) || 8;
    state.skip = parseInt(inputs.skip?.value, 10) || 2;
    state.glowAmount = parseInt(inputs.glow?.value, 10) || 15;
    state.hueShiftAmount = parseInt(inputs.hueShift?.value, 10) || 15;
    state.totalSteps = inputs.speed ? Math.max(1, 131 - parseInt(inputs.speed.value, 10)) : 30;
    updateSliders();
}

function updateSliders() {
    const { inputs, labels } = state;
    if (!inputs.side) return;

    labels.side.innerText = inputs.side.value;
    const maxSkip = Math.max(1, Math.floor(parseInt(inputs.side.value, 10) / 2));
    inputs.skip.max = maxSkip;

    if (parseInt(inputs.skip.value, 10) > maxSkip) {
        inputs.skip.value = maxSkip;
    }
    labels.skip.innerText = inputs.skip.value;
}

function startDrawing() {
    if (state.animationId) cancelAnimationFrame(state.animationId);
    state.isAnimationComplete = false;

    state.sides = parseInt(state.inputs.side.value, 10) || 3;
    state.skip = parseInt(state.inputs.skip.value, 10) || 1;
    state.totalSteps = Math.max(1, 131 - parseInt(state.inputs.speed.value, 10));
    state.glowAmount = parseInt(state.inputs.glow.value, 10) || 0;
    state.hueShiftAmount = parseInt(state.inputs.hueShift.value, 10);

    const centerX = state.canvas.width / 2;
    const centerY = state.canvas.height / 2;
    const radius = 240;

    state.points = [];
    for (let i = 0; i < state.sides; i++) {
        const angle = ((i * state.skip) * 2 * Math.PI / state.sides) - (Math.PI / 2);
        state.points.push({
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
        });
    }

    state.currentStep = 0;
    state.currentLine = 0;
    animate();
}

function renderFrame(completedLines, progress = 0) {
    if (state.points.length === 0 || !state.ctx) return;

    const { ctx, canvas, points, sides, currentHue, glowAmount, hueShiftAmount } = state;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const layers = parseInt(state.inputs.layer.value, 10) || 1;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let layer = 0; layer < layers; layer++) {
        const scale = 1 - (layer * (0.6 / layers));
        const baseLayerHue = (currentHue + (layer * hueShiftAmount)) % 360;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        ctx.translate(-centerX, -centerY);

        // Core line loops
        for (let i = 0; i < completedLines; i++) {
            ctx.beginPath();
            const startPt = points[i % sides];
            const endPt = points[(i + 1) % sides];
            const localHue = (baseLayerHue + (i * (360 / sides))) % 360;
            const strokeColor = `hsl(${localHue}, 95%, 60%)`;

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

        // Incremental Drawing Progressive Tracking Line
        if (completedLines < sides) {
            const startPt = points[completedLines % sides];
            const endPt = points[(completedLines + 1) % sides];

            if (endPt) {
                ctx.beginPath();
                const activeHue = (baseLayerHue + (completedLines * (360 / sides))) % 360;
                const activeColor = `hsl(${activeHue}, 95%, 60%)`;
                
                ctx.strokeStyle = activeColor;
                if (glowAmount > 0) {
                    ctx.shadowBlur = glowAmount;
                    ctx.shadowColor = activeColor;
                }

                ctx.moveTo(startPt.x, startPt.y);
                const currentX = startPt.x + (endPt.x - startPt.x) * progress;
                const currentY = startPt.y + (endPt.y - startPt.y) * progress;
                ctx.lineTo(currentX, currentY);
                ctx.stroke();
            }
        } else {
            // Fill closed loop path overlays on target compilation matches
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < sides; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.closePath();
            ctx.fillStyle = `hsl(${baseLayerHue}, 95%, 60%, 0.03)`;
            ctx.shadowBlur = 0; // Disable shadows for layout base fills
            ctx.fill();
        }
        ctx.restore();
    }
}

function animate() {
    const progress = state.currentStep / state.totalSteps;
    renderFrame(state.currentLine, progress);

    if (state.currentLine < state.sides) {
        state.currentStep++;
        if (state.currentStep > state.totalSteps) {
            state.currentStep = 0;
            state.currentLine++;
        }
        state.animationId = requestAnimationFrame(animate);
    } else {
        state.isAnimationComplete = true;
        renderFrame(state.sides, 0);
    }
}

function toggleAutoPilot() {
    const { buttons, inputs } = state;
    if (state.autoPilotInterval) {
        clearInterval(state.autoPilotInterval);
        state.autoPilotInterval = null;
        buttons.auto.innerText = "🚀 Auto-Pilot";
        buttons.auto.classList.replace('btn-secondary', 'btn-accent');
    } else {
        buttons.auto.innerText = "⏸ Stop Auto";
        buttons.auto.classList.replace('btn-accent', 'btn-secondary');

        state.autoPilotInterval = setInterval(() => {
            let nextSides = (parseInt(inputs.side.value, 10) || 5) + 1;
            if (nextSides > 24) nextSides = 5;

            inputs.side.value = nextSides;
            updateSliders();
            state.currentHue = (state.currentHue + 25) % 360;
            startDrawing();
        }, 4000);
    }
}

function generateSVGDocument() {
    const { points, sides, currentHue, hueShiftAmount, canvas, inputs } = state;
    if (points.length === 0) return "";

    const layers = parseInt(inputs.layer.value, 10) || 1;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    let svgPathsMarkup = "";

    for (let layer = 0; layer < layers; layer++) {
        const scale = 1 - (layer * (0.6 / layers));
        const baseLayerHue = (currentHue + (layer * hueShiftAmount)) % 360;
        let pathSegments = "";

        for (let i = 0; i < sides; i++) {
            const startPt = points[i % sides];
            const endPt = points[(i + 1) % sides];
            const localHue = (baseLayerHue + (i * (360 / sides))) % 360;
            const strokeColor = `hsl(${localHue}, 95%, 60%)`;

            pathSegments += `\n    <line x1="${startPt.x}" y1="${startPt.y}" x2="${endPt.x}" y2="${endPt.y}" stroke="${strokeColor}" stroke-width="4" stroke-linecap="round" />`;
        }

        const polyPoints = points.map(p => `${p.x},${p.y}`).join(' ');
        const fillAlphaColor = `hsla(${baseLayerHue}, 95%, 60%, 0.03)`;

        svgPathsMarkup += `  <g transform="translate(${centerX}, ${centerY}) scale(${scale}) translate(${-centerX}, ${-centerY})">
    <polygon points="${polyPoints}" fill="${fillAlphaColor}" stroke="none" />${pathSegments}
  </g>\n`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas.width} ${canvas.height}" width="100%" height="100%">
  <rect width="100%" height="100%" fill="#121214"/>
${svgPathsMarkup}</svg>`;
}

function handleSVGClipboardCopy() {
    const svgFullDocument = generateSVGDocument();
    if (!svgFullDocument) return;

    navigator.clipboard.writeText(svgFullDocument).then(() => {
        const btn = state.buttons.svgExport;
        const originalText = btn.innerText;
        btn.innerText = "✓ Copied Clean SVG Code!";
        btn.style.background = "#10b981";
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.background = "";
        }, 2500);
    }).catch(err => console.error('Could not copy system SVG elements: ', err));
}

function handleSVGDownload() {
    const svgFullDocument = generateSVGDocument();
    if (!svgFullDocument) return;

    const svgBlob = new Blob([svgFullDocument], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    
    downloadLink.href = svgUrl;
    downloadLink.download = `geovector-${state.inputs.side.value}v-${state.inputs.skip.value}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();

    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);

    const btn = state.buttons.svgDownload;
    const originalText = btn.innerText;
    btn.innerText = "✓ File Saved!";
    const prevBackground = btn.style.background;
    btn.style.background = "#10b981";
    setTimeout(() => {
        btn.innerText = originalText;
        btn.style.background = prevBackground;
    }, 2000);
}

function handlePNGExport() {
    if (state.points.length === 0) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = state.canvas.width;
    tempCanvas.height = state.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.fillStyle = '#121214';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(state.canvas, 0, 0);

    const downloadLink = document.createElement('a');
    downloadLink.href = tempCanvas.toDataURL('image/png');
    downloadLink.download = `geovector-${state.inputs.side.value}v-${state.inputs.skip.value}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

function randomizeDrawing() {
    const { inputs, labels } = state;
    
    const minSides = inputs.side ? parseInt(inputs.side.min, 10) || 3 : 3;
    const maxSides = inputs.side ? parseInt(inputs.side.max, 10) || 24 : 24;
    const randomSides = Math.floor(Math.random() * (maxSides - minSides + 1)) + minSides;
    
    if (inputs.side) {
        inputs.side.value = randomSides;
        if (labels.side) labels.side.innerText = randomSides;
    }

    const maxSkip = Math.max(1, Math.floor(randomSides / 2));
    const randomSkip = Math.floor(Math.random() * maxSkip) + 1;
    if (inputs.skip) {
        inputs.skip.max = maxSkip;
        inputs.skip.value = randomSkip;
        if (labels.skip) labels.skip.innerText = randomSkip;
    }

    if (inputs.layer) {
        const maxLayers = parseInt(inputs.layer.max, 10) || 5;
        const randomLayers = Math.floor(Math.random() * maxLayers) + 1;
        inputs.layer.value = randomLayers;
        if (labels.layer) labels.layer.innerText = randomLayers;
    }

    if (inputs.glow) {
        const maxGlow = parseInt(inputs.glow.max, 10) || 40;
        const randomGlow = Math.floor(Math.random() * (maxGlow + 1));
        inputs.glow.value = randomGlow;
        if (labels.glow) labels.glow.innerText = randomGlow;
    }

    if (inputs.hueShift) {
        const maxShift = parseInt(inputs.hueShift.max, 10) || 90;
        const randomShift = Math.floor(Math.random() * (maxShift + 1));
        inputs.hueShift.value = randomShift;
        if (labels.hueShift) labels.hueShift.innerText = randomShift + "°";
    }

    state.currentHue = Math.floor(Math.random() * 360);
    syncStateFromUI();
    startDrawing();
}