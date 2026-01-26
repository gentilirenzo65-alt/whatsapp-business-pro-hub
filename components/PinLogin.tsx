
import React, { useState } from 'react';

interface PinLoginProps {
    onSuccess: () => void;
}

const PinLogin: React.FC<PinLoginProps> = ({ onSuccess }) => {
    const [pin, setPin] = useState(['', '', '', '']);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Solo números

        const newPin = [...pin];
        newPin[index] = value.slice(-1); // Solo un dígito
        setPin(newPin);
        setError('');

        // Auto-focus siguiente input
        if (value && index < 3) {
            const nextInput = document.getElementById(`pin-${index + 1}`);
            nextInput?.focus();
        }

        // Auto-submit cuando se completa
        if (index === 3 && value) {
            const fullPin = [...newPin.slice(0, 3), value.slice(-1)].join('');
            if (fullPin.length === 4) {
                validatePin(fullPin);
            }
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            const prevInput = document.getElementById(`pin-${index - 1}`);
            prevInput?.focus();
        }
    };

    const validatePin = async (fullPin: string) => {
        setLoading(true);
        try {
            const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';
            const res = await fetch(`${API_URL}/auth/pin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: fullPin })
            });

            const data = await res.json();

            if (data.success) {
                localStorage.setItem('wh_authenticated', 'true');
                onSuccess();
            } else {
                setError('PIN incorrecto');
                setPin(['', '', '', '']);
                document.getElementById('pin-0')?.focus();
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-600 via-green-700 to-emerald-800">
            <div className="bg-white/10 backdrop-blur-xl rounded-[40px] p-12 shadow-2xl border border-white/20 max-w-md w-full mx-4">

                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center shadow-lg">
                        <i className="fa-brands fa-whatsapp text-5xl text-white"></i>
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-black text-white text-center tracking-tight mb-2">
                    WhatsApp Hub Pro
                </h1>
                <p className="text-white/60 text-center text-sm mb-10">
                    Ingresa tu PIN de 4 dígitos para acceder
                </p>

                {/* PIN Inputs */}
                <div className="flex justify-center gap-4 mb-8">
                    {pin.map((digit, index) => (
                        <input
                            key={index}
                            id={`pin-${index}`}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            className={`w-16 h-20 text-center text-3xl font-black rounded-2xl border-2 
                ${error ? 'border-red-400 bg-red-50/10' : 'border-white/30 bg-white/10'} 
                text-white focus:outline-none focus:border-white focus:bg-white/20 
                transition-all duration-200 placeholder-white/30`}
                            autoFocus={index === 0}
                            disabled={loading}
                        />
                    ))}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="text-center mb-6">
                        <span className="bg-red-500/20 text-red-200 px-4 py-2 rounded-full text-sm font-bold">
                            <i className="fa-solid fa-exclamation-circle mr-2"></i>
                            {error}
                        </span>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="flex justify-center">
                        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    </div>
                )}

                {/* Footer */}
                <p className="text-white/40 text-center text-xs mt-10">
                    Sistema protegido • Solo usuarios autorizados
                </p>
            </div>
        </div>
    );
};

export default PinLogin;
