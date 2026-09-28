function hexToRgb(hex) {
    if (!hex.startsWith('#')) hex = '#' + hex;
    const regex = /^#([0-9A-Fa-f]{6})$/;
    if (!regex.test(hex)) return null;
    const num = parseInt(hex.slice(1), 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };
}

function rgbToHex(r, g, b) {
    const toHex = (c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function parseRgbString(str) {
    const match = str.match(/(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/) || str.match(/(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})/);
    if (!match) return null;
    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);
    if (r > 255 || g > 255 || b > 255) return null;
    return { r, g, b };
}

function createCustomPicker(elementId, initialColor, hexInputId, rgbInputId) {
    const hexInput = document.getElementById(hexInputId);
    const rgbInput = document.getElementById(rgbInputId);

    const pickr = Pickr.create({
        el: elementId,
        theme: 'nano',
        default: initialColor,
        components: {
            preview: true,
            opacity: false,
            hue: true,
            interaction: {
                hex: false,
                rgba: false,
                input: true,
                clear: false,
                save: false
            }
        }
    });

    pickr.setColor(initialColor);
    pickr.applyColor(true);

    pickr.on('change', (color) => {
        pickr.applyColor(true);
        const hex = color.toHEXA().toString().substring(0, 7).toUpperCase();
        const rgb = color.toRGBA();
        
        hexInput.value = hex;
        rgbInput.value = `${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])}`;
    });

    hexInput.addEventListener('input', (e) => {
        let val = e.target.value.trim();
        if (!val.startsWith('#')) val = '#' + val;
        const rgb = hexToRgb(val);
        if (rgb) {
            pickr.setColor(val, true);
            pickr.applyColor(true);
            rgbInput.value = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
        }
    });

    rgbInput.addEventListener('input', (e) => {
        const rgb = parseRgbString(e.target.value.trim());
        if (rgb) {
            const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
            pickr.setColor(hex, true);
            pickr.applyColor(true);
            hexInput.value = hex;
        }
    });

    return pickr;
}

const textPickr = createCustomPicker('#textColorPicker', '#FFFFFF', 'textColorHex', 'textColorRgb');
const bgPickr = createCustomPicker('#bgColorPicker', '#000000', 'bgColorHex', 'bgColorRgb');

document.getElementById('generateBtn').addEventListener('click', async () => {
    const text = document.getElementById('textInput').value;
    const fontFile = document.getElementById('fontInput').files[0];
    const fontSize = parseInt(document.getElementById('fontSize').value, 10);
    const padding = parseInt(document.getElementById('padding').value, 10);
    
    let textTransparencyInput = parseFloat(document.getElementById('textAlpha').value);
    let bgTransparencyInput = parseFloat(document.getElementById('bgAlpha').value);

    if (isNaN(textTransparencyInput) || textTransparencyInput < 0) textTransparencyInput = 0;
    if (textTransparencyInput > 1) textTransparencyInput = 1;
    if (isNaN(bgTransparencyInput) || bgTransparencyInput < 0) bgTransparencyInput = 0;
    if (bgTransparencyInput > 1) bgTransparencyInput = 1;

    const textAlpha = 1 - textTransparencyInput;
    const bgAlpha = 1 - bgTransparencyInput;

    const textColorHex = document.getElementById('textColorHex').value;
    const bgColorHex = document.getElementById('bgColorHex').value;

    const textRgb = hexToRgb(textColorHex) || { r: 255, g: 255, b: 255 };
    const bgRgb = hexToRgb(bgColorHex) || { r: 0, g: 0, b: 0 };

    const textColorRgba = `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, ${textAlpha})`;
    const bgColorRgba = `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, ${bgAlpha})`;

    if (!text) return alert("텍스트를 입력해주세요.");

    let fontName = 'system-ui';

    if (fontFile) {
        fontName = 'CustomFont_' + Date.now();
        try {
            const arrayBuffer = await fontFile.arrayBuffer();
            const fontFace = new FontFace(fontName, arrayBuffer);
            await fontFace.load();
            document.fonts.add(fontFace);
            await document.fonts.ready; 
        } catch (err) {
            return alert("폰트 파일을 읽는 중 오류가 발생했습니다.");
        }
    } else {
        alert("기본 시스템 폰트로 진행합니다. 정확한 크기 계산을 위해 폰트 파일 업로드를 권장합니다.");
    }

    const canvas = document.getElementById('mainCanvas');
    const ctx = canvas.getContext('2d');
    const fontSetting = `${fontSize}px "${fontName}"`;
    
    canvas.width = 10;
    canvas.height = 10;
    ctx.font = fontSetting;

    const metrics = ctx.measureText(text);
    const textWidth = Math.ceil(metrics.actualBoundingBoxRight + metrics.actualBoundingBoxLeft);
    const textHeight = Math.ceil(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent);

    const canvasWidth = textWidth + (padding * 2);
    const canvasHeight = textHeight + (padding * 2);

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = bgColorRgba;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.font = fontSetting; 
    ctx.fillStyle = textColorRgba;
    ctx.textBaseline = 'alphabetic';

    const x = padding + metrics.actualBoundingBoxLeft;
    const y = padding + metrics.actualBoundingBoxAscent;

    ctx.fillText(text, x, y);
    canvas.style.display = 'block';

    canvas.toBlob((blob) => {
        if (!blob) return alert("이미지 생성에 실패했습니다.");
        const link = document.createElement('a');
        link.download = `${text.replace(/[\/\\?%*:|"<>]/g, '-')}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
        
        setTimeout(() => URL.revokeObjectURL(link.href), 100);
    }, 'image/png');
});