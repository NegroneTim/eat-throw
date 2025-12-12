import { useState } from 'react';
import { SvgLoading } from './svg';

export const UpgradeButton = ({ type, icon, name, level, cost, coins, onUpgrade }) => {
  const [loading, setLoading] = useState(false);
  const [animation, setAnimation] = useState('');

  const handleClick = async (e) => {
    e.stopPropagation();
    
    if (coins < cost) {
      setAnimation('error');
      return;
    }

    setLoading(true);
    const success = await onUpgrade(type);
    setLoading(false);
    
    if (success) {
      setAnimation('success');
    } else {
      setAnimation('error');
    }
  };

  return (
    <button
      className={`upgrade-button ${animation}`}
      onClick={handleClick}
      disabled={coins < cost || loading}
    >
      {loading && <SvgLoading />}
      <div className="icon">{icon}</div>
      <div className="name">{name}</div>
      <div className="level">Lvl {level}</div>
      <div className="cost">{cost}₵</div>
    </button>
  );
};