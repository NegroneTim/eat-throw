"use client";
import { useState, useRef } from 'react';
import { SignJWT } from 'jose';

export const UserComponent = ({ user, setUser }) => {
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const inputId = useRef(null);

  const createUser = async (userName, setLoading) => {
    if (userName?.trim()) {
      try {
        const data = { user: userName.toUpperCase() };
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Check the network');

        const result = await response.json();
        const secret = new TextEncoder().encode(process.env.NEXT_PUBLIC_JWT_SECRET);

        const tokenPayload = {
          user: {
            _id: result.result._id,
            uid: result.result.uid,
            user: result.result.user,
            unicode: result.result.unicode || 1,
            dailyScore: result.result.dailyScore,
            zoos: result.result.zoos,
            ard: result.result.ard,
            stats: result.result.stats
          }
        };

        const token = await new SignJWT(tokenPayload)
          .setProtectedHeader({ alg: 'HS256' })
          .setExpirationTime('2h')
          .setIssuedAt()
          .sign(secret);

        if (typeof window !== 'undefined') {
          localStorage.setItem('authToken', token);
          localStorage.setItem('cid', result.result._id);
          setUser(result.result);
        }
      } catch (err) {
        console.error('Create user error:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const getUser = async (userId, setLoading) => {
    if (userId?.trim()) {
      try {
        const response = await fetch(`/api/users/uid/${userId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: "no-store"
        });

        if (!response.ok) {
          if (response.status === 404) {
            inputId.current?.style && (inputId.current.style.outline = "1px solid red");
            setUser(false);
            localStorage.removeItem('cid');
            return;
          }
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        if (data.user) {
          const secret = new TextEncoder().encode(process.env.NEXT_PUBLIC_JWT_SECRET);
          const tokenPayload = {
            user: {
              _id: data.user._id,
              uid: data.user.uid,
              user: data.user.user,
              unicode: data.user.unicode || 1,
              dailyScore: data.user.dailyScore,
              zoos: data.user.zoos,
              ard: data.user.ard,
              stats: data.user.stats
            }
          };

          const token = await new SignJWT(tokenPayload)
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('2h')
            .setIssuedAt()
            .sign(secret);

          localStorage.setItem('authToken', token);
          localStorage.setItem('cid', data.user._id);
          setUser(data.user);
        } else {
          inputId.current?.style && (inputId.current.style.outline = "1px solid red");
          setUser(false);
          localStorage.removeItem('cid');
        }
      } catch (err) {
        console.error('Get user error:', err);
        setUser(false);
        localStorage.removeItem('cid');
      } finally {
        setLoading(false);
      }
    } else {
      setUser(false);
      localStorage.removeItem('cid');
      setLoading(false);
    }
  };

  if (user === false) {
    return (
      <div className='z-10 w-full h-[100dvh] absolute bg-[rgba(0,0,0,0.5)] flex flex-col justify-center items-center gap-2'>
        <div className='bg-[#002E63] w-1/2 min-w-[300px] max-w-[400px] h-fit border-4 border-[#0247FF] rounded-lg flex flex-col justify-start items-center p-4 gap-4 transition-all duration-500 transform scale-95 hover:scale-100'>
          <div className='flex flex-col justify-center items-center gap-3 w-full'>
            <h2 className='text-md text-white font-bold'>NEW USER</h2>
            <input
              type="text"
              className='bg-[rgba(0,0,0,0.3)] w-full active:outline-black p-2 max-w-[90%] placeholder:text-center uppercase text-white border-2 border-blue-400 rounded transition-all duration-300 focus:border-yellow-400 focus:scale-105'
              placeholder='YOUR NAME'
              onChange={(e) => setUserName(e.target.value)}
              value={userName}
            />
            <button
              className='bg-[green] px-4 py-2 rounded-lg mt-2 text-white font-bold transition-all duration-300 hover:bg-green-600 hover:scale-105 active:scale-95 w-full max-w-[90%]'
              onClick={() => { setLoading(true); createUser(userName, setLoading); }}
            >
              <p>CREATE</p>
            </button>
          </div>
          <h2 className='text-white font-bold'>or</h2>
          <div className='flex flex-col justify-center items-center gap-3 w-full'>
            <input
              type="text"
              ref={inputId}
              className='bg-[rgba(0,0,0,0.3)] w-full active:outline-black p-2 max-w-[90%] placeholder:text-center text-white border-2 border-blue-400 rounded transition-all duration-300 focus:border-yellow-400 focus:scale-105'
              placeholder='YOUR UID'
              onChange={(e) => {
                e.target.style.outline = "none";
                setUserId(e.target.value);
              }}
              value={userId}
            />
            <button
              className='bg-[green] px-4 py-2 rounded-lg mt-2 text-white font-bold transition-all duration-300 hover:bg-green-600 hover:scale-105 active:scale-95 w-full max-w-[90%]'
              onClick={() => { setLoading(true); getUser(userId, setLoading); }}
            >
              <p>LOGIN</p>
            </button>
          </div>
        </div>
        {loading && (
          <div className='absolute w-full h-full flex justify-center items-center bg-black/70 z-[100] backdrop-blur-sm transition-all duration-300'>
            <div className='bg-black/80 rounded-2xl p-6 flex flex-col items-center transition-all duration-500 transform scale-95 animate-pulse'>
              <div className="text-white text-xl font-bold mb-4">УНШИЖ БАЙНА...</div>
              <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 transition-all duration-300 animate-pulse"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
};