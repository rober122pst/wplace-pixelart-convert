// O array de dithering 4x4 (64 pixel)
const dither = [
     [0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0],
     [1, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0],
     [1, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 0],
     [1, 0, 1, 0,
      0, 0, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 0],
     [1, 0, 1, 0,
      0, 0, 0, 0,
      1, 0, 1, 0,
      0, 0, 0, 0],
     [1, 0, 1, 0,
      0, 1, 0, 0,
      1, 0, 1, 0,
      0, 0, 0, 0],
     [1, 0, 1, 0,
      0, 1, 0, 0,
      1, 0, 1, 0,
      0, 0, 0, 1],
     [1, 0, 1, 0,
      0, 1, 0, 1,
      1, 0, 1, 0,
      0, 0, 0, 1],
     [1, 0, 1, 0,
      0, 1, 0, 1,
      1, 0, 1, 0,
      0, 1, 0, 1],
     [1, 1, 1, 0,
      0, 1, 0, 1,
      1, 0, 1, 0,
      0, 1, 0, 1],
     [1, 1, 1, 0,
      0, 1, 0, 1,
      1, 0, 1, 1,
      0, 1, 0, 1],
     [1, 1, 1, 1,
      0, 1, 0, 1,
      1, 0, 1, 1,
      0, 1, 0, 1],
     [1, 1, 1, 1,
      0, 1, 0, 1,
      1, 1, 1, 1,
      0, 1, 0, 1],
     [1, 1, 1, 1,
      1, 1, 0, 1,
      1, 1, 1, 1,
      0, 1, 0, 1],
     [1, 1, 1, 1,
      1, 1, 0, 1,
      1, 1, 1, 1,
      0, 1, 1, 1],
     [1, 1, 1, 1,
      1, 1, 1, 1,
      1, 1, 1, 1,
      0, 1, 1, 1],
     [1, 1, 1, 1,
      1, 1, 1, 1,
      1, 1, 1, 1,
      1, 1, 1, 1]
];

// Obtém o estado de qualquer coordenada de uma matriz de dithering
function getDither(matrix, x, y) {
    return matrix[((y % 4) * 4) + (x % 4)];
}

// Divide todos os componentes de uma cor por um dado fator
function divideColor(color, factor) {
    return [color[0] / factor, color[1] / factor, color[2] / factor];
}

// Multiplica todos os componentes de uma cor por um dado fator
function multiplyColor(color, factor) {
    return [color[0] * factor, color[1] * factor, color[2] * factor];
}

// Adiciona duas cores somando seus componentes
function addColor(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

// Encontra a cor na paleta que melhor corresponde à cor dada
// Nota: Esta função assume que 'palette' é um array de arrays RGB [r, g, b]
function bestMatch(palette, color) {
    let best = [Infinity, [0, 0, 0]];
    for (let i = 0; i < palette.length; i += 1) {
        const difference = Math.abs(palette[i][0] - color[0]) + Math.abs(palette[i][1] - color[1]) + Math.abs(palette[i][2] - color[2]);
        if (difference < best[0]) {
            best = [difference, palette[i]];
        }
    }
    return best[1];
}

function getDither(matrix, x, y, ditherScale = 1) { // ditherScale padrão é 1
    // Ajusta as coordenadas x e y com base no ditherScale
    const scaledX = Math.floor(x / ditherScale);
    const scaledY = Math.floor(y / ditherScale);
    
    return matrix[((scaledY % 4) * 4) + (scaledX % 4)];
}

// O mesmo que a função acima, exceto que exclui a cor na paleta no índice especificado
function bestMatchEx(palette, color, index) {
    let best = [Infinity, [0, 0, 0]];
    for (let i = 0; i < palette.length; i += 1) {
        if (i === index) { continue; }
        const difference = Math.abs(palette[i][0] - color[0]) + Math.abs(palette[i][1] - color[1]) + Math.abs(palette[i][2] - color[2]);
        if (difference < best[0]) {
            best = [difference, palette[i]];
        }
    }
    return best[1];
}