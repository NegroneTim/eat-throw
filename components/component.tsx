"use client"
import { useEffect, useState } from "react";

export function Timer({ targetDate }) {
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    function calculateTimeLeft() {
        const target = new Date(targetDate).getTime();
        const now = new Date().getTime();
        const difference = target - now;

        if (difference <= 0) {
            return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
        }

        return {
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((difference % (1000 * 60)) / 1000),
            expired: false
        };
    }

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [targetDate]);

    if (timeLeft.expired) {
        return <span className="text-red-400 text-xs sm:text-sm">Дууссан</span>;
    }

    if (timeLeft.days === 0 && timeLeft.hours === 0) {
        return (
            <span className="text-yellow-300 text-xs sm:text-sm">
                {timeLeft.minutes} мин {timeLeft.seconds} сек
            </span>
        );
    }

    return (
        <span className="text-yellow-300 text-xs sm:text-sm">
            {timeLeft.days} өдөр {timeLeft.hours} цаг {timeLeft.minutes} мин
        </span>
    );
}

