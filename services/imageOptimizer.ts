// services/imageOptimizer.ts

interface OptimizeOptions {
  maxWidth: number;
  quality: number;
}

/**
 * Redimensiona e comprime uma imagem em base64.
 * @param base64Image A imagem original em formato base64.
 * @param options Opções de otimização, como largura máxima e qualidade.
 * @returns Uma Promise que resolve com a nova imagem otimizada em base64.
 */
export const optimizeImage = (
  base64Image: string,
  options: OptimizeOptions
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Não foi possível obter o contexto do canvas.'));
      }

      let { width, height } = img;

      // Calcula as novas dimensões mantendo a proporção
      if (width > options.maxWidth) {
        height = Math.round(height * (options.maxWidth / width));
        width = options.maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Desenha a imagem redimensionada no canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Converte o canvas de volta para base64 com a qualidade especificada
      const optimizedBase64 = canvas.toDataURL('image/jpeg', options.quality);
      
      resolve(optimizedBase64);
    };
    img.onerror = (err) => {
        console.error("Erro ao carregar a imagem para otimização", err);
        reject(err);
    };
    img.src = base64Image;
  });
};
