// Otimização: Largura alvo para a imagem de detecção.
// Um tamanho menor acelera significativamente o processo de detecção.
const DETECTION_IMAGE_WIDTH = 640; 

let textDetector: any | null = null;
let barcodeDetector: any | null = null;
let isInitialized = false;

// Otimização: Reutiliza um único canvas para evitar alocação de memória em cada quadro.
let detectionCanvas: HTMLCanvasElement | null = null;

interface DetectionResult {
  detectedTexts: any[];
  detectedBarcodes: any[];
}

/**
 * Inicializa as APIs TextDetector e BarcodeDetector, se disponíveis.
 * Deve ser chamado uma vez quando o componente da câmera é montado para "pré-carregar" os modelos.
 */
export const initializeOfflineDetectors = async (): Promise<{ textSupported: boolean; barcodeSupported: boolean }> => {
  if (isInitialized) {
    return {
        textSupported: !!textDetector,
        barcodeSupported: !!barcodeDetector,
    };
  }

  const supported = { textSupported: false, barcodeSupported: false };

  // Cria um canvas reutilizável para a detecção
  detectionCanvas = document.createElement('canvas');

  if ('TextDetector' in window) {
    try {
      textDetector = new (window as any).TextDetector();
      // Uma pequena chamada de aquecimento pode ajudar alguns navegadores a inicializar o modelo.
      await textDetector.detect(detectionCanvas); 
      supported.textSupported = true;
    } catch (e) {
      console.warn("TextDetector falhou ao inicializar:", e);
      textDetector = null;
    }
  }

  if ('BarcodeDetector' in window) {
    try {
      barcodeDetector = new (window as any).BarcodeDetector({ formats: ['ean_13', 'upc_a', 'qr_code', 'code_128'] });
      // Uma pequena chamada de aquecimento
      await barcodeDetector.detect(detectionCanvas); 
      supported.barcodeSupported = true;
    } catch(e) {
      console.warn("BarcodeDetector falhou ao inicializar:", e);
      barcodeDetector = null;
    }
  }
  
  isInitialized = true;
  return supported;
};

/**
 * Realiza a detecção offline de texto e código de barras em um quadro de vídeo.
 * Otimiza o processo redimensionando a imagem antes da detecção.
 * @param videoSource - O HTMLVideoElement a ser processado.
 * @returns Uma promessa que resolve com os textos e códigos de barras detectados.
 */
export const detectFromVideoFrame = async (
  videoSource: HTMLVideoElement
): Promise<DetectionResult> => {
    
  if (!isInitialized || !detectionCanvas || (!textDetector && !barcodeDetector)) {
    return { detectedTexts: [], detectedBarcodes: [] };
  }

  // --- Otimização: Redimensionar a imagem antes da detecção ---
  const aspectRatio = videoSource.videoHeight / videoSource.videoWidth;
  const width = DETECTION_IMAGE_WIDTH;
  const height = isNaN(aspectRatio) ? (width * 9/16) : Math.round(width * aspectRatio);

  if (detectionCanvas.width !== width || detectionCanvas.height !== height) {
    detectionCanvas.width = width;
    detectionCanvas.height = height;
  }
  
  const ctx = detectionCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { detectedTexts: [], detectedBarcodes: [] };

  ctx.drawImage(videoSource, 0, 0, width, height);
  // --- Fim da Otimização ---

  try {
    const detectionPromises = [];
    if (textDetector) {
      detectionPromises.push(textDetector.detect(detectionCanvas));
    }
    if (barcodeDetector) {
      detectionPromises.push(barcodeDetector.detect(detectionCanvas));
    }

    const results = await Promise.all(detectionPromises);
    
    const detectedTexts = textDetector ? results[0] : [];
    const detectedBarcodes = barcodeDetector ? results[textDetector ? 1 : 0] : [];

    return { detectedTexts, detectedBarcodes };

  } catch (e) {
    console.warn('Detecção offline falhou para um quadro.', e);
    return { detectedTexts: [], detectedBarcodes: [] };
  }
};
