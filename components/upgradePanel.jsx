"use client";
import { useState } from 'react';
import { SvgAmmo, SvgHealth, SvgZoos, SvgLoading } from "./svg";

export const UpgradePanel = ({ levels, coins, upgradeCost, onUpgrade, contentLoaded }) => {
    const [buttonAnimations, setButtonAnimations] = useState({});
    const [loadingButtons, setLoadingButtons] = useState({});

    const buttonArray = [
        { type: "health", icon: <SvgHealth />, name: "АМЬ", level: levels.health },
        { type: "coins", icon: <SvgZoos />, name: "ҮРЖ", level: levels.coins },
        { type: "ammo", icon: <SvgAmmo />, name: "СУМ", level: levels.ammo },
    ];

    const getUpgradeCost = (type) => {
        const currentLevel = levels[type];
        return upgradeCost * currentLevel;
    };

    const handleUpgrade = async (type) => {
        setLoadingButtons(prev => ({ ...prev, [type]: true }));
        const success = await onUpgrade(type);

        if (success) {
            setButtonAnimations(prev => ({ ...prev, [type]: 'success' }));
        } else {
            setButtonAnimations(prev => ({ ...prev, [type]: 'error' }));
        }

        setLoadingButtons(prev => ({ ...prev, [type]: false }));

        setTimeout(() => {
            setButtonAnimations(prev => ({ ...prev, [type]: '' }));
        }, success ? 1500 : 600);
    };

    const UpgradeButton = ({ item }) => {
        const cost = getUpgradeCost(item.type);
        const animation = buttonAnimations[item.type];
        const loading = loadingButtons[item.type];

        return (
            <button
                className={`relative bg-blue-500/30 rounded-lg p-3 text-center text-xs cursor-pointer transition-all duration-500 hover:bg-blue-500/50 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-4 border-blue-600 pixel-corners ${animation === 'success' ? 'success-green-glow pixel-success' :
                    animation === 'error' ? 'error-red-shake pixel-error' :
                        'pixel-normal'
                    } ${contentLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
                onClick={(e) => { e.stopPropagation(); handleUpgrade(item.type); }}
                disabled={coins < cost || loading}
                style={{
                    transitionDelay: contentLoaded ? `${100 + (buttonArray.indexOf(item) * 100)}ms` : '0ms'
                }}
            >
                {loading && <SvgLoading />}

                {animation === 'success' && (
                    <div className="absolute inset-0 overflow-hidden rounded-lg">
                        <div className="success-particle-1"></div>
                        <div className="success-particle-2"></div>
                        <div className="success-particle-3"></div>
                        <div className="success-particle-4"></div>
                    </div>
                )}

                <div className={`text-2xl mb-2 transition-all duration-300 flex items-center justify-center ${animation === 'success' ? 'pixel-bounce scale-125' : 'hover:scale-110'
                    }`}>
                    {item.icon}
                </div>

                <div className="text-white font-bold pixel-text mb-1">{item.name}</div>

                <div className="text-gray-300 text-xs pixel-text mb-2">
                    Lvl <span className={`${animation === 'success' ? 'level-up-animation' : ''}`}>{item.level}</span>
                </div>

                <div className={`text-yellow-300 font-bold transition-all duration-300 ${animation === 'success' ? 'text-green-300 pixel-prize-glow' : ''
                    }`}>
                    <span className="">{cost}</span>
                    <span className="text-[8px]">₵</span>
                </div>
            </button>
        );
    };

    return (
        <div
            className={`grid grid-cols-3 gap-2 p-4 h-52 transition-all duration-500 ${contentLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
            onClick={(e) => e.stopPropagation()}
            style={{ transitionDelay: contentLoaded ? '700ms' : '0ms' }}
        >
            {buttonArray.map((item, index) => (
                <UpgradeButton key={item.type + index} item={item} />
            ))}
        </div>
    );
};