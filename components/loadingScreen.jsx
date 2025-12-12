export const LoadingScreen = ({ progress }) => {
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center">
      <div className='flex flex-col items-center gap-4'>
        <div className="text-white text-xl font-bold whitespace-nowrap">
          <p>УНШИЖ БАЙНА...</p>
        </div>
        <div className='relative w-full rounded-md overflow-hidden'>
          <div className="w-full h-6 bg-gray-700 overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="absolute top-1 w-full flex justify-center text-white text-sm text-center">
            {progress}%
          </div>
        </div>
      </div>
    </div>
  );
};