import Image from 'next/image';

export const CurrencyDisplay = ({ ard, coins, insufficientArd }) => {
    return (
        <div className="flex justify-end gap-3 p-4">
            <div className={`flex items-center gap-1 transition-all duration-300 hover:scale-105 ${insufficientArd ? 'insufficient-ard-shake' : ''}`}>
                <span className={`text-white text-xs font-bold min-w-[40px] text-end pixel-text transition-all duration-300 ${insufficientArd ? 'insufficient-ard-glow' : ''}`}>
                    {ard == -1 ? "0" : ard}
                </span>
                <div className="w-8 h-14 relative transition-transform duration-300 hover:scale-110">
                    <Image
                        src="/ard.png"
                        alt="ARD"
                        fill
                        className="object-contain"
                    />
                </div>
            </div>
            <div className="flex items-center gap-1 transition-all duration-300 hover:scale-105">
                <span className="text-white text-xs font-bold min-w-[0px] text-end pixel-text">
                    {coins == -1 ? "0" : coins}
                </span>
                <div className="w-6 h-6 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full border-2 border-yellow-400 flex items-center justify-center text-white font-mono text-md transition-transform duration-300 hover:scale-110">
                    ₵
                </div>
            </div>
        </div>
    );
};