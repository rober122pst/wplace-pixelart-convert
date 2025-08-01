// Elementos do DOM
const imageInput = document.getElementById('imageInput');
const originalCanvas = document.getElementById('originalCanvas'); // Novo elemento
const scaleFactorInput = document.getElementById('scaleFactor');
const interpolationMethodInput = document.getElementById('interpolationMethod');
const colorModeInput = document.getElementById('colorMode');
const convertBtn = document.getElementById('convertBtn');
const pixelArtCanvas = document.getElementById('pixelArtCanvas');
const scaleValueSpan = document.getElementById('scaleValue');
const canvasWidthSpan = document.getElementById('canvasWidth');
const canvasHeightSpan = document.getElementById('canvasHeight');
const pixelCountSpan = document.getElementById('pixelCount');
const ditherScaleFactorInput = document.getElementById('ditherScaleFactor');
const ditherScaleValueSpan = document.getElementById('ditherScaleValue');
const usedColorsContainer = document.getElementById('usedColorsContainer'); // Novo elemento

const originalCtx = originalCanvas.getContext('2d');
const ctx = pixelArtCanvas.getContext('2d');
let originalImage = null;

// Tooltip
const tooltip = document.createElement('div');
tooltip.className = 'tooltip hidden';
document.body.appendChild(tooltip);


// Event Listeners
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            originalImage = new Image();
            originalImage.onload = () => {
                // Desenha a imagem original no canvas com o mesmo tamanho
                originalCanvas.width = originalImage.width;
                originalCanvas.height = originalImage.height;
                originalCtx.imageSmoothingEnabled = true;
                originalCtx.drawImage(originalImage, 0, 0);
                convertImage();
            };
            originalImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

scaleFactorInput.addEventListener('input', () => {
    scaleValueSpan.textContent = scaleFactorInput.value + '%';
});

convertBtn.addEventListener('click', convertImage);
interpolationMethodInput.addEventListener('change', convertImage);
colorModeInput.addEventListener('change', convertImage);

pixelArtCanvas.addEventListener('mousemove', (e) => {
    if (!originalImage) return;

    const rect = pixelArtCanvas.getBoundingClientRect();
    // Ajusta a escala para pegar o pixel correto no canvas interno, não na exibição CSS
    const canvasActualWidth = pixelArtCanvas.width;
    const canvasActualHeight = pixelArtCanvas.height;

    const displayWidth = rect.width;
    const displayHeight = rect.height;

    // Calcular o fator de escala de renderização do canvas no DOM
    const scaleX = canvasActualWidth / displayWidth;
    const scaleY = canvasActualHeight / displayHeight;

    // Ajustar coordenadas do mouse com base no offset do canvas dentro do seu container flex
    // e no redimensionamento do canvas em relação ao seu tamanho real.
    const xInDisplay = e.clientX - rect.left;
    const yInDisplay = e.clientY - rect.top;

    const x = Math.floor(xInDisplay * scaleX);
    const y = Math.floor(yInDisplay * scaleY);
    
    // Certifique-se de que as coordenadas estão dentro dos limites do canvas
    if (x < 0 || x >= canvasActualWidth || y < 0 || y >= canvasActualHeight) {
        tooltip.classList.add('hidden');
        return;
    }

    const imageData = ctx.getImageData(x, y, 1, 1).data;
    const r = imageData[0];
    const g = imageData[1];
    const b = imageData[2];
    const a = imageData[3];

    if (a > 0) {
        // Usa a função do palette.js para encontrar o objeto de cor e seu nome
        const matchedColorObject = findClosestColorObject([r, g, b]);
        if (matchedColorObject) {
            tooltip.textContent = `${matchedColorObject.name}`;
        } else {
            // Fallback caso não encontre (deve ser raro com dithering para cores exatas da paleta)
            tooltip.textContent = `RGB(${r}, ${g}, ${b})`;
        }
        tooltip.style.left = `${e.clientX}px`;
        tooltip.style.top = `${e.clientY - 20}px`;
        tooltip.style.transform = 'translate(-50%, -50%)'
        tooltip.classList.remove('hidden');
    } else {
        tooltip.classList.add('hidden');
    }
});

ditherScaleFactorInput.addEventListener('input', () => {
    ditherScaleValueSpan.textContent = ditherScaleFactorInput.value + 'x';
    convertImage(); 
});

pixelArtCanvas.addEventListener('mouseleave', () => {
    tooltip.classList.add('hidden');
});

function convertImage() {
    if (!originalImage) return;

    const scaleFactor = parseInt(scaleFactorInput.value) / 100;
    const newWidth = Math.max(1, Math.floor(originalImage.width * scaleFactor));
    const newHeight = Math.max(1, Math.floor(originalImage.height * scaleFactor));

    // Dimensões do canvas final (mesmo que a imagem original)
    const finalWidth = originalImage.width;
    const finalHeight = originalImage.height;

    // O canvas de pixel art deve ter AS DIMENSÕES CALCULADAS
    pixelArtCanvas.width = finalWidth;
    pixelArtCanvas.height = finalHeight;

    // Redimensiona a imagem para um canvas temporário usando o método de interpolação selecionado
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;

    if (interpolationMethodInput.value === 'nearest-neighbor') {
        tempCtx.imageSmoothingEnabled = false;
    } else {
        tempCtx.imageSmoothingEnabled = true;
    }

    tempCtx.drawImage(originalImage, 0, 0, newWidth, newHeight);

    const imageData = tempCtx.getImageData(0, 0, newWidth, newHeight);
    const data = imageData.data;

    // NORMALIZA OS PIXELS TRANSPARENTES PARA TOTALMENTE OPACO OU TOTALMENTE TRANSPARENTE
    for (let i = 3; i < data.length; i += 4) {
        if (data[(i - 3) + 3] > 0) {
            data[(i - 3) + 3] = 255;
        }
    }

    let pixelCount = 0;
    const usedColors = new Set(); // Usar um Set para armazenar cores únicas

    // Use a paleta RGB pré-mapeada de palette.js
    if (colorModeInput.value === 'dithering') {
        const forceDither = true;
        const ditherScale = parseInt(ditherScaleFactorInput.value);

        for (let y = 0; y < newHeight; y++) {
            for (let x = 0; x < newWidth; x++) {
                const i = (y * newWidth + x) * 4;
                const r = data[(y * newWidth + x) * 4];
                const g = data[(y * newWidth + x) * 4 + 1];
                const b = data[(y * newWidth + x) * 4 + 2];
                const a = data[(y * newWidth + x) * 4 + 3];

                if (a > 0) {
                    const color = [r, g, b];

                    const closest = bestMatch(fixedRgbPalette, color);
                    const closestIndex = fixedRgbPalette.findIndex(p => p[(0)] === closest[(0)] && p[(1)] === closest[(1)] && p[(2)] === closest[(2)]);

                    const closest2 = bestMatchEx(fixedRgbPalette, color, closestIndex);

                    let between;
                    if (forceDither === true) {
                        between = [[Infinity, Infinity, Infinity]];
                        for (let b = 1; b < 15; b += 1) {
                            between.push(addColor(closest, multiplyColor(divideColor(closest2, 17), b)));
                        }
                        between.push([Infinity, Infinity, Infinity]);

                    } else {
                        between = [];
                        for (let b = 0; b < 17; b += 1) {
                            between.push(addColor(closest, multiplyColor(divideColor(closest2, 17), b)));
                        }
                    }

                    const closest3 = bestMatch(between, color);
                    const index3 = between.findIndex(p => p[(0)] === closest3[(0)] && p[(1)] === closest3[(1)] && p[(2)] === closest3[(2)]);

                    const ditherIndex = Math.min(Math.max(0, index3), dither.length - 1);
                    const trans = [closest, closest2][getDither(dither[(ditherIndex)], x, y, ditherScale)];

                    data[(y * newWidth + x) * 4] = trans[(0)];
                    data[(y * newWidth + x) * 4 + 1] = trans[(1)];
                    data[(y * newWidth + x) * 4 + 2] = trans[(2)];
                    data[(y * newWidth + x) * 4 + 3] = 255;
                    pixelCount++;
                    usedColors.add(JSON.stringify(trans)); // Adiciona a cor final ao Set
                }
            }
        }
    } else {
        // Sem Dithering, apenas quantização
        for (let y = 0; y < newHeight; y++) {
            for (let x = 0; x < newWidth; x++) {
                const i = (y * newWidth + x) * 4;
                const r = data[(y * newWidth + x) * 4];
                const g = data[(y * newWidth + x) * 4 + 1];
                const b = data[(y * newWidth + x) * 4 + 2];
                const a = data[(y * newWidth + x) * 4 + 3];

                if (a > 0) {
                    const matchedColorRgb = bestMatch(fixedRgbPalette, [r, g, b]);
                    data[(y * newWidth + x) * 4] = matchedColorRgb[(0)];
                    data[(y * newWidth + x) * 4 + 1] = matchedColorRgb[(1)];
                    data[(y * newWidth + x) * 4 + 2] = matchedColorRgb[(2)];
                    pixelCount++;
                    usedColors.add(JSON.stringify(matchedColorRgb)); // Adiciona a cor final ao Set
                }
            }
        }
    }

    tempCtx.putImageData(imageData, 0, 0);

    ctx.clearRect(0, 0, pixelArtCanvas.width, pixelArtCanvas.height);

    ctx.imageSmoothingEnabled = false;

    // Desenha a nova imagem no canvas principal
    ctx.drawImage(tempCanvas, 0, 0, pixelArtCanvas.width, pixelArtCanvas.height);

    // Atualiza as informações
    canvasWidthSpan.textContent = newWidth;
    canvasHeightSpan.textContent = newHeight;
    pixelCountSpan.textContent = pixelCount;

    // Exibe as cores utilizadas
    displayUsedColors([...usedColors].map(color => JSON.parse(color)));
}

// Lista de cores premium (exemplo, você pode ajustar esta lista)
// IMPORTANTE: As cores aqui devem corresponder EXATAMENTE aos valores RGB da sua paleta.
const premiumColors = [
    [170, 170, 170],
    [250, 128, 114],
    [228, 92, 26],
    [156, 132, 49],
    [197, 173, 49],
    [232, 212, 95],
    [74, 107, 58],
    [90, 148, 74],
    [132, 197, 115],
    [15, 121, 159],
    [187, 250, 242],
    [125, 199, 255],
    [122, 113, 196],
    [181, 174, 241],
    [155, 82, 73],
    [209, 128, 120],
    [250, 182, 164],
    [219, 164, 99],
    [123, 99, 82],
    [156, 132, 107],
    [214, 181, 148],
    [209, 128, 81],
    [255, 197, 165],
    [109, 100, 63],
    [148, 140, 107],
    [205, 197, 158],
    [51, 57, 65],
    [109, 117, 141],
    [179, 185, 209]
];

function isPremiumColor(rgbColor) {
    return premiumColors.some(pColor => 
        pColor[0] === rgbColor[0] && 
        pColor[1] === rgbColor[1] && 
        pColor[2] === rgbColor[2]
    );
}

function displayUsedColors(colors) {
    usedColorsContainer.innerHTML = ''; // Limpa as cores existentes

    if (colors.length === 0) {
        usedColorsContainer.textContent = 'Nenhuma cor utilizada.';
        return;
    }

    colors.forEach(rgb => {
        const colorSwatch = document.createElement('div');
        colorSwatch.className = 'w-6 h-6 rounded-md shadow-md inline-block mr-2 mb-2 cursor-pointer';
        colorSwatch.style.backgroundColor = `rgb(${rgb[(0)]}, ${rgb[(1)]}, ${rgb[(2)]})`;
        colorSwatch.style.border = '1px solid rgba(255, 255, 255, 0.1)'; // Adiciona uma leve borda para separação visual

        const colorName = findClosestColorObject(rgb)?.name || `RGB(${rgb[(0)]}, ${rgb[(1)]}, ${rgb[(2)]})`;

        // Tooltip no hover
        colorSwatch.addEventListener('mouseover', (e) => {
            tooltip.textContent = colorName;
            tooltip.style.left = `${e.clientX + 10}px`;
            tooltip.style.top = `${e.clientY + 10}px`;
            tooltip.classList.remove('hidden');
        });

        colorSwatch.addEventListener('mouseout', () => {
            tooltip.classList.add('hidden');
        });

        // Adiciona a classe 'premium' se necessário
        if (isPremiumColor(rgb)) {
            colorSwatch.style.outline = '2px solid gold';
            colorSwatch.style.outlineOffset = '1px'; // Para não sobrepor a borda arredondada
        }

        usedColorsContainer.appendChild(colorSwatch);
    });
}

function downloadImage() {
    const imageURL = pixelArtCanvas.toDataURL('image/png');
    const link = document.createElement('a');
  
    link.href = imageURL;
    link.download = 'pixel-art.png';
 
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
}