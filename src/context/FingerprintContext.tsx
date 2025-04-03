import React, { createContext, useContext, useEffect, useState } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

// Define the shape of the context
interface FingerprintContextType {
  fingerprint: string | null;
}

const FingerprintContext = createContext<FingerprintContextType | undefined>(undefined);

// Provider component
export const FingerprintProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    const getFingerprint = async () => {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      setFingerprint(result.visitorId);
    };

    getFingerprint();
  }, []);

  return (
    <FingerprintContext.Provider value={{ fingerprint }}>
      {children}
    </FingerprintContext.Provider>
  );
};

// Custom hook to use the fingerprint context
export const useFingerprint = () => {
  const context = useContext(FingerprintContext);
  if (!context) {
    throw new Error('useFingerprint must be used within a FingerprintProvider');
  }
  return context;
};
