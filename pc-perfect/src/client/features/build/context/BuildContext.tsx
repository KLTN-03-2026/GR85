import React, { createContext, useContext, useState, useCallback } from 'react';
import { ComponentCategory, PCComponent, PCBuild } from '@/types/pc-components';

interface BuildContextType {
  currentBuild: PCBuild;
  addComponent: (category: ComponentCategory, component: PCComponent) => void;
  removeComponent: (category: ComponentCategory) => void;
  clearBuild: () => void;
  totalPrice: number;
  componentCount: number;
  useUsedPrices: boolean;
  setUseUsedPrices: (value: boolean) => void;
}

const BuildContext = createContext<BuildContextType | undefined>(undefined);

const createEmptyBuild = (): PCBuild => ({
  id: crypto.randomUUID(),
  name: 'My Build',
  components: {},
  totalPrice: 0,
  createdAt: new Date(),
});

export function BuildProvider({ children }: { children: React.ReactNode }) {
  const [currentBuild, setCurrentBuild] = useState<PCBuild>(createEmptyBuild());
  const [useUsedPrices, setUseUsedPrices] = useState(false);

  const addComponent = useCallback((category: ComponentCategory, component: PCComponent) => {
    setCurrentBuild((prev) => ({
      ...prev,
      components: {
        ...prev.components,
        [category]: component,
      },
    }));
  }, []);

  const removeComponent = useCallback((category: ComponentCategory) => {
    setCurrentBuild((prev) => {
      const newComponents = { ...prev.components };
      delete newComponents[category];
      return {
        ...prev,
        components: newComponents,
      };
    });
  }, []);

  const clearBuild = useCallback(() => {
    setCurrentBuild(createEmptyBuild());
  }, []);

  const totalPrice = Object.values(currentBuild.components).reduce((sum, component) => {
    if (!component) return sum;
    const price = useUsedPrices && component.usedPrice ? component.usedPrice : component.price;
    return sum + price;
  }, 0);

  const componentCount = Object.keys(currentBuild.components).length;

  return (
    <BuildContext.Provider
      value={{
        currentBuild,
        addComponent,
        removeComponent,
        clearBuild,
        totalPrice,
        componentCount,
        useUsedPrices,
        setUseUsedPrices,
      }}
    >
      {children}
    </BuildContext.Provider>
  );
}

export function useBuild() {
  const context = useContext(BuildContext);
  if (!context) {
    throw new Error('useBuild must be used within a BuildProvider');
  }
  return context;
}
