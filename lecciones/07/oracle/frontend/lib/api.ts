export const fetchAdaPrice = async (): Promise<number | string> => {
    const baseUrl = 'https://api.polygon.io/v2/aggs/ticker/X:ADAUSD/prev';
    const params = new URLSearchParams({
        adjusted: 'true',
        apiKey: process.env.NEXT_PUBLIC_POLYGON as string,
    });

    try {
        const response = await fetch(`${baseUrl}?${params}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const price = data.results[0].c;
        return price;
    } catch (error) {
        if (error instanceof Error) {
            return error.message;
        } else {
            return 'An unknown error occurred';
        }
    }
};