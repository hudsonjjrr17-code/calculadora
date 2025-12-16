import Tesseract from 'tesseract.js';

export const analyzePriceTag = async (base64Image: string): Promise<{ price: number; guessedName: string } | null> => {
  try {
    const result = await Tesseract.recognize(
      base64Image,
      'eng', // Usar 'eng' é frequentemente melhor para números do que 'por'
      { 
        logger: m => console.log(m) // Opcional: ver progresso no console
      }
    );

    const text = result.data.text;
    console.log("Texto detectado:", text);

    // Regex para encontrar preços (ex: 10.99, 10,99, R$ 10,99)
    // Procura por números que tenham 1 ou 2 dígitos decimais no final
    const priceRegex = /R?\$?\s?(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\b/g;
    
    const matches = text.match(priceRegex);
    
    let bestPrice = 0;

    if (matches && matches.length > 0) {
      // Pega o maior valor encontrado (assumindo que o preço principal costuma ser o maior destaque)
      // Ou pega o primeiro. Vamos tentar limpar e converter.
      const prices = matches.map(m => {
        // Limpa R$, espaços e substitui vírgula por ponto se necessário
        const clean = m.replace(/[R$\s]/g, '').replace(',', '.');
        return parseFloat(clean);
      }).filter(n => !isNaN(n));

      if (prices.length > 0) {
        // Geralmente o preço do produto é o maior número na etiqueta (ignorando preço por kg muito pequeno)
        bestPrice = Math.max(...prices);
      }
    }

    return {
      price: bestPrice,
      guessedName: '' // OCR simples tem dificuldade com nomes, deixamos vazio para o usuário preencher
    };

  } catch (error) {
    console.error("Erro no OCR:", error);
    return null;
  }
};