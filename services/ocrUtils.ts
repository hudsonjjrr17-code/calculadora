// Regex to find prices
const priceRegex = /(?:R\$?\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+[,.]\d{2})/;

// Parses a price string into a number
const parsePrice = (text: string): number => {
    const match = text.match(priceRegex);
    if (!match) return 0;
    const priceStr = match[1].replace(/\./g, '').replace(',', '.');
    return parseFloat(priceStr) || 0;
};

/**
 * Parses raw detected text objects to find the best price and a guessed name.
 * @param detectedTexts - Array of objects from the TextDetector API.
 * @returns An object with the price and guessed name, or null if no price is found.
 */
export const parseDetectedTexts = (detectedTexts: any[]): { price: number; guessedName: string } | null => {
    if (!detectedTexts || detectedTexts.length === 0) {
        return null;
    }

    let foundPrice = 0;
    const textParts: string[] = [];

    // Sort texts by position (top-to-bottom, left-to-right) for better name guessing
    detectedTexts.sort((a: any, b: any) => {
        if (a.boundingBox.y !== b.boundingBox.y) {
            return a.boundingBox.y - b.boundingBox.y;
        }
        return a.boundingBox.x - b.boundingBox.x;
    });

    for (const text of detectedTexts) {
        const rawValue = text.rawValue;
        textParts.push(rawValue);

        // Find the highest valid price in all detected text parts
        const priceInText = parsePrice(rawValue);
        if (priceInText > foundPrice) {
            foundPrice = priceInText;
        }
    }
    
    if (foundPrice === 0) {
        return null; // No price found, abort.
    }

    // Heuristic for a better name: join all texts and remove the price string
    let guessedName = textParts.join(' ').replace(/\s+/g, ' ').trim();
    const priceStringMatch = guessedName.match(priceRegex);
    if (priceStringMatch) {
        // Remove all occurrences of the price to clean up the name
        guessedName = guessedName.replace(new RegExp(priceStringMatch[0], 'g'), '').trim();
    }

    return {
        price: foundPrice,
        guessedName: guessedName || "Item desconhecido",
    };
};
