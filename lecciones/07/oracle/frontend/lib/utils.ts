export const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export function formatTxHash(txHash: string) {
    const matchResult = txHash.match(/.{1,32}/g);
    if (matchResult) {
        return matchResult.join('\n');
    }
    return '';
}
