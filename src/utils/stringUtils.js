/**
 * Calculate the Levenshtein distance between two strings 
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} - The distance between the strings
 */

export function calculateLevenshteinDistance(a, b){
    const matrix = Array(b.length + 1).fill().map(()=>Array(a.length+1).fill(0));

    for(let i=0; i<= a.length; i++){
        matrix[0][i] = i;
    }

    for(let i = 0; i <= b.length; i++){
        matrix[i][0] = i;
    }

    for(let i = 1; i <= b.length; i++){
        for(let j = 1; j <= a.length; j++){
            if(b.charAt(i-1) === a.charAt(j-1)){
                matrix[i][j] = matrix[i-1][j-1]; 
            }else{
                matrix[i][j] = Math.min(
                    matrix[i-1][j-1] + 1,
                    matrix[i][j-1] + 1,
                    matrix[i-1][j] + 1
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Calculate normalized similarity between strings (0-1)
 * @param {string} a - First string
 * @param {string} b - Second string
 * @param {number} - Similarity value (0-1)
 */

export function calculateSimilarity(a, b) {
    const maxLength = Math.max(a.length, b.length);
    if (maxLength === 0) return 1.0;
    
    const distance = calculateLevenshteinDistance(a, b);
    return 1 - (distance / maxLength);
}