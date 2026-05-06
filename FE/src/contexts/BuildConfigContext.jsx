import React, { createContext, useContext, useState, useEffect } from "react";

const BuildConfigContext = createContext();

export function BuildConfigProvider({ children }) {
  const [savedConfigs, setSavedConfigs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load configs từ localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pc_build_configs");
      if (saved) {
        setSavedConfigs(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading configs from localStorage:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync configs to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("pc_build_configs", JSON.stringify(savedConfigs));
    }
  }, [savedConfigs, isLoading]);

  const saveConfig = (config) => {
    const newConfig = {
      id: config.id || Date.now(),
      name: config.name,
      budget: config.budget,
      usage: config.usage,
      items: config.items,
      totalPrice: config.totalPrice,
      createdAt: config.createdAt || new Date().toISOString(),
      pcComponentsOnly: config.pcComponentsOnly || false,
    };

    setSavedConfigs((prev) => {
      const filtered = prev.filter((c) => c.id !== newConfig.id);
      return [...filtered, newConfig];
    });

    return newConfig;
  };

  const deleteConfig = (configId) => {
    setSavedConfigs((prev) => prev.filter((c) => c.id !== configId));
  };

  const updateConfig = (configId, updates) => {
    setSavedConfigs((prev) =>
      prev.map((c) =>
        c.id === configId ? { ...c, ...updates } : c
      )
    );
  };

  const getConfig = (configId) => {
    return savedConfigs.find((c) => c.id === configId);
  };

  const getAllConfigs = () => savedConfigs;

  return (
    <BuildConfigContext.Provider
      value={{
        savedConfigs,
        saveConfig,
        deleteConfig,
        updateConfig,
        getConfig,
        getAllConfigs,
        isLoading,
      }}
    >
      {children}
    </BuildConfigContext.Provider>
  );
}

export function useBuildConfig() {
  const context = useContext(BuildConfigContext);
  if (!context) {
    throw new Error(
      "useBuildConfig must be used within a BuildConfigProvider"
    );
  }
  return context;
}
