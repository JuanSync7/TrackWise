
import { useState, useEffect, useCallback } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);


  useEffect(() => {
    // This effect ensures that if the initialValue prop changes, 
    // and the key is not already in localStorage, we update to the new initialValue.
    // This is more relevant if the hook could be re-initialized with a different initialValue
    // without the key changing, which is less common for a typical localStorage hook.
    // The primary mechanism for setting from localStorage is the useState initializer.
    // This effect primarily handles the stringification and saving to localStorage on change.
    if (typeof window !== 'undefined') {
      try {
         // Re-check if item exists, if not, and initialValue is different, update.
        const item = window.localStorage.getItem(key);
        if (item === null && JSON.stringify(storedValue) !== JSON.stringify(initialValue)) {
           // This condition might be too aggressive or lead to loops if initialValue is unstable.
           // For now, we'll rely on the initial useState setup and the setValue callback.
           // The main purpose here is to save `storedValue` when it changes.
        }
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      } catch (error) {
        console.error(`Error synchronizing localStorage key "${key}":`, error);
      }
    }
  }, [key, storedValue, initialValue]); // Added initialValue to dependencies, though its role here is subtle

  return [storedValue, setValue];
}

export default useLocalStorage;
