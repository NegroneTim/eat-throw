"use client";

export const GameStartModal = ({ progress, status }) => {
  return (
    <div className='absolute w-full h-full flex justify-center items-center bg-black/70 z-50 backdrop-blur-sm transition-all duration-500'>
      <div className='bg-black/80 rounded-2xl p-8 flex flex-col items-center transition-all duration-500 transform scale-95'>
        <div className="text-white text-xl font-bold mb-6 pixel-text text-center">
          ТОГЛООМ ЭХЛЭЖ БАЙНА...
        </div>
        <div className="text-green-300 text-sm pixel-text text-center mb-4 min-h-[40px]">
          {status}
        </div>
        <div className="w-64 mb-6">
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            >
              <div className="progress-bar-glow"></div>
            </div>
            <div className="progress-percent">
              {progress}%
            </div>
          </div>
          <div className="flex justify-between text-white text-xs pixel-text mt-1">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>
        <div className="text-gray-300 text-xs pixel-text text-center mt-2">
          {progress === 100 ? (
            <div className="text-green-400 animate-pulse">
              ✓ БҮХ ПРОЦЕСС АМЖИЛТТАЙ ДУУССАН
            </div>
          ) : (
            <>
              <div className="mb-1">• СЕРВЕРТ ХОЛБОГДОЖ БАЙНА</div>
              <div>• ТОГЛООМЫН ӨГӨГДЛИЙГ УНШИЖ БАЙНА</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};