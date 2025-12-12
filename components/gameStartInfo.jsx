import Image from 'next/image';

export const GameStartInfo = ({ user, contentLoaded, ard }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <div className={`text-white text-xs font-bold text-center pixel-text transition-all duration-500 delay-100 ${contentLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        ХАМГИЙН ӨНДӨР: {user?.dailyScore || 0}
      </div>

      <h1 className={`text-white text-2xl font-bold text-center pixel-text transition-all duration-500 delay-200 ${contentLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
        ТОГЛООМ ЭХЛҮҮЛЭХ
      </h1>

      <h2 className={`text-[15px] text-ellipsis max-w-fit overflow-hidden text-white pixel-text transition-all duration-500 delay-300 ${contentLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {`NAME: ${user?.user || ''}#${user?.unicode || 0}`}
      </h2>

      <p className={`text-xs pl-1 text-gray-300 pixel-text transition-all duration-500 delay-400 ${contentLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {`UID: ${user?.uid || ''}`}
      </p>

      <div className={`flex items-center gap-1 hover:scale-110 transition-all duration-500 delay-500 ${contentLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
        <span className="text-white text-xs font-bold pixel-text">
          {10}
        </span>
        <div className="w-8 h-14 relative">
          <Image
            src="/ard.png"
            alt="ARD Cost"
            fill
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
};